import React, { useState, useEffect } from 'react';
import { useSystemClock } from '../../context/SystemClockContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorUtils';
import {
  Clock,
  Calendar,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  History,
  Sparkles,
  ArrowRight,
  Flame,
  ChevronRight,
} from 'lucide-react';

export const SystemTimeControl: React.FC = () => {
  const { user } = useAuth();
  const {
    status,
    effectiveDate,
    realDate,
    isTestMode,
    isPaused,
    speedMultiplier,
    formattedDate,
    formattedTime,
    enableTestMode,
    disableTestMode,
    setTestTime,
    advanceTestTime,
    setPlayback,
    resetSystemTime,
  } = useSystemClock();

  // Local form state
  const [targetDatetime, setTargetDatetime] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Format real date/time
  const realFormattedDate = realDate.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const realFormattedTime = realDate.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Calculate current period for effective time
  const effH = effectiveDate.getHours();
  const effM = effectiveDate.getMinutes();
  const totalMins = effH * 60 + effM;

  let currentPeriodLabel = 'Campus Closed / Outside Working Hours';
  let periodColor = 'text-slate-400 bg-slate-800/60 border-slate-700';

  if (totalMins >= 9 * 60 && totalMins < 10 * 60) {
    currentPeriodLabel = 'Forenoon — Hour 1 (09:00 AM - 10:00 AM)';
    periodColor = 'text-blue-400 bg-blue-950/60 border-blue-800';
  } else if (totalMins >= 10 * 60 && totalMins < 11 * 60) {
    currentPeriodLabel = 'Forenoon — Hour 2 (10:00 AM - 11:00 AM)';
    periodColor = 'text-blue-400 bg-blue-950/60 border-blue-800';
  } else if (totalMins >= 11 * 60 && totalMins < 12 * 60) {
    currentPeriodLabel = 'Forenoon — Hour 3 (11:00 AM - 12:00 PM)';
    periodColor = 'text-blue-400 bg-blue-950/60 border-blue-800';
  } else if (totalMins >= 12 * 60 && totalMins < 13 * 60) {
    currentPeriodLabel = 'LUNCH BREAK (12:00 PM - 01:00 PM) — Attendance Blocked';
    periodColor = 'text-amber-400 bg-amber-950/60 border-amber-800 animate-pulse';
  } else if (totalMins >= 13 * 60 && totalMins < 14 * 60) {
    currentPeriodLabel = 'Afternoon — Hour 4 (01:00 PM - 02:00 PM)';
    periodColor = 'text-indigo-400 bg-indigo-950/60 border-indigo-800';
  } else if (totalMins >= 14 * 60 && totalMins < 15 * 60) {
    currentPeriodLabel = 'Afternoon — Hour 5 (02:00 PM - 03:00 PM)';
    periodColor = 'text-indigo-400 bg-indigo-950/60 border-indigo-800';
  } else if (totalMins >= 15 * 60 && totalMins < 16 * 60) {
    currentPeriodLabel = 'Afternoon — Hour 6 (03:00 PM - 04:00 PM)';
    periodColor = 'text-indigo-400 bg-indigo-950/60 border-indigo-800';
  }

  // Pre-fill datetime picker
  useEffect(() => {
    // Format YYYY-MM-DDTHH:mm
    const y = effectiveDate.getFullYear();
    const m = String(effectiveDate.getMonth() + 1).padStart(2, '0');
    const d = String(effectiveDate.getDate()).padStart(2, '0');
    const h = String(effectiveDate.getHours()).padStart(2, '0');
    const min = String(effectiveDate.getMinutes()).padStart(2, '0');
    setTargetDatetime(`${y}-${m}-${d}T${h}:${min}`);
  }, [isTestMode]);

  // Fetch recent time audit logs
  const loadAuditLogs = async () => {
    try {
      const res = await api.get('/admin/audit?entityType=SystemSetting&limit=8');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAuditLogs(res.data.data);
      }
    } catch (err) {
      // Non-blocking
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [isTestMode]);

  const handleToggleMode = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (isTestMode) {
        await disableTestMode();
        setSuccessMsg('Test Mode disabled. Clock synchronized to real server time.');
      } else {
        await enableTestMode();
        setSuccessMsg('Test Mode enabled. System clock decoupled from hardware time.');
      }
      loadAuditLogs();
    } catch (err) {
      setErrorMsg(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTargetTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDatetime) return;
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await setTestTime(new Date(targetDatetime));
      setSuccessMsg(`Simulated time applied: ${targetDatetime.replace('T', ' ')}`);
      loadAuditLogs();
    } catch (err) {
      setErrorMsg(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAdvance = async (minutes: number) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await advanceTestTime(minutes);
      setSuccessMsg(`System time jumped forward by ${minutes} minute(s).`);
      loadAuditLogs();
    } catch (err) {
      setErrorMsg(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleJumpToPeriod = async (timeStr: string, label: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const newDate = new Date(effectiveDate);
      newDate.setHours(h, m, 0, 0);
      await setTestTime(newDate);
      setSuccessMsg(`Jumped directly to ${label} (${timeStr})`);
      loadAuditLogs();
    } catch (err) {
      setErrorMsg(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset simulated system clock back to real physical server time?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await resetSystemTime();
      setSuccessMsg('System time reset to actual physical server time.');
      loadAuditLogs();
    } catch (err) {
      setErrorMsg(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePlaybackChange = async (speed: number, paused: boolean) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await setPlayback(speed, paused);
      setSuccessMsg(paused ? 'Simulated clock paused.' : `Playback speed updated to ${speed}x.`);
    } catch (err) {
      setErrorMsg(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Manage &amp; Settings</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-cyan-400 font-semibold">System Time Control</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-cyan-400" />
            System Time Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centrally control the college operational clock, timetable evaluation, and biometric attendance engine.
          </p>
        </div>

        {/* Mode Toggle Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleMode}
            disabled={loading}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
              isTestMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isTestMode ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
            <span>{isTestMode ? 'TEST MODE ACTIVE' : 'REAL TIME MODE'}</span>
            <span className="text-[10px] opacity-75 font-normal ml-1">
              (Click to {isTestMode ? 'Disable' : 'Enable Test Mode'})
            </span>
          </button>

          {isTestMode && (
            <button
              onClick={handleReset}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"
              title="Reset immediately to physical real server time"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Warning banner when Test Mode is active */}
      {isTestMode && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex items-start gap-3 shadow-lg">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-300">Simulated Clock Active</p>
            <p className="text-[11px] text-amber-200/80 mt-0.5">
              All timetable periods, biometric attendance sessions, auto-absent evaluations, and portal views are currently operating under this simulated test time. Physical server audit logs preserve true real-world timestamps.
            </p>
          </div>
        </div>
      )}

      {/* Live Clocks Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Physical Server Real Time */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Physical Server Hardware Clock
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              Read-Only
            </span>
          </div>

          <div className="text-3xl lg:text-4xl font-mono font-black text-slate-100 tracking-tight">
            {realFormattedTime}
          </div>
          <div className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{realFormattedDate}</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-mono font-bold">Asia/Kolkata (IST)</span>
          </div>
        </div>

        {/* System Effective Time */}
        <div className={`p-5 rounded-2xl border shadow-xl relative overflow-hidden ${
          isTestMode
            ? 'bg-gradient-to-br from-amber-950/40 to-slate-900 border-amber-500/50 shadow-amber-950/20'
            : 'bg-gradient-to-br from-cyan-950/40 to-slate-900 border-cyan-500/40 shadow-cyan-950/20'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold flex items-center gap-1.5 text-cyan-300">
              <span className={`w-2 h-2 rounded-full ${isTestMode ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400'}`}></span>
              Active System Operational Time
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold tracking-wider uppercase border ${
              isTestMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
            }`}>
              {status?.mode || 'REAL_TIME'}
            </span>
          </div>

          <div className="text-3xl lg:text-4xl font-mono font-black text-cyan-200 tracking-tight">
            {formattedTime}
          </div>
          <div className="text-xs font-semibold text-slate-300 mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>{formattedDate}</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400 font-mono font-bold">Asia/Kolkata (IST)</span>
          </div>

          {/* Current Period Badge */}
          <div className={`mt-3.5 px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${periodColor}`}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{currentPeriodLabel}</span>
          </div>
        </div>
      </div>

      {/* Test Controls (Enabled only when Test Mode is active) */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isTestMode
          ? 'bg-slate-900/90 border-slate-700 shadow-2xl'
          : 'bg-slate-900/40 border-slate-800 opacity-60 pointer-events-none'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FastForward className="w-5 h-5 text-amber-400" />
            Simulated Time Controls
          </h2>
          <span className="text-xs text-slate-400">
            {isTestMode ? 'Test controls unlocked' : 'Enable Test Mode to use controls'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Date & Time Picker */}
          <form onSubmit={handleApplyTargetTime} className="space-y-4">
            <label className="block text-xs font-bold text-slate-300">
              Set Specific Target Date &amp; Time:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={targetDatetime}
                onChange={(e) => setTargetDatetime(e.target.value)}
                disabled={!isTestMode || loading}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="submit"
                disabled={!isTestMode || loading}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow-md disabled:opacity-50"
              >
                Apply Time
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Target date automatically activates scheduled classes for that date.
            </p>
          </form>

          {/* 2. Playback Speed & Pause */}
          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-300">
              Playback Speed &amp; Clock State:
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handlePlaybackChange(speedMultiplier, !isPaused)}
                disabled={!isTestMode || loading}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isPaused
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-amber-600 text-white hover:bg-amber-500'
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Resume Clock' : 'Pause Clock'}</span>
              </button>

              {[1, 2, 5, 10, 60].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handlePlaybackChange(speed, isPaused)}
                  disabled={!isTestMode || loading}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                    speedMultiplier === speed
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Accelerate time to test period transitions, lunch blocks, and auto-absent timeouts.
            </p>
          </div>
        </div>

        {/* Quick Advance Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <label className="block text-xs font-bold text-slate-300 mb-2.5">
            Quick Advance Offsets:
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleAdvance(1)}
              disabled={!isTestMode || loading}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold font-mono transition-all"
            >
              +1 Minute
            </button>
            <button
              onClick={() => handleAdvance(10)}
              disabled={!isTestMode || loading}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold font-mono transition-all"
            >
              +10 Minutes
            </button>
            <button
              onClick={() => handleAdvance(60)}
              disabled={!isTestMode || loading}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold font-mono transition-all"
            >
              +1 Hour
            </button>
            <button
              onClick={() => handleAdvance(1440)}
              disabled={!isTestMode || loading}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold font-mono transition-all"
            >
              +1 Day (Next Date)
            </button>
          </div>
        </div>

        {/* Quick Jump to College Period Shortcuts */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <label className="block text-xs font-bold text-slate-300 mb-2.5">
            Direct Period Shortcuts (Today):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { time: '09:05', label: 'Hour 1', tag: '09:05 AM' },
              { time: '10:05', label: 'Hour 2', tag: '10:05 AM' },
              { time: '11:05', label: 'Hour 3', tag: '11:05 AM' },
              { time: '12:30', label: 'Lunch', tag: '12:30 PM' },
              { time: '13:05', label: 'Hour 4', tag: '01:05 PM' },
              { time: '14:05', label: 'Hour 5', tag: '02:05 PM' },
              { time: '15:05', label: 'Hour 6', tag: '03:05 PM' },
              { time: '16:15', label: 'After Hours', tag: '04:15 PM' },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => handleJumpToPeriod(p.time, p.label)}
                disabled={!isTestMode || loading}
                className="p-2 rounded-xl bg-slate-950 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-700 text-left transition-all"
              >
                <div className="text-[11px] font-bold text-slate-200">{p.label}</div>
                <div className="text-[10px] font-mono text-cyan-400 mt-0.5">{p.tag}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            System Time Control Audit Trail
          </h2>
          <span className="text-[11px] text-slate-500">Real hardware timestamp recorded</span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">No recent time modifications recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase font-mono text-slate-400 bg-slate-950 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Real Server Timestamp</th>
                  <th className="px-3 py-2">Details</th>
                  <th className="px-3 py-2">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {auditLogs.map((log: any) => (
                  <tr key={log._id || log.id} className="hover:bg-slate-800/40">
                    <td className="px-3 py-2 font-bold text-cyan-400">
                      {log.action}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {new Date(log.createdAt || log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="px-3 py-2 text-slate-400 truncate max-w-xs">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
