"use client";
import React from "react";
import type { LessonStatus } from "@/lib/types";


export default function StatusBadge({ status }: { status: LessonStatus }) {
    const base = "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium";
    const cls =
        status === "generated"
            ? "bg-green-100 text-green-700 ring-1 ring-green-200"
            : status === "generating"
                ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200 animate-pulse"
                : "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
    const dot =
        status === "generated" ? "bg-green-500" : status === "generating" ? "bg-amber-500" : "bg-rose-500";
    return (
        <span className={`${base} ${cls}`}>
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}