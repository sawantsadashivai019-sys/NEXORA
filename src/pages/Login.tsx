import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mail, Lock, ArrowRight, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
    interface Window {
        google: any;
    }
}

const Login: React.FC = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Dynamically load Google Identity Services script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    const handleGoogleLogin = () => {
        if (window.google) {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: '971843857271-41sm0c2ame1u6l0n5v1hv297i33pt8a6.apps.googleusercontent.com',
                scope: 'email profile openid',
                callback: async (tokenResponse: any) => {
                    console.log("Google Auth Success:", tokenResponse);
                    try {
                        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                        });
                        const userInfo = await res.json();
                        localStorage.setItem('user', JSON.stringify(userInfo));
                    } catch (error) {
                        console.error('Failed to fetch Google profile', error);
                        localStorage.setItem('user', JSON.stringify({ name: "Nexora User", email: "user@nexora.ai" }));
                    }
                    navigate('/dashboard');
                },
                error_callback: (error: any) => {
                    console.error("Google Auth failed:", error);
                }
            });
            client.requestAccessToken();
        } else {
            console.warn("Google script not loaded yet, falling back.");
            navigate('/dashboard');
        }
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Since we don't have backend, simply mock the authenticated user locally
        localStorage.setItem('user', JSON.stringify({ name: "Sadashiv Sawant", email: "hello@example.com" }));
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen w-full bg-[#f3f4f6] dark:bg-[#0a0a0a] text-[var(--color-text-primary)] flex overflow-hidden relative font-[var(--font-family)]">
            {/* Background Animations */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[150px] mix-blend-screen" />
                <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-emerald-500/20 rounded-full blur-[100px] mix-blend-screen" />
            </div>

            <div className="w-full flex items-center justify-center relative z-10 p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full max-w-md"
                >
                    <div className="bg-[var(--color-surface)]/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl shadow-2xl p-8 overflow-hidden relative">
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
                            <div className="absolute top-0 left-[-100%] w-[200%] h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-45deg] animate-[shimmer_5s_infinite]" />
                        </div>

                        <div className="flex flex-col items-center mb-8 relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg mb-4 p-0.5 relative overflow-hidden group">
                                <img src="/nexora-logo.jpg" alt="Nexora Logo" className="w-full h-full rounded-xl object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10"></div>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent mb-2">Nexora</h1>
                            <p className="text-sm text-[var(--color-text-secondary)]">Your AI-Powered Second Brain</p>
                        </div>

                        <div className="space-y-6 relative z-10">
                            {/* Toggle Sign Up / Login */}
                            <div className="bg-[var(--color-surface-hover)] p-1 rounded-xl flex items-center relative">
                                <motion.div
                                    className="absolute inset-y-1 w-[calc(50%-4px)] bg-[var(--color-surface)] shadow border border-[var(--color-border)] rounded-lg"
                                    animate={{ left: isSignUp ? 'calc(50% + 2px)' : '2px' }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                                <button
                                    onClick={() => setIsSignUp(false)}
                                    className={`w-1/2 py-2 text-sm font-medium z-10 transition-colors ${!isSignUp ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                                >
                                    Log In
                                </button>
                                <button
                                    onClick={() => setIsSignUp(true)}
                                    className={`w-1/2 py-2 text-sm font-medium z-10 transition-colors ${isSignUp ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                                >
                                    Sign Up
                                </button>
                            </div>

                            {/* Google Sign In */}
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all font-semibold border border-gray-200 shadow-sm group relative overflow-hidden"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 group-hover:scale-110 transition-transform">
                                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                                </svg>
                                Continue with Google
                            </button>

                            <div className="flex items-center gap-4">
                                <div className="h-[1px] flex-1 bg-[var(--color-border)]" />
                                <span className="text-xs text-[var(--color-text-secondary)] font-medium uppercase tracking-widest">or</span>
                                <div className="h-[1px] flex-1 bg-[var(--color-border)]" />
                            </div>

                            <form onSubmit={handleEmailSubmit} className="space-y-4">
                                <AnimatePresence mode="popLayout">
                                    {isSignUp && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, y: -10 }}
                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                            exit={{ opacity: 0, height: 0, y: -10 }}
                                            className="relative"
                                        >
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-secondary)]">
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Full Name"
                                                required
                                                className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-secondary)]">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                                    />
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-secondary)]">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-purple-500/25 transition-all outline-none focus:ring-4 focus:ring-purple-500/50 group"
                                >
                                    {isSignUp ? 'Create Account' : 'Sign In'}
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </form>

                            {!isSignUp && (
                                <p className="text-center text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors">
                                    Forgot your password?
                                </p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
            {/* Adding the shimmer animation to global CSS if not exists. Can be added here as a style component for ease */}
            <style>
                {`
                @keyframes shimmer {
                    100% {
                        left: 100%;
                    }
                }
                `}
            </style>
        </div>
    );
};

export default Login;
