"use client";
import React, { useState } from "react";


export default function LessonForm({
  onGenerate,
  loading,
  error,
}: {
  onGenerate: (outline: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [outline, setOutline] = useState("");


  function submit(e: React.FormEvent) {
    e.preventDefault();
    onGenerate(outline);
    if (!loading) setOutline("");
  }


  return (
    <form onSubmit={submit} className="mb-8">
      <label htmlFor="outline" className="mb-2 block text-sm font-medium">
        Lesson Outline
      </label>
      <textarea
        id="outline"
        value={outline}
        onChange={(e) => setOutline(e.target.value)}
        placeholder="e.g. Solar System basics for Grade 3: planets, orbits, fun facts"
        className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm outline-none focus:ring-4 focus:ring-indigo-100"
        rows={6}
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate"}
        </button>
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>
    </form>
  );
}