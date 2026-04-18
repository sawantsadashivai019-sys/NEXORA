
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, Citation } from '../types';
import { SendIcon, CitationIcon, SaveIcon } from './Icons';
import { Plus, User, Copy, ThumbsUp, ThumbsDown, MoreHorizontal } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// Simple code block renderer to ensure fenced code and inline code display cleanly
const Code: React.FC<{ inline?: boolean; className?: string; children: React.ReactNode }> = ({ inline, className, children, ...props }) => {
  const isBlock = !inline;
  if (!isBlock) {
    return (
      <code className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-sm font-mono text-[var(--color-text-secondary)] border border-[var(--color-border)]" {...props}>
        {children}
      </code>
    );
  }
  return (
    <div className="relative group my-4">
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs text-white/70">
                <Copy size={14} />
            </button>
        </div>
        <pre className="bg-[#0f172a] text-sm rounded-xl overflow-x-auto p-4 border border-[var(--color-border)] shadow-sm">
            <code className={clsx(className, "font-mono text-gray-200")} {...props}>{children}</code>
        </pre>
    </div>
  );
};

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onCitationClick: (citation: Citation) => void;
  onSaveToNoteboard: (text: string) => void;
  suggestedQuestions?: string[];
  notebookTitle?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
    chatHistory, 
    onSendMessage, 
    isLoading, 
    onCitationClick, 
    onSaveToNoteboard,
    suggestedQuestions = []
}) => {
  const [input, setInput] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory, isLoading, suggestedQuestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[var(--color-background)] to-[var(--color-surface)] relative">
        <div ref={scrollContainerRef} className="flex-1 px-4 overflow-y-auto custom-scrollbar scroll-smooth pb-40 pt-6">
            <div className="w-full max-w-5xl mx-auto space-y-8">
                
                {/* Empty State / Suggestions */}
                {chatHistory.length === 0 && (
                     <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center justify-center mt-20 text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-violet-500 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20 p-1">
                            <img src="/nexora-logo.jpg" alt="Nexora Logo" className="w-full h-full rounded-xl object-cover" />
                        </div>
                        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-2">
                            How can I help you today?
                        </h2>
                        <p className="text-[var(--color-text-secondary)] max-w-md mb-10">
                            I can analyze your documents, answer questions, and generate study materials.
                        </p>

                        {suggestedQuestions.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                                {suggestedQuestions.map((q, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => onSendMessage(q)}
                                        className="text-left p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-blue-500/30 hover:bg-[var(--color-surface-hover)] hover:shadow-md transition-all group"
                                    >
                                        <p className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-blue-500 transition-colors">{q}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Message List */}
                <AnimatePresence initial={false}>
                    {chatHistory.map((msg, index) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            key={index}
                            className={clsx(
                                "flex gap-4",
                                msg.isUser ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            {/* Avatar */}
                            <div className="flex-shrink-0 mt-1">
                                {msg.isUser ? (
                                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center">
                                        <User size={16} className="text-[var(--color-text-primary)]" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 p-0.5">
                                        <img src="/nexora-logo.jpg" alt="Nexora" className="w-full h-full rounded-full object-cover" />
                                    </div>
                                )}
                            </div>

                            {/* Message Bubble */}
                            <div className={clsx(
                                "flex flex-col max-w-[85%] sm:max-w-[75%]",
                                msg.isUser ? "items-end" : "items-start"
                            )}>
                                <div className={clsx(
                                    "px-5 py-3.5 shadow-sm relative group text-[15px] leading-relaxed",
                                    msg.isUser 
                                        ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-2xl rounded-tr-sm border border-[var(--color-border)]" 
                                        : "bg-transparent text-[var(--color-text-primary)]"
                                )}>
                                    {!msg.isUser && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-violet-500">
                                                Nexora
                                            </span>
                                        </div>
                                    )}

                                    <div className="prose prose-invert prose-p:leading-relaxed prose-pre:my-0 max-w-none text-[var(--color-text-primary)]">
                                        <Markdown 
                                            remarkPlugins={[remarkGfm]} 
                                            components={{ 
                                                code: Code,
                                                table: ({node, ...props}) => (
                                                    <div className="overflow-x-auto my-4 rounded-lg border border-[var(--color-border)]">
                                                        <table className="min-w-full divide-y divide-[var(--color-border)]" {...props} />
                                                    </div>
                                                ),
                                                thead: ({node, ...props}) => (
                                                    <thead className="bg-[var(--color-surface-hover)]" {...props} />
                                                ),
                                                tbody: ({node, ...props}) => (
                                                    <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]" {...props} />
                                                ),
                                                tr: ({node, ...props}) => (
                                                    <tr className="transition-colors hover:bg-[var(--color-surface-hover)]/50" {...props} />
                                                ),
                                                th: ({node, ...props}) => (
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider" {...props} />
                                                ),
                                                td: ({node, ...props}) => (
                                                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)] whitespace-pre-wrap" {...props} />
                                                )
                                            }}
                                        >
                                            {msg.text}
                                        </Markdown>
                                    </div>

                                    {/* Citations */}
                                    {msg.citations && msg.citations.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-[var(--color-border)]/50">
                                            {msg.citations.map((citation, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => onCitationClick(citation)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] hover:border-blue-500/30 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-blue-500 transition-all"
                                                    title={citation.snippet}
                                                >
                                                    <CitationIcon className="w-3 h-3" />
                                                    Source {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Message Actions (Bot Only for now) */}
                                {!msg.isUser && (
                                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-2">
                                        <button 
                                            onClick={() => onSaveToNoteboard(msg.text)}
                                            className="p-1.5 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                                            title="Save to notes"
                                        >
                                            <SaveIcon className="w-4 h-4" />
                                        </button>
                                        <button className="p-1.5 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-green-500 transition-colors">
                                            <ThumbsUp size={14} />
                                        </button>
                                        <button className="p-1.5 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-red-500 transition-colors">
                                            <ThumbsDown size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Loading Indicator */}
                {isLoading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-4"
                    >
                         <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mt-1 p-0.5">
                            <img src="/nexora-logo.jpg" alt="Nexora" className="w-full h-full rounded-full object-cover" />
                        </div>
                        <div className="flex items-center gap-1.5 bg-transparent pt-2 pl-1">
                            <span className="w-2 h-2 bg-[var(--color-text-secondary)]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-[var(--color-text-secondary)]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-[var(--color-text-secondary)]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </motion.div>
                )}
            </div>
        </div>

        {/* Input Area - Floating Pill */}
        <div className="absolute bottom-6 left-0 right-0 px-4 flex flex-col items-center z-20 pointer-events-none">
            <div className="max-w-5xl w-full pointer-events-auto">
                <form 
                    onSubmit={handleSubmit} 
                    onClick={() => inputRef.current?.focus()}
                    className={clsx(
                        "relative flex items-center gap-2 p-2 pl-4 rounded-3xl transition-all duration-300",
                        "bg-[var(--color-surface)]/80 backdrop-blur-xl border border-[var(--color-border)]",
                        "shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)]",
                        "focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50"
                    )}
                >
                    <button
                        type="button"
                        className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] rounded-full transition-colors"
                        title="Add attachment"
                    >
                        <Plus size={20} />
                    </button>
                    
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything about your sources..."
                        disabled={isLoading}
                        className="flex-1 bg-transparent border-none outline-none text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] text-[15px] py-3 pr-2"
                    />

                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className={clsx(
                            "p-3 rounded-2xl transition-all duration-200 flex items-center justify-center",
                            input.trim() && !isLoading
                                ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg hover:shadow-blue-500/25 active:scale-95"
                                : "bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed"
                        )}
                    >
                        <SendIcon className={clsx("w-5 h-5 rotate-90", input.trim() && !isLoading && "-ml-0.5")} />
                    </button>
                </form>
                
                <p className="text-center text-[11px] text-[var(--color-text-secondary)] mt-3 font-medium select-none opacity-60">
                    Nexora can be inaccurate. Please double check important information.
                </p>
            </div>
        </div>
    </div>
  );
};

export default ChatPanel;
