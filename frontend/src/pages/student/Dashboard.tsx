import React, { useEffect, useState } from 'react';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { CheckSquare, AlertTriangle, BookOpen, Clock, Bell, Scan, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/student/dashboard');
      if (res.data.success) setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('attendance.created', () => fetchDashboard());
    socket.on('notification.created', () => fetchDashboard());
    return () => {
      socket.off('attendance.created');
      socket.off('notification.created');
    };
  }, [socket]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Student Attendance Portal...</div>;
  }

  const s = data?.summary || {};
  const student = data?.student || {};

  return (
    <div className="space-y-6">
      {/* Student Greeting Banner */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider">STUDENT PORTAL</span>
          <h1 className="text-xl font-extrabold text-white">Welcome back, {student.name}</h1>
          <p className="text-xs text-slate-400">
            Register No: <span className="font-mono font-bold text-slate-200">{student.registerNumber}</span> | Roll: {student.rollNumber} | {student.department} (Section {student.section})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge status={s.statusBadge || 'SAFE'} />
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <p className="text-xl font-extrabold text-cyan-400">{s.overallPercentage}%</p>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Overall Attendance</p>
          </div>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Overall Attendance" value={`${s.overallPercentage}%`} subtext={`${s.presentCount || 0} Attended Classes`} icon={CheckSquare} color={s.overallPercentage >= 75 ? 'cyan' : 'rose'} />
        <StatCard title="Present Classes" value={s.presentCount || 0} subtext="Recognized by Face AI" icon={CheckSquare} color="emerald" />
        <StatCard title="Late Arrivals" value={s.lateCount || 0} subtext="Past Grace Period" icon={Clock} color="amber" />
        <StatCard title="Absent Classes" value={s.absentCount || 0} subtext="Total Missed" icon={AlertTriangle} color="rose" />
      </div>

      {/* Subject Wise Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-200">Subject-wise Attendance Breakdown</h2>
          <Link to="/student/history" className="text-xs text-cyan-400 hover:underline">View Detailed History &rarr;</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.subjectBreakdown?.map((sub: any) => (
            <div key={sub.subjectId} className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-cyan-400 text-xs">{sub.subjectCode}</span>
                <Badge status={sub.status} />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-xs">{sub.subjectName}</h3>
                <p className="text-[10px] text-slate-400">Faculty: {sub.facultyName}</p>
              </div>

              {/* Progress bar */}
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
