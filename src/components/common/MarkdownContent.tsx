import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export default function MarkdownContent({ content }: Props) {
  return (
    <div className="space-y-4 text-gray-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-2 text-4xl font-bold leading-tight text-[var(--cms-primary)]">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-8 border-l-4 border-[var(--cms-primary)] pl-3 text-2xl font-semibold text-gray-900">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 text-xl font-semibold text-gray-900">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="leading-8 text-gray-700">{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium underline underline-offset-4"
              style={{ color: "var(--cms-accent)" }}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-2 pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-2 pl-6">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-6 rounded-r-lg border-l-4 border-[var(--cms-primary)] bg-gray-50 px-4 py-3 italic text-gray-700">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-gray-200" />,
          code: ({ children }) => (
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-gray-800">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">{children}</pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
