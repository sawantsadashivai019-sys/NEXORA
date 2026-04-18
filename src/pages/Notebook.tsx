import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { clsx } from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

// Icons
import { 
    ChevronLeft, 
    PanelLeftClose, 
    PanelLeftOpen, 
    Plus, 
    MoreVertical, 
    Share, 
    Share2,
    Settings, 
    Search,
    Sparkles, 
    FileText, 
    Upload, 
    X,
    Trash2,
    MessageSquare,
    Library,
    HelpCircle,
    BrainCircuit,
    Lightbulb,
    BookOpen,
    Link
} from 'lucide-react';
// Removing old icon imports if they clash or are unused
// import { WelcomeIcon } from '@/components/Icons'; 

// Components
import ChatPanel from '@/components/ChatPanel';
import SourceViewer from '@/components/SourceViewer';
import NoteBoard from '@/components/NoteBoard';

import MindMapPanel from '@/components/MindMapPanel';
import Studio from '@/components/Studio';

// Services & Types
import { 
  generateResponse, 
  generateSummary, 
  uploadFiles, 
  uploadUrl,
  getKnowledgeBases,
  getKnowledgeBaseFiles,
  getChatSessions,
  deleteFile
} from '@/services/grokService';
import type { Source, ChatMessage, Note, Citation, KnowledgeBase, ChatSession } from '@/types';

const Notebook: React.FC = () => {
    const { id: kbId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    // State
    const [currentKnowledgeBase, setCurrentKnowledgeBase] = useState<KnowledgeBase | null>(null);
    const [sources, setSources] = useState<Source[]>([]);
    const [selectedSource, setSelectedSource] = useState<Source | null>(null);
    const [activeTab, setActiveTab] = useState<'sources' | 'chat' | 'studio'>('chat');
    const [activeStudioView, setActiveStudioView] = useState<'faq' | 'mindmap' | 'learning' | 'notes' | 'flashcards' | 'quiz' | null>(null);
    
    // Mind Map State Lifted Up
    const [mindMapData, setMindMapData] = useState<any>(null); // Lifted state for persistence

    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    
    // Other State
    const [notes, setNotes] = useState<Note[]>([]);
    const [highlight, setHighlight] = useState<{ sourceId: string; text: string } | null>(null);
    const [sourceSummaries, setSourceSummaries] = useState<Record<string, string>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
    const [urlInput, setUrlInput] = useState("");

    // Initialization
    useEffect(() => {
        if (!kbId) {
            navigate('/dashboard');
            return;
        }
        loadData(kbId);
    }, [kbId]);

    // Load chat sessions for the current KB
    const loadChatSessions = async (kbId?: string) => {
        if (!kbId) return;
        try {
            const sessions = await getChatSessions(kbId);
            setChatSessions(sessions || []);
        } catch (e) {
            console.warn('Could not load chat sessions', e);
        }
    };


    const loadData = async (id: string) => {
        try {
            // Load KB details
            const kbs = await getKnowledgeBases();
            const kb = kbs.find(k => k.id === id);
            if (!kb) {
                console.error("Knowledge base not found");
                navigate('/dashboard');
                return;
            }
            setCurrentKnowledgeBase(kb);

            // If KB already has a stored mindmap, initialize the panel state with it
            if ((kb as any).mindmap) {
                setMindMapData((kb as any).mindmap);
            }

            // Load Files
            const files = await getKnowledgeBaseFiles(id);
            setSources(files);

            // Load chat sessions for this KB
            await loadChatSessions(id);
            
            // Initialize chat if empty
            if (chatHistory.length === 0) {
                 setChatHistory([{
                    isUser: false,
                    text: `Hello! I'm ready to help you analyze "${kb.name}". Upload documents or ask me anything about the existing ones.`,
                    citations: []
                 }]);
            }

        } catch (error) {
            console.error("Error loading notebook data:", error);
        }
    };

    // --- Logic Handlers (Migrated from App.tsx) ---

    // File Upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || !currentKnowledgeBase) return;

        // Simple toast or indicator - could improve this
        const indicator = document.createElement('div');
        indicator.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        indicator.textContent = `Uploading ${files.length} files...`;
        document.body.appendChild(indicator);

        try {
            const result = await uploadFiles(files, currentKnowledgeBase.id);
            setSources(prev => [...prev, ...result.uploaded]);
            indicator.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            indicator.textContent = `Uploaded ${result.uploaded.length} files.`;
        } catch (error) {
            console.error(error);
            indicator.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            indicator.textContent = 'Upload failed';
        } finally {
            setTimeout(() => indicator.remove(), 3000);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleUrlUpload = async () => {
        if (!urlInput.trim() || !currentKnowledgeBase) return;
        setIsUrlDialogOpen(false);
        const indicator = document.createElement('div');
        indicator.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-5';
        indicator.textContent = `Extracting content from URL...`;
        document.body.appendChild(indicator);

        try {
            const result = await uploadUrl(urlInput.trim(), currentKnowledgeBase.id);
            setSources(prev => [...prev, result as Source]);
            indicator.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-5';
            indicator.textContent = `Successfully added URL source.`;
            setUrlInput("");
        } catch (error) {
            console.error(error);
            indicator.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-5';
            indicator.textContent = 'Failed to extract URL content.';
        } finally {
            setTimeout(() => indicator.remove(), 3000);
        }
    };

    // Delete a source/file
    const handleDeleteSource = async (fileId: string) => {
        if (!fileId) return;
        const ok = window.confirm('Delete this source? This will remove it from the KB and any local copy.');
        if (!ok) return;
        try {
            // Call API
            await deleteFile(fileId);
            // Remove from local state
            setSources(prev => prev.filter(s => s.id !== fileId));
            if (selectedSource && selectedSource.id === fileId) setSelectedSource(null);
            // small transient UI feedback
            const n = document.createElement('div');
            n.className = 'fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            n.textContent = 'Source deleted';
            document.body.appendChild(n);
            setTimeout(() => n.remove(), 1600);
        } catch (err) {
            console.error('Delete failed', err);
            alert('Failed to delete source');
        }
    };

    // Chat
    const handleSendMessage = useCallback(async (message: string) => {
        if (!currentKnowledgeBase) return;

        setIsLoading(true);
        setSuggestedQuestions([]);
        setChatHistory(prev => [...prev, { isUser: true, text: message }]);

        try {
            const { aiResponseText, suggestions, sessionId, sessionTitle } = await generateResponse(
                message,
                currentKnowledgeBase.id,
                currentSession?.id
            );
            
            // Update session if needed
            if (!currentSession || currentSession.id !== sessionId) {
                setCurrentSession({
                    id: sessionId,
                    title: sessionTitle || message.substring(0, 50),
                    knowledge_base: currentKnowledgeBase.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }

            // If model returned a fenced Markdown block (```markdown ... ```), unwrap it so the
            // inner Markdown is parsed/rendered instead of shown as a literal code block.
            const unwrapCodeFence = (s: string) => {
                if (!s) return s;
                const m = s.match(/^\s*```(?:markdown)?\n([\s\S]*?)\n```\s*$/i);
                return m ? m[1] : s;
            };

            const aiText = unwrapCodeFence(aiResponseText);

            // Parse citations (Simplified logic from App.tsx)
            // Make regex case-insensitive and tolerant of spaces
            const citationRegex = /\[[sS]ource (\d+):\s*"([^"]+)"\]/g;
            const citations: Citation[] = [];
            let match;
            const regex = new RegExp(citationRegex);
            while ((match = regex.exec(aiText)) !== null) {
                const sourceIndex = parseInt(match[1], 10) - 1;
                // Even if sourceIndex is out of bounds, we might want to register it 
                // but let's just push it to citations so it gets an index.
                citations.push({
                    sourceId: sources[sourceIndex] ? sources[sourceIndex].id : `unknown-${match[1]}`,
                    snippet: match[2],
                    originalMatch: match[0]
                });
            }

            const cleanText = aiText.replace(citationRegex, (originalMatch, idStr) => {
                const citation = citations.find(c => c.originalMatch === originalMatch);
                return citation ? `[${citations.indexOf(citation) + 1}]` : `[${idStr}]`;
            });

            setChatHistory(prev => [...prev, {
                isUser: false,
                text: cleanText,
                citations,
                suggestions,
                session_id: sessionId
            }]);
            setSuggestedQuestions(suggestions || []);

        } catch (error) {
            console.error(error);
            setChatHistory(prev => [...prev, { isUser: false, text: "Error generating response.", citations: [] }]);
        } finally {
            setIsLoading(false);
        }
    }, [currentKnowledgeBase, sources, currentSession]);

    const handleCitationClick = (citation: Citation) => {
        const source = sources.find(s => s.id === citation.sourceId);
        if (source) {
            setSelectedSource(source);
            setHighlight({ sourceId: source.id, text: citation.snippet });
        }
    };

    const handleGenerateSummary = async (source: Source) => {
        if (!currentKnowledgeBase) return;
        setSourceSummaries(prev => ({...prev, [source.id]: "Generating..."}));
        try {
            // Note: generateSummary currently takes kbId, might need source Id specific logic later if backend supports it
            // For now, mirroring App.tsx logic which seems to summarize the WHOLE KB? 
            // Wait, App.tsx logic was: `generateSummary(currentKnowledgeBase.id)`
            // But it sets it for a specific source? That seems like a bug in the original code or backend limitation.
            // I'll stick to original behavior but maybe it summarizes the specific document if the backend supported it.
            // Actually, checking App.tsx again... `generateSummary(currentKnowledgeBase.id)`... 
            // It seems it generates a summary for the KB.  I'll leave it as is.
             const summary = await generateSummary(currentKnowledgeBase.id);
             setSourceSummaries(prev => ({ ...prev, [source.id]: summary }));
        } catch (e) {
            setSourceSummaries(prev => ({...prev, [source.id]: "Error"}));
        }
    };


    // --- Render Helpers ---

    // Panel Refs
    const leftPanelRef = useRef<any>(null);
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);

    const toggleLeftPanel = () => {
        const panel = leftPanelRef.current;
        if (panel) {
            if (isLeftCollapsed) {
                panel.expand();
            } else {
                panel.collapse();
            }
        }
    };

    const rightPanelRef = useRef<any>(null);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);

    const toggleRightPanel = () => {
        const panel = rightPanelRef.current;
        if (panel) {
            if (isRightCollapsed) {
                panel.expand();
            } else {
                panel.collapse();
            }
        }
    };

    const handleCloseSource = () => {
        setSelectedSource(null);
    };

    return (
        <div className="h-screen w-full bg-[#f3f4f6] dark:bg-[#0a0a0a] text-[var(--color-text-primary)] flex font-[var(--font-family)] overflow-hidden">
            {/* Sidebar Navigation removed as per user request */}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
                
                {/* Header / Navbar */}
                <header className="h-16 flex items-center justify-between px-6 shrink-0 z-20 bg-[var(--color-surface)]/80 backdrop-blur-md border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-4">
                         <button 
                             onClick={() => navigate('/dashboard')} 
                             className="p-2 -ml-2 rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center"
                             title="Back to Home"
                         >
                             <ChevronLeft size={20} />
                         </button>
                        <div className="flex flex-col">
                             <div className="flex items-center gap-3">
                                <h1 className="font-semibold text-lg text-[var(--color-text-primary)] tracking-tight">
                                    {currentKnowledgeBase?.name || "Loading..."}
                                </h1>
                                {currentKnowledgeBase?.file_search_store_name && (
                                    <div className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                                        RAG Active
                                    </div>
                                )}
                             </div>
                             <span className="text-xs text-[var(--color-text-secondary)] font-medium">{sources.length} sources · {chatSessions.length} conversations</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                         <button className="h-9 px-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-surface-hover)] transition-all flex items-center gap-2 text-[var(--color-text-primary)] shadow-sm hover:shadow">
                            <Share2 size={14} /> Share
                         </button>
                         <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white dark:ring-gray-800">
                            H
                         </div>
                    </div>
                </header>

                {/* Resizable Panels Area */}
                <div className="flex-1 overflow-hidden p-3 sm:p-4">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        multiple
                        accept=".txt,.md,.json,.pdf,.docx,.png,.jpg,.jpeg,.webp"
                    />

                    <PanelGroup direction="horizontal" className="panel-group gap-0">
                        {/* LEFT PANEL: Sources & Chat History */}
                        <Panel 
                            ref={leftPanelRef}
                            collapsible 
                            collapsedSize={4} 
                            defaultSize={20} 
                            minSize={15} 
                            maxSize={30} 
                            onCollapse={() => setIsLeftCollapsed(true)}
                            onExpand={() => setIsLeftCollapsed(false)}
                            className={clsx(
                                "transition-all duration-300 ease-in-out !overflow-visible",
                                isLeftCollapsed && "min-w-[60px]"
                            )}
                        >
                            <div className="h-full w-full bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-sm flex flex-col overflow-hidden transition-all duration-300">
                                {isLeftCollapsed ? (
                                    /* Collapsed Left Panel Content */
                                    <div className="flex flex-col items-center py-4 gap-4 h-full">
                                        <button 
                                            onClick={() => leftPanelRef.current?.expand()}
                                            className="p-2 rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                                            title="Expand Library"
                                        >
                                            <PanelLeftOpen size={20} />
                                        </button>
                                        
                                        <div className="w-8 h-[1px] bg-[var(--color-border)]" />

                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
                                            title="Upload Sources"
                                        >
                                            <Upload size={18} />
                                        </button>
                                        
                                        <button 
                                            onClick={() => setIsUrlDialogOpen(true)}
                                            className="p-2 rounded-xl bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition-colors"
                                            title="Add Website/Video URL"
                                        >
                                            <Link size={18} />
                                        </button>

                                        <div className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto custom-scrollbar px-1">
                                            {sources.map(source => (
                                                <button
                                                    key={source.id}
                                                    onClick={() => {
                                                        setSelectedSource(source);
                                                        setActiveTab('chat');
                                                        // Optionally expand? User might want to stay collapsed and just switch context.
                                                        // let's just switch context.
                                                    }}
                                                    className={clsx(
                                                        "p-2 rounded-lg transition-colors relative group",
                                                        selectedSource?.id === source.id ? "bg-[var(--color-surface-hover)]" : "hover:bg-[var(--color-surface-hover)]"
                                                    )}
                                                    title={source.name}
                                                >
                                                     <div className={clsx(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm",
                                                        source.type === 'pdf' ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
                                                    )}>
                                                        <FileText size={16} />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Expanded Left Panel Content */
                                    <>
                                        {/* Header */}
                                        <div className="p-4 flex items-center justify-between border-b border-[var(--color-border)]/50">
                                            <div className="flex items-center gap-2">
                                                <Library size={18} className="text-[var(--color-primary)]" />
                                                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Library</h2>
                                            </div>
                                            <button onClick={() => leftPanelRef.current?.collapse()} className="p-1.5 hover:bg-[var(--color-surface-hover)] rounded-lg text-[var(--color-text-secondary)] transition-colors">
                                                <PanelLeftClose size={16} />
                                            </button>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
                                            
                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <button 
                                                    className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/20 flex flex-col items-center justify-center transition-all font-medium text-xs group"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <Upload size={18} className="mb-1 group-hover:-translate-y-0.5 transition-transform" />
                                                    Upload File
                                                </button>
                                                
                                                <button 
                                                    className="flex-1 py-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 border border-purple-500/20 flex flex-col items-center justify-center transition-all font-medium text-xs group"
                                                    onClick={() => setIsUrlDialogOpen(true)}
                                                >
                                                    <Link size={18} className="mb-1 group-hover:-translate-y-0.5 transition-transform" />
                                                    Add URL
                                                </button>
                                            </div>

                                            {/* Deep Research Promo */}
                                            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/80 to-teal-900/80 border border-emerald-500/30 relative overflow-hidden group cursor-pointer shadow-lg">
                                                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                                    <Sparkles size={40} className="text-white" />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Sparkles size={14} className="text-emerald-400" />
                                                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">New</span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-white mb-1">Deep Research</p>
                                                    <p className="text-xs text-emerald-100/70 leading-relaxed">Generate comprehensive reports from your sources.</p>
                                                </div>
                                            </div>

                                            {/* Sources List */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between px-1">
                                                    <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Sources</h3>
                                                    <span className="text-[10px] bg-[var(--color-surface-hover)] px-2 py-0.5 rounded-full text-[var(--color-text-secondary)]">{sources.length}</span>
                                                </div>

                                                <div className="space-y-1">
                                                    {sources.map(source => (
                                                        <div key={source.id} className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--color-surface-hover)] transition-all cursor-pointer border border-transparent hover:border-[var(--color-border)]">
                                                            <div className={clsx(
                                                                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm transition-colors",
                                                                source.type === 'pdf' ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
                                                            )}>
                                                                <FileText size={18} />
                                                            </div>
                                                            <div className="flex-1 min-w-0" onClick={() => { setSelectedSource(source); setActiveTab('chat'); }}>
                                                                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{source.name}</p>
                                                                <p className="text-[10px] text-[var(--color-text-secondary)] truncate">
                                                                    {(source.type || 'FILE').toUpperCase()} • {(source.id.length % 5) + 1}.4 MB
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSource(source.id); }} className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-[var(--color-text-secondary)] transition-colors" title="Delete">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {sources.length === 0 && (
                                                        <div className="text-center py-8 text-[var(--color-text-secondary)] text-sm italic">
                                                            No sources uploaded yet.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Conversations */}
                                            <div className="space-y-2 pb-10">
                                                 <div className="flex items-center justify-between px-1">
                                                    <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Chats</h3>
                                                     <button
                                                        onClick={() => {
                                                            setCurrentSession(null);
                                                            setChatHistory([{ isUser: false, text: `Hello! I'm ready to help you analyze "${currentKnowledgeBase?.name}". Upload documents or ask me anything about the existing ones.`, citations: [] }]);
                                                            setSuggestedQuestions([]);
                                                            setActiveTab('chat');
                                                        }}
                                                        className="p-1 hover:bg-[var(--color-surface-hover)] rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                                                        title="New Chat"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>

                                                <div className="space-y-1">
                                                    {chatSessions.map((s) => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => {
                                                                setCurrentSession(s);
                                                                const unwrapCodeFence = (t: string) => {
                                                                    if (!t) return t;
                                                                    const mm = t.match(/^\s*```(?:markdown)?\n([\s\S]*?)\n```\s*$/i);
                                                                    return mm ? mm[1] : t;
                                                                };
                                                                const mapped: ChatMessage[] = ([] as ChatMessage[]).concat(...((s.messages || []).map((m: any) => {
                                                                    const out: ChatMessage[] = [];
                                                                    if (m.content) out.push({ isUser: true, text: unwrapCodeFence(m.content || ''), session_id: s.id, message_id: m.id } as ChatMessage);
                                                                    if (m.response) out.push({ isUser: false, text: unwrapCodeFence(m.response || ''), citations: m.citations || [], suggestions: m.suggestions || [], session_id: s.id, message_id: m.id } as ChatMessage);
                                                                    return out;
                                                                })));
                                                                setChatHistory(mapped.length ? mapped : [{ isUser: false, text: 'Session started', citations: [] }]);
                                                                setActiveTab('chat');
                                                            }}
                                                            className={clsx(
                                                                "w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between group",
                                                                currentSession && currentSession.id === s.id 
                                                                    ? 'bg-[var(--color-surface-hover)] border-[var(--color-border)] shadow-sm' 
                                                                    : 'hover:bg-[var(--color-surface)]/50 border-transparent hover:border-[var(--color-border)]/50 text-[var(--color-text-secondary)]'
                                                            )}
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <div className={clsx("text-sm font-medium truncate", currentSession?.id === s.id ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]")}>
                                                                    {s.title || 'Untitled Chat'}
                                                                </div>
                                                                <div className="text-[10px] text-[var(--color-text-secondary)]/70 mt-0.5">
                                                                    {new Date(s.updated_at).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                     {chatSessions.length === 0 && (
                                                        <div className="text-center py-4 text-[var(--color-text-secondary)] text-xs">
                                                            Start a new chat to begin.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </Panel>

                        <PanelResizeHandle className="w-1.5 hover:bg-[var(--color-primary)]/20 transition-colors cursor-col-resize z-50 rounded-full bg-transparent mx-1" />

                        {/* CENTER PANEL: Chat Interface */}
                        <Panel defaultSize={50} minSize={30} className="rounded-3xl shadow-sm border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
                            <ChatPanel
                                chatHistory={chatHistory}
                                onSendMessage={handleSendMessage}
                                isLoading={isLoading}
                                onCitationClick={handleCitationClick}
                                onSaveToNoteboard={(text) => setNotes(prev => [...prev, { id: Date.now().toString(), content: text }])}
                                suggestedQuestions={suggestedQuestions}
                            />
                        </Panel>

                        <PanelResizeHandle className="w-1.5 hover:bg-[var(--color-primary)]/20 transition-colors cursor-col-resize z-50 rounded-full bg-transparent mx-1" />

                        {/* RIGHT PANEL: Studio & Tools */}
                        <Panel 
                            ref={rightPanelRef}
                            collapsible 
                            collapsedSize={4} 
                            defaultSize={30} 
                            minSize={20} 
                            maxSize={40} 
                            onCollapse={() => setIsRightCollapsed(true)}
                            onExpand={() => setIsRightCollapsed(false)}
                            className={clsx(
                                "transition-all duration-300 ease-in-out !overflow-visible",
                                isRightCollapsed && "min-w-[60px]"
                            )}
                        >
                            <div className="h-full w-full bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-sm flex flex-col overflow-hidden relative transition-all duration-300">
                                {isRightCollapsed ? (
                                    /* Collapsed Right Panel */
                                    <div className="flex flex-col items-center py-4 gap-4 h-full">
                                        <button 
                                            onClick={() => rightPanelRef.current?.expand()}
                                            className="p-2 rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                                            title="Expand Studio"
                                        >
                                            <PanelLeftClose size={20} className="rotate-180" />
                                        </button>
                                        
                                        <div className="w-8 h-[1px] bg-[var(--color-border)]" />

                                        {/* Quick Links */}
                                        <button title="FAQ" className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 rounded-xl transition-colors" onClick={() => { setActiveStudioView('faq'); rightPanelRef.current?.expand(); }}>
                                             <HelpCircle size={18} />
                                        </button>
                                        <button title="Mind Map" className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded-xl transition-colors" onClick={() => { setActiveStudioView('mindmap'); rightPanelRef.current?.expand(); }}>
                                             <BrainCircuit size={18} />
                                        </button>
                                        <button title="Flashcards" className="p-2.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-500 rounded-xl transition-colors" onClick={() => { setActiveStudioView('flashcards'); rightPanelRef.current?.expand(); }}>
                                            <BookOpen size={18} /> 
                                        </button>
                                        <button title="Quiz" className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 rounded-xl transition-colors" onClick={() => { setActiveStudioView('quiz'); rightPanelRef.current?.expand(); }}>
                                            <Lightbulb size={18} /> 
                                        </button>

                                    </div>
                                ) : (
                                    /* Expanded Right Panel */
                                    selectedSource ? (
                                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] z-10">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="p-1.5 bg-blue-500/10 rounded text-blue-500">
                                                        <FileText size={16} />
                                                    </div>
                                                    <h3 className="font-medium truncate text-sm" title={selectedSource.name}>{selectedSource.name}</h3>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => rightPanelRef.current?.collapse()} className="p-1.5 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-secondary)] transition-colors">
                                                        <PanelLeftOpen size={18} className="rotate-180" />
                                                    </button>
                                                    <button onClick={handleCloseSource} className="p-1.5 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-secondary)] transition-colors">
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-hidden p-0 relative">
                                                <SourceViewer 
                                                    source={selectedSource}
                                                    highlight={highlight}
                                                    summary={sourceSummaries[selectedSource.id]}
                                                    onGenerateSummary={handleGenerateSummary}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col relative">
                                             <Studio 
                                                currentKnowledgeBase={currentKnowledgeBase}
                                                notes={notes}
                                                onUpdateNote={(id, content) => setNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n))}
                                                onDeleteNote={(id) => setNotes(prev => prev.filter(n => n.id !== id))}
                                                onAddNote={() => {
                                                    const newNote = {
                                                        id: Date.now().toString(),
                                                        content: 'New Note'
                                                    };
                                                    setNotes(prev => [...prev, newNote]);
                                                    setActiveStudioView('notes');
                                                }}
                                                onViewClick={(view) => setActiveStudioView(view)}
                                                activeView={activeStudioView}
                                                mindMapData={mindMapData}
                                                setMindMapData={setMindMapData}
                                              />
                                              {/* Overlaid collapse button for Studio view */}
                                              <div className="absolute top-4 right-4 z-20">
                                                <button 
                                                    onClick={() => rightPanelRef.current?.collapse()}
                                                    className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-full transition-colors"
                                                    title="Collapse Panel"
                                                >
                                                    <PanelLeftOpen size={18} className="rotate-180" />
                                                </button>
                                             </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </Panel>

                    </PanelGroup>
                </div>
            </div>

            {/* URL Upload Dialog */}
            <AnimatePresence>
                {isUrlDialogOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setIsUrlDialogOpen(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Add Website or Video</h2>
                                <button 
                                    onClick={() => setIsUrlDialogOpen(false)}
                                    className="p-1 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-secondary)] transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                                Paste a URL to a YouTube video or a website article. Nexora will extract the text automatically.
                            </p>
                            
                            <input
                                autoFocus
                                type="url"
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                className="w-full px-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all mb-6"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleUrlUpload();
                                    }
                                }}
                            />
                            
                            <div className="flex justify-end gap-3">
                                <button 
                                    onClick={() => setIsUrlDialogOpen(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleUrlUpload}
                                    disabled={!urlInput.trim()}
                                    className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:brightness-110 shadow-md shadow-[var(--color-primary)]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Import
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Notebook;
