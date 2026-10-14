import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { WebcamEnrollmentModal } from '../../components/common/WebcamEnrollmentModal';
import {
  Scan,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  UserX,
  Camera,
  Layers,
  Building,
  Sparkles,
} from 'lucide-react';

interface StudentData {
  _id: string;
  id?: string;
  registerNumber: string;
  rollNumber?: string;
  biometricStatus: 'PENDING' | 'ENROLLED' | 'RE_ENROLL_REQUIRED';
  enrollmentDate?: string;
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
}

export const AdminBiometrics: React.FC = () => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  
  // Tab view: 'PENDING' | 'REGISTERED' | 'ALL'
  const [activeTab, setActiveTab] = useState<'PENDING' | 'REGISTERED' | 'ALL'>('PENDING');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [departments, setDepartments] = useState<{ _id: string; name: string; code: string }[]>([]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/students', { params: { limit: 1000 } });
      if (res.data?.success) {
        setStudents(res.data.data.students || []);
      }
    } catch (err) {
      console.error('Failed to load students for biometric registry', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      if (res.data?.success) {
        setDepartments(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchDepartments();
  }, []);

  // Compute live breakdown counts
  const stats = useMemo(() => {
    const total = students.length;
    const registered = students.filter((s) => s.biometricStatus === 'ENROLLED').length;
    const pending = students.filter(
      (s) => s.biometricStatus === 'PENDING' || !s.biometricStatus
    ).length;
    const reEnroll = students.filter(
      (s) => s.biometricStatus === 'RE_ENROLL_REQUIRED'
    ).length;
    const coverage = total > 0 ? Math.round((registered / total) * 100) : 0;
    return { total, registered, pending, reEnroll, coverage };
  }, [students]);

  // Filter students based on activeTab, search query, and department
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Tab segregation
      if (activeTab === 'REGISTERED' && s.biometricStatus !== 'ENROLLED') {
        return false;
      }
      if (activeTab === 'PENDING' && s.biometricStatus === 'ENROLLED') {
        return false;
      }

      // Department filter
      if (selectedDept && s.departmentId?._id !== selectedDept && s.departmentId?.code !== selectedDept) {
        return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const reg = s.registerNumber?.toLowerCase() || '';
        const roll = s.rollNumber?.toLowerCase() || '';
        const name = s.userId?.name?.toLowerCase() || '';
        const email = s.userId?.email?.toLowerCase() || '';
        return reg.includes(query) || roll.includes(query) || name.includes(query) || email.includes(query);
      }

      return true;
    });
  }, [students, activeTab, selectedDept, searchTerm]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
                Biometric Face Profile Registry
              </h1>
              <p className="text-xs text-slate-400">
                Manage, audit, and enroll AI facial embedding profiles for kiosk recognition
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStudents}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Total Students
            </span>
            <UsersIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-100 font-mono">
              {stats.total}
            </span>
            <span className="text-[11px] text-slate-500">enrolled in system</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Registered / Enrolled Faces */}
        <div
          onClick={() => setActiveTab('REGISTERED')}
          className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'REGISTERED'
              ? 'border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/40'
              : 'border-slate-800/80 bg-slate-900/40 hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Registered Faces
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-400 font-mono">
              {stats.registered}
            </span>
            <span className="text-[11px] text-emerald-400/70 font-semibold">
              ({stats.coverage}% ready)
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.coverage}%` }}
            />
          </div>
        </div>

        {/* Pending Enrollment */}
        <div
          onClick={() => setActiveTab('PENDING')}
          className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'PENDING'
              ? 'border-amber-500/60 bg-amber-950/20 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/40'
              : 'border-slate-800/80 bg-slate-900/40 hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
              Pending Enrollment
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-400 font-mono">
              {stats.pending}
            </span>
            <span className="text-[11px] text-amber-400/70 font-semibold">Needs Face Scan</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Re-enroll Required */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-semibold">
              Re-enroll Required
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-400 font-mono">
              {stats.reEnroll}
            </span>
            <span className="text-[11px] text-rose-400/70">Quality degraded</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats.total > 0 ? (stats.reEnroll / stats.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Tabbed & Filter Area */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/40">
        {/* Navigation Tabs Bar */}
        <div className="border-b border-slate-800/80 bg-slate-900/60 p-2 sm:p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'PENDING'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Pending Enrollment</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                {stats.pending + stats.reEnroll}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('REGISTERED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'REGISTERED'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Registered Students</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                {stats.registered}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'ALL'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Students</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                {stats.total}
              </span>
            </button>
          </div>

          {/* Quick instructions / status notice */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            {activeTab === 'PENDING' && (
              <span>Showing students awaiting face scan. Click "Add Biometrics" to register via webcam.</span>
            )}
            {activeTab === 'REGISTERED' && (
              <span>Showing registered students with AI embeddings active in kiosk memory.</span>
            )}
            {activeTab === 'ALL' && (
              <span>Complete institutional roster overview.</span>
            )}
          </div>
        </div>

        {/* Search & Department Filters */}
        <div className="p-3 bg-slate-900/40 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, roll no, or 7376..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span>Dept:</span>
            </div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Student Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-mono">
                <th className="py-3 px-4">Register / Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Department &amp; Section</th>
                <th className="py-3 px-4">Biometric Status</th>
                <th className="py-3 px-4">Enrollment Timestamp</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Scan className="w-8 h-8 text-slate-600" />
                      <p className="text-xs font-semibold text-slate-400">
                        No students found matching current view criteria.
                      </p>
                      {activeTab === 'PENDING' && (
                        <p className="text-[11px] text-emerald-400">
                          Great job! All students are currently enrolled with biometric face profiles.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const isEnrolled = s.biometricStatus === 'ENROLLED';

                  return (
                    <tr
                      key={s._id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Register Number */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        <div className="flex items-center gap-2">
                          <span>{s.registerNumber}</span>
                          {s.rollNumber && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              {s.rollNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Student Name & Email */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{s.userId?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.userId?.email || 'N/A'}</div>
                      </td>

                      {/* Department & Section */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-300">
                          {s.departmentId?.name || s.departmentId?.code || 'Department N/A'}
                        </span>
                        {s.sectionId && (
                          <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-400 border border-slate-700/60">
                            Sec: {s.sectionId?.name}
                          </span>
                        )}
                      </td>

                      {/* Biometric Status */}
                      <td className="py-3 px-4">
                        <Badge status={s.biometricStatus || 'PENDING'} />
                      </td>

                      {/* Enrollment Date */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {s.enrollmentDate
                          ? new Date(s.enrollmentDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : <span className="text-slate-600 italic">Not yet enrolled</span>}
                      </td>

                      {/* Launch Webcam Enrollment Button */}
                      <td className="py-3 px-4 text-right">
                        {isEnrolled ? (
                          <button
                            onClick={() => setSelectedStudent(s)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-semibold text-[11px] inline-flex items-center gap-1.5 transition-all"
                            title="Update or overwrite face descriptor"
                          >
                            <Camera className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Re-enroll Face</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedStudent(s)}
                            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] inline-flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all hover:scale-[1.02]"
                          >
                            <Scan className="w-3.5 h-3.5" />
                            <span>Add Biometrics</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Face Capture Webcam Modal */}
      {selectedStudent && (
        <WebcamEnrollmentModal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          student={selectedStudent}
          onSuccess={() => {
            fetchStudents();
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
