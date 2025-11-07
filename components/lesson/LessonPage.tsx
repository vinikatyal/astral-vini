"use client";
import React from "react";
import LessonForm from "@/components/lesson/LessonForm";
import LessonsTable from "@/components/lesson/LessonsTable";
import { useLessons } from "@/hooks/useLessons";


export default function LessonsPage() {
    const { lessons, loading, error, generateLesson } = useLessons();

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Lesson Generator</h1>
            </header>
            <LessonForm onGenerate={generateLesson} loading={loading} error={error} />
            <LessonsTable lessons={lessons} />
        </div>
    );
}