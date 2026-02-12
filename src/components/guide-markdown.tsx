"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import type { Components } from "react-markdown";

interface GuideMarkdownProps {
  content: string;
}

/**
 * Derive a guide slug from a markdown filename reference.
 * `01-getting-started.md` → `getting-started`
 */
function mdFilenameToSlug(href: string): string {
  return href.replace(/^\d+-/, "").replace(/\.md$/, "");
}

const components: Components = {
  // Rewrite guide image paths: assets/foo.png → /api/guide/assets/foo.png
  // Returns a styled <img> without block wrapper — the p override handles layout
  img: ({ src, alt }) => {
    const srcStr = typeof src === "string" ? src : undefined;
    const resolvedSrc =
      srcStr && srcStr.startsWith("assets/")
        ? `/api/guide/assets/${srcStr.slice("assets/".length)}`
        : srcStr;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={alt || ""}
        className="rounded-lg border shadow-sm w-full my-6"
        loading="lazy"
      />
    );
  },

  // Unwrap paragraphs that contain an image to avoid block-in-inline hydration errors.
  // Markdown parser wraps `![](...)` in <p>, but images are block-level in our styling.
  p: ({ children, node }) => {
    // Use the AST node to check if any child is an img element
    const containsImg = node?.children?.some(
      (c) => c.type === "element" && c.tagName === "img",
    );
    if (containsImg) {
      return <div>{children}</div>;
    }
    return <p>{children}</p>;
  },

  // Rewrite internal .md links to Next.js routes, external links open in new tab
  a: ({ href, children }) => {
    if (!href) return <span>{children}</span>;

    // Internal guide link: NN-slug.md → /dashboard/guide/slug
    if (href.endsWith(".md") && !href.startsWith("http")) {
      const slug = mdFilenameToSlug(href);
      return (
        <Link
          href={`/dashboard/guide/${slug}`}
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {children}
        </Link>
      );
    }

    // External link
    if (href.startsWith("http")) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {children}
        </a>
      );
    }

    // Fallback
    return (
      <a href={href} className="text-primary underline underline-offset-2">
        {children}
      </a>
    );
  },
};

export function GuideMarkdown({ content }: GuideMarkdownProps) {
  return (
    <div className="prose dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&_table]:text-sm [&_th]:px-3 [&_td]:px-3 [&_th]:py-2 [&_td]:py-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
