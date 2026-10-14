import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useSystemClock } from '../../context/SystemClockContext';
import { Badge } from '../../components/common/Badge';
import {
  BookOpen,
  Clock,
  CheckSquare,
  Calendar,
  MapPin,
  Users,
  Sparkles,
  Building,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  AlertCircle,
  Scan,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const FacultyClasses: React.FC = () => {
  const { socket } = useSocket();
  const { effectiveDate } = useSystemClock();

  // Selected date defaults to effective system date
  const initialDateStr = useMemo(() => {
    const y = effectiveDate.getFullYear();
    const m = String(effectiveDate.getMonth() + 1).padStart(2, '0');
    const d = String(effectiveDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(initialDateStr);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Derived date display
  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return new Date();
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }, [selectedDate]);

  const fullFormattedDate = useMemo(() => {
    return selectedDateObj.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDateObj]);

  const fetchFacultySchedule = () => {
    if (!selectedDate) return;
    setLoading(true);

    api
      .get(`/faculty/timetable?date=${selectedDate}`)
      .then((res) => {
        if (res.data.success && res.data.data) {
          setData(res.data.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFacultySchedule();
  }, [selectedDate]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchFacultySchedule();
    };
    socket.on('timetable.updated', handleUpdate);
    socket.on('attendance.session_status', handleUpdate);
    socket.on('attendance.verified', handleUpdate);

    return () => {
      socket.off('timetable.updated', handleUpdate);
      socket.off('attendance.session_status', handleUpdate);
      socket.off('attendance.verified', handleUpdate);
    };
  }, [socket, selectedDate]);

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d - 1));
    const py = prev.getUTCFullYear();
    const pm = String(prev.getUTCMonth() + 1).padStart(2, '0');
    const pd = String(prev.getUTCDate()).padStart(2, '0');
    setSelectedDate(`${py}-${pm}-${pd}`);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const ny = next.getUTCFullYear();
    const nm = String(next.getUTCMonth() + 1).padStart(2, '0');
    const nd = String(next.getUTCDate()).padStart(2, '0');
    setSelectedDate(`${ny}-${nm}-${nd}`);
  };

  const handleToday = () => {
    const y = effectiveDate.getFullYear();
    const m = String(effectiveDate.getMonth() + 1).padStart(2, '0');
    const d = String(effectiveDate.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const classes = data?.classes || [];
  const hasClasses = classes.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider font-mono">
            FACULTY PORTAL
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-blue-400" />
            My Teaching Schedule &amp; Classes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Official date-based class allocations and live hourly biometric attendance sessions.
          </p>
        </div>

        {/* Date Navigator Toolbar */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-blue-300 font-mono font-bold focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={handleNextDay}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-blue-950/70 border border-blue-800 text-blue-300 hover:bg-blue-900 text-xs font-bold transition-all"
          >
            Today
          </button>
        </div>
      </div>

      {/* Date Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <h2 className="text-base font-extrabold text-white">{fullFormattedDate}</h2>
            <p className="text-[11px] text-slate-400 font-mono">Assigned faculty class slots</p>
          </div>
        </div>

        <div className="text-xs font-mono font-bold text-slate-300">
          {hasClasses ? `${classes.length} Teaching Period(s)` : 'No Classes Assigned'}
        </div>
      </div>

      {/* Classes List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse">
          Loading assigned classes for {fullFormattedDate}...
        </div>
      ) : !hasClasses ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No classes assigned on this date.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not have any teaching classes scheduled for {fullFormattedDate}. Use the date navigator to inspect other days.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls: any) => {
            const isCancelled = cls.status === 'CANCELLED';

            return (
              <div
                key={cls.id || cls._id}
                className={`p-4 rounded-2xl border transition-all ${
                  cls.isCurrent
                    ? 'bg-blue-950/30 border-blue-700 shadow-lg shadow-blue-950/30'
                    : isCancelled
                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                    : 'bg-slate-900/90 border-slate-800 shadow-md'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Hour & Subject Details */}
                  <div className="flex items-start sm:items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono border shrink-0 ${
                      cls.isCurrent
                        ? 'bg-blue-900 text-blue-200 border-blue-600 animate-pulse'
                        : 'bg-slate-950 text-blue-300 border-slate-800'
                    }`}>
                      <span className="text-[9px] uppercase font-bold">Hour</span>
                      <span className="text-base font-black">{cls.periodNumber}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-white text-base">
                          {cls.subjectName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                          {cls.subjectCode}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          Section {cls.sectionName}
                        </span>

                        {cls.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 animate-pulse">
                            LIVE CLASS NOW
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5">
                        <span className="flex items-center gap-1 font-mono text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {cls.startTime} – {cls.endTime} ({cls.slot})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {cls.classroom}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          {cls.presentCount} / {cls.totalAllocated} Students Present
                        </span>
                      </div>

                      {cls.notes && (
                        <div className="text-[11px] text-amber-300/80 mt-1 italic">
                          Note: {cls.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Roster Link Button */}
                  <div className="self-end md:self-center">
                    {cls.sessionId ? (
                      <Link
                        to={`/faculty/attendance/${cls.sessionId}`}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-950/40"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Live Attendance Roster</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">
                        Session not active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
