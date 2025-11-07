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
You are an expert educational content creator specializing in creating comprehensive, interactive lessons for all age groups.

Your task is to transform the given outline into a complete, detailed lesson that students can read and learn from directly.

**LESSON CONTENT REQUIREMENTS:**
- Write in a clear, conversational teaching style as if speaking directly to the student
- Include clear explanations of all concepts
- Break down content into logical sections with proper structure
- Add practical examples, demonstrations, and interactive elements where relevant
- Include practice exercises or questions for self-assessment
- Make it engaging and accessible for all age groups
- Ensure content flows naturally from introduction to conclusion

**IMAGE GUIDELINES:**
- Add 1-2 relevant educational images from Unsplash or Pexels per major section
- Images must enhance understanding of the topic
- Use proper HTML img tags with src and alt attributes

**OUTPUT FORMAT:**
Return ONLY a valid JSON object with NO markdown formatting, NO code fences, NO additional text.

Required JSON structure:
{
  "success": true,
  "outline": "The original outline text provided by the student",
  "details": "Complete lesson content in HTML format only. Use HTML tags for all formatting: <h1>, <h2>, <p>, <ul>, <ol>, <strong>, <em>, <img>, <div>, etc. NO markdown symbols like #, *, -, etc."
}

**HTML FORMATTING RULES:**
- Use <h1> for main title
- Use <h2> for major sections
- Use <h3> for subsections
- Use <p> for paragraphs
- Use <ul> and <li> for bullet lists
- Use <ol> and <li> for numbered lists
- Use <strong> for bold text
- Use <em> for italic text
- Use <img src="URL" alt="description" style="max-width:100%; height:auto;"> for images
- Use <div class="section"> to wrap major sections if needed

**OUTLINE TO TRANSFORM:**
"""${outline}"""

**Critical:** Output pure JSON only. The "details" field must contain the complete lesson as an HTML string with proper tags. Absolutely NO markdown formatting (no #, *, -, etc.).
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
