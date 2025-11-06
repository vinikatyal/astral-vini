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

  console.log("Created lesson:", lesson);
  console.log("Not created lesson:", error);

  // i want to send this to langfuse as well for tracking

  const splitPrompt = `
You are an expert educational lesson planner specializing in creating comprehensive, student-friendly lesson plans.

Your task is to transform the given outline into a detailed, structured lesson plan that students can easily follow and understand.

**LESSON PLAN REQUIREMENTS:**
- Include clear learning objectives
- Break down content into digestible sections with headings
- Add estimated time for each section
- Include practical examples and activities where relevant
- Suggest assessment methods or reflection questions
- Make it engaging and age-appropriate

**IMAGE GUIDELINES:**
- Add 1-2 relevant educational images from Unsplash using markdown syntax: ![description](https://source.unsplash.com/800x600/?keyword)
- Only include images that enhance understanding of the topic

**OUTPUT FORMAT:**
Return ONLY a valid JSON object with NO markdown formatting, NO code fences, NO additional text.

Required JSON structure:
{
  "success": true,
  "outline": "The original outline text provided by the student",
  "details": "Complete detailed lesson plan in plain text format with markdown for structure and images. Include: title, learning objectives, materials needed, time breakdown, step-by-step instructions, activities, and assessment suggestions."
}

The details field should be either text string or html no markdown formatting.

**OUTLINE TO TRANSFORM:**
"""${outline}"""

**Remember:** Output pure JSON only. The "details" field should contain the full lesson plan as a text string with markdown formatting for readability.
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
