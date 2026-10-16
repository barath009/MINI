import React, { useEffect, useState } from 'react';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { BookOpen, Users, Clock, Cpu, CheckSquare, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FacultyDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/faculty/dashboard');
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

    const handleRefresh = () => {
      fetchDashboard();
    };

    socket.on('attendance.created', handleRefresh);
    socket.on('timetable.updated', handleRefresh);
    socket.on('timetable.deleted', handleRefresh);
    socket.on('session.deleted', handleRefresh);
    socket.on('TIMETABLE_UPDATED', handleRefresh);
    socket.on('attendance.session_status', handleRefresh);

    return () => {
      socket.off('attendance.created', handleRefresh);
      socket.off('timetable.updated', handleRefresh);
      socket.off('timetable.deleted', handleRefresh);
      socket.off('session.deleted', handleRefresh);
      socket.off('TIMETABLE_UPDATED', handleRefresh);
      socket.off('attendance.session_status', handleRefresh);
    };
  }, [socket]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Faculty Workstation...</div>;
  }

  const s = data?.summary || {};
  const activeClass = s.activeClass;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Faculty Workspace Dashboard</h1>
        <p className="text-xs text-slate-400">Welcome, {data?.faculty?.name} ({data?.faculty?.employeeId})</p>
      </div>

      {/* Active Class Live Banner */}
      {activeClass ? (
        <div className="glass-card p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-extrabold text-xs text-emerald-400 uppercase tracking-wider">ACTIVE CLASS SESSION</span>
            </div>
            <h2 className="text-lg font-extrabold text-white">{activeClass.subjectId?.name} ({activeClass.subjectId?.code})</h2>
            <p className="text-xs text-slate-300">
              Classroom: <span className="font-mono text-cyan-400 font-bold">{activeClass.classroomId?.building} - {activeClass.classroomId?.roomNumber}</span> | Section {activeClass.sectionId?.name}
            </p>
          </div>

          <Link
            to={`/faculty/attendance/${activeClass._id}`}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/30"
          >
            <CheckSquare className="w-4 h-4" /> Open Realtime Attendance Monitor
          </Link>
        </div>
      ) : (
        <div className="glass-card p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>No active class session currently in progress.</span>
          <span className="text-[11px] text-slate-500">Next class scheduled in timetable.</span>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Assigned Students" value={s.assignedStudentCount || 0} subtext="Allocated to your classes" icon={Users} color="cyan" />
        <StatCard title="Today's Classes" value={s.todayClassesCount || 0} subtext="Scheduled Sessions" icon={BookOpen} color="purple" />
        <StatCard title="Present Today" value={s.presentToday || 0} subtext="Recognized via IoT Camera" icon={CheckSquare} color="emerald" />
        <StatCard title="Classroom Camera" value={s.deviceStatus || 'ONLINE'} subtext="Hardware Node" icon={Cpu} color="amber" />
      </div>

      {/* Today's Schedule & Live Arrivals Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Sessions */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="font-bold text-sm text-slate-200">Today's Class Schedule</h2>
          <div className="space-y-3">
            {data?.todaySessions?.map((sess: any) => (
              <div key={sess._id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-slate-100">{sess.subjectId?.name}</p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                      Year {sess.subjectId?.year || Math.ceil((sess.subjectId?.semester || 1) / 2)} (Sem {sess.subjectId?.semester || 1})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Room {sess.classroomId?.roomNumber} | {sess.startTime} - {sess.endTime}</p>
                </div>
                <Badge status={sess.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Live Arrivals Feed */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="font-bold text-sm text-slate-200">Realtime Arrival Feed</h2>
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {data?.liveArrivals?.map((arr: any) => (
              <div key={arr._id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-200">{arr.studentId?.userId?.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{arr.studentId?.registerNumber}</p>
                </div>
                <div className="text-right">
                  <Badge status={arr.status} />
                  <p className="text-[10px] text-slate-500 mt-1">{new Date(arr.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
