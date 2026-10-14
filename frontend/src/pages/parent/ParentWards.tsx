import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Users, GraduationCap, CheckSquare, BarChart3, ChevronRight, Scan } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ParentWards: React.FC = () => {
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/parent/wards')
      .then((res) => {
        if (res.data.success) setWards(res.data.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider font-mono">
          PARENT PORTAL
        </span>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">My Linked Wards</h1>
        <p className="text-xs text-slate-400">
          All students registered under your parent account. Each student's attendance is calculated and monitored independently.
        </p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-500 text-xs animate-pulse">Loading linked student wards...</div>
      ) : wards.length === 0 ? (
        <div className="glass-card p-10 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
          No students are currently linked to your parent account.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wards.map((w) => (
            <div key={w.studentId} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800">
                      {w.relationship || 'Ward'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 flex items-center gap-1">
                      <Scan className="w-3 h-3 text-cyan-400" />
                      {w.biometricStatus === 'ENROLLED' ? 'Biometrics Enrolled' : 'Biometrics Pending'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-100">{w.name}</h2>
                  <p className="text-xs text-slate-400">
                    Register No: <span className="font-mono font-bold text-slate-200">{w.registerNumber}</span> | Roll: {w.rollNumber}
                  </p>
                  <p className="text-xs text-slate-400">
                    {w.department} | Year {w.year} (Sem {w.semester}) - Section {w.section}
                  </p>
                </div>

                <div className="text-right">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center min-w-[80px]">
                    <p className={`text-xl font-extrabold ${w.percentage >= 75 ? 'text-cyan-400' : 'text-rose-400'}`}>
                      {w.percentage}%
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Attendance</p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Attendance Progress</span>
                  <span>
                    {w.attendedClasses} / {w.totalClasses} Classes
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      w.percentage >= 75 ? 'bg-cyan-500' : w.percentage >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(w.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <Link
                  to={`/parent/attendance?studentId=${w.studentId}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span>Attendance Logs</span>
                </Link>
                <Link
                  to={`/parent/analytics?studentId=${w.studentId}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Subject Analytics</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
