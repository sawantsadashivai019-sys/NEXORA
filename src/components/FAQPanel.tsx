import React, { useState, useEffect } from 'react';
import type { KnowledgeBase } from '../types';
import { generateFAQ, getFAQs, deleteFAQ, type FAQList } from '../services/grokService';
import { HelpCircle, RefreshCw, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface FAQPanelProps {
  currentKnowledgeBase: KnowledgeBase | null;
}

const FAQPanel: React.FC<FAQPanelProps> = ({ currentKnowledgeBase }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [faqs, setFaqs] = useState<FAQList[]>([]);
  const [error, setError] = useState<string>('');
  const [expandedFaqLists, setExpandedFaqLists] = useState<{ [key: string]: boolean }>({});
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadFAQs();
  }, [currentKnowledgeBase?.id]);

  const loadFAQs = async () => {
    try {
      if (currentKnowledgeBase?.id) {
          const faqList = await getFAQs(currentKnowledgeBase.id);
          setFaqs(faqList || []);
          // Auto-expand the latest FAQ list
          if (faqList && faqList.length > 0) {
            setExpandedFaqLists(prev => ({ ...prev, [faqList[0].id]: true }));
          }
      } else {
          setFaqs([]);
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
    }
  };

  const handleGenerateFAQ = async () => {
    if (!currentKnowledgeBase) {
      setError('Please ensure a knowledge base is selected.');
      return;
    }

    if (currentKnowledgeBase.file_count === 0) {
      setError('Knowledge base must contain at least one file.');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const newFAQ = await generateFAQ(currentKnowledgeBase.id);
      setFaqs([newFAQ, ...faqs]);
      setExpandedFaqLists(prev => ({ ...prev, [newFAQ.id]: true }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate FAQ');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleFaqList = (id: string) => {
    setExpandedFaqLists(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const toggleItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeleteFAQ = async (faqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this FAQ?')) {
      return;
    }

    try {
      await deleteFAQ(faqId);
      setFaqs(faqs.filter(f => f.id !== faqId));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete FAQ');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)]">
      <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)] sticky top-0 z-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Frequently Asked Questions</h2>
        <button onClick={loadFAQs} className="p-1.5 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-secondary)] transition-colors">
            <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-[var(--color-background)]">
        {/* Generation Action */}
        <div className="mb-8 bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
          <div className="space-y-4">
            {!currentKnowledgeBase && (
              <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
                Please select a knowledge base.
              </div>
            )}
            
            {currentKnowledgeBase && (
               <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        <HelpCircle size={20} />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm text-[var(--color-text-primary)]">FAQ Generator</h3>
                        <p className="text-xs text-[var(--color-text-secondary)]">Automatically extract Q&A from {currentKnowledgeBase.name}</p>
                    </div>
               </div>
            )}

            {error && (
               <div className="p-3 bg-red-50 text-red-800 text-xs rounded-lg border border-red-200">
                  {error}
               </div>
            )}

            <button
              onClick={handleGenerateFAQ}
              disabled={isGenerating || !currentKnowledgeBase || currentKnowledgeBase.file_count === 0}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-all text-sm shadow-sm flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Generating FAQ...
                  </>
              ) : 'Generate FAQ'}
            </button>
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="group relative overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm transition-all"
              >
                {/* Header */}
                <div 
                    className="p-4 flex justify-between items-center cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors"
                    onClick={() => toggleFaqList(faq.id)}
                >
                    <div className="flex items-center gap-2">
                         {expandedFaqLists[faq.id] ? <ChevronDown size={18} className="text-[var(--color-text-secondary)]" /> : <ChevronRight size={18} className="text-[var(--color-text-secondary)]" />}
                         <div>
                             <h4 className="font-medium text-[var(--color-text-primary)] text-sm">{faq.title}</h4>
                             <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                {new Date(faq.created_at).toLocaleDateString()} • {faq.items.length} questions
                             </p>
                         </div>
                    </div>
                     <button 
                        onClick={(e) => handleDeleteFAQ(faq.id, e)}
                        className="p-2 text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-[var(--color-surface-hover)] rounded-full transition-colors"
                        title="Delete FAQ"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Items */}
                {expandedFaqLists[faq.id] && (
                    <div className="bg-[var(--color-background)] border-t border-[var(--color-border)] p-2 space-y-2">
                        {faq.items.map((item, index) => (
                             <div key={item.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                                  <div 
                                     className="px-4 py-3 flex justify-between items-start cursor-pointer hover:bg-[var(--color-surface-hover)]"
                                     onClick={(e) => toggleItem(item.id, e)}
                                  >
                                      <p className="text-sm font-medium text-[var(--color-text-primary)] pr-4">
                                          {index + 1}. {item.question}
                                      </p>
                                      <div className="mt-0.5 text-[var(--color-text-secondary)]">
                                          {expandedItems[item.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      </div>
                                  </div>
                                  {expandedItems[item.id] && (
                                     <div className="px-4 pb-3 pt-1 text-sm text-[var(--color-text-secondary)] border-t border-[var(--color-border)] bg-[var(--color-background)]">
                                        {item.answer}
                                     </div>
                                  )}
                             </div>
                        ))}
                    </div>
                )}
              </div>
            ))}

            {faqs.length === 0 && !isGenerating && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-[var(--color-surface)] rounded-full flex items-center justify-center mb-4 border border-[var(--color-border)]">
                        <HelpCircle size={24} className="text-[var(--color-text-secondary)]" />
                    </div>
                    <h3 className="text-[var(--color-text-primary)] font-medium mb-1">No FAQs yet</h3>
                    <p className="text-[var(--color-text-secondary)] text-sm max-w-[200px]">Extract common questions and answers from your knowledge base.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default FAQPanel;
