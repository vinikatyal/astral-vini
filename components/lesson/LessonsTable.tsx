"use client";
import React from "react";
import { useRouter } from "next/navigation";
import type { Lesson } from "@/lib/types";
import { formatDate } from "@/lib/date";
import StatusBadge from "./StatusBadge";


export default function LessonsTable({ lessons }: { lessons: Lesson[] }) {
    const router = useRouter();
    return (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Lessons</h2>
                <span className="text-xs text-gray-500">{lessons.length} total</span>
            </div>
            {lessons.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">No lessons yet. Submit an outline to get started.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead>
                            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                                <th className="px-4 py-3">Title</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Updated</th>
                                <th className="px-4 py-3 text-right">Open</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {lessons.map((l) => (
                                <tr key={l.id} className="hover:bg-gray-50/60">
                                    <td className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/lessons/${l.id}`)}
                                            className="line-clamp-1 max-w-[28rem] text-left font-medium text-indigo-700 hover:underline"
                                            title={l.title}
                                        >
                                            {l.title}
                                        </button>
                                        <p className="mt-1 line-clamp-1 text-xs text-gray-500">{l.description}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={l.status} />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(l.updated_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/lessons/${l.id}`)}
                                            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Open
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}