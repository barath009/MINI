import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
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
  AlertCircle,
} from 'lucide-react';

export const ParentAttendanceHistory: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [wards, setWards] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(searchParams.get('studentId') || '');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Load parent wards
  useEffect(() => {
    api
      .get('/parent/wards')
      .then((res) => {
        if (res.data.success && res.data.data.length > 0) {
          setWards(res.data.data);
          if (!selectedStudentId) {
            setSelectedStudentId(res.data.data[0].studentId);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch attendance records for selected ward
  const fetchRecords = async () => {
    if (!selectedStudentId) return;
    try {
      setLoading(true);
      const params: any = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      if (monthFilter) params.month = monthFilter;

      const res = await api.get(`/parent/wards/${selectedStudentId}/attendance`, { params });
      if (res.data.success) {
        setRecords(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      setSearchParams({ studentId: selectedStudentId });
      fetchRecords();
    }
  }, [selectedStudentId, statusFilter, monthFilter, page]);

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.subjectName?.toLowerCase().includes(q) ||
      r.subjectCode?.toLowerCase().includes(q) ||
      r.facultyName?.toLowerCase().includes(q) ||
      r.classroom?.toLowerCase().includes(q)
    );
  });

  const currentWard = wards.find((w) => w.studentId === selectedStudentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider font-mono">
            PARENT PORTAL
          </span>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Ward Attendance History</h1>
          <p className="text-xs text-slate-400">
            Read-only, verifiable attendance logs with exact biometric punch timestamps recorded by classroom terminals.
          </p>
        </div>

        {/* Ward switcher dropdown */}
        {wards.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-semibold">Ward:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 font-bold focus:outline-none focus:border-blue-500"
            >
              {wards.map((w) => (
                <option key={w.studentId} value={w.studentId}>
                  {w.name} ({w.registerNumber})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Ward Info Pill */}
      {currentWard && (
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-slate-200">{currentWard.name}</span>
            <span className="text-slate-500">|</span>
            <span className="font-mono text-slate-400">{currentWard.registerNumber}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">{currentWard.department}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Current Attendance:</span>
            <span className={`font-mono font-bold ${currentWard.percentage >= 75 ? 'text-cyan-400' : 'text-rose-400'}`}>
              {currentWard.percentage}%
            </span>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subject, faculty, classroom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" /> Filter Status:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present (On-Time)</option>
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
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
          {monthFilter && (
            <button
              onClick={() => setMonthFilter('')}
              className="text-[11px] text-slate-500 hover:text-slate-300"
            >
              Clear Month
            </button>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Biometric Entry Time</th>
                <th className="py-3 px-4">Classroom</th>
                <th className="py-3 px-4">Faculty Member</th>
                <th className="py-3 px-4">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    Loading attendance records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No attendance logs found matching these filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-100 block">{r.subjectName}</span>
                        <span className="font-mono text-[10px] text-cyan-400">{r.subjectCode}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{r.date}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{r.biometricTime}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{r.classroom}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>{r.facultyName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="py-3 px-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
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
    </div>
  );
};
