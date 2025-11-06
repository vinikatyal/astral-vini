"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/types";

function tempId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `temp_${Date.now()}`;
}

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateLesson(outline: string) {
    setError(null);
    const clean = outline.trim();
    if (!clean) {
      setError("Please enter a lesson outline.");
      return;
    }
    setLoading(true);

    const tempLessonId = tempId();
    const optimistic: Lesson = {
      id: tempLessonId,
      lessonId: tempLessonId,
      outline: clean,
      details: "",
      status: "generating",
      updated_at: new Date().toISOString(),
    };
    setLessons((prev) => [optimistic, ...prev]);

    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline: clean, tempLessonId: tempLessonId }),
      });
      if (!res.ok) throw new Error(await res.text());

      const lesson = await res.json();

      console.log("Generated lesson on front end:", lesson);

      setLessons((prev) =>
        prev.map((l) =>
          l.lessonId === tempLessonId
            ? {
                ...l,
                ...lesson,
                status: lesson.status ?? "generated",
                updated_at: new Date().toISOString(),
              }
            : l
        )
      );
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to create lesson.");

      setLessons((prev) =>
        prev.map((l) =>
          l.id === tempLessonId ? { ...l, status: "failed" } : l
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return { lessons, loading, error, generateLesson, setError, setLessons };
}
