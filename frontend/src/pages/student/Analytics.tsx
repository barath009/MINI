import React from 'react';
import { BarChart3 } from 'lucide-react';

export const StudentAnalytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Personal Attendance Analytics</h1>
        <p className="text-xs text-slate-400">Visual performance trends and subject-wise breakdown.</p>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
          <BarChart3 className="w-5 h-5" />
          Monthly Attendance Consistency
        </div>
        <p className="text-xs text-slate-300">Overall Attendance Status: <span className="font-extrabold text-cyan-400">93.4%</span> (Well above safe institutional threshold of 75%).</p>
      </div>
    </div>
  );
};
