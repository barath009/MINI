/**
 * MyStudents.tsx — Faculty view of allocated students
 * Shows today's attendance status (PRESENT with time / ABSENT by default) for each student.
 * Auto-refreshes via Socket.IO attendance events.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { Users, Search, ShieldCheck, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';

export const FacultyMyStudents: React.FC = () => {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState('');
  const { socket } = useSocket();

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get('/faculty/students');
      if (res.data.success) {
        setAllocations(res.data.data);
        setLastRefresh(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Live updates via socket — when any attendance is marked, refresh list
  useEffect(() => {
    if (!socket) return;
    socket.on('attendance.marked', () => fetchStudents());
    socket.on('attendance.created', () => fetchStudents());
    socket.on('attendance.updated', () => fetchStudents());
    return () => {
      socket.off('attendance.marked');
      socket.off('attendance.created');
      socket.off('attendance.updated');
    };
  }, [socket, fetchStudents]);

  const filtered = allocations.filter((a) => {
    const name = a.studentId?.userId?.name || '';
    const reg = a.studentId?.registerNumber || '';
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || reg.toLowerCase().includes(q);
  });

  const presentCount = allocations.filter((a) => a.todayAttendance?.status === 'PRESENT' || a.todayAttendance?.status === 'LATE').length;
  const absentCount = allocations.length - presentCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            My Allocated Students ({allocations.length})
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Live today's attendance status for all your allocated students.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Summary pills */}
          <span className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Present: {presentCount}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-800/60 text-rose-300 font-bold text-xs flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Absent: {absentCount}
          </span>
          <button
            onClick={fetchStudents}
            title="Refresh"
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Last refresh */}
      {lastRefresh && (
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Last updated: {lastRefresh} · Auto-updates via live socket
        </p>
      )}

      {/* Search */}
      <div className="glass-card p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500 ml-2 shrink-0" />
        <input
          type="text"
          placeholder="Search by name or register number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 w-full"
        />
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400 animate-pulse">Loading students...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 italic">
            {allocations.length === 0
              ? 'No students currently allocated to your account.'
              : 'No students match your search.'}
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Register No.</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Today's Status</th>
                <th className="py-3 px-4">Time Marked</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Biometrics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map((a) => {
                const st = a.studentId;
                if (!st) return null;
                const att = a.todayAttendance;
                const isPresent = att?.status === 'PRESENT';
                const isLate = att?.status === 'LATE';
                const isAbsent = !isPresent && !isLate;

                return (
                  <tr
                    key={a._id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isPresent ? 'border-l-2 border-emerald-600/60'
                      : isLate ? 'border-l-2 border-amber-600/60'
                      : 'border-l-2 border-rose-800/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{st.registerNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-100">{st.userId?.name}</td>
                    <td className="py-3 px-4 text-slate-300">{st.departmentId?.name || '—'}</td>
                    <td className="py-3 px-4 text-slate-400">{st.sectionId?.name || '—'}</td>

                    {/* Status badge */}
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

                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {att?.timestamp
                        ? new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-slate-600">—</span>}
                    </td>

                    {/* Recognition method */}
                    <td className="py-3 px-4 text-slate-500">
                      {att?.recognitionMethod
                        ? <span className="capitalize text-[10px] font-mono">{att.recognitionMethod.replace(/_/g, ' ')}</span>
                        : <span className="text-slate-700">—</span>}
                    </td>

                    {/* Biometric status */}
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full font-semibold text-[10px] inline-flex items-center gap-1 border ${
                        st.biometricStatus === 'ENROLLED'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                          : 'bg-slate-900 text-slate-500 border-slate-700'
                      }`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {st.biometricStatus || 'NOT ENROLLED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
