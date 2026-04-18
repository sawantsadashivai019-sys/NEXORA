import React, { useState, useRef, useEffect } from 'react';
import type { Note } from '@/types';
import { Notebook as NoteIcon, Trash2 as TrashIcon, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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

interface NoteBoardProps {
  notes: Note[];
  onUpdateNote: (id: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  compact?: boolean;
}

const NoteItem: React.FC<{
  note: Note;
  onDeleteNote: (id: string) => void;
  onUpdateNote: (id: string, content: string) => void;
  compact?: boolean;
}> = ({ note, onDeleteNote, onUpdateNote, compact }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(note.content);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing) {
            textareaRef.current?.focus();
            textareaRef.current?.select();
        }
    }, [isEditing]);
    
    const handleSave = () => {
        if (content.trim() && content.trim() !== note.content) {
            onUpdateNote(note.id, content.trim());
        } else {
            setContent(note.content);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            setContent(note.content);
            setIsEditing(false);
        }
    };

    return (
        <div 
            className="bg-[var(--color-surface)] p-4 rounded-xl relative group border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-all shadow-sm"
            onDoubleClick={() => setIsEditing(true)}
        >
            {isEditing ? (
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-sm text-[var(--color-text-primary)] focus:outline-none resize-none font-mono"
                    rows={compact ? 3 : 6}
                />
            ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--color-text-primary)] text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: Code }}>{note.content}</ReactMarkdown>
                </div>
            )}
            
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button 
                onClick={() => onDeleteNote(note.id)}
                className="p-1.5 rounded-full hover:bg-[var(--color-danger)]/10 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors"
                title="Delete note"
                >
                    <TrashIcon size={14} />
                </button>
            </div>
        </div>
    );
};


const NoteBoard: React.FC<NoteBoardProps> = ({ notes, onUpdateNote, onDeleteNote, compact }) => {
  if (compact) {
      return (
        <div className="space-y-3 h-full overflow-y-auto custom-scrollbar pr-2">
            {notes.length === 0 ? (
                <div className="text-center text-[var(--color-text-secondary)] text-sm py-8 border border-dashed border-[var(--color-border)] rounded-xl">
                    No notes yet.
                </div>
            ) : (
                notes.map((note) => (
                    <NoteItem key={note.id} note={note} onDeleteNote={onDeleteNote} onUpdateNote={onUpdateNote} compact />
                ))
            )}
        </div>
      );
  }

  // Fallback for full view if used elsewhere
  return (
    <div className="flex-1 flex flex-col bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] min-h-[40vh]">
      <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
        <NoteIcon size={20} className="text-[var(--color-primary)]" />
        <h3 className="font-semibold text-[var(--color-text-primary)]">Noteboard</h3>
      </div>
      <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
        {notes.length === 0 ? (
          <div className="text-center text-[var(--color-text-secondary)] h-full flex items-center justify-center">
            <div>
                <p>Saved insights will appear here.</p>
                <p className="text-xs mt-1 opacity-70">Double-click a note to edit.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <NoteItem key={note.id} note={note} onDeleteNote={onDeleteNote} onUpdateNote={onUpdateNote} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteBoard;
