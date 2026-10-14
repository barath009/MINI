import React, { useEffect, useState } from 'react';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import {
  CheckSquare,
  AlertTriangle,
  BookOpen,
  Clock,
  Bell,
  Scan,
  Shield,
  Calendar,
  MapPin,
  User,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
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

  if (loading && !data) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Student Attendance Portal...</div>;
  }

  const s = data?.summary || {};
  const student = data?.student || {};
  const todayAtt = data?.todayAttendance;
  const todaySchedule = data?.todaySchedule || { classes: [], nextUpcomingClass: null };

  return (
    <div className="space-y-6">
      {/* Student Greeting Banner */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider font-mono">
              STUDENT PORTAL
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {student.academicYear || '2026-2027'}
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white">Welcome back, {student.name}</h1>
          <p className="text-xs text-slate-400">
            Student ID: <span className="font-mono font-bold text-slate-200">{student.registerNumber}</span> | Roll: {student.rollNumber} | {student.department} (Year {student.year}, Sem {student.semester} - Section {student.section})
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

      {/* Low-Attendance Alert Callout */}
      {s.isLowAttendance && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-start gap-3 text-rose-200 text-xs shadow-lg shadow-rose-950/30">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-rose-100">Low Attendance Warning</h3>
            <p className="text-rose-300">
              Your overall attendance is currently at <span className="font-extrabold text-white">{s.overallPercentage}%</span>, which is below the required 75% institutional threshold. Please contact your department advisor or faculty.
            </p>
          </div>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Overall Attendance"
          value={`${s.overallPercentage}%`}
          subtext={`${s.totalEligibleClasses || 0} Total Classes`}
          icon={CheckSquare}
          color={s.overallPercentage >= 75 ? 'cyan' : 'rose'}
        />
        <StatCard
          title="Present Classes"
          value={s.presentCount || 0}
          subtext="On-Time Facial Scans"
          icon={CheckSquare}
          color="emerald"
        />
        <StatCard
          title="Late Arrivals"
          value={s.lateCount || 0}
          subtext="Within Grace Period"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Absent Classes"
          value={s.absentCount || 0}
          subtext="Unattended Sessions"
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Grid: Today's Biometric Attendance & Today's Timetable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Latest Biometric Attendance */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Today's Attendance Status
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
            </span>
          </div>

          {todayAtt ? (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-cyan-400 text-xs">{todayAtt.subjectCode}</span>
                  <h3 className="font-bold text-slate-100 text-sm">{todayAtt.subjectName}</h3>
                </div>
                <Badge status={todayAtt.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Recorded: <strong className="font-mono text-slate-100">{todayAtt.recordedTime}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{todayAtt.classroom}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>{todayAtt.faculty}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Biometrically Verified</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl space-y-1">
              <Clock className="w-6 h-6 mx-auto mb-1 opacity-40 text-cyan-400" />
              <p className="font-bold text-slate-300">No attendance logged yet today</p>
              <p className="text-[11px]">Walk up to the classroom kiosk terminal before class to log attendance.</p>
            </div>
          )}
        </div>

        {/* Today's Timetable Schedule */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Today's Schedule ({todaySchedule.dayName})
              </h2>
            </div>
            <Link to="/student/timetable" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              Full Week <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {todaySchedule.classes.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              No classes scheduled on {todaySchedule.dayName}.
            </div>
          ) : (
            <div className="space-y-2">
              {todaySchedule.classes.map((cls: any) => (
                <div
                  key={cls.id}
                  className={`p-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 ${
                    cls.isCurrent
                      ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-600/20'
                      : cls.isUpcoming
                      ? 'bg-slate-900/90 border-slate-800'
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-400 text-xs">{cls.startTime} - {cls.endTime}</span>
                      {cls.isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white animate-pulse">
                          LIVE NOW
                        </span>
                      )}
                      {cls.isUpcoming && cls === todaySchedule.nextUpcomingClass && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-400 border border-purple-800">
                          NEXT UP
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-100">{cls.subjectName}</p>
                    <p className="text-[11px] text-slate-400">
                      {cls.facultyName} | {cls.classroom}
                    </p>
                  </div>
                  <span className="font-mono text-slate-500 font-bold">P{cls.period}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject Wise Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-200">Subject-wise Attendance Breakdown</h2>
          <Link to="/student/attendance" className="text-xs text-cyan-400 hover:underline">
            View Detailed History &rarr;
          </Link>
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
                  <span className="text-slate-400">
                    {sub.attendedClasses} / {sub.totalClasses} Attended
                  </span>
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

      {/* Recent Attendance Activity List */}
      <div className="space-y-3">
        <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" /> Recent Attendance Activity
        </h2>

        {data?.recentRecords?.length === 0 ? (
          <div className="glass-card p-6 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
            No previous attendance records logged yet.
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
    </div>
  );
};
