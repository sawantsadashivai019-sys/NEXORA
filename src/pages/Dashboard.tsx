import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKnowledgeBases, createKnowledgeBase, getChatSessions } from '@/services/grokService';
import type { KnowledgeBase, ChatSession } from '@/types';
import { motion } from 'framer-motion';
import { Plus, Search, Book, Clock, MoreVertical, FileText, Sparkles, MessageSquare, Zap, BarChart3, Layers } from 'lucide-react';
import { clsx } from 'clsx';

const Dashboard: React.FC = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  
  // Onboarding Modal States
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    loadData();
    const storedUser = localStorage.getItem('user');
    let u = null;
    if (storedUser) {
        try { u = JSON.parse(storedUser); setUser(u); } catch (e) {}
    }
    
    // Check if user has explicitly saved their preferred name yet
    const hasOnboarded = localStorage.getItem('user_has_onboarded');
    if (!hasOnboarded) {
        if (u?.name) setTempName(u.name);
        setShowNameModal(true);
    }
  }, []);

  const handleSaveName = () => {
    if (!tempName.trim()) return;
    const updatedUser = { ...user, name: tempName.trim() };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('user_has_onboarded', 'true');
    setShowNameModal(false);
  };

  const loadData = async () => {
    try {
      const [kbs, sessions] = await Promise.all([
        getKnowledgeBases(),
        getChatSessions()
      ]);
      const myNotebookIds = JSON.parse(localStorage.getItem('my_notebooks') || '[]');
      const myKbs = kbs.filter(kb => myNotebookIds.includes(kb.id));
      
      setKnowledgeBases(myKbs);
      setChatSessions(sessions);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    }
  };

  const handleCreateNew = async () => {
    const name = prompt("Enter a name for your new Notebook:");
    if (!name) return;

    setIsCreating(true);
    try {
      const newKb = await createKnowledgeBase(name, "Created via Dashboard");
      
      const myNotebookIds = JSON.parse(localStorage.getItem('my_notebooks') || '[]');
      myNotebookIds.push(newKb.id);
      localStorage.setItem('my_notebooks', JSON.stringify(myNotebookIds));
      
      setKnowledgeBases([...knowledgeBases, newKb]);
      navigate(`/notebook/${newKb.id}`);
    } catch (error) {
      console.error('Failed to create knowledge base', error);
      alert('Failed to create notebook');
    } finally {
      setIsCreating(false);
    }
  };

  const baseKbs = knowledgeBases.filter(kb => kb.name !== 'SMA');
  
  const filteredKbs = baseKbs.filter(kb =>
    kb.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const baseKbIds = new Set(baseKbs.map(kb => kb.id));
  const validChatSessions = chatSessions.filter(session => session.knowledge_base && baseKbIds.has(session.knowledge_base));

  // Calculate Stats
  const totalNotebooks = baseKbs.length;
  const totalSources = baseKbs.reduce((acc, kb) => acc + (kb.file_count || 0), 0);
  const totalMessages = validChatSessions.reduce((acc, session) => acc + (session.message_count || 0), 0);
  const avgDepth = validChatSessions.length > 0 ? Math.round(totalMessages / validChatSessions.length) : 0;

  const stats = [
    { label: 'Total Notebooks', value: totalNotebooks, icon: Book, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Sources Processed', value: totalSources, icon: Layers, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'AI Interactions', value: totalMessages, icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Avg. Discussion Depth', value: `${avgDepth} msgs`, icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#0a0a0a] text-[var(--color-text-primary)] font-[var(--font-family)]">

      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-4 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20">
              <img src="/nexora-logo.jpg" alt="Nexora Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-[var(--color-text-primary)] to-[var(--color-text-secondary)] bg-clip-text text-transparent">
              Nexora
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
              <input
                type="text"
                placeholder="Search notebooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none text-sm w-64 transition-all"
              />
            </div>
            <button onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white dark:ring-gray-800 hover:scale-105 transition-transform">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">

        {/* Welcome & Stats Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Welcome back, {user?.given_name || user?.name?.split(' ')[0] || 'Sadashiv'}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-4 hover:border-[var(--color-border-hover)] transition-colors"
              >
                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{stat.label}</p>
                  <p className="text-xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

          {/* Create New Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleCreateNew}
            className="group relative flex flex-col items-center justify-center min-h-[280px] rounded-3xl border-2 border-dashed border-[var(--color-border)] hover:border-indigo-500/50 bg-[var(--color-surface)]/30 hover:bg-[var(--color-surface)] transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] group-hover:border-indigo-500/30 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Plus size={32} className="text-[var(--color-text-secondary)] group-hover:text-indigo-500 transition-colors" />
            </div>
            <h3 className="font-semibold text-lg text-[var(--color-text-primary)]">New Notebook</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Create a new knowledge base</p>
          </motion.div>

          {/* Notebook Cards */}
          {filteredKbs.map((kb, index) => (
            <motion.div
              key={kb.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => navigate(`/notebook/${kb.id}`)}
              className="group relative flex flex-col justify-between min-h-[280px] p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500/30 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-secondary)] transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>

              <div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 text-blue-500 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                  <Book size={24} />
                </div>

                <div className="mb-2">
                  {kb.file_search_store_name && (
                    <span className="inline-block px-2 py-0.5 mb-2 text-[10px] font-bold tracking-wider text-emerald-500 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                      RAG ACTIVE
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                    {kb.name}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed">
                    {kb.description || "No description provided. Add sources to get started."}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 mt-2 border-t border-[var(--color-border)]/50">
                <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)] font-medium">
                  <div className="flex items-center gap-1.5">
                    <FileText size={14} className="text-indigo-400" />
                    <span>{kb.file_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>{new Date(kb.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty Search State */}
        {filteredKbs.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-[var(--color-surface)] rounded-full flex items-center justify-center mb-4">
              <Search size={24} className="text-[var(--color-text-secondary)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No notebooks found</h3>
            <p className="text-[var(--color-text-secondary)] mt-1">Try adjusting your search query.</p>
          </div>
        )}

      </main>

      {/* Onboarding Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
            <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Welcome to Nexora!</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">What should we call you?</p>
            
            <input 
              type="text" 
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Enter your preferred name"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-[var(--color-text-primary)] outline-none transition-all mb-6"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            />
            
            <button 
              onClick={handleSaveName}
              disabled={!tempName.trim()}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Exploring
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
