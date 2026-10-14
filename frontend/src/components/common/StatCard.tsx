import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  color?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, icon: Icon, color = 'cyan' }) => {
  const colorStyles = {
    cyan: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className="glass-card p-4 rounded-xl border border-[#26334d] flex items-center justify-between shadow-md relative overflow-hidden transition-all hover:border-blue-500/50">
      <div className="space-y-1">
        <p className="text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black font-mono text-white tracking-tight">{value}</p>
        {subtext && <p className="text-[11px] text-slate-400 font-semibold">{subtext}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-xs ${colorStyles[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};
