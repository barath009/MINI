import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import {
  CheckSquare,
  MapPin,
  Clock,
  Calendar,
  User,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Scan,
  TrendingUp,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';

export const StudentAttendanceHistory: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (monthFilter) params.month = monthFilter;

      const res = await api.get('/student/attendance', { params });
      if (res.data.success) {
        setRecords(res.data.data || []);
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, monthFilter, page]);

  const filtered = useMemo(() => {
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.subjectName?.toLowerCase().includes(q) ||
        r.subjectCode?.toLowerCase().includes(q) ||
        r.facultyName?.toLowerCase().includes(q) ||
        r.classroom?.toLowerCase().includes(q) ||
        r.deviceName?.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  // Group records by Date (descending)
  const groupedByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    filtered.forEach((r) => {
      const d = r.formattedDate || (r.date ? new Date(r.date).toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) : 'Other Sessions');

      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d)!.push(r);
    });
    return map;
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider font-mono">
            STUDENT PORTAL
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-cyan-400" />
            My Attendance History
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Hourly biometric attendance verified by IoT facial recognition scanners with server audit stamps.
          </p>
        </div>

        {/* View Switcher (Cards vs Table) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'cards'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'table'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Top Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Attendance Percentage */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-800/50 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Attendance Percentage</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {summary.attendancePercentage?.toFixed(1) || '100.0'}%
            </div>
            <div className="mt-2 text-[11px] flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                summary.attendancePercentage >= 75
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {summary.attendancePercentage >= 75 ? 'ELIGIBLE (>=75%)' : 'DEFAULTER (<75%)'}
              </span>
            </div>
          </div>

          {/* Card 2: Total Classes Present */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/50 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Classes Attended</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-emerald-300 font-mono">
              {summary.presentCount || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Out of {summary.totalEligibleClasses || 0} total evaluated periods
            </p>
          </div>

          {/* Card 3: Total Classes Absent */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-800/50 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Classes Absent</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl font-black text-rose-300 font-mono">
              {summary.absentCount || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {summary.lateCount ? `${summary.lateCount} late arrivals recorded` : 'Unexcused period absences'}
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center shadow-lg">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subject, faculty, device..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late Arrival</option>
            <option value="ABSENT">Absent</option>
            <option value="EXCUSED">Excused</option>
          </select>

          <input
            type="month"
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
          {monthFilter && (
            <button
              onClick={() => setMonthFilter('')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Clear Month
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse">
          Loading verified biometric attendance records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No attendance records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No biometric attendance records matched your filter criteria.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card View matching user screenshot */
        <div className="space-y-6">
          {Array.from(groupedByDate.entries()).map(([dateHeader, dayRecords]) => (
            <div key={dateHeader} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-2.5 px-1">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-extrabold text-white tracking-wide">
                  {dateHeader}
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  ({dayRecords.length} Period{dayRecords.length > 1 ? 's' : ''})
                </span>
              </div>

              {/* Period Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {dayRecords.map((r: any) => {
                  const isPresent = r.status === 'PRESENT' || r.status === 'LATE';
                  const isAbsent = r.status === 'ABSENT';

                  return (
                    <div
                      key={r.id || r._id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isPresent
                          ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-700/60 shadow-lg'
                          : isAbsent
                          ? 'bg-rose-950/15 border-rose-900/40 hover:border-rose-700/60'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Hour & Subject Info */}
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-mono border shrink-0 ${
                            isPresent
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : isAbsent
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : 'bg-slate-950 text-cyan-300 border-slate-800'
                          }`}>
                            <span className="text-[8px] uppercase font-bold">Hour</span>
                            <span className="text-sm font-black">{r.periodNumber || 1}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-white text-sm">
                                {r.subjectName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                                {r.subjectCode}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                              <span className="flex items-center gap-1 font-mono text-slate-300 text-[11px]">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {r.startTime || '09:00'} – {r.endTime || '10:00'} ({r.slot || 'Forenoon'})
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-500" />
                                {r.facultyName}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {r.classroom}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Pill */}
                        <div className="shrink-0">
                          {isPresent && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black font-mono tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 shadow-md shadow-emerald-950/40">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              PRESENT
                            </span>
                          )}
                          {isAbsent && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black font-mono tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              ABSENT
                            </span>
                          )}
                          {!isPresent && !isAbsent && (
                            <Badge status={r.status} />
                          )}
                        </div>
                      </div>

                      {/* Biometric Verification Footer */}
                      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                        {isPresent ? (
                          <div className="flex items-center gap-2 text-emerald-300 font-mono">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Punch Time: {r.verificationTime || r.biometricTime}
                            </span>
                          </div>
                        ) : (
                          <div className="text-rose-400/80 font-mono text-[10px]">
                            Auto-finalized Absent (Unscanned after period ended)
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                          <Scan className="w-3 h-3 text-cyan-400" />
                          <span>{r.deviceName || 'Hall Biometric Scanner'}</span>
                          {r.isTestMode && (
                            <span className="ml-1 text-[9px] text-amber-400 font-bold">(Test Scan)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Verification Time</th>
                  <th className="py-3 px-4">Biometric Terminal</th>
                  <th className="py-3 px-4">Faculty &amp; Room</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((r) => (
                  <tr key={r.id || r._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                      Hour {r.periodNumber || 1}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-100 block">{r.subjectName}</span>
                        <span className="font-mono text-[10px] text-cyan-400">{r.subjectCode}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {r.formattedDate || r.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{r.verificationTime || r.biometricTime || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {r.deviceName || 'Biometric Device'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{r.facultyName}</div>
                      <div className="text-[10px] text-slate-500">{r.classroom}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="py-3 px-4 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing Page {page} of {pagination.totalPages} ({pagination.total} Records)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
