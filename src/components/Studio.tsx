import React, { useState } from 'react';
import { 
    Headphones, 
    BrainCircuit, 
    Lightbulb, 
    BookOpen, 
    Video, 
    FileText, 
    MoreHorizontal,
    Table2,
    Presentation,
    HelpCircle,
    Plus,
    ArrowLeft,
    Layers,
    CheckSquare,
    Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Note, KnowledgeBase } from '../types';
import FAQPanel from './FAQPanel';
import MindMapPanel from './MindMapPanel';
import NoteBoard from './NoteBoard';
import FlashcardDeckView from './FlashcardDeckView';
import QuizView from './QuizView';
import { 
    generateFlashcards, 
    generateQuiz, 
    getFlashcardDecks, 
    getQuizzes,
    type FlashcardDeck, 
    type Quiz 
} from '@/services/grokService';

interface StudioProps {
  currentKnowledgeBase: KnowledgeBase | null;
  notes: Note[];
  onUpdateNote: (id: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  onAddNote: () => void;
  onViewClick: (view: 'faq' | 'mindmap' | 'learning' | 'notes' | 'flashcards' | 'quiz' | null) => void;
  activeView: 'faq' | 'mindmap' | 'learning' | 'notes' | 'flashcards' | 'quiz' | null;
  mindMapData: any;
  setMindMapData: (data: any) => void;
}

const StudioToolToken: React.FC<{
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  colorClass?: string;
  comingSoon?: boolean;
}> = ({ icon, title, onClick, colorClass = "text-[var(--color-primary)]", comingSoon }) => (
  <button
    onClick={comingSoon ? undefined : onClick}
    className={clsx(
        "flex flex-col items-start p-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all group w-full text-left h-36 justify-between relative overflow-hidden",
        comingSoon ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)]/30 hover:shadow-md cursor-pointer"
    )}
  >
    <div className={clsx("p-3 rounded-full bg-[var(--color-background)] group-hover:scale-105 transition-transform", colorClass)}>
      {icon}
    </div>
    <div className="w-full flex justify-between items-end">
        <h4 className="font-medium text-sm text-[var(--color-text-primary)] leading-tight max-w-[80%]">{title}</h4>
        {comingSoon && <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-secondary)] bg-[var(--color-background)] px-1.5 py-0.5 rounded">Soon</span>}
    </div>
  </button>
);

const NoteCard: React.FC<{ note: Note }> = ({ note }) => (
    <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-text-secondary)] group cursor-pointer transition-all">
        <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-[var(--color-text-secondary)] font-medium">Note</span>
            <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-background)] rounded text-[var(--color-text-secondary)]">
                <MoreHorizontal size={14} />
            </button>
        </div>
        <p className="text-sm text-[var(--color-text-primary)] line-clamp-3 leading-relaxed">
            {note.content}
        </p>
    </div>
);

const Studio: React.FC<StudioProps> = ({ 
    currentKnowledgeBase, 
    notes, 
    onUpdateNote, 
    onDeleteNote, 
    onAddNote,
    onViewClick, 
    activeView,
    mindMapData,
    setMindMapData
}) => {
    const [flashcardDeck, setFlashcardDeck] = useState<FlashcardDeck | null>(null);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [isFlashcardLoading, setIsFlashcardLoading] = useState(false);
    const [isQuizLoading, setIsQuizLoading] = useState(false);

    const handleOpenFlashcards = async () => {
        if (!currentKnowledgeBase) return;
        setIsFlashcardLoading(true);
        try {
            const decks = await getFlashcardDecks(currentKnowledgeBase.id);
            if (decks.length > 0) {
                setFlashcardDeck(decks[0]);
                onViewClick('flashcards');
            } else {
                const newDeck = await generateFlashcards(currentKnowledgeBase.id);
                setFlashcardDeck(newDeck);
                onViewClick('flashcards');
            }
        } catch (e) {
            console.error(e);
            alert("Failed to load flashcards");
        } finally {
            setIsFlashcardLoading(false);
        }
    };

    const handleOpenQuiz = async () => {
        if (!currentKnowledgeBase) return;
        setIsQuizLoading(true);
        try {
            const quizzes = await getQuizzes(currentKnowledgeBase.id);
            if (quizzes.length > 0) {
                setQuiz(quizzes[0]);
                onViewClick('quiz');
            } else {
                const newQuiz = await generateQuiz(currentKnowledgeBase.id);
                setQuiz(newQuiz);
                onViewClick('quiz');
            }
        } catch (e) {
            console.error(e);
            alert("Failed to load quiz");
        } finally {
            setIsQuizLoading(false);
        }
    };
  
  if (activeView) {
      if (activeView === 'faq') {
        return (
            <div className="h-full flex flex-col bg-[var(--color-surface)]">
                <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
                    <button onClick={() => onViewClick(null as any)} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-primary)]">
                        <ArrowLeft size={20} />
                    </button>
                    <span className="font-medium text-[var(--color-text-primary)]">Back to Studio</span>
                </div>
                <div className="flex-1 overflow-hidden">
                    <FAQPanel currentKnowledgeBase={currentKnowledgeBase} />
                </div>
            </div>
        );
      }
      
      if (activeView === 'mindmap') {
        return (
            <div className="h-full flex flex-col bg-[var(--color-surface)]">
                 <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
                    <button onClick={() => onViewClick(null as any)} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-primary)]">
                        <ArrowLeft size={20} />
                    </button>
                    <span className="font-medium text-[var(--color-text-primary)]">Back to Studio</span>
                </div>
                <div className="flex-1 overflow-hidden">
                    <MindMapPanel 
                        currentKnowledgeBase={currentKnowledgeBase}
                        onNodeClick={(id, text) => console.log(id, text)}
                        existingData={mindMapData}
                        onDataChange={setMindMapData}
                    />
                </div>
            </div>
        );
      }

      if (activeView === 'learning') {
          return (
              <div className="h-full flex flex-col bg-[var(--color-surface)]">
                   <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
                       <button onClick={() => onViewClick(null as any)} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-primary)]">
                           <ArrowLeft size={20} />
                       </button>
                       <span className="font-medium text-[var(--color-text-primary)]">Briefing Doc</span>
                   </div>
                   <div className="flex-1 p-8 text-center text-[var(--color-text-secondary)]">
                       Content generation view...
                   </div>
              </div>
          );
      }

      if (activeView === 'notes') {
          return (
              <div className="h-full flex flex-col bg-[var(--color-surface)]">
                  <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
                      <button onClick={() => onViewClick(null as any)} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-primary)]">
                          <ArrowLeft size={20} />
                      </button>
                      <span className="font-medium text-[var(--color-text-primary)]">Notes</span>
                  </div>
                  <div className="flex-1 p-4">
                      <NoteBoard notes={notes} onUpdateNote={onUpdateNote} onDeleteNote={onDeleteNote} />
                  </div>
              </div>
          );
      }

      if (activeView === 'flashcards' && flashcardDeck) {
          return <FlashcardDeckView deck={flashcardDeck} onClose={() => onViewClick(null as any)} />;
      }
      
      if (activeView === 'quiz' && quiz) {
          return <QuizView quiz={quiz} onClose={() => onViewClick(null as any)} />;
      }
  }

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)] relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <h3 className="text-xl font-medium text-[var(--color-text-primary)] mb-6">Studio</h3>
            
            {/* 1. FAQ Section */}
            <div className="mb-6">
                 <div className="p-5 rounded-[28px] bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/20 flex items-center justify-between group cursor-pointer hover:border-emerald-500/40 transition-all shadow-sm" onClick={() => onViewClick('faq')}>
                     <div className="flex items-center gap-5">
                         <div className="p-3.5 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                             <HelpCircle size={24} />
                         </div>
                         <div>
                             <h4 className="font-medium text-white text-lg">FAQ Generator</h4>
                             <p className="text-sm text-emerald-200/80">Automatically extract Q&A from your sources.</p>
                         </div>
                     </div>
                     <div className="px-5 py-2 rounded-full border border-emerald-400/30 text-emerald-100 text-sm font-medium group-hover:bg-emerald-500/20 transition-all">
                         Generate
                     </div>
                 </div>
            </div>

            {/* 2. Tools Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
                 <StudioToolToken 
                    icon={<BrainCircuit size={24} />} 
                    title="Mind Map" 
                    onClick={() => onViewClick('mindmap')} 
                    colorClass="text-blue-400"
                />
                 <StudioToolToken 
                    icon={isFlashcardLoading ? <Loader2 size={24} className="animate-spin" /> : <Layers size={24} />} 
                    title="Flashcards" 
                    onClick={handleOpenFlashcards} 
                    colorClass="text-purple-400"
                />
                 <StudioToolToken 
                    icon={isQuizLoading ? <Loader2 size={24} className="animate-spin" /> : <CheckSquare size={24} />} 
                    title="Quiz" 
                    onClick={handleOpenQuiz} 
                    colorClass="text-green-400"
                />
                {/* <StudioToolToken 
                    icon={<FileText size={24} />} 
                    title="Briefing Doc" 
                    onClick={() => onViewClick('learning')} 
                    colorClass="text-amber-400"
                />
                 <StudioToolToken 
                    icon={<HelpCircle size={24} />} 
                    title="FAQ" 
                    onClick={() => {}} 
                    colorClass="text-emerald-400"
                    comingSoon
                />
                 <StudioToolToken 
                    icon={<Presentation size={24} />} 
                    title="Slide Deck" 
                    onClick={() => {}} 
                    colorClass="text-orange-400"
                    comingSoon
                />
                <StudioToolToken 
                    icon={<Table2 size={24} />} 
                    title="Data Table" 
                    onClick={() => {}} 
                    colorClass="text-pink-400"
                    comingSoon
                /> */}
            </div>

            {/* 3. Saved Notes */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Saved notes ({notes.length})</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                    {notes.length === 0 ? (
                        <div className="text-center py-10 text-[var(--color-text-secondary)] bg-[var(--color-surface-hover)]/30 rounded-3xl border border-dashed border-[var(--color-border)]">
                            <p className="text-sm">No notes created yet.</p>
                        </div>
                    ) : (
                        notes.map(note => <NoteCard key={note.id} note={note} />)
                    )}
                </div>
            </div>
        </div>

        {/* 4. Floating Add Note Button */}
        <div className="absolute bottom-8 right-8 z-10">
            <button 
                onClick={onAddNote}
                className="flex items-center gap-2 px-6 py-4 bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-full shadow-xl border border-[var(--color-border)] transition-all transform hover:scale-105 active:scale-95"
            >
                <Plus size={24} />
                <span className="font-medium text-base">Add note</span>
            </button>
        </div>
    </div>
  );
};

export default Studio;
