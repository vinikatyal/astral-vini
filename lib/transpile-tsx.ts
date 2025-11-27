// lib/transpile-tsx.ts (server-side only)
import * as ts from "typescript";

export function transpileTsx(source: string): {
  code: string;
  error: string | null;
} {
  try {
    const out = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        jsxImportSource: "react",
        importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
        preserveValueImports: false,
        skipLibCheck: true,
      },
      reportDiagnostics: false,
    });
    return { code: out.outputText, error: null };
  } catch (e: any) {
    return { code: "", error: e?.message ?? String(e) };
  }
}
