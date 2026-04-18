import React, { useEffect, useRef } from 'react';
import type { Source } from '@/types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Code: React.FC<{ inline?: boolean; className?: string; children: React.ReactNode }> = ({ inline, className, children, ...props }) => {
  if (!inline) {
    return (
      <pre className="bg-[#0b1220] text-sm rounded-md overflow-auto p-3"><code className={className} {...props}>{children}</code></pre>
    );
  }
  return <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 text-[var(--color-text-secondary)]">{children}</code>;
};
import { clsx } from 'clsx';

interface SourceViewerProps {
  source: Source | null;
  highlight: { sourceId: string; text: string } | null;
  summary?: string;
  onGenerateSummary: (source: Source) => void;
}

const SourceViewer: React.FC<SourceViewerProps> = ({ source, highlight, summary, onGenerateSummary }) => {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlight && source && highlight.sourceId === source.id && viewerRef.current) {
      const elementToScroll = viewerRef.current.querySelector('mark');
      if (elementToScroll) {
        elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlight, source]);

  const renderContent = () => {
    if (!source) return null;
    if (highlight && highlight.sourceId === source.id) {
       // Escape special characters in highlight text for regex
       const escapedText = highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       // 'gi' flags for global and case-insensitive search
      const parts = source.content.split(new RegExp(`(${escapedText})`, 'gi'));
      return parts.map((part, index) =>
        part.toLowerCase() === highlight.text.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 text-black px-1 rounded">
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      );
    }
    return source.content;
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-surface)] rounded-xl h-full overflow-hidden">
      {/* Header handled by parent now, but keeping inner padding if needed */}
      <div className="flex-1 overflow-y-auto p-6 whitespace-pre-wrap text-sm leading-7 text-[var(--color-text-primary)] custom-scrollbar font-mono md:font-sans" ref={viewerRef}>
        {summary && (
            <div className="mb-6 p-4 bg-[var(--color-background)] rounded-xl border border-[var(--color-border)]">
                <h4 className="font-medium mb-3 text-[var(--color-text-primary)]flex items-center gap-2">
                    <span className="text-xl">✨</span> Summary
                </h4>
                <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--color-text-secondary)]">
                    <Markdown remarkPlugins={[remarkGfm]} components={{ code: Code }}>{summary}</Markdown>
                </div>
            </div>
        )}
        
        {source && !summary && (
             <div className="flex justify-end mb-4">
                <button 
                    onClick={() => onGenerateSummary(source)}
                    className="text-xs px-3 py-1.5 bg-[var(--color-accent)] text-[var(--color-primary)] rounded-full hover:bg-[var(--color-surface-hover)] transition-colors border border-[var(--color-border)]"
                >
                    ✨ Generate Summary
                </button>
             </div>
        )}

        {source ? (
          <div className="text-[var(--color-text-primary)]">
            {renderContent()}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-secondary)] opacity-50">
             <div className="text-4xl mb-4">📄</div>
             <p>Select a source to view content</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SourceViewer;
