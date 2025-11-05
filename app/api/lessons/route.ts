// /app/api/lessons/route.ts
import { Lesson } from "@/lib/types";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const PartsSchema = z.object({
  success: z.boolean(),
  outline: z.string(),
  data: z.array(
    z.object({
      idx: z.number(),
      title: z.string().min(1),
      description: z.string().min(1),
    })
  ),
});

export async function POST(req: Request) {
  const { outline } = await req.json();

  //   const { data: lesson } = await supabase
  //     .from("lessons")
  //     .insert([{ outline, status: "generating" }])
  //     .select()
  //     .single();

  const splitPrompt = `
You are a expert educational lesson planner. Split the following outline into 2-5 parts.
Return strictly JSON array of objects inside data variable: [{ "id": 1, "title": "...", "description": "..." }, ...] 
plus mention success true if parsing was successful else false, plus the original outline.

Make sure each part has a clear title and a brief description.

## Respond only with JSON in the following format:

{
  "success": true,
  "outline": "...original outline...",
  "lessons": [
    { "id": 1, "title": "Part 1 Title", "description": "Brief description of part 1", details: "Details about the chapter 1 such that it encompasses the title" },
    { "id": 2, "title": "Part 2 Title", "description": "Brief description of part 2", details: "Details about the chapter 2 such that it encompasses the title" }
    ...
  ]
}

## To follow for sure
1. Make sure you include a details field that provides in-depth information about each chapter.
2. You can even include code snippets or examples in the details if relevant to the outline

Here is the outline
Outline: """${outline}"""
  `.trim();

  const split = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: splitPrompt }],
    response_format: { type: "json_object" } as any, // or parse from text if needed
  });

  const text = split.choices[0].message?.content ?? "[]";

  console.log("Split response:", text);
  const lessonPlanJSON = JSON.parse(text);
  if (!lessonPlanJSON.success) {
    console.error("Failed to parse lesson plan JSON:", lessonPlanJSON);
  }


  //   await supabase.from("lessons")
  //     .update({
  //       status: "done",
  //       title: extractTitleFromCode(code),
  //       content: code
  //     })
  //     .eq("id", lesson.id);

  const dataWithIds = lessonPlanJSON.lessons.map((p: Lesson) => ({
    id: randomUUID(),
    title: p.title.trim(),
    description: p.description.trim(),
    outline,
    status: "generated" as const, // generated only after creation
    updated_at: new Date().toISOString(),
    details: p.details
  }));


  return NextResponse.json({
    outline: lessonPlanJSON.outline,
    data: dataWithIds
  });
}
