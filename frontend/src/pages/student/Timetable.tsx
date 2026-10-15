import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useSystemClock } from '../../context/SystemClockContext';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  BookOpen,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CalendarDays,
  Coffee,
  XCircle,
  Scan,
} from 'lucide-react';

export const StudentTimetable: React.FC = () => {
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

  const fetchTimetable = () => {
    if (!selectedDate) return;
    setLoading(true);
    api
      .get(`/student/timetable?date=${selectedDate}`)
      .then((res) => {
        if (res.data.success && res.data.data) {
          setData(res.data.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTimetable();
    const interval = setInterval(() => {
      fetchTimetable();
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchTimetable();
    };
    socket.on('timetable.updated', handleUpdate);
    socket.on('attendance.session_status', handleUpdate);
    socket.on('attendance.verified', handleUpdate);
    socket.on('attendance.marked', handleUpdate);

    return () => {
      socket.off('timetable.updated', handleUpdate);
      socket.off('attendance.session_status', handleUpdate);
      socket.off('attendance.verified', handleUpdate);
      socket.off('attendance.marked', handleUpdate);
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
          <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider font-mono">
            STUDENT PORTAL
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="w-7 h-7 text-cyan-400" />
            Class Schedule &amp; Timetable
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Official class schedule assigned to your academic section for the selected date.
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
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
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
            className="px-3 py-1.5 rounded-xl bg-cyan-950/70 border border-cyan-800 text-cyan-300 hover:bg-cyan-900 text-xs font-bold transition-all"
          >
            Today
          </button>
        </div>
      </div>

      {/* Date Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <h2 className="text-base font-extrabold text-white">{fullFormattedDate}</h2>
            <p className="text-[11px] text-slate-400 font-mono">Hourly biometric verification schedule</p>
          </div>
        </div>

        <div className="text-xs font-mono font-bold text-slate-300">
          {hasClasses ? `${classes.length} Class(es) Scheduled` : 'No Classes Scheduled'}
        </div>
      </div>

      {/* Classes List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse">
          Loading schedule for {fullFormattedDate}...
        </div>
      ) : !hasClasses ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No classes scheduled for this date.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are no classes scheduled for your academic section on {fullFormattedDate}. Use the date navigator above to check other dates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls: any) => {
            const isPresent = cls.status === 'PRESENT' || cls.status === 'LATE';
            const isAbsent = cls.status === 'ABSENT';
            const isActive = cls.status === 'ACTIVE' || cls.status === 'ONGOING' || (!isPresent && !isAbsent && cls.isCurrent);
            const isPending = cls.status === 'PENDING';
            const isUpcoming = cls.status === 'UPCOMING';
            const isCancelled = cls.status === 'CANCELLED';

            return (
              <div
                key={cls.id || cls._id}
                className={`p-4 rounded-2xl border transition-all ${
                  isPresent
                    ? 'bg-emerald-950/20 border-emerald-900/60 shadow-emerald-950/20'
                    : isAbsent
                    ? 'bg-rose-950/20 border-rose-900/60 shadow-rose-950/20'
                    : isActive
                    ? 'bg-cyan-950/25 border-cyan-500/70 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                    : isPending
                    ? 'bg-blue-950/30 border-blue-800 shadow-blue-950/20'
                    : isCancelled
                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                    : 'bg-slate-900/90 border-slate-800 shadow-lg'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Hour & Details */}
                  <div className="flex items-start sm:items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono border shrink-0 ${
                      isPresent
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : isAbsent
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : isActive
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/50'
                        : isPending
                        ? 'bg-blue-950 text-blue-300 border-blue-800 animate-pulse'
                        : 'bg-slate-950 text-cyan-300 border-slate-800'
                    }`}>
                      <span className="text-[9px] uppercase font-bold">Hour</span>
                      <span className="text-base font-black">{cls.periodNumber}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-white text-base">
                          {cls.subjectName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {cls.subjectCode}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          ({cls.slot})
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5">
                        <span className="flex items-center gap-1 font-mono text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {cls.startTime} – {cls.endTime}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {cls.facultyName}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {cls.classroom}
                        </span>
                      </div>

                      {/* Biometric verification details if present */}
                      {isPresent && (
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-emerald-300 font-mono">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Verified at {cls.verificationTime || '09:07 AM'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Scan className="w-3.5 h-3.5 text-cyan-400" />
                            {cls.deviceName || 'Hall Biometric Scanner'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Live Status Pill */}
                  <div className="self-end md:self-center">
                    {isPresent && (
                      <span className="px-3.5 py-1.5 rounded-full text-xs font-black font-mono tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1.5 shadow-md shadow-emerald-950/40">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        PRESENT
                      </span>
                    )}
                    {isAbsent && (
                      <span className="px-3.5 py-1.5 rounded-full text-xs font-black font-mono tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        ABSENT
                      </span>
                    )}
                    {isActive && !isPresent && (
                      <span className="px-3.5 py-1.5 rounded-full text-xs font-black font-mono tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 flex items-center gap-2 shadow-md shadow-cyan-950/40">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        ACTIVE
                      </span>
                    )}
                    {isPending && !isActive && (
                      <span className="px-3.5 py-1.5 rounded-full text-xs font-black font-mono tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/50 flex items-center gap-1.5 animate-pulse">
                        <Clock className="w-4 h-4 text-blue-400" />
                        PENDING SCAN
                      </span>
                    )}
                    {isUpcoming && !isActive && (
                      <span className="px-3.5 py-1.5 rounded-full text-xs font-bold font-mono tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        UPCOMING
                      </span>
                    )}
                    {isCancelled && (
                      <span className="px-3.5 py-1.5 rounded-full text-xs font-bold font-mono tracking-wider bg-rose-900/60 text-rose-200 border border-rose-700">
                        CANCELLED
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
