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

Your task is to transform the given outline/topic into a complete, engaging lesson that students will read and learn from directly.

**LESSON CONTENT REQUIREMENTS:**
- Write as if speaking directly to the student
- Use clear, conversational language appropriate for all ages
- Break complex concepts into simple, digestible explanations
- Include practical examples and real-world applications
- Add interactive elements (questions to think about, try-it-yourself sections)
- Make it engaging and easy to follow from start to finish

**STRUCTURE GUIDELINES:**
- Start with a brief introduction that hooks the reader
- Explain concepts step-by-step with examples
- Include practice exercises or activities students can do
- End with a summary and key takeaways

**IMAGE GUIDELINES:**
- Include 2-3 relevant educational images from Unsplash or Pexels
- Images should directly illustrate the concepts being taught
- Use proper HTML img tags with descriptive alt text

**STYLING REQUIREMENTS:**
- Use Tailwind CSS utility classes for all styling
- Apply consistent spacing, typography, and color scheme
- Suggested classes: text-2xl, text-lg, font-bold, mb-4, mt-6, p-4, bg-blue-50, rounded-lg, etc.
- Make headings stand out with larger text and proper margins
- Use background colors or borders to highlight important sections

**OUTPUT FORMAT:**
Return ONLY a valid JSON object with NO markdown code fences, NO additional text outside the JSON.

Required JSON structure:
{
  "success": true,
  "outline": "The original outline/topic text",
  "details": "Complete lesson content in pure HTML format with Tailwind CSS classes"
}

**HTML FORMAT RULES FOR "details" FIELD:**
- Use semantic HTML tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <img>, <div>, etc.
- NO markdown syntax (no #, **, [], etc.)
- NO code blocks with backticks
- Apply Tailwind classes directly to HTML elements
- All content must be properly structured HTML

**EXAMPLE HTML STRUCTURE:**
<div class="max-w-4xl mx-auto p-6">
  <h1 class="text-3xl font-bold mb-6 text-gray-800">Lesson Title</h1>
  <p class="text-lg mb-4">Introduction paragraph...</p>
  <img src="image-url" alt="description" class="w-full rounded-lg shadow-md my-6" />
  <h2 class="text-2xl font-semibold mt-8 mb-4 text-gray-700">Section Heading</h2>
  <p class="mb-4">Content...</p>
  <div class="bg-blue-50 p-4 rounded-lg my-6">
    <p class="font-semibold">Try This:</p>
    <p>Interactive activity description...</p>
  </div>
</div>

**TOPIC/OUTLINE TO TRANSFORM:**
"""${outline}"""

**CRITICAL:** Output ONLY the JSON object. The "details" field must contain pure HTML with Tailwind classes, no markdown whatsoever.
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
        status: "generated",
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
