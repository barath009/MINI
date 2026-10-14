import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { useSystemClock } from '../../context/SystemClockContext';
import {
  Calendar,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Cpu,
  RefreshCw,
  Edit3,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface AttendanceRecordItem {
  _id: string;
  studentId?: {
    _id: string;
    registerNumber: string;
    userId?: {
      name: string;
      email: string;
    };
    departmentId?: {
      _id: string;
      name: string;
      code: string;
    };
    sectionId?: {
      _id: string;
      name: string;
    };
  };
  subjectId?: {
    _id: string;
    name: string;
    code: string;
  };
  facultyId?: {
    _id: string;
    userId?: {
      name: string;
    };
  };
  classroomId?: {
    _id: string;
    roomNumber: string;
    building?: string;
  };
  deviceId?: {
    _id: string;
    deviceId: string;
    deviceName: string;
    location?: string;
  };
  timetableId?: {
    _id: string;
    periodNumber?: number;
    startTime?: string;
    endTime?: string;
  };
  date: string;
  timestamp: string;
  realTimestamp?: string;
  isTestMode?: boolean;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
  recognitionMethod: string;
  confidenceScore?: number;
  overrideReason?: string;
  overrideRemark?: string;
}

export const AdminAttendance: React.FC = () => {
  const { isTestMode, effectiveDate } = useSystemClock();

  // Get current system clock date in YYYY-MM-DD
  const effectiveDateStr = useMemo(() => {
    return effectiveDate.toISOString().split('T')[0];
  }, [effectiveDate]);

  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [departments, setDepartments] = useState<any[]>([]);

  // Filter states
  const [selectedDate, setSelectedDate] = useState<string>(effectiveDateStr);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Override Modal state
  const [overrideModalOpen, setOverrideModalOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecordItem | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'>('PRESENT');
  const [overrideReason, setOverrideReason] = useState<string>('BIOMETRIC_DEVICE_ERROR');
  const [overrideRemark, setOverrideRemark] = useState<string>('');
  const [submittingOverride, setSubmittingOverride] = useState<boolean>(false);
  const [overrideSuccessMsg, setOverrideSuccessMsg] = useState<string | null>(null);
  const [overrideErrorMsg, setOverrideErrorMsg] = useState<string | null>(null);

  // Sync date when system clock date initially resolves
  useEffect(() => {
    if (effectiveDateStr && selectedDate === '') {
      setSelectedDate(effectiveDateStr);
    }
  }, [effectiveDateStr]);

  // Load departments
  useEffect(() => {
    api.get('/admin/departments').then((res) => {
      if (res.data.success) {
        setDepartments(res.data.data);
      }
    }).catch(() => {});
  }, []);

  // Fetch Attendance Records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedDate) params.date = selectedDate;
      if (selectedDept !== 'ALL') params.departmentId = selectedDept;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const res = await api.get('/reports/export', { params });
      if (res.data.success) {
        setRecords(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load attendance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedDate, selectedDept, selectedStatus]);

  // Date stepper
  const shiftDate = (days: number) => {
    const curr = new Date(selectedDate || effectiveDateStr);
    curr.setDate(curr.getDate() + days);
    setSelectedDate(curr.toISOString().split('T')[0]);
  };

  // Filtered by Search Query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter((r) => {
      const studentName = r.studentId?.userId?.name?.toLowerCase() || '';
      const regNo = r.studentId?.registerNumber?.toLowerCase() || '';
      const subName = r.subjectId?.name?.toLowerCase() || '';
      const subCode = r.subjectId?.code?.toLowerCase() || '';
      const room = r.classroomId?.roomNumber?.toLowerCase() || '';
      const faculty = r.facultyId?.userId?.name?.toLowerCase() || '';
      const device = r.deviceId?.deviceName?.toLowerCase() || '';
      return (
        studentName.includes(q) ||
        regNo.includes(q) ||
        subName.includes(q) ||
        subCode.includes(q) ||
        room.includes(q) ||
        faculty.includes(q) ||
        device.includes(q)
      );
    });
  }, [records, searchQuery]);

  // KPI Stats
  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, rate };
  }, [records]);

  // CSV Export
  const handleExportCSV = async () => {
    try {
      const params: any = { format: 'csv' };
      if (selectedDate) params.date = selectedDate;
      if (selectedDept !== 'ALL') params.departmentId = selectedDept;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const res = await api.get('/reports/export', {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BIT_Attendance_${selectedDate || 'all'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV', err);
    }
  };

  // Open Override Modal
  const openOverrideModal = (rec: AttendanceRecordItem) => {
    setSelectedRecord(rec);
    setOverrideStatus(rec.status);
    setOverrideReason('BIOMETRIC_DEVICE_ERROR');
    setOverrideRemark('');
    setOverrideSuccessMsg(null);
    setOverrideErrorMsg(null);
    setOverrideModalOpen(true);
  };

  // Submit Override
  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setSubmittingOverride(true);
    setOverrideErrorMsg(null);
    setOverrideSuccessMsg(null);

    try {
      const res = await api.put(`/faculty/attendance/${selectedRecord._id}/override`, {
        status: overrideStatus,
        reason: overrideReason,
        remark: overrideRemark,
      });

      if (res.data.success) {
        setOverrideSuccessMsg('Status successfully overridden and logged into audit trail.');
        setTimeout(() => {
          setOverrideModalOpen(false);
          fetchRecords();
        }, 1200);
      }
    } catch (err: any) {
      setOverrideErrorMsg(err.response?.data?.message || 'Failed to update attendance override');
    } finally {
      setSubmittingOverride(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            Institutional Attendance Explorer
            {isTestMode && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                TEST MODE ACTIVE
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400">
            Realtime biometric punch logs, timetable-period linkages, terminal diagnostics &amp; administrative overrides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRecords}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Scans</div>
          <div className="text-xl font-extrabold text-slate-100 mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Records for selected filters</div>
        </div>

        <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-3">
          <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center justify-between">
            <span>Present</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{stats.present}</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">
            {stats.total > 0 ? `${Math.round((stats.present / stats.total) * 100)}% of total` : '0%'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-3">
          <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center justify-between">
            <span>Late</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-extrabold text-amber-400 mt-0.5">{stats.late}</div>
          <div className="text-[10px] text-amber-500/80 mt-0.5">
            {stats.total > 0 ? `${Math.round((stats.late / stats.total) * 100)}% of total` : '0%'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-3">
          <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center justify-between">
            <span>Absent</span>
            <XCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-extrabold text-rose-400 mt-0.5">{stats.absent}</div>
          <div className="text-[10px] text-rose-500/80 mt-0.5">
            {stats.total > 0 ? `${Math.round((stats.absent / stats.total) * 100)}% of total` : '0%'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-cyan-500/20 rounded-xl p-3 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Attendance Rate</div>
          <div className="text-xl font-extrabold text-cyan-400 mt-0.5">{stats.rate}%</div>
          <div className="text-[10px] text-cyan-500/80 mt-0.5">Verified presence ratio</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date Picker with Prev/Next / Today */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Class Date
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftDate(-1)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onClick={() => shiftDate(1)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedDate(effectiveDateStr)}
                className="px-2 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 rounded-lg border border-cyan-700/40 text-[10px] font-bold uppercase transition"
                title="System Current Date"
              >
                Today
              </button>
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Status Filter
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Live Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search student, reg no, terminal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Timestamp &amp; Verification</th>
                <th className="py-3 px-4">Register No / Student</th>
                <th className="py-3 px-4">Subject &amp; Period</th>
                <th className="py-3 px-4">Classroom &amp; Faculty</th>
                <th className="py-3 px-4">Biometric Terminal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                    Loading attendance records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No attendance records found matching the specified filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const devName =
                    r.deviceId?.deviceName ||
                    r.deviceId?.deviceId ||
                    (r.recognitionMethod === 'MANUAL_OVERRIDE' ? 'Manual Override' : 'Biometric Terminal');

                  const punchTime = r.timestamp
                    ? new Date(r.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                      })
                    : 'N/A';

                  const punchDate = r.date
                    ? new Date(r.date).toISOString().split('T')[0]
                    : new Date(r.timestamp).toISOString().split('T')[0];

                  const periodNum = r.timetableId?.periodNumber;
                  const timeSlot =
                    r.timetableId?.startTime && r.timetableId?.endTime
                      ? `${r.timetableId.startTime} - ${r.timetableId.endTime}`
                      : null;

                  return (
                    <tr key={r._id} className="hover:bg-slate-800/40 transition">
                      {/* Timestamp */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-200 font-semibold">{punchTime}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-2.5 h-2.5 text-slate-400" />
                          {punchDate}
                        </div>
                        {r.isTestMode && (
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-mono bg-amber-500/10 text-amber-400 rounded mt-0.5 border border-amber-500/20">
                            TEST MODE
                          </span>
                        )}
                      </td>

                      {/* Student */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-100">
                          {r.studentId?.registerNumber || 'UNKNOWN'}
                        </div>
                        <div className="text-slate-300 font-medium text-[11px]">
                          {r.studentId?.userId?.name || 'Student'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {r.studentId?.departmentId?.code || 'CSE'}
                          {r.studentId?.sectionId?.name ? ` · Sec ${r.studentId.sectionId.name}` : ''}
                        </div>
                      </td>

                      {/* Subject & Period */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">
                          {r.subjectId?.name || 'Unassigned Subject'}
                        </div>
                        <div className="text-[10px] text-cyan-400 font-mono">
                          {r.subjectId?.code || 'SUB-001'}
                        </div>
                        {periodNum && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Period {periodNum} {timeSlot ? `(${timeSlot})` : ''}
                          </div>
                        )}
                      </td>

                      {/* Classroom & Faculty */}
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-medium">
                          Room {r.classroomId?.roomNumber || 'A204'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {r.facultyId?.userId?.name || 'Assigned Faculty'}
                        </div>
                      </td>

                      {/* Terminal */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate max-w-[130px]" title={devName}>
                            {devName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {r.recognitionMethod || 'FACE_RECOGNITION'}
                          {r.confidenceScore ? ` (${Math.round(r.confidenceScore * 100)}%)` : ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Badge status={r.status} />
                        {r.overrideReason && (
                          <div className="text-[9px] text-amber-400/80 mt-1 max-w-[120px] truncate" title={`Override: ${r.overrideReason} - ${r.overrideRemark || ''}`}>
                            Overridden: {r.overrideReason}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openOverrideModal(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-cyan-900/40 text-slate-300 hover:text-cyan-300 text-[11px] font-semibold rounded-lg border border-slate-700 hover:border-cyan-600/50 transition"
                          title="Manual Attendance Override"
                        >
                          <Edit3 className="w-3 h-3" />
                          Override
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
      {overrideModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Manual Attendance Override</h3>
              </div>
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Target Details */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Student:</span>
                <span className="font-bold text-slate-200">{selectedRecord.studentId?.userId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Register Number:</span>
                <span className="font-mono text-cyan-400">{selectedRecord.studentId?.registerNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subject:</span>
                <span className="text-slate-200">{selectedRecord.subjectId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <Badge status={selectedRecord.status} />
              </div>
            </div>

            {overrideSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{overrideSuccessMsg}</span>
              </div>
            )}

            {overrideErrorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{overrideErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitOverride} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  New Status
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOverrideStatus(st)}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        overrideStatus === st
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-900/40'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Override Reason
                </label>
                <select
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="BIOMETRIC_DEVICE_ERROR">Biometric Terminal Scanner Error</option>
                  <option value="MEDICAL_LEAVE">Medical / Sick Leave Approved</option>
                  <option value="ON_DUTY_APPROVAL">On-Duty (OD) Event / College Representative</option>
                  <option value="FACULTY_DISCRETION">Faculty / Head of Department Discretion</option>
                  <option value="LUNCH_SCAN_EXCEPTION">Authorized Exception</option>
                  <option value="OTHER">Other Administrative Justification</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Administrative Remark / Audit Note
                </label>
                <textarea
                  value={overrideRemark}
                  onChange={(e) => setOverrideRemark(e.target.value)}
                  placeholder="Enter specific justification for audit logs (e.g. Student presented medical certificate #8492)..."
                  rows={3}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOverride}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-900/40 transition"
                >
                  {submittingOverride ? 'Updating...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

