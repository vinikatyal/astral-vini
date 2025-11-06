"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as ts from "typescript";

type AnyComp = React.ComponentType<any>;

export default function TsxRunner({
  source,
}: {
  source: string;                       // TSX source string
}) {
  const [Comp, setComp] = useState<AnyComp | null>(null);
  const [error, setError] = useState<string | null>(null);

  

   const transpiled = useMemo(() => {
    setError(null);
    try {
      const out = ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,     // emits require(...)
          jsx: ts.JsxEmit.React,              // classic runtime
          importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
          preserveValueImports: false,
          skipLibCheck: true,
        },
        reportDiagnostics: false,
      });
      return out.outputText;
    } catch (e: any) {
      setError(e?.message ?? String(e));
      return "";
    }
  }, [source]);

  useEffect(() => {
    if (!transpiled) return;
    try {
      const exports: any = {};
      const module = { exports };

      // Provide a tiny CommonJS shim so require("react") works
      const requireShim = (id: string) => {
        if (
          id === "react" ||
          id === "react/jsx-runtime" ||
          id === "react/jsx-dev-runtime"
        ) return React;
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
  }, [transpiled]);


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
        <p className="text-gray-600">Loading TypeScript…</p>
      </main>
    );
  }

  // Render with user props (e.g., { lesson })
  return <Comp />;
}
