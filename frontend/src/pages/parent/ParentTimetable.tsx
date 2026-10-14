import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { Calendar, Clock, MapPin, User, BookOpen, AlertCircle, Sparkles, GraduationCap } from 'lucide-react';

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const ParentTimetable: React.FC = () => {
  const { socket } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const [wards, setWards] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(searchParams.get('studentId') || '');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('MONDAY');

  // 1. Fetch parent wards
  useEffect(() => {
    api
      .get('/parent/wards')
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setWards(res.data.data);
          if (!selectedStudentId) {
            setSelectedStudentId(res.data.data[0].studentId);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // 2. Fetch timetable for selected ward
  const fetchWardTimetable = () => {
    if (!selectedStudentId) return;
    setSearchParams({ studentId: selectedStudentId });
    setLoading(true);

    api
      .get(`/parent/wards/${selectedStudentId}/timetable`)
      .then((res) => {
        if (res.data.success) {
          setData(res.data.data);
          const today = res.data.data.currentDay;
          if (WEEKDAYS.includes(today)) {
            setSelectedDay(today);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWardTimetable();
  }, [selectedStudentId]);

  // 3. Real-time Socket.IO Listener
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchWardTimetable();
    };
    socket.on('TIMETABLE_UPDATED', handleUpdate);
    return () => {
      socket.off('TIMETABLE_UPDATED', handleUpdate);
    };
  }, [socket, selectedStudentId]);

  const currentWard = wards.find((w) => w.studentId === selectedStudentId);
  const currentDay = data?.currentDay || 'MONDAY';
  const scheduleForDay = data?.weeklySchedule?.[selectedDay] || [];
  const hasPublished = data?.hasPublishedTimetable;

  if (loading && !data) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Ward Timetable...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider font-mono">
            PARENT PORTAL
          </span>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Ward Weekly Class Timetable</h1>
          <p className="text-xs text-slate-400">
            Official class schedule assigned to your student ward's academic section.
          </p>
        </div>

        {currentDay && (
          <div className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-300 font-mono text-xs flex items-center gap-1.5 self-start sm:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Today is {currentDay}</span>
          </div>
        )}
      </div>

      {/* Ward Switcher Tabs (if multiple wards) */}
      {wards.length > 1 && (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Select Ward ({wards.length} Linked Students)
          </label>
          <div className="flex flex-wrap gap-2">
            {wards.map((w: any) => {
              const isSelected = w.studentId === selectedStudentId;
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
                    {w.registerNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ward Profile Banner */}
      {currentWard && (
        <div className="glass-card px-4 py-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-100">{currentWard.name}</span>
              <p className="text-[11px] text-slate-400">
                {currentWard.department} | Year {currentWard.year} (Sem {currentWard.semester}) - Section {currentWard.section}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            Roll: {currentWard.rollNumber}
          </span>
        </div>
      )}

      {/* Weekday Switcher Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800">
        {WEEKDAYS.map((day) => {
          const isSelected = selectedDay === day;
          const isToday = currentDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isSelected
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>{day.slice(0, 3)}</span>
              {isToday && <span className="w-2 h-2 rounded-full bg-emerald-400" title="Today" />}
            </button>
          );
        })}
      </div>

      {/* Schedule Cards / Empty State */}
      {!hasPublished ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <Calendar className="w-10 h-10 mx-auto text-slate-500 opacity-40" />
          <h3 className="font-bold text-sm text-slate-200">No Published Timetable</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Your department coordinator has not published an active timetable schedule for this section yet. Please check back soon or consult the class advisor.
          </p>
        </div>
      ) : scheduleForDay.length === 0 ? (
        <div className="glass-card p-10 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
          No classes scheduled on {selectedDay}.
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
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
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
                <span className="font-mono text-xs text-cyan-400 font-semibold">{entry.subjectCode}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{entry.facultyName}</span>
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
    </div>
  );
};
