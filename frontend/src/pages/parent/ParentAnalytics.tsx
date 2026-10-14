import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { BarChart3, AlertTriangle, BookOpen, GraduationCap, CheckCircle2 } from 'lucide-react';
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
} from 'recharts';

export const ParentAnalytics: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [wards, setWards] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(searchParams.get('studentId') || '');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/parent/wards')
      .then((res) => {
        if (res.data.success && res.data.data.length > 0) {
          setWards(res.data.data);
          if (!selectedStudentId) {
            setSelectedStudentId(res.data.data[0].studentId);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      setSearchParams({ studentId: selectedStudentId });
      setLoading(true);
      api
        .get(`/parent/wards/${selectedStudentId}/summary`)
        .then((res) => {
          if (res.data.success) setSubjects(res.data.data);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [selectedStudentId]);

  const currentWard = wards.find((w) => w.studentId === selectedStudentId);
  const lowAttendanceSubjects = subjects.filter((s) => s.percentage < 75);

  const chartData = subjects.map((s) => ({
    name: s.subjectCode || s.subjectName.slice(0, 10),
    fullName: s.subjectName,
    percentage: s.percentage,
    totalClasses: s.totalClasses,
    attendedClasses: s.presentClasses + (s.lateClasses || 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider font-mono">
            PARENT PORTAL
          </span>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Attendance Analytics</h1>
          <p className="text-xs text-slate-400">
            Subject-wise attendance distribution and compliance with the 75% institutional threshold.
          </p>
        </div>

        {wards.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-semibold">Ward:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 font-bold focus:outline-none focus:border-blue-500"
            >
              {wards.map((w) => (
                <option key={w.studentId} value={w.studentId}>
                  {w.name} ({w.registerNumber})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Low Attendance Warning */}
      {lowAttendanceSubjects.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-800/80 flex items-start gap-3 text-amber-200 text-xs shadow-md">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-amber-100">Attention Required: Subjects Below 75% Threshold</h3>
            <p className="text-amber-300">
              Your ward is currently below 75% attendance in {lowAttendanceSubjects.length} {lowAttendanceSubjects.length === 1 ? 'subject' : 'subjects'}:{' '}
              <span className="font-bold text-white">
                {lowAttendanceSubjects.map((s) => `${s.subjectName} (${s.percentage}%)`).join(', ')}
              </span>.
            </p>
          </div>
        </div>
      )}

      {/* Chart: Subject-wise Breakdown */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Subject Attendance Percentage vs 75% Threshold
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Institutional Target: 75%</span>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-xs">Loading analytics chart...</div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-xs">No subject records available.</div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Attendance']}
                />
                <ReferenceLine
                  y={75}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  label={{ value: '75% Required', fill: '#f43f5e', position: 'top', fontSize: 11 }}
                />
                <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? '#06b6d4' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detailed Subject Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 font-bold text-xs text-slate-200 uppercase tracking-wider font-mono">
          Detailed Subject Summary
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Faculty Member</th>
                <th className="py-3 px-4 text-center">Total Classes</th>
                <th className="py-3 px-4 text-center">Attended (On-Time + Late)</th>
                <th className="py-3 px-4 text-center">Absent</th>
                <th className="py-3 px-4 text-center">Percentage</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {subjects.map((s) => (
                <tr key={s.subjectId} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-100 block">{s.subjectName}</span>
                    <span className="font-mono text-[10px] text-cyan-400">{s.subjectCode}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{s.facultyName}</td>
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
  );
};
