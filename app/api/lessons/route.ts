// /app/api/lessons/route.ts
import { createClient } from "@/lib/supabase/server";
import { Langfuse } from "langfuse";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const model = "gpt-4o-mini";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET() {
  const supabase = await createClient();

  const { data: lessons, error } = await supabase
    .from("lessons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }

  return NextResponse.json(lessons);
}

export async function POST(req: Request) {
  const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
    secretKey: process.env.LANGFUSE_SECRET_KEY!,
  });

  // Create main trace at the very beginning
  const trace = langfuse.trace({
    name: "generate-lesson-workflow",
    userId: "anonymous",
    metadata: {
      timestamp: new Date().toISOString(),
    },
    tags: ["lesson-generation", "api-endpoint"],
  });

  try {
    // Step 1: Parse request body
    const parseSpan = trace.span({
      name: "parse-request",
      metadata: { step: "1-parse-request" },
    });

    const { outline, tempLessonId } = await req.json();

    parseSpan.end({
      output: { outline, tempLessonId },
    });

    // Update trace with parsed data
    trace.update({
      metadata: {
        lessonId: tempLessonId,
        outline,
        timestamp: new Date().toISOString(),
      },
    });

    // Step 2: Create database entry
    const dbInsertSpan = trace.span({
      name: "database-insert",
      metadata: {
        step: "2-db-insert",
        table: "lessons",
      },
    });

    const supabase = await createClient();
    const { data: lesson, error: insertError } = await supabase
      .from("lessons")
      .insert([{ outline, status: "generating", lessonId: tempLessonId }])
      .select()
      .single();

    if (insertError) {
      dbInsertSpan.end({
        level: "ERROR",
        statusMessage: insertError.message,
      });

      trace.update({
        metadata: {
          error: insertError.message,
          step: "database-insert-failed",
        },
        tags: ["error", "database-error"],
      });

      await langfuse.flushAsync();

      console.error("Error inserting lesson:", insertError);
      return NextResponse.json(
        { error: "Failed to create lesson" },
        { status: 500 }
      );
    }

    dbInsertSpan.end({
      output: {
        lessonId: lesson.id,
        dbId: lesson.id,
        status: "generating",
      },
    });

    // Update trace with database ID
    trace.update({
      metadata: {
        lessonId: tempLessonId,
        dbId: lesson.id,
        outline,
        timestamp: new Date().toISOString(),
      },
    });

    // Step 3: Prepare prompt
    const promptPrepSpan = trace.span({
      name: "prepare-prompt",
      metadata: {
        step: "3-prompt-preparation",
      },
    });

    const splitPrompt = `
You are an expert educational content creator specializing in interactive lessons for all age groups.

Your task is to transform the given outline into a comprehensive, engaging lesson with interactive elements.

**LESSON REQUIREMENTS:**
- Create actual lesson content, not a lesson plan (students will be reading/learning from this directly)
- Break content into clear, digestible sections
- Include explanations, examples, and practice opportunities
- Make it engaging and age-appropriate for all learners
- Use simple, clear language with progressive complexity

**STYLING GUIDELINES:**
Use Tailwind CSS classes for all styling:
- Headings: text-3xl font-bold mb-4, text-2xl font-semibold mb-3, text-xl font-medium mb-2
- Paragraphs: text-base leading-relaxed mb-4
- Containers: max-w-4xl mx-auto p-6
- Cards/Sections: bg-white rounded-lg shadow-md p-6 mb-6
- Lists: list-disc list-inside space-y-2
- Code blocks: bg-gray-100 p-4 rounded font-mono text-sm
- Emphasis: text-blue-600 font-semibold, bg-yellow-100 px-2 py-1 rounded

**OUTPUT FORMAT:**
Return ONLY a valid JSON object with NO markdown code fences, NO additional text.

Required JSON structure:
{
  "success": true,
  "outline": "${outline}",
  "details": "Complete HTML lesson content here"
}

**HTML STRUCTURE FOR DETAILS:**
<div class="max-w-4xl mx-auto p-6">
  <h1 class="text-3xl font-bold mb-6 text-gray-800">[Lesson Title]</h1>
  
  <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
    <p class="text-sm text-gray-700">What you'll learn: [brief overview]</p>
  </div>

  <section class="bg-white rounded-lg shadow-md p-6 mb-6">
    <h2 class="text-2xl font-semibold mb-4 text-gray-800">[Section Title]</h2>
    <p class="text-base leading-relaxed mb-4">[Content]</p>
    
    <div class="bg-gray-50 p-4 rounded-lg mb-4">
      <h3 class="text-lg font-medium mb-2">Example:</h3>
      <p>[Practical example]</p>
    </div>
  </section>

  <section class="bg-white rounded-lg shadow-md p-6 mb-6">
    <h2 class="text-2xl font-semibold mb-4 text-gray-800">[Next Section]</h2>
    <!-- More content -->
  </section>

  <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
    <h3 class="text-lg font-semibold mb-2">Try It Yourself:</h3>
    <p>[Practice exercise]</p>
  </div>

  <div class="bg-purple-50 p-6 rounded-lg">
    <h3 class="text-xl font-semibold mb-3">Key Takeaways:</h3>
    <ul class="list-disc list-inside space-y-2">
      <li>[Point 1]</li>
      <li>[Point 2]</li>
    </ul>
  </div>
</div>

**REMEMBER:** 
My html will be injected directly into a React component, so ensure all class names use Tailwind CSS conventions
Don't add any next related code - just pure HTML with Tailwind classes

**OUTLINE TO TRANSFORM:**
"""${outline}"""

Remember: Output ONLY the JSON object. No markdown, no code fences, no extra text. The details field must contain complete HTML with Tailwind classes.
`.trim();

    promptPrepSpan.end({
      output: {
        promptLength: splitPrompt.length,
        outlineLength: outline.length,
      },
    });

    // Step 4: Generate lesson with OpenAI
    const planGeneration = trace.generation({
      name: "generate-lesson-content",
      input: splitPrompt,
      model: model,
      metadata: {
        step: "4-openai-generation",
        purpose: "Create structured lesson content from outline",
        provider: "openai",
      },
    });

    const startTime = Date.now();
    const planResponse = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: splitPrompt }],
      response_format: { type: "json_object" } as any,
    });
    const endTime = Date.now();

    const planText = planResponse.choices[0].message?.content ?? "{}";
    const planData = JSON.parse(planText);

    planGeneration.end({
      output: planData,
      usage: {
        input: planResponse.usage?.prompt_tokens,
        output: planResponse.usage?.completion_tokens,
        total: planResponse.usage?.total_tokens,
      },
      metadata: {
        tokensUsed: planResponse.usage?.total_tokens,
        promptTokens: planResponse.usage?.prompt_tokens,
        completionTokens: planResponse.usage?.completion_tokens,
        latencyMs: endTime - startTime,
        finishReason: planResponse.choices[0].finish_reason,
      },
    });

    // Step 5: Parse and validate response
    const parseResponseSpan = trace.span({
      name: "parse-openai-response",
      metadata: {
        step: "5-parse-response",
      },
    });

    const isValidResponse = planData.success && planData.details;

    parseResponseSpan.end({
      output: {
        success: planData.success,
        hasDetails: !!planData.details,
        detailsLength: planData.details?.length || 0,
      },
      level: isValidResponse ? "DEFAULT" : "WARNING",
    });

    // Step 6: Update database with generated content
    const dbUpdateSpan = trace.span({
      name: "database-update",
      metadata: {
        step: "6-db-update",
        table: "lessons",
      },
    });

    if (lesson.id) {
      const { error: updateError } = await supabase
        .from("lessons")
        .update({
          status: "generated",
          outline: outline,
          details: planData.details,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lesson.id);

      if (updateError) {
        dbUpdateSpan.end({
          level: "ERROR",
          statusMessage: updateError.message,
        });

        trace.update({
          tags: ["error", "database-update-error"],
        });
      } else {
        dbUpdateSpan.end({
          output: {
            lessonId: lesson.id,
            status: "generated",
            updated: true,
          },
        });
      }
    } else {
      dbUpdateSpan.end({
        level: "WARNING",
        statusMessage: "No lesson ID available for update",
      });
    }

    // Step 7: Prepare final response
    const responseData = {
      status: planData.success ? "generated" : "error",
      outline: outline,
      id: lesson?.id,
      lessonId: lesson?.lessonId,
      details: planData.details,
    };

    // Update trace with final success state
    trace.update({
      output: {
        status: responseData.status,
        lessonId: responseData.lessonId,
        dbId: responseData.id,
      },
      metadata: {
        lessonId: tempLessonId,
        dbId: lesson.id,
        outline,
        finalStatus: responseData.status,
        timestamp: new Date().toISOString(),
      },
      tags: ["lesson-generation", "success"],
    });

    // Flush langfuse events before returning
    await langfuse.flushAsync();

    return NextResponse.json(responseData);
  } catch (error: any) {
    // Log error to Langfuse
    trace.update({
      metadata: {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
      tags: ["error", "exception"],
    });

    // Flush before returning error
    await langfuse.flushAsync();

    console.error("Error in lesson generation workflow:", error);
    return NextResponse.json(
      {
        error: "Failed to generate lesson",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
