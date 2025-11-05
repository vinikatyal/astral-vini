"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/types";

// Example type (update in your /lib/types)

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateLesson(outline: string) {
    setError(null);
    if (!outline.trim()) {
      setError("Please enter a lesson outline.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create lesson: ${res.statusText}`);
      }

  
      const result = await res.json();
      console.log("Generated Lessons:", result);

      // Optimistically mark them as "generated"
      const generatedLessons: Lesson[] = result.data.map((item: Lesson) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        outline: result.outline,
        status: "generated",
        updated_at: new Date().toISOString(),
      }));

      setLessons((prev) => [...generatedLessons, ...prev]);
    } catch (err: { message?: string } | any  ) {
      console.error("Error generating lessons:", err);
      setError(err.message || "Something went wrong while generating lessons.");
    } finally {
      setLoading(false);
    }
  }

  return { lessons, loading, error, generateLesson, setError };
}
