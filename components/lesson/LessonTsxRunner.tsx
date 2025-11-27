"use client";

import React, { useEffect, useState } from "react";

type AnyComp = React.ComponentType<any>;

export default function TsxRunner({
  transpiled,
  error: initialError,
}: {
  transpiled: string;
  error?: string | null;
}) {
  const [Comp, setComp] = useState<AnyComp | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    if (!transpiled || initialError) return;

    try {
      const exports: any = {};
      const module = { exports };

      const requireShim = (id: string) => {
        if (id === "react") return React;
        if (id === "react/jsx-runtime" || id === "react/jsx-dev-runtime") {
          return {
            jsx: React.createElement,
            jsxs: React.createElement,
            Fragment: React.Fragment,
          };
        }
        if (id === "next" || id.startsWith("next/")) {
          return {};
        }
        throw new Error(`Cannot require '${id}' in this sandbox`);
      };

      const fn = new Function(
        "React",
        "exports",
        "module",
        "require",
        `${transpiled}; return module.exports?.default ?? exports.default;`
      );

      const DefaultExport = fn(React, exports, module, requireShim);
      if (!DefaultExport) throw new Error("Module has no default export");
      setComp(() => DefaultExport as AnyComp);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setComp(null);
    }
  }, [transpiled, initialError]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold mb-2">Failed to render lesson</h1>
        <pre className="rounded bg-red-50 p-3 text-red-700 text-sm whitespace-pre-wrap">
          {error}
        </pre>
      </main>
    );
  }

  if (!Comp) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-gray-600">Loading Lesson Plan....</p>
      </main>
    );
  }

  return <Comp />;
}