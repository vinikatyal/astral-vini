"use client";
import { useState, useEffect, useCallback } from "react";
import type { Lesson } from "@/lib/types";

function tempId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `temp_${Date.now()}`;
}


interface UseLessonsReturn {
  lessons: Lesson[];
  loading: boolean;
  initialLoading: boolean; // New state
  error: string | null;
  generateLesson: (outline: string) => Promise<void>;
  fetchLessons: () => Promise<void>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>;
}

export function useLessons(): UseLessonsReturn {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLessons = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/lessons", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to fetch lessons");
      }

      const data: Lesson[] = await res.json();
      setLessons(data);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to fetch lessons.";
      console.error("Error fetching lessons:", e);
      setError(errorMessage);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const generateLesson = useCallback(async (outline: string): Promise<void> => {
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
        body: JSON.stringify({ outline: clean, tempLessonId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create lesson");
      }

      const lesson: Lesson = await res.json();

      // const res1 = await fetch(`/api/lessons/${lesson.lessonId}`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ lesson }),
      // });

      // if (!res1.ok) {
      //   const errorText = await res1.text();
      //   throw new Error(errorText || "Failed to generate lesson details");
      // }

      // const lessonDetailedCode = await res1.json();

      setLessons((prev) =>
        prev.map((l) =>
          l.lessonId === tempLessonId
            ? {
                ...l,
                ...lesson,
                status: lesson.status ?? "generated",
                updated_at: new Date().toISOString(),
                tsxSource: lesson.code,
              }
            : l
        )
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to create lesson.";
      console.error("Error generating lesson:", e);
      setError(errorMessage);

      setLessons((prev) =>
        prev.map((l) =>
          l.id === tempLessonId ? { ...l, status: "failed" as const } : l
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  return { 
    lessons, 
    loading, 
    initialLoading,
    error, 
    generateLesson, 
    fetchLessons, 
    setError, 
    setLessons 
  };
}