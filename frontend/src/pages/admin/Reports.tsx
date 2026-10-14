import React from 'react';
import { FileText, Download } from 'lucide-react';

export const AdminReports: React.FC = () => {
  const downloadCSV = () => {
    window.open('/api/v1/reports/export?format=csv', '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Institutional Reports &amp; Data Export</h1>
        <p className="text-xs text-slate-400">Generate CSV, Excel-compatible, and PDF official institutional reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
          <FileText className="w-6 h-6 text-cyan-400" />
          <h3 className="font-bold text-slate-100 text-sm">Daily Attendance Log Report</h3>
          <p className="text-xs text-slate-400">Complete log of present, late, and absent records for today.</p>
          <button onClick={downloadCSV} className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Download CSV Report
          </button>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
          <FileText className="w-6 h-6 text-emerald-400" />
          <h3 className="font-bold text-slate-100 text-sm">Low Attendance Defaulter List</h3>
          <p className="text-xs text-slate-400">List of students falling below the 75% attendance threshold.</p>
          <button onClick={downloadCSV} className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Export Defaulters CSV
          </button>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
          <FileText className="w-6 h-6 text-purple-400" />
          <h3 className="font-bold text-slate-100 text-sm">Recognition Hardware Audit</h3>
          <p className="text-xs text-slate-400">IoT camera events, confidence scores, and liveness checks.</p>
          <button onClick={downloadCSV} className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Export Device Audit
          </button>
        </div>
      </div>
    </div>
  );
};
