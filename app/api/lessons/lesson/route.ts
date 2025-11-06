// /app/api/lessons/chapters/route.ts
import { createClient } from "@/lib/supabase/server";

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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
  console.log("Received lesson for chapter generation:", lesson);

const chapterDetailsPrompt = `
You are a senior Next.js + TypeScript developer.

Task:
Generate a TypeScript React page component that renders a detailed lesson at the route \`/lessons/<id>\`.

STRICT RULES:
- Output **TypeScript code only** (no markdown, no commentary, no fences).
- **Do NOT declare or export any types, interfaces, enums, or generics.**
- Use the consumer's types. If needed, import: \`import type { Lesson } from "@/lib/types"\`.
- Component signature MUST be exactly:
  export default function LessonPage({ lesson }: { lesson: Lesson }): JSX.Element
  (If the import is unavailable in your environment, you may replace \`Lesson\` with \`any\`, but do not create new types.)
- No data fetching; assume \`lesson\` is passed as a prop.
- Use minimal JSX with Tailwind classes for styling.
- No external libraries beyond React/JSX. No dynamic imports.

What to render:
1) A header with the lesson outline text from the \`lesson.outline\` field.
2) The detailed lesson content from the \`lesson.details\` field.

IMPORTANT - Handling the details field:
- The \`lesson.details\` field can be either plain text or HTML.
- If it contains HTML, render it using dangerouslySetInnerHTML: <div dangerouslySetInnerHTML={{ __html: lesson.details }} />
- If it's plain text, render it normally in a <div> or <pre> tag with proper whitespace preservation.
- Check if the content includes HTML tags (like <p>, <h1>, <div>, etc.) to determine the rendering approach.
- Ensure images and markdown-like formatting render correctly if present.

Implementation details:
- Keep it simple; no state, effects, or suspense.
- No runtime logging.
- Export **only** the default component.
- Style the page to be student-friendly and readable with proper spacing and typography.
- Add a back button or link to return to the lessons list at /.
- Don't add anything else.

Respond with the complete .tsx file content (code only). Do not wrap in code fences.

Here is the lesson data:
${JSON.stringify(lesson, null, 2)}
`.trim();

  const typeScriptData = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: chapterDetailsPrompt }],
    temperature: 0,
  });

  const code = typeScriptData.choices[0].message?.content;

  return NextResponse.json({
    lesson: lesson,
    tsxSource: code,
  });
}
