/**
 * SessionLiveAttendance.tsx
 *
 * Full real-time attendance roster for a session.
 * Shows ALL allocated students — PRESENT (with entry time) or ABSENT (by default).
 * Updates instantly via Socket.IO when a student's attendance is marked.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { ManualOverrideModal } from '../../components/common/ManualOverrideModal';
import {
  CheckSquare, Edit, Clock, UserCheck, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, Search, Users,
} from 'lucide-react';

interface AttendanceRow {
  _id: string;
  studentId: {
    _id: string;
    registerNumber: string;
    userId?: { name: string; email?: string };
    departmentId?: { name: string };
  };
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  timestamp: string | null;
  recognitionMethod: string | null;
  confidenceScore: number | null;
  markedBy: string | null;
  isVirtual?: boolean;
}

export const FacultySessionLiveAttendance: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sessionData, setSessionData] = useState<any>(null);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, late: 0, absent: 0 });
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LATE'>('ALL');
  const [lastUpdated, setLastUpdated] = useState('');
  const { socket } = useSocket();

  const fetchSessionDetails = useCallback(async () => {
    try {
      const res = await api.get(`/faculty/attendance/${sessionId}`);
      if (res.data.success) {
        setSessionData(res.data.data.session);
        setRecords(res.data.data.records || []);
        setSummary(res.data.data.summary || { total: 0, present: 0, late: 0, absent: 0 });
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to load session attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionDetails();
  }, [fetchSessionDetails]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchSessionDetails();
    socket.on('attendance.created', refresh);
    socket.on('attendance.updated', refresh);
    socket.on('attendance.marked', refresh);
    if (sessionData?.sessionId) socket.emit('join_session', sessionData.sessionId);
    return () => {
      socket.off('attendance.created', refresh);
      socket.off('attendance.updated', refresh);
      socket.off('attendance.marked', refresh);
    };
  }, [socket, sessionData?.sessionId, fetchSessionDetails]);

  // Filter + search
  const visible = records.filter((r) => {
    const name = r.studentId?.userId?.name?.toLowerCase() || '';
    const reg = r.studentId?.registerNumber?.toLowerCase() || '';
    const q = search.toLowerCase();
    const matchSearch = !q || name.includes(q) || reg.includes(q);
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const percentage = summary.total > 0
    ? (((summary.present + summary.late) / summary.total) * 100).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
        Loading attendance roster...
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="p-8 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <p className="text-sm text-slate-300 font-semibold">Session not found</p>
        <p className="text-xs text-slate-500">The session ID may be invalid or the session has not started yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sessionData?.status === 'ACTIVE' ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`} />
              <span className={`font-extrabold text-xs uppercase tracking-wider ${sessionData?.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-400'}`}>
                {sessionData?.status === 'ACTIVE' ? 'LIVE ATTENDANCE MONITORING' : `SESSION ${sessionData?.status}`}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-white">
              {sessionData?.subjectId?.name}
              {sessionData?.subjectId?.code && <span className="text-slate-400 font-normal text-base ml-2">({sessionData.subjectId.code})</span>}
            </h1>
            <p className="text-xs text-slate-400">
              Room: <span className="font-bold text-cyan-400">{sessionData?.classroomId?.building} - {sessionData?.classroomId?.roomNumber}</span>
              {sessionData?.sectionId?.name && <> | Section: <span className="font-bold text-violet-300">{sessionData.sectionId.name}</span></>}
              {' '}| {sessionData?.startTime} – {sessionData?.endTime}
            </p>
          </div>

          {/* KPI counters */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Total', value: summary.total, color: 'text-slate-300' },
              { label: 'Present', value: summary.present, color: 'text-emerald-400' },
              { label: 'Late', value: summary.late, color: 'text-amber-400' },
              { label: 'Absent', value: summary.absent, color: 'text-rose-400' },
              { label: 'Rate', value: `${percentage}%`, color: 'text-cyan-400' },
            ].map((k) => (
              <div key={k.label} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center min-w-[60px]">
                <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">{k.label}</p>
              </div>
            ))}
            <button onClick={fetchSessionDetails} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {lastUpdated && (
          <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Last synced: {lastUpdated} ·
            <span className="text-emerald-400 font-semibold">Socket.IO live updates active</span>
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="glass-card flex-1 p-3 rounded-2xl border border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search student by name or register number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 w-full"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['ALL', 'PRESENT', 'LATE', 'ABSENT'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                filterStatus === s
                  ? s === 'PRESENT' ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                  : s === 'LATE' ? 'bg-amber-950 border-amber-700 text-amber-300'
                  : s === 'ABSENT' ? 'bg-rose-950 border-rose-700 text-rose-300'
                  : 'bg-slate-800 border-slate-600 text-slate-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              {s}
              {s === 'PRESENT' && <span className="ml-1 opacity-60">({summary.present})</span>}
              {s === 'LATE' && <span className="ml-1 opacity-60">({summary.late})</span>}
              {s === 'ABSENT' && <span className="ml-1 opacity-60">({summary.absent})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Full Attendance Roster
            <span className="text-[11px] text-slate-500 font-normal">({visible.length} shown)</span>
          </h2>
          {sessionData?.status === 'ACTIVE' && (
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Live Push Active
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Register No.</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Entry Time</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4 text-right">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500 text-xs italic">
                    No records match your filter.
                  </td>
                </tr>
              ) : (
                visible.map((r, idx) => {
                  const isPresent = r.status === 'PRESENT';
                  const isLate = r.status === 'LATE';
                  const isAbsent = r.status === 'ABSENT';

                  return (
                    <tr
                      key={r._id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isPresent ? 'border-l-2 border-emerald-600/60'
                        : isLate ? 'border-l-2 border-amber-600/60'
                        : 'border-l-2 border-rose-800/40 opacity-80'
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-600 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">{r.studentId?.registerNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-100">{r.studentId?.userId?.name}</td>
                      <td className="py-3 px-4 text-slate-400">{r.studentId?.departmentId?.name || '—'}</td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> PRESENT
                          </span>
                        ) : isLate ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 font-bold text-[11px]">
                            <Clock className="w-3.5 h-3.5" /> LATE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-800/60 text-rose-300 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" /> ABSENT
                          </span>
                        )}
                      </td>

                      {/* Entry time */}
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {r.timestamp
                          ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : <span className="text-slate-600">Not arrived</span>}
                      </td>

                      {/* Method */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {r.recognitionMethod
                          ? r.recognitionMethod.replace(/_/g, ' ')
                          : <span className="text-slate-700">—</span>}
                      </td>

                      {/* Confidence */}
                      <td className="py-3 px-4 font-mono text-cyan-400">
                        {r.confidenceScore != null
                          ? `${(r.confidenceScore * 100).toFixed(0)}%`
                          : <span className="text-slate-700">—</span>}
                      </td>

                      {/* Override button — enabled for ALL students including absent */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedRecord(r)}
                          title="Manual Override"
                          className="px-2.5 py-1.5 rounded-lg text-[11px] inline-flex items-center gap-1 font-semibold transition-colors bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
                        >
                          <Edit className="w-3.5 h-3.5" /> Override
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Override Modal */}
      {selectedRecord && (
        <ManualOverrideModal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          record={selectedRecord}
          onSuccess={fetchSessionDetails}
        />
      )}
    </div>
  );
};
