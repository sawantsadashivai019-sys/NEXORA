import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, HelpCircle, LogOut } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const navigate = useNavigate();

  return (
    <div className={clsx("w-20 flex flex-col items-center py-6 bg-[var(--color-background)] z-30 flex-shrink-0", className)}>
        {/* Logo / Home */}
        <div className="mb-6">
            <button onClick={() => navigate('/dashboard')} className="p-1 rounded-2xl bg-[var(--color-surface)] shadow-sm hover:shadow-md hover:scale-105 transition-all border border-[var(--color-border)] w-12 h-12 flex items-center justify-center overflow-hidden group">
                 <img src="/nexora-logo.jpg" alt="Home" className="w-full h-full object-cover rounded-xl opacity-90 group-hover:opacity-100 transition-opacity" />
            </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 flex flex-col gap-6 w-full px-2 items-center">
            <div className="flex flex-col gap-2 p-2 bg-[var(--color-surface)] rounded-full border border-[var(--color-border)] shadow-sm">
                <button className="p-3 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex justify-center relative group" title="Profile">
                    <User size={22} />
                    <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Profile</span>
                </button>
                 <button className="p-3 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex justify-center relative group" title="Settings">
                    <Settings size={22} />
                     <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Settings</span>
                </button>
            </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-4 w-full px-2 mt-auto items-center">
             <button className="p-3 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex justify-center" title="Help">
                <HelpCircle size={22} />
            </button>
             <button onClick={() => navigate('/')} className="p-3 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors flex justify-center" title="Logout">
                <LogOut size={22} />
            </button>
            <div 
                onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 mt-2 cursor-pointer shadow-md hover:ring-4 ring-[var(--color-surface)] transition-all flex items-center justify-center text-white font-bold"
                title="Profile"
            >
                {(() => {
                    try {
                        const u = JSON.parse(localStorage.getItem('user') || '{}');
                        return u?.name ? u.name.charAt(0).toUpperCase() : 'U';
                    } catch { return 'U'; }
                })()}
            </div>
        </div>
    </div>
  );
};

export default Sidebar;
