import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

function CodeBlock({ children }: { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const code = React.isValidElement<{ children?: string; className?: string }>(children) ? children.props : null;
  const text = String(code?.children || '');
  const language = code?.className?.replace('language-', '') || 'texte';
  return <div className="my-3 overflow-hidden rounded-xl border border-slate-700/70 bg-[#090b11]">
    <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5 text-[10px] text-slate-400">
      <span>{language}</span>
      <button type="button" className="flex items-center gap-1.5 hover:text-white" aria-label="Copier le bloc de code" onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setError(false); } catch { setError(true); }
      }}>{copied ? <Check size={12} /> : <Copy size={12} />}{error ? 'Copie indisponible' : copied ? 'Copié' : 'Copier'}</button>
    </div>
    <pre className="overflow-x-auto p-3 text-[11px] leading-6">{children}</pre>
  </div>;
}

/** HTML brut ignoré ; URL dangereuses filtrées par react-markdown ; pas d'images distantes automatiques. */
export function HermesMarkdown({ children }: { children: string }) {
  return <div className="hermes-markdown min-w-0 break-words">
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
      pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
      a: ({ href, children }) => <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{children}</a>,
      img: ({ alt }) => <span className="text-slate-400">[Image : {alt || 'non chargée automatiquement'}]</span>,
      table: ({ children }) => <div className="overflow-x-auto"><table>{children}</table></div>
    }}>{children}</ReactMarkdown>
  </div>;
}
