"use client";

import ReactMarkdown from "react-markdown";

/** Fields rendered as markdown when their value is a string longer than 40 chars */
const MARKDOWN_FIELDS = new Set(["text", "message"]);

function isMarkdownCandidate(key: string, value: unknown): value is string {
  return MARKDOWN_FIELDS.has(key) && typeof value === "string" && value.length > 40;
}

export function StepOutputRenderer({
  output,
  variant,
}: {
  output: Record<string, unknown>;
  variant: "inline" | "block";
}) {
  const markdownEntries: [string, string][] = [];
  const structuredEntries: [string, unknown][] = [];

  for (const [k, v] of Object.entries(output)) {
    if (v === undefined || v === null || v === 0) continue;
    if (isMarkdownCandidate(k, v)) {
      markdownEntries.push([k, v]);
    } else {
      structuredEntries.push([k, v]);
    }
  }

  if (markdownEntries.length === 0 && structuredEntries.length === 0) return null;

  return (
    <>
      {markdownEntries.map(([key, value]) => (
        <div key={key} className="prose prose-sm dark:prose-invert max-w-none text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_h1]:my-1.5 [&_h2]:my-1 [&_h3]:my-1 [&_li]:my-0 [&_pre]:my-1 [&_pre]:text-[10px] [&_code]:text-[10px]">
          <ReactMarkdown
            components={{
              a: ({ children, href, ...props }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                  {children}
                </a>
              ),
            }}
          >
            {value}
          </ReactMarkdown>
        </div>
      ))}
      {structuredEntries.length > 0 && (
        variant === "inline" ? (
          <p className="text-xs text-muted-foreground">
            {structuredEntries.map(([k, v]) => `${k}: ${v}`).join(", ")}
          </p>
        ) : (
          <pre className="text-[10px] font-mono bg-muted rounded p-2 overflow-x-auto max-h-[120px]">
            {JSON.stringify(Object.fromEntries(structuredEntries), null, 2)}
          </pre>
        )
      )}
    </>
  );
}
