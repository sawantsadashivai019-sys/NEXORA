import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, ArrowLeft, Mail, Star, Activity, User, Shield } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const Profile: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } catch (e) {}
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <div className="flex h-screen w-full bg-[#f3f4f6] dark:bg-[#0a0a0a] text-[var(--color-text-primary)] overflow-hidden font-[var(--font-family)]">
            <Sidebar />
            
            <div className="flex-1 flex flex-col h-full bg-[var(--color-background)] relative overflow-y-auto">
                {/* Background Decor */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

                {/* Header */}
                <header className="h-20 px-8 flex items-center justify-between sticky top-0 z-20 bg-[var(--color-surface)]/60 backdrop-blur-md border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="p-2 -ml-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-indigo-500 transition-all group"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--color-text-primary)] to-[var(--color-text-secondary)] bg-clip-text text-transparent">Profile Center</h1>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto w-full px-8 py-12 relative z-10 flex-1 flex flex-col gap-8">
                    
                    {/* Hero Card */}
                    <div className="bg-[var(--color-surface)]/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl p-8 shadow-xl flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rotate-45 blur-2xl" />
                        
                        <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 flex-shrink-0 shadow-lg shadow-indigo-500/20">
                            {user?.picture ? (
                                <img src={user.picture} alt="Profile" className="w-full h-full rounded-2xl object-cover border-4 border-[var(--color-surface)]" />
                            ) : (
                                <div className="w-full h-full rounded-2xl bg-[var(--color-surface)] border-4 border-[var(--color-surface)] flex items-center justify-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-500">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left z-10">
                            <h2 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">{user?.name || 'Nexora User'}</h2>
                            <p className="text-[var(--color-text-secondary)] flex items-center gap-2 mb-6 bg-[var(--color-surface-hover)] px-4 py-1.5 rounded-full text-sm font-medium border border-[var(--color-border)]">
                                <Mail size={14} className="text-indigo-400" />
                                {user?.email || 'No email provided'}
                            </p>

                            <div className="flex gap-4 w-full md:w-auto">
                                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-white hover:bg-indigo-600 shadow-lg shadow-[var(--color-primary)]/25 transition-all font-semibold">
                                    <User size={18} />
                                    Edit Profile
                                </button>
                                <button onClick={handleLogout} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-all font-semibold">
                                    <LogOut size={18} />
                                    Log Out
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats & Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Account Details */}
                        <div className="bg-[var(--color-surface)]/60 backdrop-blur-md border border-[var(--color-border)] rounded-3xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Shield className="text-emerald-500" size={20} />
                                Account Security
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)]">
                                    <div>
                                        <p className="font-semibold">Authentication Method</p>
                                        <p className="text-xs text-[var(--color-text-secondary)]">Google OAuth 2.0</p>
                                    </div>
                                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-full border border-emerald-500/20">Secure</div>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] cursor-pointer hover:border-indigo-500/50 transition-colors">
                                    <div>
                                        <p className="font-semibold">Password</p>
                                        <p className="text-xs text-[var(--color-text-secondary)]">Manage your local password</p>
                                    </div>
                                    <button className="text-indigo-400 text-sm font-medium hover:text-indigo-300">Change</button>
                                </div>
                            </div>
                        </div>

                        {/* App Settings Hook */}
                        <div className="bg-[var(--color-surface)]/60 backdrop-blur-md border border-[var(--color-border)] rounded-3xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Settings className="text-purple-500" size={20} />
                                Preferences
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] hover:border-indigo-500/50 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] group-hover:text-indigo-400 transition-colors">
                                            <Star size={18} />
                                        </div>
                                        <div>
                                            <p className="font-semibold">Theme Settings</p>
                                            <p className="text-xs text-[var(--color-text-secondary)]">System Default (Dark)</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] hover:border-indigo-500/50 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] group-hover:text-indigo-400 transition-colors">
                                            <Activity size={18} />
                                        </div>
                                        <div>
                                            <p className="font-semibold">Data & Privacy</p>
                                            <p className="text-xs text-[var(--color-text-secondary)]">Manage your notebook data</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
};

export default Profile;
