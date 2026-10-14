import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import {
  Users,
  CheckSquare,
  AlertTriangle,
  Clock,
  BookOpen,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ParentDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const fetchDashboard = async (studentId?: string) => {
    try {
      setLoading(true);
      const url = studentId ? `/parent/dashboard?studentId=${studentId}` : '/parent/dashboard';
      const res = await api.get(url);
      if (res.data.success) {
        setData(res.data.data);
        if (!selectedStudentId && res.data.data.selectedWard?.studentId) {
          setSelectedStudentId(res.data.data.selectedWard.studentId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedStudentId || undefined);
  }, [selectedStudentId]);

  if (loading && !data) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Parent Portal...</div>;
  }

  const wards = data?.wards || [];
  const selectedWard = data?.selectedWard;
  const summary = data?.summary || {};

  if (!wards || wards.length === 0) {
    return (
      <div className="glass-card p-10 rounded-2xl border border-slate-800 text-center space-y-4">
        <Users className="w-12 h-12 text-slate-500 mx-auto opacity-50" />
        <h2 className="text-lg font-bold text-slate-200">No Student Wards Associated Yet</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Your parent account is active, but an administrator has not yet assigned your student ward to this profile. Please contact the college administration with your ward's Register Number.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ward Selector Tabs (if multiple wards) */}
      {wards.length > 1 && (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Switch Ward ({wards.length} Students Linked)
          </label>
          <div className="flex flex-wrap gap-2">
            {wards.map((w: any) => {
              const isSelected = w.studentId === selectedWard?.studentId;
              return (
                <button
                  key={w.studentId}
                  onClick={() => setSelectedStudentId(w.studentId)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>{w.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-blue-800' : 'bg-slate-800 text-slate-400'}`}>
                    {w.overallPercentage}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ward Profile Banner */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider font-mono bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
              MONITORING WARD
            </span>
            <span className="text-xs text-slate-400">({selectedWard?.relationship || 'Guardian'})</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-100">{selectedWard?.name}</h1>
          <p className="text-xs text-slate-400">
            Reg No: <span className="font-mono font-bold text-slate-200">{selectedWard?.registerNumber}</span> | Roll: {selectedWard?.rollNumber} | {selectedWard?.department} (Section {selectedWard?.section})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge status={summary.statusBadge || 'SAFE'} />
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
            <p className="text-xl font-extrabold text-cyan-400">{summary.overallPercentage}%</p>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Attendance Record</p>
          </div>
        </div>
      </div>

      {/* Low-Attendance Alert Callout */}
      {summary.isLowAttendance && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-start gap-3 text-rose-200 text-xs shadow-lg shadow-rose-950/30">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-rose-100">Low Attendance Warning</h3>
            <p className="text-rose-300">
              Your ward's attendance is currently at <span className="font-extrabold text-white">{summary.overallPercentage}%</span>, which is below the mandatory institutional threshold of <span className="font-bold">75.0%</span>. Please contact the class advisor or department head.
            </p>
          </div>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Overall Attendance"
          value={`${summary.overallPercentage}%`}
          subtext={`${summary.presentCount + (summary.lateCount || 0)} Attended Classes`}
          icon={CheckSquare}
          color={summary.overallPercentage >= 75 ? 'cyan' : 'rose'}
        />
        <StatCard
          title="Present Classes"
          value={summary.presentCount || 0}
          subtext="On-Time Attendance"
          icon={CheckSquare}
          color="emerald"
        />
        <StatCard
          title="Late Arrivals"
          value={summary.lateCount || 0}
          subtext="Within Grace Period"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Absent Classes"
          value={summary.absentCount || 0}
          subtext={`Out of ${summary.totalEligibleClasses || 0} Eligible`}
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Recent Biometric Attendance Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" /> Recent Attendance Activity
          </h2>
          <Link
            to={`/parent/attendance?studentId=${selectedWard?.studentId}`}
            className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
          >
            Full Attendance History <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data?.recentRecords?.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
            No attendance records logged yet for this academic period.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.recentRecords?.map((r: any) => (
              <div key={r.id} className="glass-card p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-400 text-xs">{r.subjectCode || 'SUB'}</span>
                  <Badge status={r.status} />
                </div>
                <h3 className="font-bold text-slate-200 text-xs line-clamp-1">{r.subjectName}</h3>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{r.date}</span>
                    <span className="text-slate-600">|</span>
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span className="font-bold text-slate-300 font-mono">{r.biometricTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span className="truncate">{r.classroom}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subject-Wise Attendance Breakdown */}
      <div className="space-y-3">
        <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" /> Subject-wise Attendance Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.subjectBreakdown?.map((sub: any) => (
            <div key={sub.subjectId} className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-cyan-400 text-xs">{sub.subjectCode}</span>
                <Badge status={sub.status} />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-xs">{sub.subjectName}</h3>
                <p className="text-[10px] text-slate-400">Staff: {sub.facultyName}</p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">{sub.attendedClasses} / {sub.totalClasses} Attended</span>
                  <span className="font-bold text-slate-200">{sub.percentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      sub.percentage >= 75 ? 'bg-cyan-500' : sub.percentage >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
