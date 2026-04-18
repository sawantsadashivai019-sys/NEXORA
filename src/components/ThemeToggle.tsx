import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';
import { clsx } from 'clsx';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full">
      <button
        onClick={() => setTheme('light')}
        className={clsx(
          "p-1.5 rounded-full transition-all",
          theme === 'light' ? "bg-[var(--color-background)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        )}
        title="Light Mode"
      >
        <Sun size={14} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={clsx(
            "p-1.5 rounded-full transition-all",
            theme === 'system' ? "bg-[var(--color-background)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
        title="System Default"
      >
        <Monitor size={14} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={clsx(
            "p-1.5 rounded-full transition-all",
            theme === 'dark' ? "bg-[var(--color-background)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
        title="Dark Mode"
      >
        <Moon size={14} />
      </button>
    </div>
  );
};
