/**
 * MyStudents.tsx — Faculty Student Attendance Dashboard ("My Students & Attendance")
 * BIT Enterprise Suite IoT Biometric Attendance System
 *
 * Provides:
 * - Summary KPI cards (Total Allocated Students, Average Attendance %, Students in Warning Status <75%)
 * - Multi-criteria filter toolbar (Search, Department, Section, Semester, Attendance Status, Date range)
 * - Allocated student table with attendance formula (Present+Late)/Total*100, N/A when 0 classes, Warning status badges
 * - Interactive Detail Drawer/Modal with student profile, overall metrics, subject breakdown with click-to-filter,
 *   and paginated date-wise attendance history with biometric timestamps and scanner device names.
 * - Real-time Socket.IO attendance update listeners.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import {
  Users,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Filter,
  Eye,
  X,
  Calendar,
  BookOpen,
  MapPin,
  Scan,
  User,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

export const FacultyMyStudents: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState('');
  const { socket } = useSocket();

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Detail Modal State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSubjectFilter, setDetailSubjectFilter] = useState('');
  const [detailStatusFilter, setDetailStatusFilter] = useState('');
  const [detailStartDate, setDetailStartDate] = useState('');
  const [detailEndDate, setDetailEndDate] = useState('');
  const [detailPage, setDetailPage] = useState(1);

  // Fetch all allocated students
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (departmentFilter) params.departmentId = departmentFilter;
      if (sectionFilter) params.sectionId = sectionFilter;
      if (semesterFilter) params.semester = semesterFilter;
      if (statusFilter && statusFilter !== 'ALL') params.attendanceStatus = statusFilter;
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/faculty/students', { params });
      if (res.data.success) {
        setStudents(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        setLastRefresh(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Error fetching faculty students:', err);
    } finally {
      setLoading(false);
    }
  }, [departmentFilter, sectionFilter, semesterFilter, statusFilter, search, startDate, endDate]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchStudents();
      if (selectedStudentId) {
        fetchStudentDetail(selectedStudentId);
      }
    };

    socket.on('attendance.marked', handleUpdate);
    socket.on('attendance.created', handleUpdate);
    socket.on('attendance.updated', handleUpdate);
    return () => {
      socket.off('attendance.marked', handleUpdate);
      socket.off('attendance.created', handleUpdate);
      socket.off('attendance.updated', handleUpdate);
    };
  }, [socket, fetchStudents, selectedStudentId]);

  // Fetch student detail when modal opens or detail filters change
  const fetchStudentDetail = async (studentId: string) => {
    try {
      setDetailLoading(true);
      const params: any = { page: detailPage, limit: 15 };
      if (detailSubjectFilter) params.subjectId = detailSubjectFilter;
      if (detailStatusFilter) params.status = detailStatusFilter;
      if (detailStartDate) params.startDate = detailStartDate;
      if (detailEndDate) params.endDate = detailEndDate;

      const res = await api.get(`/faculty/students/${studentId}/attendance`, { params });
      if (res.data.success) {
        setDetailData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching student detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentDetail(selectedStudentId);
    }
  }, [selectedStudentId, detailPage, detailSubjectFilter, detailStatusFilter, detailStartDate, detailEndDate]);

  const openStudentDetail = (studentId: string) => {
    setSelectedStudentId(studentId);
    setDetailPage(1);
    setDetailSubjectFilter('');
    setDetailStatusFilter('');
    setDetailStartDate('');
    setDetailEndDate('');
  };

  const closeStudentDetail = () => {
    setSelectedStudentId(null);
    setDetailData(null);
  };

  // Derive filter dropdown lists from data
  const { departments, sections, semesters } = useMemo(() => {
    const deptMap = new Map<string, string>();
    const secMap = new Map<string, string>();
    const semSet = new Set<number>();

    students.forEach((s) => {
      const st = s.student || s.studentId || {};
      if (st.departmentId && st.department) {
        deptMap.set(st.departmentId.toString(), st.department);
      }
      if (st.sectionId && st.section) {
        secMap.set(st.sectionId.toString(), st.section);
      }
      if (st.semester) {
        semSet.add(st.semester);
      }
    });

    return {
      departments: Array.from(deptMap.entries()).map(([id, name]) => ({ id, name })),
      sections: Array.from(secMap.entries()).map(([id, name]) => ({ id, name })),
      semesters: Array.from(semSet).sort((a, b) => a - b),
    };
  }, [students]);

  // Client-side quick filter fallback if needed
  const displayStudents = students;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider font-mono">
            FACULTY PORTAL
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-cyan-400" />
            My Students &amp; Attendance
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Comprehensive attendance tracking, subject-wise breakdown, and biometric verification logs for allocated students.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchStudents()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Refresh student records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Allocated Students */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Total Allocated Students</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {summary ? summary.totalAllocated : students.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Enrolled across your active class &amp; section allocations
          </p>
        </div>

        {/* Card 2: Average Attendance % */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-950 border border-cyan-800/40 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Average Attendance</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-300 font-mono">
            {summary && summary.averageAttendancePercentage !== null
              ? `${summary.averageAttendancePercentage.toFixed(1)}%`
              : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Cumulative across all finalized class sessions
          </p>
        </div>

        {/* Card 3: Students in Warning Status */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-950 border border-rose-800/40 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Attendance Defaulters (&lt;75%)</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-400 font-mono">
            {summary ? summary.studentsInWarning : 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Students falling below the mandatory 75% threshold
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, register no, or roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Department */}
            {departments.length > 0 && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            {/* Section */}
            {sections.length > 0 && (
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Sec {sec.name}
                  </option>
                ))}
              </select>
            )}

            {/* Semester */}
            {semesters.length > 0 && (
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Semesters</option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    Sem {sem}
                  </option>
                ))}
              </select>
            )}

            {/* Attendance Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Attendance</option>
              <option value="SAFE">Safe (≥75%)</option>
              <option value="WARNING">Warning (65-74.9%)</option>
              <option value="CRITICAL">Critical (&lt;65%)</option>
              <option value="LOW">All Low (&lt;75%)</option>
              <option value="NO_DATA">No Data (N/A)</option>
            </select>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Date Range:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          {(startDate || endDate || departmentFilter || sectionFilter || semesterFilter || statusFilter !== 'ALL' || search) && (
            <button
              onClick={() => {
                setSearch('');
                setDepartmentFilter('');
                setSectionFilter('');
                setSemesterFilter('');
                setStatusFilter('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading allocated student attendance records...
          </div>
        ) : displayStudents.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-slate-300">No allocated students found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {students.length === 0
                ? 'No students are currently allocated to your faculty account.'
                : 'No students matched the active search and filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-extrabold">
                  <th className="py-3 px-4">Register No.</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Dept &amp; Sec</th>
                  <th className="py-3 px-4 text-center">Semester</th>
                  <th className="py-3 px-4 text-center">Eligible Classes</th>
                  <th className="py-3 px-4 text-center text-emerald-400">Present</th>
                  <th className="py-3 px-4 text-center text-rose-400">Absent</th>
                  <th className="py-3 px-4 text-center">Attendance %</th>
                  <th className="py-3 px-4 text-center">Warning Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {displayStudents.map((item) => {
                  const st = item.student || item.studentId || {};
                  const stId = st._id || item._id;
                  const pct = item.attendancePercentage;
                  const warningStatus = item.warningStatus;
                  const isLow = warningStatus === 'WARNING' || warningStatus === 'CRITICAL';

                  return (
                    <tr
                      key={stId}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isLow ? 'border-l-2 border-rose-600/70' : 'border-l-2 border-emerald-600/50'
                      }`}
                    >
                      {/* Register No */}
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">
                        {st.registerNumber}
                      </td>

                      {/* Name & Roll */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{st.name || st.userId?.name}</div>
                        {st.rollNumber && (
                          <div className="text-[10px] font-mono text-slate-500">Roll: {st.rollNumber}</div>
                        )}
                      </td>

                      {/* Dept & Sec */}
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        <div>{st.departmentCode || st.department || '—'}</div>
                        <div className="text-[10px] text-slate-500">Sec {st.section || '—'}</div>
                      </td>

                      {/* Semester */}
                      <td className="py-3 px-4 text-center font-mono text-slate-300">
                        {st.semester ? `Sem ${st.semester}` : '—'}
                      </td>

                      {/* Total Classes */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-200">
                        {item.totalEligibleClasses ?? 0}
                      </td>

                      {/* Present */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                        {(item.presentCount ?? 0) + (item.lateCount ?? 0)}
                      </td>

                      {/* Absent */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">
                        {item.absentCount ?? 0}
                      </td>

                      {/* Attendance % Pill */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {pct === null ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-800/80 text-slate-400 border border-slate-700">
                            N/A
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-black border ${
                              pct >= 75
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                                : pct >= 65
                                ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                                : 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                            }`}
                          >
                            {pct.toFixed(1)}%
                          </span>
                        )}
                      </td>

                      {/* Warning Status Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {warningStatus === 'SAFE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3 h-3" /> SAFE
                          </span>
                        )}
                        {warningStatus === 'WARNING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                            <AlertTriangle className="w-3 h-3" /> WARNING
                          </span>
                        )}
                        {warningStatus === 'CRITICAL' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-300 border border-rose-500/40">
                            <XCircle className="w-3 h-3" /> CRITICAL
                          </span>
                        )}
                        {warningStatus === 'NO_DATA' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-400 border border-slate-700">
                            NO DATA
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => openStudentDetail(stId)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 font-bold text-xs flex items-center gap-1.5 ml-auto transition-all shadow-md"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Attendance</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Detail Drawer / Modal */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    {detailData?.student?.name || 'Student Attendance Details'}
                    {detailData?.student?.registerNumber && (
                      <span className="font-mono text-cyan-400 text-sm">
                        ({detailData.student.registerNumber})
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {detailData?.student?.department || 'Department'} · Sec {detailData?.student?.section || '—'} · Sem{' '}
                    {detailData?.student?.semester || '—'}
                  </p>
                </div>
              </div>

              <button
                onClick={closeStudentDetail}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading && !detailData ? (
                <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
                  Loading detailed attendance history...
                </div>
              ) : (
                <>
                  {/* Student Overall Summary Banner */}
                  {detailData?.summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Cumulative Attendance
                        </span>
                        <div className="text-2xl font-black font-mono text-cyan-400 mt-1">
                          {detailData.summary.attendancePercentage !== null
                            ? `${detailData.summary.attendancePercentage.toFixed(1)}%`
                            : 'N/A'}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {detailData.summary.warningStatus}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Total Classes
                        </span>
                        <div className="text-2xl font-black font-mono text-slate-200 mt-1">
                          {detailData.summary.totalEligibleClasses}
                        </div>
                        <span className="text-[10px] text-slate-400">Evaluated sessions</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Attended
                        </span>
                        <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                          {detailData.summary.presentCount + detailData.summary.lateCount}
                        </div>
                        <span className="text-[10px] text-emerald-500">
                          {detailData.summary.lateCount > 0 ? `(${detailData.summary.lateCount} late)` : 'Present'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Absent
                        </span>
                        <div className="text-2xl font-black font-mono text-rose-400 mt-1">
                          {detailData.summary.absentCount}
                        </div>
                        <span className="text-[10px] text-rose-500">Missed periods</span>
                      </div>
                    </div>
                  )}

                  {/* Low Attendance Warning Alert if <75% */}
                  {detailData?.summary?.isLowAttendance && (
                    <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/80 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-rose-300">
                          Low Attendance Alert (&lt;75%)
                        </div>
                        <p className="text-[11px] text-rose-400/90 mt-0.5">
                          This student is currently in warning/critical status with an overall attendance of{' '}
                          {detailData.summary.attendancePercentage?.toFixed(1)}%. They are at risk of semester condonation penalties.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subject-wise Breakdown Section */}
                  {detailData?.subjectBreakdown && detailData.subjectBreakdown.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-cyan-400" /> Subject-wise Breakdown (Click to filter
                          history)
                        </h3>
                        {detailSubjectFilter && (
                          <button
                            onClick={() => setDetailSubjectFilter('')}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                          >
                            Show All Subjects
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {detailData.subjectBreakdown.map((sub: any) => {
                          const isSelected = detailSubjectFilter === sub.subjectId;
                          const pct = sub.percentage;
                          return (
                            <button
                              key={sub.subjectId}
                              onClick={() =>
                                setDetailSubjectFilter((prev) => (prev === sub.subjectId ? '' : sub.subjectId))
                              }
                              className={`p-3.5 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'bg-cyan-950/50 border-cyan-500 shadow-lg'
                                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                                    {sub.subjectCode}
                                  </span>
                                  <div className="text-xs font-bold text-white mt-1 line-clamp-1">
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

                              <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>
                                  Attended: {sub.attendedClasses}/{sub.totalClasses}
                                </span>
                                <span>{sub.facultyName}</span>
                              </div>

                              {/* Mini Progress Bar */}
                              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
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

                  {/* Date-wise Attendance Records Table */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-cyan-400" /> Date-wise Attendance Logs (
                        {detailData?.pagination?.total ?? 0})
                      </h3>

                      {/* Detail Filters */}
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={detailStatusFilter}
                          onChange={(e) => {
                            setDetailStatusFilter(e.target.value);
                            setDetailPage(1);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                        >
                          <option value="">All Status</option>
                          <option value="PRESENT">Present</option>
                          <option value="LATE">Late</option>
                          <option value="ABSENT">Absent</option>
                          <option value="EXCUSED">Excused</option>
                        </select>

                        <input
                          type="date"
                          value={detailStartDate}
                          onChange={(e) => {
                            setDetailStartDate(e.target.value);
                            setDetailPage(1);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono"
                          title="Start Date"
                        />
                        <input
                          type="date"
                          value={detailEndDate}
                          onChange={(e) => {
                            setDetailEndDate(e.target.value);
                            setDetailPage(1);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono"
                          title="End Date"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Hour &amp; Slot</th>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3">Classroom</th>
                            <th className="py-2.5 px-3">Punch Time</th>
                            <th className="py-2.5 px-3">Scanner Terminal</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {detailData?.records?.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-xs text-slate-500 italic">
                                No attendance records found matching filters.
                              </td>
                            </tr>
                          ) : (
                            detailData?.records?.map((rec: any) => {
                              const isPresent = rec.status === 'PRESENT' || rec.status === 'LATE';
                              return (
                                <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="py-2.5 px-3 font-mono text-slate-200">
                                    {rec.formattedDate || rec.dateStr}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-mono font-bold text-cyan-400">
                                      Period {rec.periodNumber}
                                    </div>
                                    <div className="text-[10px] text-slate-500">{rec.slot}</div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-semibold text-slate-200">{rec.subjectName}</div>
                                    <div className="font-mono text-[10px] text-slate-500">{rec.subjectCode}</div>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-400">{rec.classroom}</td>
                                  <td className="py-2.5 px-3 font-mono">
                                    {rec.verificationTime || rec.biometricTime ? (
                                      <span className="text-emerald-400 font-bold">
                                        {rec.verificationTime || rec.biometricTime}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                                    {rec.deviceName}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {rec.status === 'PRESENT' && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                        PRESENT
                                      </span>
                                    )}
                                    {rec.status === 'LATE' && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                        LATE
                                      </span>
                                    )}
                                    {rec.status === 'ABSENT' && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                        ABSENT
                                      </span>
                                    )}
                                    {rec.status === 'EXCUSED' && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                        EXCUSED
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Modal Pagination */}
                    {detailData?.pagination?.totalPages > 1 && (
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                        <span>
                          Page {detailData.pagination.page} of {detailData.pagination.totalPages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            disabled={detailPage <= 1}
                            onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
                            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-40"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            disabled={detailPage >= detailData.pagination.totalPages}
                            onClick={() => setDetailPage((p) => p + 1)}
                            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-40"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={closeStudentDetail}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
