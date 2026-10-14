/**
 * ParentAttendanceHistory.tsx — Parent Ward Attendance Portal ("My Ward's Attendance")
 * BIT Enterprise Suite IoT Biometric Attendance System
 *
 * Provides:
 * - Direct view for single ward / interactive switcher tabs for multiple wards
 * - Helpful empty state if no wards linked
 * - Low attendance warning banner when overall attendance < 75%
 * - Standardized formula percentage (null -> 'N/A' when 0 classes)
 * - Subject-wise breakdown cards with progress bars and click-to-filter
 * - Date-wise attendance history (Cards & Table views) with Forenoon/Afternoon slots,
 *   biometric verification timestamps, and scanner terminal device names
 * - Multi-criteria filters: Date range (from/to), Subject, Status, Search
 * - Real-time Socket.IO attendance update listeners
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { Badge } from '../../components/common/Badge';
import {
  CheckSquare,
  MapPin,
  Clock,
  Calendar,
  User,
  Filter,
  Search,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scan,
  TrendingUp,
  LayoutGrid,
  List,
  BookOpen,
  RefreshCw,
  Phone,
  Mail,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const ParentAttendanceHistory: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [wards, setWards] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(searchParams.get('studentId') || '');
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [subjectBreakdown, setSubjectBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wardsLoading, setWardsLoading] = useState(true);
  const { socket } = useSocket();

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Load parent wards
  const fetchWards = useCallback(async () => {
    try {
      setWardsLoading(true);
      const res = await api.get('/parent/wards');
      if (res.data.success) {
        const list = res.data.data || [];
        setWards(list);
        if (list.length > 0 && !selectedStudentId) {
          setSelectedStudentId(list[0].studentId);
        }
      }
    } catch (err) {
      console.error('Error fetching parent wards:', err);
    } finally {
      setWardsLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    fetchWards();
  }, [fetchWards]);

  // Fetch attendance records and subject breakdown for selected ward
  const fetchRecords = useCallback(async () => {
    if (!selectedStudentId) return;
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (subjectFilter) params.subjectId = subjectFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (monthFilter) params.month = monthFilter;

      const [historyRes, summaryRes] = await Promise.all([
        api.get(`/parent/wards/${selectedStudentId}/attendance`, { params }),
        api.get(`/parent/wards/${selectedStudentId}/summary`).catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (historyRes.data.success) {
        setRecords(historyRes.data.data || []);
        if (historyRes.data.summary) setSummary(historyRes.data.summary);
        if (historyRes.data.pagination) setPagination(historyRes.data.pagination);
      }

      if (summaryRes.data.success) {
        setSubjectBreakdown(summaryRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching ward attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId, statusFilter, subjectFilter, startDate, endDate, monthFilter, page]);

  useEffect(() => {
    if (selectedStudentId) {
      setSearchParams({ studentId: selectedStudentId });
      fetchRecords();
    }
  }, [selectedStudentId, fetchRecords, setSearchParams]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchRecords();
    };

    socket.on('attendance.marked', handleUpdate);
    socket.on('attendance.created', handleUpdate);
    socket.on('attendance.updated', handleUpdate);
    return () => {
      socket.off('attendance.marked', handleUpdate);
      socket.off('attendance.created', handleUpdate);
      socket.off('attendance.updated', handleUpdate);
    };
  }, [socket, fetchRecords]);

  const filteredRecords = useMemo(() => {
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
    filteredRecords.forEach((r) => {
      const d =
        r.formattedDate ||
        (r.date
          ? new Date(r.date).toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : 'Other Sessions');

      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d)!.push(r);
    });
    return map;
  }, [filteredRecords]);

  const currentWard = wards.find((w) => w.studentId === selectedStudentId);

  // Empty state: No wards linked
  if (!wardsLoading && wards.length === 0) {
    return (
      <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-4 max-w-lg mx-auto mt-10">
        <GraduationCap className="w-12 h-12 text-blue-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Wards Linked</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          No student profiles are currently associated with your parent account. Please contact the college administration office to link your ward's student record.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider font-mono">
            PARENT PORTAL
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-blue-400" />
            My Ward's Attendance
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time biometric attendance records, period-wise scans, subject breakdown, and institutional compliance monitoring.
          </p>
        </div>

        {/* View Switcher & Refresh */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => fetchRecords()}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh Attendance"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white shadow-md'
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
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ward Selector: Multiple Wards Tabs */}
      {wards.length > 1 && (
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 overflow-x-auto">
          {wards.map((w) => {
            const isSelected = w.studentId === selectedStudentId;
            return (
              <button
                key={w.studentId}
                onClick={() => {
                  setSelectedStudentId(w.studentId);
                  setPage(1);
                  setSubjectFilter('');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>{w.name}</span>
                <span className="text-[10px] opacity-75 font-mono">
                  ({w.department || 'Dept'} - Sec {w.section || '—'})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Single Ward Profile Banner */}
      {currentWard && (
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                {currentWard.name}
                <span className="font-mono text-blue-400 text-xs">({currentWard.registerNumber})</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {currentWard.department} · Sec {currentWard.section} · Year {currentWard.year || '—'} · Sem{' '}
                {currentWard.semester || '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${
                currentWard.biometricStatus === 'ENROLLED'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-900 text-slate-500 border-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {currentWard.biometricStatus || 'NOT ENROLLED'}
            </span>
          </div>
        </div>
      )}

      {/* Low Attendance Warning Alert Banner */}
      {summary && summary.attendancePercentage !== null && summary.attendancePercentage < 75 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 shadow-lg flex items-start gap-3.5 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-black text-rose-200 tracking-wide uppercase">
              Institutional Attendance Warning — Below 75% Requirement
            </div>
            <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
              {currentWard?.name || 'Your ward'} currently has an overall attendance of{' '}
              <span className="font-mono font-black text-white underline">
                {summary.attendancePercentage.toFixed(1)}%
              </span>
              , which falls below the mandatory 75% threshold. Please ensure immediate regular attendance across all scheduled class periods to avoid semester condonation or exam hall-ticket restrictions.
            </p>
          </div>
        </div>
      )}

      {/* Top Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Attendance Percentage */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-800/50 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">Overall Attendance</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {summary.attendancePercentage !== null ? `${summary.attendancePercentage.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="mt-2 text-[11px] flex items-center gap-1.5">
              {summary.attendancePercentage === null ? (
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                  NO EVALUATED CLASSES YET
                </span>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                    summary.attendancePercentage >= 75
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {summary.attendancePercentage >= 75 ? 'ELIGIBLE (≥75%)' : 'DEFAULTER (<75%)'}
                </span>
              )}
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

      {/* Subject Breakdown Cards Section */}
      {subjectBreakdown.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-blue-400" /> Subject-wise Attendance Breakdown (Click to filter)
            </h3>
            {subjectFilter && (
              <button
                onClick={() => setSubjectFilter('')}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
              >
                Clear Subject Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {subjectBreakdown.map((sub: any) => {
              const isSelected = subjectFilter === sub.subjectId;
              const pct = sub.percentage;
              return (
                <button
                  key={sub.subjectId}
                  onClick={() =>
                    setSubjectFilter((prev) => (prev === sub.subjectId ? '' : sub.subjectId))
                  }
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-950/60 border-blue-500 shadow-xl shadow-blue-950/30 ring-1 ring-blue-500'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                        {sub.subjectCode}
                      </span>
                      <div className="text-xs font-bold text-white mt-1.5 line-clamp-1">
                        {sub.subjectName}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        pct === null
                          ? 'bg-slate-800 text-slate-400'
                          : pct >= 75
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {pct !== null ? `${pct.toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      Attended: {sub.attendedClasses || sub.presentClasses || 0}/{sub.totalClasses}
                    </span>
                    <span>{sub.facultyName}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct === null
                          ? 'bg-slate-700 w-0'
                          : pct >= 75
                          ? 'bg-emerald-500'
                          : pct >= 65
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(pct || 0, 100)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subject, faculty, device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Subject Dropdown */}
            {subjectBreakdown.length > 0 && (
              <select
                value={subjectFilter}
                onChange={(e) => {
                  setSubjectFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Subjects</option>
                {subjectBreakdown.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>
                    {s.subjectCode} - {s.subjectName}
                  </option>
                ))}
              </select>
            )}

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late Arrival</option>
              <option value="ABSENT">Absent</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-blue-400" /> Date Range:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {(startDate || endDate || subjectFilter || statusFilter || searchQuery) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSubjectFilter('');
                setStatusFilter('');
                setSearchQuery('');
                setPage(1);
              }}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse">
          Loading verified biometric attendance records for {currentWard?.name || 'ward'}...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No attendance records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No biometric attendance records matched your filter criteria for {currentWard?.name || 'this ward'}.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card View */
        <div className="space-y-6">
          {Array.from(groupedByDate.entries()).map(([dateHeader, dayRecords]) => (
            <div key={dateHeader} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-2.5 px-1">
                <Calendar className="w-4 h-4 text-blue-400" />
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
                          <div
                            className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-mono border shrink-0 ${
                              isPresent
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : isAbsent
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : 'bg-slate-950 text-blue-300 border-slate-800'
                            }`}
                          >
                            <span className="text-[8px] uppercase font-bold">Hour</span>
                            <span className="text-sm font-black">{r.periodNumber || 1}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-white text-sm">
                                {r.subjectName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
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
                          {r.status === 'PRESENT' && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black font-mono tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 shadow-md shadow-emerald-950/40">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              PRESENT
                            </span>
                          )}
                          {r.status === 'LATE' && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black font-mono tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-md shadow-amber-950/40">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              LATE
                            </span>
                          )}
                          {r.status === 'ABSENT' && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black font-mono tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              ABSENT
                            </span>
                          )}
                          {r.status === 'EXCUSED' && (
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
                          <Scan className="w-3 h-3 text-blue-400" />
                          <span>{r.deviceName || 'Terminal Biometric Scanner'}</span>
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
                {filteredRecords.map((r) => (
                  <tr key={r.id || r._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      Hour {r.periodNumber || 1}
                      <span className="text-[10px] text-slate-500 font-normal block">{r.slot}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-100 block">{r.subjectName}</span>
                        <span className="font-mono text-[10px] text-blue-400">{r.subjectCode}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {r.formattedDate || r.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>{r.verificationTime || r.biometricTime || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {r.deviceName || 'Biometric Scanner'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{r.facultyName}</div>
                      <div className="text-[10px] text-slate-500">{r.classroom}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === 'PRESENT' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          PRESENT
                        </span>
                      )}
                      {r.status === 'LATE' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          LATE
                        </span>
                      )}
                      {r.status === 'ABSENT' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          ABSENT
                        </span>
                      )}
                      {r.status === 'EXCUSED' && <Badge status={r.status} />}
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
