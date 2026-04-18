
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Lightbulb, HelpCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import type { Quiz } from '@/services/grokService';

interface QuizViewProps {
    quiz: Quiz;
    onClose: () => void;
}

const QuizView: React.FC<QuizViewProps> = ({ quiz, onClose }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [answers, setAnswers] = useState<Record<string, boolean>>({}); // questionId -> isCorrect

    const currentQuestion = quiz.questions[currentQuestionIndex];

    const handleSubmit = () => {
        if (!selectedOption) return;
        
        const isCorrect = selectedOption === currentQuestion.correct_answer;
        if (isCorrect) {
            setScore(prev => prev + 1);
        }
        
        setAnswers(prev => ({...prev, [currentQuestion.id]: isCorrect}));
        setIsSubmitted(true);
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsSubmitted(false);
            setShowHint(false);
        } else {
            setQuizCompleted(true);
        }
    };

    if (quizCompleted) {
        return (
            <div className="h-full flex flex-col bg-[var(--color-surface)]">
                 <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
                    <button onClick={onClose} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-primary)]">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-medium text-[var(--color-text-primary)]">Quiz Results</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-24 h-24 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center mb-6">
                        <span className="text-3xl font-bold text-[var(--color-primary)]">{Math.round((score / quiz.questions.length) * 100)}%</span>
                    </div>
                    <h2 className="text-2xl font-semibold mb-2 text-[var(--color-text-primary)]">
                        You scored {score} out of {quiz.questions.length}
                    </h2>
                    <p className="text-[var(--color-text-secondary)] mb-8">
                        {score === quiz.questions.length ? "Perfect score! You've mastered this topic." : "Good effort! Review the material and try again."}
                    </p>
                    <button 
                        onClick={() => {
                            setCurrentQuestionIndex(0);
                            setScore(0);
                            setQuizCompleted(false);
                            setSelectedOption(null);
                            setIsSubmitted(false);
                            setAnswers({});
                        }}
                        className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-full font-medium hover:bg-[var(--color-primary)]/90 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw size={18} />
                        Retake Quiz
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[var(--color-surface)]">
            <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
                <button onClick={onClose} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full text-[var(--color-text-primary)]">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex-1">
                    <h3 className="font-medium text-[var(--color-text-primary)]">{quiz.title}</h3>
                     <div className="w-full bg-[var(--color-surface-hover)] h-1 rounded-full mt-2 overflow-hidden">
                        <div 
                            className="bg-[var(--color-primary)] h-full transition-all duration-300"
                            style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                        />
                    </div>
                </div>
                 <div className="text-sm font-medium text-[var(--color-text-secondary)] ml-3">
                    {currentQuestionIndex + 1}/{quiz.questions.length}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-xl font-medium text-[var(--color-text-primary)] mb-6 leading-relaxed">
                        {currentQuestion.question}
                    </h2>

                    <div className="space-y-3 mb-8">
                        {currentQuestion.options.map((option, idx) => {
                            let stateClass = "border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]";
                            if (isSubmitted) {
                                if (option === currentQuestion.correct_answer) {
                                    stateClass = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300";
                                } else if (option === selectedOption && option !== currentQuestion.correct_answer) {
                                    stateClass = "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300";
                                } else {
                                    stateClass = "opacity-50 border-transparent";
                                }
                            } else if (selectedOption === option) {
                                stateClass = "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !isSubmitted && setSelectedOption(option)}
                                    disabled={isSubmitted}
                                    className={clsx(
                                        "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group",
                                        stateClass
                                    )}
                                >
                                    <span className="font-medium text-[var(--color-text-primary)]">{option}</span>
                                    {isSubmitted && option === currentQuestion.correct_answer && <CheckCircle size={20} className="text-green-500" />}
                                    {isSubmitted && option === selectedOption && option !== currentQuestion.correct_answer && <XCircle size={20} className="text-red-500" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Hint Section */}
                    {currentQuestion.hint && !isSubmitted && (
                        <div className="mb-6">
                            <button 
                                onClick={() => setShowHint(!showHint)}
                                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-2 transition-colors"
                            >
                                <Lightbulb size={16} />
                                {showHint ? "Hide Hint" : "Need a Hint?"}
                            </button>
                            <AnimatePresence>
                            {showHint && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 text-sm border border-yellow-500/20"
                                >
                                    {currentQuestion.hint}
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Explanation Section */}
                    {isSubmitted && currentQuestion.explanation && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 p-4 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)]"
                        >
                            <div className="flex items-center gap-2 mb-2 text-[var(--color-text-primary)] font-medium">
                                <HelpCircle size={16} />
                                Explanation
                            </div>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                                {currentQuestion.explanation}
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-[var(--color-border)] flex justify-end">
                {!isSubmitted ? (
                    <button 
                        onClick={handleSubmit}
                        disabled={!selectedOption}
                        className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-full font-medium shadow-sm hover:bg-[var(--color-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Submit Answer
                    </button>
                ) : (
                    <button 
                        onClick={handleNext}
                        className="px-6 py-2.5 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-full font-medium hover:bg-[var(--color-surface-hover)]/80 transition-all flex items-center gap-2"
                    >
                        {currentQuestionIndex < quiz.questions.length - 1 ? "Next Question" : "View Results"}
                        <ChevronRight size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default QuizView;
