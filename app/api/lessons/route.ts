// /app/api/lessons/route.ts
import { createClient } from "@/lib/supabase/server";
import { Langfuse } from "langfuse";

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const { outline, tempLessonId } = await req.json();

  const supabase = await createClient();

  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert([{ outline, status: "generating", lessonId: tempLessonId }])
    .select()
    .single();

  const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
    secretKey: process.env.LANGFUSE_SECRET_KEY!,
  });

  // Create a main trace for the entire lesson generation workflow
  const trace = langfuse.trace({
    name: "generate-lesson-workflow",
    userId: "anonymous", // You can add user tracking later
    metadata: {
      lessonId: tempLessonId,
      dbId: lesson?.id,
      outline,
      timestamp: new Date().toISOString(),
    },
    tags: ["lesson-generation"],
  });

  // How can i pass this to ui in the mean while
  // also pass to langfuse for tracking
  // https://cloud.langfuse.com/docs/sdk/javascript/integrations/nextjs

  // i want to send this to langfuse as well for tracking

  const splitPrompt = `
You are an expert educational content creator specializing in interactive lessons for all age groups.

Your task is to transform the given outline into a comprehensive, engaging lesson with interactive elements.

**LESSON REQUIREMENTS:**
- Create actual lesson content, not a lesson plan (students will be reading/learning from this directly)
- Break content into clear, digestible sections
- Include explanations, examples, and practice opportunities
- Make it engaging and age-appropriate for all learners
- Use simple, clear language with progressive complexity

**VISUAL ELEMENTS:**
You MUST include inline SVG diagrams to illustrate concepts. SVGs should be:
- Small and performant (under 5KB each)
- Simple, clean designs with clear labels
- Use basic shapes (circles, rectangles, lines, paths)
- Include 2-4 SVGs per lesson to visualize key concepts
- Educational and directly relevant to the content

**STYLING GUIDELINES:**
Use Tailwind CSS classes for all styling:
- Headings: text-3xl font-bold mb-4, text-2xl font-semibold mb-3, text-xl font-medium mb-2
- Paragraphs: text-base leading-relaxed mb-4
- Containers: max-w-4xl mx-auto p-6
- Cards/Sections: bg-white rounded-lg shadow-md p-6 mb-6
- Lists: list-disc list-inside space-y-2
- Code blocks: bg-gray-100 p-4 rounded font-mono text-sm
- Emphasis: text-blue-600 font-semibold, bg-yellow-100 px-2 py-1 rounded
- SVG containers: flex justify-center my-8

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
    
    <div class="flex justify-center my-8">
      <svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <!-- Simple, educational SVG diagram here -->
      </svg>
    </div>
    
    <div class="bg-gray-50 p-4 rounded-lg mb-4">
      <h3 class="text-lg font-medium mb-2">Example:</h3>
      <p>[Practical example]</p>
    </div>
  </section>

  <section class="bg-white rounded-lg shadow-md p-6 mb-6">
    <h2 class="text-2xl font-semibold mb-4 text-gray-800">[Next Section]</h2>
    <!-- More content with SVGs -->
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

**SVG GUIDELINES:**
- Keep viewBox proportional and clean
- Use stroke-width="2" for lines
- Use fill and stroke with hex colors (#3B82F6, #10B981, #F59E0B, etc.)
- Add text labels with font-size="14" or "16"
- Keep total SVG code under 1000 characters per diagram
- Make diagrams self-explanatory

**OUTLINE TO TRANSFORM:**
"""${outline}"""

Remember: Output ONLY the JSON object. No markdown, no code fences, no extra text. The details field must contain complete HTML with Tailwind classes and inline SVG diagrams.
`.trim();

  const model = "gpt-4o-mini";

  const planGeneration = trace.generation({
    name: "generate-lesson-plan",
    input: outline,
    model: model,
    metadata: {
      step: "1-lesson-planning",
      purpose: "Create structured lesson plan from outline",
    },
  });

  const planResponse = await openai.chat.completions.create({
    model: model,
    messages: [{ role: "user", content: splitPrompt }],
    response_format: { type: "json_object" } as any, // or parse from text if needed
  });

  const planText = planResponse.choices[0].message?.content ?? "{}";
  const planData = JSON.parse(planText);

  planGeneration.end({
    output: planData,
    metadata: {
      tokensUsed: planResponse.usage?.total_tokens,
      promptTokens: planResponse.usage?.prompt_tokens,
      completionTokens: planResponse.usage?.completion_tokens,
    },
  });

  console.log("Split response:", planData);

  if (lesson.id) {
    await supabase
      .from("lessons")
      .update({
        status: "generated", // change this since code is not generated or move the code into this
        outline: outline,
        details: planData.details,
      })
      .eq("id", lesson.id);
  }

  return NextResponse.json({
    status: planData.success ? "generated" : "error",
    outline: outline,
    id: lesson?.id,
    lessonId: lesson?.lessonId,
    details: planData.details,
  });
}
