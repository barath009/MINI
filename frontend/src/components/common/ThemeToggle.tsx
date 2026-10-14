import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Sparkles } from 'lucide-react';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm ${
        theme === 'light'
          ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
          : theme === 'emerald'
          ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
      } ${className}`}
      title={`Current Theme: ${theme.toUpperCase()}. Click to switch theme.`}
    >
      {theme === 'light' && (
        <>
          <Sun className="w-4 h-4 text-amber-500 fill-amber-400" />
          <span>Light Mode</span>
        </>
      )}
      {theme === 'dark' && (
        <>
          <Moon className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
          <span>Dark Mode</span>
        </>
      )}
      {theme === 'emerald' && (
        <>
          <Sparkles className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
          <span>Emerald Theme</span>
        </>
      )}
    </button>
  );
};
