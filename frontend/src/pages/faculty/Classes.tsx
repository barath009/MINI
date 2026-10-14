import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { Badge } from '../../components/common/Badge';
import { BookOpen, Clock, CheckSquare, Calendar, MapPin, Users, Sparkles, Building } from 'lucide-react';
import { Link } from 'react-router-dom';

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const FacultyClasses: React.FC = () => {
  const { socket } = useSocket();
  const [timetableData, setTimetableData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('MONDAY');
  const [loading, setLoading] = useState(true);

  const fetchTimetableAndSessions = () => {
    Promise.all([
      api.get('/faculty/timetable'),
      api.get('/admin/sessions'),
    ])
      .then(([ttRes, sessRes]) => {
        if (ttRes.data.success) {
          setTimetableData(ttRes.data.data);
          const today = ttRes.data.data.currentDay;
          if (WEEKDAYS.includes(today)) {
            setSelectedDay(today);
          }
        }
        if (sessRes.data.success) {
          setSessions(sessRes.data.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTimetableAndSessions();
  }, []);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchTimetableAndSessions();
    };
    socket.on('TIMETABLE_UPDATED', handleUpdate);
    return () => {
      socket.off('TIMETABLE_UPDATED', handleUpdate);
    };
  }, [socket]);

  const currentDay = timetableData?.currentDay || 'MONDAY';
  const scheduleForDay = timetableData?.weeklySchedule?.[selectedDay] || [];
  const hasPublished = timetableData?.hasPublishedTimetable;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider font-mono">
            FACULTY PORTAL
          </span>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">My Teaching Schedule &amp; Classes</h1>
          <p className="text-xs text-slate-400">
            Assigned weekly period slots across departments and active biometric attendance sessions.
          </p>
        </div>

        {currentDay && (
          <div className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-300 font-mono text-xs flex items-center gap-1.5 self-start sm:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Today is {currentDay}</span>
          </div>
        )}
      </div>

      {/* Weekday Switcher Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800">
        {WEEKDAYS.map((day) => {
          const isSelected = selectedDay === day;
          const isToday = currentDay === day;
          const dayCount = timetableData?.weeklySchedule?.[day]?.length || 0;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>{day.slice(0, 3)}</span>
              {dayCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-blue-800' : 'bg-slate-800 text-slate-300'}`}>
                  {dayCount}
                </span>
              )}
              {isToday && <span className="w-2 h-2 rounded-full bg-emerald-400" title="Today" />}
            </button>
          );
        })}
      </div>

      {/* Timetable Period Cards */}
      {!hasPublished ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <Calendar className="w-10 h-10 mx-auto text-slate-500 opacity-40" />
          <h3 className="font-bold text-sm text-slate-200">No Assigned Teaching Periods</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The administrator has not assigned active timetable periods to your faculty profile yet.
          </p>
        </div>
      ) : scheduleForDay.length === 0 ? (
        <div className="glass-card p-10 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
          No classes scheduled for you on {selectedDay}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scheduleForDay.map((entry: any) => (
            <div
              key={entry.id}
              className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800">
                    Period {entry.periodNumber}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-semibold">
                    {entry.startTime} - {entry.endTime}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                  {entry.classType || 'Theory'}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-100">{entry.subjectName}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs text-cyan-400 font-semibold">{entry.subjectCode}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-cyan-300 border border-slate-800">
                    Year {entry.year || Math.ceil((entry.semester || 1) / 2)} (Sem {entry.semester || 1})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Section: {entry.sectionName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{entry.classroom}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Attendance Sessions */}
      {sessions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" /> Active Attendance Sessions ({sessions.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {sessions.map((sess) => (
              <div key={sess._id} className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-400">{sess.sessionId}</span>
                  <Badge status={sess.status} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-slate-100 text-sm">{sess.subjectId?.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                      Year {sess.subjectId?.year || Math.ceil((sess.subjectId?.semester || 1) / 2)} (Sem {sess.subjectId?.semester || 1})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Classroom: {sess.classroomId?.building} - {sess.classroomId?.roomNumber}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400">
                    {sess.startTime} - {sess.endTime}
                  </span>
                  <Link
                    to={`/faculty/attendance/${sess._id}`}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> Monitor Live Attendance
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

