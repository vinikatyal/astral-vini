// /app/api/lessons/chapters/route.ts
import { createClient } from "@/lib/supabase/server";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Redis } from "@upstash/redis";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function hashKey(prompt: string) {
  const bytes = new TextEncoder().encode(prompt);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `gpt-cache:${hash}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const supabase = await createClient();
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Lesson ID is required" },
      { status: 400 }
    );
  }

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching line item:", error);
  } else {
    console.log("Line item data:", lesson);
  }

  // Get Lesson Details from Supa base or any other DB here using id from query params
  return NextResponse.json(lesson);
}

export async function POST(req: Request) {
  const { lesson } = await req.json();

  const chapterDetailsPrompt = `
You are a senior Next.js + TypeScript developer.

Task:
Generate a complete TypeScript React page component that renders a detailed lesson at the route \`/lessons/[id]\`.

STRICT RULES:
- Output **TypeScript code only** (no markdown, no commentary, no code fences).
- This is a **server-side rendered** Next.js page component.
- Generate ALL necessary TypeScript types/interfaces based on the lesson data structure provided.
- Component signature MUST be:
  export default function LessonPage({ params }: { params: { id: string } })
- The lesson data will be available as shown below - use it directly in the component.
- Use Tailwind CSS for styling.
- No external libraries beyond React/Next.js built-ins.

What to render:
1) A header with the lesson outline from the \`outline\` field
2) The detailed lesson content from the \`details\` field
   - The \`details\` field can be either plain text OR HTML
   - If it contains HTML tags, render it using dangerouslySetInnerHTML
   - If it's plain text with markdown formatting, render it as formatted text
3) Add a "Back to Lessons" link that navigates to "/"
4) Make the layout clean, readable, and student-friendly

Implementation details:
- Keep it simple and focused on content display
- Ensure proper typography and spacing for readability
- Handle both text and HTML content gracefully
- Include proper semantic HTML structure
- Make it responsive

Here is the lesson data structure:
${JSON.stringify(lesson, null, 2)}

Respond with the complete .tsx file content (code only). Do not wrap in code fences or add any explanatory text.
`.trim();

  // Above prompt needs to be worked on still to handle details as html or text properly.
  // Also not hard code basis lesson etc

  // create a hash-based key (deterministic)
  const key = await hashKey(chapterDetailsPrompt);

  const cached = await redis.get<string>(key);

  console.log("Cache key:", key, "Cached:", Boolean(cached));
  if (cached) {
    return NextResponse.json({
      tsxSource: cached,
      cached: true,
      lesson: lesson,
    });
  }

   console.log("Cached TSX code:", cached);

  // Call OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: chapterDetailsPrompt }],
    temperature: 0,
  });

  const code = completion.choices[0].message?.content ?? "";

  console.log("Generated TSX code:", code);

  // Cache the result (TTL 1 hour)
  await redis.set(key, code);
  await redis.expire(key, 60 * 60);

  return NextResponse.json({
    lesson: lesson,
    tsxSource: code,
    cache: false,
  });
}
