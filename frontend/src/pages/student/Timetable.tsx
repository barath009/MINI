import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Calendar, Clock, MapPin, User, BookOpen, AlertCircle, Sparkles } from 'lucide-react';

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const StudentTimetable: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('MONDAY');

  useEffect(() => {
    api
      .get('/student/timetable')
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
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Weekly Class Timetable...</div>;
  }

  const currentDay = data?.currentDay || 'MONDAY';
  const scheduleForDay = data?.weeklySchedule?.[selectedDay] || [];
  const hasPublished = data?.hasPublishedTimetable;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider font-mono">
            STUDENT PORTAL
          </span>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Weekly Class Timetable</h1>
          <p className="text-xs text-slate-400">
            Official class schedule assigned to your academic section. Attendance terminals open 10 minutes prior to class start.
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
              {isToday && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Today" />
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule Cards */}
      {!hasPublished ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <Calendar className="w-10 h-10 mx-auto text-slate-500 opacity-40" />
          <h3 className="font-bold text-sm text-slate-200">No Published Timetable</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Your department coordinator has not published an active timetable schedule for your section yet. Please check back soon or consult your class advisor.
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
