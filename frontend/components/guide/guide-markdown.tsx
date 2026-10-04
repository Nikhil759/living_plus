import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Raw HTML is never rendered (react-markdown's default), so uploaded notices can't inject markup.
const components: Components = {
  p: ({ children }) => <p className="text-body text-ink">{children}</p>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5 text-body text-ink">{children}</ul>,
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5 text-body text-ink">{children}</ol>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-callout">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-hairline px-3 py-2 text-left font-semibold text-ink">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-hairline px-3 py-2 align-top text-ink-secondary">{children}</td>
  ),
};

export function GuideMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
