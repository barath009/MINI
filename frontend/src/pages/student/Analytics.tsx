import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
} from 'recharts';

export const StudentAnalytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/student/analytics')
      .then((res) => {
        if (res.data.success) setData(res.data.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Attendance Analytics...</div>;
  }

  const summary = data?.summary || {};
  const subjects = data?.subjectBreakdown || [];
  const lowAttendanceSubjects = data?.lowAttendanceSubjects || [];
  const monthlyTrend = data?.monthlyTrend || [];
  const distribution = data?.distribution || [];

  const subjectChartData = subjects.map((s: any) => ({
    name: s.subjectCode || s.subjectName.slice(0, 10),
    fullName: s.subjectName,
    percentage: s.percentage,
    totalClasses: s.totalClasses,
    attendedClasses: s.presentClasses + (s.lateClasses || 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider font-mono">
          STUDENT PORTAL
        </span>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Personal Attendance Analytics</h1>
        <p className="text-xs text-slate-400">
          Visual trends, subject compliance metrics, and monthly consistency calculated from official biometric sessions.
        </p>
      </div>

      {/* Low Attendance Alert */}
      {lowAttendanceSubjects.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-800/80 flex items-start gap-3 text-amber-200 text-xs shadow-md">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-amber-100">Attendance Warning: Subjects Below 75%</h3>
            <p className="text-amber-300">
              You are below the mandatory 75% threshold in {lowAttendanceSubjects.length} subject(s):{' '}
              <span className="font-bold text-white">
                {lowAttendanceSubjects.map((s: any) => `${s.subjectName} (${s.percentage}%)`).join(', ')}
              </span>.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Bar Chart & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject-Wise Bar Chart */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Subject Attendance vs 75% Target
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Target: 75%</span>
          </div>

          {subjectChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">No subject records available.</div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChartData} margin={{ top: 15, right: 10, left: -25, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#f8fafc' }}
                    formatter={(val: any) => [`${val}%`, 'Attendance']}
                  />
                  <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="4 4" />
                  <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                    {subjectChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? '#06b6d4' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Monthly Attendance Trend Line Chart */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Monthly Attendance Consistency Trend
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">6-Month History</span>
          </div>

          {monthlyTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">No monthly trends recorded yet.</div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend} margin={{ top: 15, right: 15, left: -25, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#f8fafc' }}
                    formatter={(val: any) => [`${val}%`, 'Monthly Attendance']}
                  />
                  <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Distribution and Detailed Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Present vs Absent Distribution */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <PieIcon className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Status Distribution
            </h2>
          </div>

          <div className="space-y-3 pt-2">
            {distribution.map((d: any) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-300">{d.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-100">{d.value}</span>
              </div>
            ))}
          </div>

          <div className="p-3 mt-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Overall Performance</span>
            <span className={`text-2xl font-extrabold ${summary.overallPercentage >= 75 ? 'text-cyan-400' : 'text-rose-400'}`}>
              {summary.overallPercentage}%
            </span>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="lg:col-span-2 glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-950/40 border-b border-slate-800 font-bold text-xs text-slate-200 uppercase tracking-wider font-mono">
            Subject-wise Detailed Analytics
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4 text-center">Eligible</th>
                  <th className="py-3 px-4 text-center">Attended</th>
                  <th className="py-3 px-4 text-center">Missed</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {subjects.map((s: any) => (
                  <tr key={s.subjectId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-100 block">{s.subjectName}</span>
                      <span className="font-mono text-[10px] text-cyan-400">{s.subjectCode}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{s.totalClasses}</td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-400">
                      {s.presentClasses + (s.lateClasses || 0)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-rose-400">{s.absentClasses || 0}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span className={s.percentage >= 75 ? 'text-cyan-400' : 'text-rose-400'}>
                        {s.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
