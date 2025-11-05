// /app/api/lessons/route.ts
import { createClient } from "@/lib/supabase/server";

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });


export async function POST(req: Request) {
  const { outline } = await req.json();

  const supabase = await createClient();

  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert([{ outline, status: "generating" }])
    .select()
    .single();

  console.log("Created lesson:", lesson);
  console.log("Not created lesson:", error);

  const splitPrompt = `
You are a expert educational lesson planner. Create a detailed lesson plan outline for the given topic.

STRICT RULES:
- Output **JSON only** (no markdown, no commentary, no fences).
- The JSON object MUST have the following structure:
{
  "success": true,
  "outline": "The initial prompt outline text here"
  "details": "<A detailed lesson plan covering the outline this should be text only>"
}
Here is the outline
Outline: """${outline}"""
  `.trim();

  const split = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: splitPrompt }],
    response_format: { type: "json_object" } as any, // or parse from text if needed
  });

  const text = split.choices[0].message?.content ?? "{}";

  console.log("Split response:", text);
  const lessonPlanJSON = JSON.parse(text);
  if (!lessonPlanJSON.success) {
    console.error("Failed to parse lesson plan JSON:", lessonPlanJSON);
  }


  if (!lesson) {
    // Add in langfuse also add error handling
  } else {
  await supabase
    .from("lessons")
    .update({
      status: "generated",
      outline: outline,
      details: lessonPlanJSON.details,
    })
    .eq("id", lesson.id);
  }
 


  return NextResponse.json({
    status: "generated",
    outline: outline,
    details: lessonPlanJSON.details,
  });
}
