
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, X, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FlashcardDeck } from '@/services/grokService';
import { clsx } from 'clsx';

interface FlashcardDeckProps {
    deck: FlashcardDeck;
    onClose: () => void;
}

const FlashcardDeckView: React.FC<FlashcardDeckProps> = ({ deck, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [direction, setDirection] = useState(0); // -1 for prev, 1 for next

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === ' ' || e.key === 'Enter') handleFlip();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, deck.cards.length]); // Dependencies needed for closures

    if (!deck || !deck.cards || deck.cards.length === 0) {
        return (
            <div className="h-full flex flex-col bg-[var(--color-surface)]">
                 <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
                    <button onClick={onClose} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-primary)] transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-medium text-[var(--color-text-primary)]">{deck?.title || 'Flashcards'}</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--color-text-secondary)]">
                    <Layers size={48} className="mb-4 opacity-20" />
                    <p>No cards available in this deck.</p>
                </div>
            </div>
        );
    }

    const currentCard = deck.cards[currentIndex];

    const handleNext = () => {
        setDirection(1);
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % deck.cards.length);
        }, 150); // slight delay to allow flip reset if you want, or just instant
    };

    const handlePrev = () => {
        setDirection(-1);
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + deck.cards.length) % deck.cards.length);
        }, 150);
    };

    const handleFlip = () => {
        setIsFlipped((prev) => !prev);
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0,
            scale: 0.95,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 50 : -50,
            opacity: 0,
            scale: 0.95,
        })
    };

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-hover)] to-[var(--color-surface)] relative overflow-hidden">
             
             {/* Header */}
             <div className="flex items-center justify-between p-6 z-10">
                <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-[var(--color-text-primary)] transition-colors backdrop-blur-sm">
                    <X size={24} />
                </button>
                
                <div className="flex flex-col items-center">
                    <h3 className="font-semibold text-lg text-[var(--color-text-primary)] tracking-tight">{deck.title}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="h-1.5 w-24 bg-[var(--color-border)] rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300 ease-out"
                                style={{ width: `${((currentIndex + 1) / deck.cards.length) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono text-[var(--color-text-secondary)] ml-2">
                            {currentIndex + 1} / {deck.cards.length}
                        </span>
                    </div>
                </div>

                <div className="w-10" /> {/* Spacer for balance */}
            </div>

            {/* Main Card Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 perspective-1000">
                <div className="relative w-full max-w-2xl aspect-[1.6/1]">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 },
                                scale: { duration: 0.2 }
                            }}
                            className="w-full h-full absolute inset-0 cursor-pointer perspective-1000"
                            onClick={handleFlip}
                        >
                            <motion.div
                                className="w-full h-full relative preserve-3d shadow-2xl rounded-3xl"
                                animate={{ rotateY: isFlipped ? 180 : 0 }}
                                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {/* Front */}
                                <div className={clsx(
                                    "absolute inset-0 backface-hidden rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center",
                                    "bg-[var(--color-card)] border border-[var(--color-border)]",
                                    "shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]",
                                    "group hover:border-violet-500/30 transition-colors duration-300"
                                )}
                                style={{ backfaceVisibility: 'hidden' }}>
                                    <div className="absolute top-6 left-6 text-xs font-bold text-violet-500 tracking-widest uppercase opacity-70">Question</div>
                                    
                                    <p className="text-2xl sm:text-3xl font-medium text-[var(--color-text-primary)] leading-relaxed select-none">
                                        {currentCard.front}
                                    </p>
                                    
                                    <div className="absolute bottom-6 text-sm text-[var(--color-text-secondary)] flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                        Click to flip
                                    </div>
                                </div>

                                {/* Back */}
                                <div className={clsx(
                                    "absolute inset-0 backface-hidden rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center",
                                    "bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20",
                                    "backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(139,92,246,0.15)]"
                                )}
                                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                    <div className="absolute top-6 left-6 text-xs font-bold text-fuchsia-500 tracking-widest uppercase opacity-70">Answer</div>
                                    
                                    <p className="text-xl sm:text-2xl text-[var(--color-text-primary)] leading-relaxed select-none">
                                        {currentCard.back}
                                    </p>
                                </div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Controls */}
            <div className="h-32 flex items-center justify-center gap-6 sm:gap-10 pb-8 z-10">
                    <button 
                        onClick={handlePrev} 
                        className="p-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-primary)] hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg"
                        title="Previous (Left Arrow)"
                    >
                    <ChevronLeft size={28} />
                    </button>
                    
                    <button 
                        onClick={handleFlip} 
                        className="p-6 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_10px_30px_-10px_rgba(139,92,246,0.5)] hover:shadow-[0_15px_35px_-10px_rgba(139,92,246,0.6)] hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300"
                        title="Flip (Space / Enter)"
                    >
                    <RotateCcw size={32} strokeWidth={2.5} />
                    </button>
                    
                    <button 
                        onClick={handleNext} 
                        className="p-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-primary)] hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg"
                        title="Next (Right Arrow)"
                    >
                    <ChevronRight size={28} />
                    </button>
            </div>
        </div>
    );
};

export default FlashcardDeckView;
