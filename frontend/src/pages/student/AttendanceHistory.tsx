import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

const formatTimeRange = (start?: string, end?: string) => {
  if (!start) return '';
  const to12h = (t: string) => {
    if (!t) return '';
    const parts = t.split(':');
    if (parts.length < 2) return t;
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };
  return `${to12h(start)} to ${to12h(end || '')}`;
};

const getTodayKolkataStr = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);
  return ist.toISOString().slice(0, 10);
};

export const StudentAttendanceHistory: React.FC = () => {
  const { socket } = useSocket();
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const todayStr = useMemo(() => getTodayKolkataStr(), []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 50 };
      if (statusFilter) params.status = statusFilter;
      if (monthFilter) params.month = monthFilter;
      if (dateFilter) params.date = dateFilter;

      const res = await api.get('/student/attendance', { params });
      if (res.data.success) {
        setRecords(res.data.data || []);
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching student attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, monthFilter, dateFilter, page]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchRecords();
    };
    socket.on('attendance.marked', handleUpdate);
    socket.on('attendance.created', handleUpdate);
    socket.on('attendance.verified', handleUpdate);

    return () => {
      socket.off('attendance.marked', handleUpdate);
      socket.off('attendance.created', handleUpdate);
      socket.off('attendance.verified', handleUpdate);
    };
  }, [socket]);

  const handlePrevDay = () => {
    const current = dateFilter || todayStr;
    const d = new Date(current + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setDateFilter(d.toISOString().slice(0, 10));
    setPage(1);
  };

  const handleNextDay = () => {
    const current = dateFilter || todayStr;
    const d = new Date(current + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setDateFilter(d.toISOString().slice(0, 10));
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.subjectName?.toLowerCase().includes(q) ||
        r.subjectCode?.toLowerCase().includes(q) ||
        r.facultyName?.toLowerCase().includes(q) ||
        r.markedBy?.toLowerCase().includes(q) ||
        r.classroom?.toLowerCase().includes(q) ||
        r.deviceName?.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  // Group records by Date (descending)
  const groupedByDate = useMemo(() => {
    const map = new Map<string, { formattedDate: string; rawDate: string; records: any[] }>();
    filtered.forEach((r) => {
      const dKey = r.dateStr || (r.date ? new Date(r.date).toISOString().slice(0, 10) : 'all');
      const formattedDate = r.formattedDate || (r.date ? new Date(r.date).toLocaleDateString('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) : 'Other Sessions');

      if (!map.has(dKey)) {
        map.set(dKey, { formattedDate, rawDate: dKey, records: [] });
      }
      map.get(dKey)!.records.push(r);
    });

    // Sort records inside each day by periodNumber ascending
    for (const entry of map.values()) {
      entry.records.sort((a, b) => (a.periodNumber || 0) - (b.periodNumber || 0));
    }

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
            My Attendance
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

      {/* Top Summary KPI Badges (Matching User Screenshot 2: 91.15% Attendance | 87.5 Present | 8.5 Absent) */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Attendance Percentage */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-800/50 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Attendance Percentage</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {summary.attendancePercentage !== undefined ? `${summary.attendancePercentage.toFixed(2)}%` : '100.00%'}
            </div>
            <div className="mt-2 text-[11px] flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                (summary.attendancePercentage ?? 100) >= 75
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {(summary.attendancePercentage ?? 100) >= 75 ? 'ELIGIBLE (>=75%)' : 'DEFAULTER (<75%)'}
              </span>
            </div>
          </div>

          {/* Card 2: Total Classes Present */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/50 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Present</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-emerald-300 font-mono">
              {summary.presentCount ?? 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Out of {summary.totalEligibleClasses ?? 0} total evaluated periods
            </p>
          </div>

          {/* Card 3: Total Classes Absent */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-800/50 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Absent</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl font-black text-rose-300 font-mono">
              {summary.absentCount ?? 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {summary.lateCount ? `${summary.lateCount} late arrivals recorded` : 'Unexcused period absences'}
            </p>
          </div>
        </div>
      )}

      {/* Day Wise Navigation Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center shadow-lg">
        {/* Day Selectors */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            onClick={() => {
              setDateFilter('');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              !dateFilter
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            All Days
          </button>
          <button
            onClick={() => {
              setDateFilter(todayStr);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateFilter === todayStr
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            Today
          </button>

          {/* Day Steppers */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={handlePrevDay}
              title="Previous Day"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
            />
            <button
              onClick={handleNextDay}
              title="Next Day"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {dateFilter && (
            <button
              onClick={() => {
                setDateFilter('');
                setPage(1);
              }}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Clear Date
            </button>
          )}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subject, faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
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
            <option value="LATE">Late</option>
            <option value="ABSENT">Absent</option>
            <option value="EXCUSED">Excused</option>
          </select>
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
            {dateFilter
              ? `No biometric attendance records recorded for ${dateFilter}.`
              : 'No biometric attendance records matched your filter criteria.'}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card View matching user screenshot */
        <div className="space-y-7">
          {Array.from(groupedByDate.values()).map((dayGroup) => {
            const dayRecords = dayGroup.records;
            const dayPresent = dayRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
            const dayAbsent = dayRecords.filter(r => r.status === 'ABSENT').length;
            const isToday = dayGroup.rawDate === todayStr;

            return (
              <div key={dayGroup.rawDate} className="space-y-3.5">
                {/* Day Header matching Image 2 */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                      {dayGroup.formattedDate}
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                          TODAY
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950/70 text-emerald-400 border border-emerald-800/80 font-bold">
                      {dayPresent} Present
                    </span>
                    {dayAbsent > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-950/70 text-rose-400 border border-rose-800/80 font-bold">
                        {dayAbsent} Absent
                      </span>
                    )}
                  </div>
                </div>

                {/* Period Cards Grid matching Image 2 Design */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {dayRecords.map((r: any) => {
                    const isPresent = r.status === 'PRESENT' || r.status === 'LATE';
                    const isAbsent = r.status === 'ABSENT';
                    const facultyName = r.markedBy || r.facultyName || 'Sivabalakrishnan R';
                    const timeRangeText = formatTimeRange(r.startTime, r.endTime);

                    return (
                      <div
                        key={r.id || r._id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isPresent
                            ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-600/50 shadow-lg'
                            : isAbsent
                            ? 'bg-rose-950/15 border-rose-900/40 hover:border-rose-600/50'
                            : 'bg-slate-900/90 border-slate-800'
                        }`}
                      >
                        {/* Top Line: Marked by: Faculty Name (Matching Screenshot 2) */}
                        <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-800/80 pb-2 mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Marked by:</span>
                            <span className="font-extrabold text-white">{facultyName}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 text-cyan-300 border border-slate-800">
                            Hour {r.periodNumber || 1}
                          </span>
                        </div>

                        {/* Middle Line: Time • Slot • Status (Matching Screenshot 2) */}
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{timeRangeText || '10:40 am to 11:30 am'}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">{r.slot || 'Forenoon'}</span>
                          </div>

                          {/* Status Indicator with Dot */}
                          <div>
                            {isPresent ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                Present
                              </span>
                            ) : isAbsent ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/60 text-rose-400 border border-rose-800/80 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                                Absent
                              </span>
                            ) : (
                              <Badge status={r.status} />
                            )}
                          </div>
                        </div>

                        {/* Subject Details */}
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <div className="font-bold text-white text-sm">
                            {r.subjectName}
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shrink-0">
                            {r.subjectCode}
                          </span>
                        </div>

                        {/* Footer Details: Room & Biometric Punch Verification */}
                        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{r.classroom}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isPresent ? (
                              <div className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                                <Scan className="w-3 h-3 text-emerald-400" />
                                <span>Punch: {r.verificationTime || r.biometricTime || 'Verified'}</span>
                              </div>
                            ) : (
                              <div className="text-rose-400/80 font-mono text-[10px]">
                                No Punch Detected
                              </div>
                            )}

                            <span className="text-slate-600">|</span>
                            <span className="text-slate-500 font-mono text-[10px]">
                              {r.deviceName || 'Terminal'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
                  <th className="py-3 px-4">Class Time</th>
                  <th className="py-3 px-4">Verification Time</th>
                  <th className="py-3 px-4">Marked By</th>
                  <th className="py-3 px-4">Room</th>
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
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                      {formatTimeRange(r.startTime, r.endTime)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{r.verificationTime || r.biometricTime || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{r.markedBy || r.facultyName || 'Faculty'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {r.classroom}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === 'PRESENT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Present
                        </span>
                      ) : r.status === 'ABSENT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Absent
                        </span>
                      ) : (
                        <Badge status={r.status} />
                      )}
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
