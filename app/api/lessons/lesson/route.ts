// /app/api/lessons/chapters/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 });
  }
  // Get Lesson Details from Supa base or any other DB here using id from query params
  return NextResponse.json({ message: "Lesson Chapters API is working!" });
}

export async function POST(req: Request) {
 const { lesson } = await req.json();
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
- Use minimal JSX with Tailwind classes.
- No external libraries beyond React/JSX. No dynamic imports.

What to render:
1) A header with the lesson outline which is a text which is present in the \`outline\` field of the lesson.
2) A paragraph on descripton of the lesson which is present in the \`description\` field of the lesson.
3) A detailed information of each lesson which is present in the \`details\` field of the lesson.

Implementation details:
- Keep it simple; no state, effects, or suspense.
- No runtime logging.
- Export **only** the default component.
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
    tsxSource: code,
  });
}
