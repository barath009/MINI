import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { WebcamEnrollmentModal } from '../../components/common/WebcamEnrollmentModal';
import { api } from '../../services/api';
import { Search, Scan, UserPlus, Filter, Edit3, CheckCircle, Trash2, Key, Building, Users, FileSpreadsheet, BookOpen, Award } from 'lucide-react';

export const AdminStudents: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [selectedStudentForEnroll, setSelectedStudentForEnroll] = useState<any>(null);

  // Department Subjects Inspection Modal State
  const [viewingSubjectsStudent, setViewingSubjectsStudent] = useState<any | null>(null);
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectsFilterSem, setSubjectsFilterSem] = useState<'CURRENT' | 'ALL'>('CURRENT');

  // Add Form State
  const [addFormData, setAddFormData] = useState({
    name: '',
    registerNumber: '',
    rollNumber: '',
    email: '',
    password: '',
    phone: '',
    departmentId: '',
    sectionId: '',
    year: 3,
    semester: 5,
    academicYear: '2026-2027',
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    registerNumber: '',
    rollNumber: '',
    email: '',
    phone: '',
    departmentId: '',
    sectionId: '',
    year: 3,
    semester: 5,
    biometricStatus: 'PENDING',
    status: 'ACTIVE',
  });

  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let url = `/admin/students?search=${encodeURIComponent(search)}&limit=100`;
      if (selectedDeptId) {
        url += `&departmentId=${selectedDeptId}`;
      }
      const res = await api.get(url);
      if (res.data.success) setStudents(res.data.data.students);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [deptRes, secRes] = await Promise.all([api.get('/admin/departments'), api.get('/admin/sections')]);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (secRes.data.success) setSections(secRes.data.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchStudents();
  }, [search, selectedDeptId]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await api.post('/admin/students', addFormData);
      if (res.data.success) {
        setShowAddModal(false);
        setSuccessMessage('Student account registered successfully!');
        setTimeout(() => setSuccessMessage(''), 4000);
        fetchStudents();
        fetchMetadata(); // Refresh department counts
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create student');
    }
  };

  const openEditModal = (student: any) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.userId?.name || '',
      registerNumber: student.registerNumber || '',
      rollNumber: student.rollNumber || '',
      email: student.userId?.email || '',
      phone: student.userId?.phone || '',
      departmentId: student.departmentId?._id || student.departmentId || '',
      sectionId: student.sectionId?._id || student.sectionId || '',
      year: student.year || 3,
      semester: student.semester || 5,
      biometricStatus: student.biometricStatus || 'PENDING',
      status: student.status || 'ACTIVE',
    });
    setFormError('');
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await api.put(`/admin/students/${editingStudent._id}`, editFormData);
      if (res.data.success) {
        setEditingStudent(null);
        setSuccessMessage(`Updated profile for student ${editFormData.registerNumber}`);
        setTimeout(() => setSuccessMessage(''), 4000);
        fetchStudents();
        fetchMetadata();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update student profile');
    }
  };

  // User Credentials Modal State
  const [selectedUserForCreds, setSelectedUserForCreds] = useState<any | null>(null);
  const [credsFormData, setCredsFormData] = useState({ email: '', password: '' });

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('Are you sure you want to delete this student account and associated data?')) return;
    try {
      await api.delete(`/admin/students/${studentId}`);
      setSuccessMessage('Student account deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchStudents();
      fetchMetadata();
    } catch (err) {
      console.error('Failed to delete student', err);
    }
  };

  const handleViewStudentSubjects = async (s: any) => {
    setViewingSubjectsStudent(s);
    setLoadingSubjects(true);
    setSubjectsFilterSem('CURRENT');
    try {
      const deptId = s.departmentId?._id || s.departmentId;
      const res = await api.get(`/admin/subjects?departmentId=${deptId}`);
      if (res.data.success) {
        setStudentSubjects(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load student subjects:', err);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await api.put(`/admin/users/${selectedUserForCreds.userId?._id || selectedUserForCreds.userId}/credentials`, credsFormData);
      if (res.data.success) {
        setSelectedUserForCreds(null);
        setSuccessMessage('Student login credentials updated successfully!');
        setTimeout(() => setSuccessMessage(''), 4000);
        fetchStudents();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update credentials');
    }
  };

  // Sections filtered by selected department in Add Modal
  const filteredSectionsForAdd = sections.filter(
    (sec) => !addFormData.departmentId || sec.departmentId?._id === addFormData.departmentId || sec.departmentId === addFormData.departmentId
  );

  // Selected department details in Add Modal
  const selectedDeptInAdd = departments.find((d) => d._id === addFormData.departmentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            Student Directory &amp; Department Breakdown
          </h1>
          <p className="text-xs text-slate-400">View students categorized by Department with live enrollment counts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/bulk-import')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import Students
          </button>
          <button
            onClick={() => {
              setFormError('');
              if (departments.length > 0 && !addFormData.departmentId) {
                setAddFormData({ ...addFormData, departmentId: departments[0]._id });
              }
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/20"
          >
            <UserPlus className="w-4 h-4" />
            Add New Student
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {successMessage}
        </div>
      )}

      {/* Department Breakdown Cards (Enrolled Student Count per Department) */}
      <div>
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <Building className="w-4 h-4 text-cyan-400" />
          Department Student Enrollment Breakdown ({departments.length} Depts)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div
            onClick={() => setSelectedDeptId('')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              selectedDeptId === ''
                ? 'bg-cyan-950/90 border-cyan-500 ring-2 ring-cyan-500/20'
                : 'glass-card border-slate-800 hover:border-slate-700'
            }`}
          >
            <p className="text-[10px] text-slate-400 font-bold uppercase">All Departments</p>
            <p className="text-lg font-black text-slate-100 font-mono mt-0.5">
              {departments.reduce((acc, d) => acc + (d.studentCount || 0), 0)} <span className="text-xs font-normal text-slate-400">Total</span>
            </p>
          </div>

          {departments.map((dept) => (
            <div
              key={dept._id}
              onClick={() => setSelectedDeptId(dept._id)}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                selectedDeptId === dept._id
                  ? 'bg-cyan-950/90 border-cyan-500 ring-2 ring-cyan-500/20'
                  : 'glass-card border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-cyan-400 font-mono text-xs">{dept.code}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-cyan-300 border border-slate-800">
                  {dept.studentCount || 0}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-semibold truncate mt-1">{dept.name}</p>
              <p className="text-[10px] text-slate-400 font-mono">{dept.studentCount || 0} Enrolled</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Department Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 glass-card p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-500 ml-2" />
          <input
            type="text"
            placeholder="Search by student name, register number (7376221CS101), or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 w-full font-medium"
          />
        </div>

        <div className="glass-card px-3 py-2.5 rounded-2xl border border-slate-800 flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-200 w-full font-semibold cursor-pointer"
          >
            <option value="" className="bg-slate-900 text-slate-200">
              All Departments ({departments.reduce((acc, d) => acc + (d.studentCount || 0), 0)} Students)
            </option>
            {departments.map((d) => (
              <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">
                {d.code} - {d.name} ({d.studentCount || 0} Students)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading student directory...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No student records found. Click 'Add New Student' to register.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Register No / Roll</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Department &amp; Section</th>
                  <th className="py-3 px-4">College Email</th>
                  <th className="py-3 px-4">Biometric Status</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {students.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                      {s.registerNumber}
                      <span className="block text-[10px] text-slate-500 font-normal">{s.rollNumber}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-100">{s.userId?.name}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-cyan-400">{s.departmentId?.code}</span> - {s.sectionId?.name}
                      <span className="block text-[10px] text-slate-500">Year {s.year} (Sem {s.semester})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{s.userId?.email}</td>
                    <td className="py-3 px-4">
                      <Badge status={s.biometricStatus} />
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={s.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleViewStudentSubjects(s)}
                        className="px-2 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 text-indigo-300 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                        title={`View subjects for ${s.departmentId?.code || 'Department'} (Sem ${s.semester})`}
                      >
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        Subjects
                      </button>

                      <button
                        onClick={() => {
                          setSelectedUserForCreds(s);
                          setCredsFormData({ email: s.userId?.email || '', password: '' });
                          setFormError('');
                        }}
                        className="px-2 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                        title="Change Login Credentials (Username / Password)"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Pass
                      </button>

                      <button
                        onClick={() => openEditModal(s)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                        title="Edit Student Details"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        Edit
                      </button>

                      <button
                        onClick={() => setSelectedStudentForEnroll(s)}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 font-semibold text-[11px] inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Scan className="w-3.5 h-3.5" />
                        Enroll
                      </button>

                      <button
                        onClick={() => handleDeleteStudent(s._id)}
                        className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px] inline-flex items-center transition-colors"
                        title="Delete Student Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Register New Student Modal (Shows Department Student Counts) */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register New Student Account">
        <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
          {formError && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{formError}</div>}

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Full Student Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Aarav Sharma"
              value={addFormData.name}
              onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Register Number *</label>
              <input
                type="text"
                required
                placeholder="7376221CS101"
                value={addFormData.registerNumber}
                onChange={(e) => setAddFormData({ ...addFormData, registerNumber: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Roll Number *</label>
              <input
                type="text"
                required
                placeholder="22CS101"
                value={addFormData.rollNumber}
                onChange={(e) => setAddFormData({ ...addFormData, rollNumber: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-semibold">Institutional Email (Optional)</label>
                {selectedDeptInAdd && addFormData.name && (
                  <button
                    type="button"
                    onClick={() => {
                      const cleanName = addFormData.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                      const cleanDept = selectedDeptInAdd.code.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                      setAddFormData({ ...addFormData, email: `${cleanName}.${cleanDept}@bitsathy.ac.in` });
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                  >
                    Auto-Fill
                  </button>
                )}
              </div>
              <input
                type="email"
                placeholder={
                  selectedDeptInAdd && addFormData.name
                    ? `${addFormData.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}.${selectedDeptInAdd.code.toLowerCase()}@bitsathy.ac.in`
                    : 'name.dept@bitsathy.ac.in'
                }
                value={addFormData.email}
                onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Default: &lt;name&gt;.&lt;dept&gt;@bitsathy.ac.in
              </span>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Account Password</label>
              <input
                type="text"
                placeholder="Default: Student@123"
                value={addFormData.password}
                onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Leave empty for standard default
              </span>
            </div>
          </div>

          {/* Department Selection with Enrolled Student Count */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-slate-300 font-bold">Select Department *</label>
              {selectedDeptInAdd && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                  Current Enrolled: {selectedDeptInAdd.studentCount || 0} Students
                </span>
              )}
            </div>

            <select
              required
              value={addFormData.departmentId}
              onChange={(e) => setAddFormData({ ...addFormData, departmentId: e.target.value, sectionId: '' })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold"
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} - {d.name} ({d.studentCount || 0} enrolled students)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Select Section *</label>
            <select
              required
              value={addFormData.sectionId}
              onChange={(e) => setAddFormData({ ...addFormData, sectionId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-bold"
            >
              <option value="">Select Section</option>
              {filteredSectionsForAdd.map((sec) => (
                <option key={sec._id} value={sec._id}>
                  Section {sec.name} ({sec.departmentId?.code || 'Dept'})
                </option>
              ))}
            </select>
          </div>

          {/* Year of Study, Semester, and Academic Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Year of Study *</label>
              <select
                required
                value={addFormData.year}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  const defaultSem = y * 2 - 1;
                  setAddFormData({ ...addFormData, year: y, semester: defaultSem });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold"
              >
                <option value={1}>1st Year (Freshman)</option>
                <option value={2}>2nd Year (Sophomore)</option>
                <option value={3}>3rd Year (Junior)</option>
                <option value={4}>4th Year (Senior)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Semester of Study *</label>
              <select
                required
                value={addFormData.semester}
                onChange={(e) => {
                  const sem = Number(e.target.value);
                  const derivedYear = Math.ceil(sem / 2);
                  setAddFormData({ ...addFormData, semester: sem, year: derivedYear });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-cyan-400 font-bold font-mono"
              >
                <option value={1}>Semester 1 (Year 1)</option>
                <option value={2}>Semester 2 (Year 1)</option>
                <option value={3}>Semester 3 (Year 2)</option>
                <option value={4}>Semester 4 (Year 2)</option>
                <option value={5}>Semester 5 (Year 3)</option>
                <option value={6}>Semester 6 (Year 3)</option>
                <option value={7}>Semester 7 (Year 4)</option>
                <option value={8}>Semester 8 (Year 4)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Academic Year *</label>
              <select
                value={addFormData.academicYear}
                onChange={(e) => setAddFormData({ ...addFormData, academicYear: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-medium"
              >
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2027-2028">2027-2028</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
              Create Student Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      {editingStudent && (
        <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} title={`Edit Student Profile (${editingStudent.registerNumber})`}>
          <form onSubmit={handleUpdateStudent} className="space-y-3 text-xs">
            {formError && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{formError}</div>}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Register Number *</label>
                <input
                  type="text"
                  required
                  value={editFormData.registerNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, registerNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Roll Number *</label>
                <input
                  type="text"
                  required
                  value={editFormData.rollNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, rollNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department *</label>
                <select
                  required
                  value={editFormData.departmentId}
                  onChange={(e) => setEditFormData({ ...editFormData, departmentId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-bold"
                >
                  <option value="">Select Dept</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.code} - {d.name} ({d.studentCount || 0} Students)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Section *</label>
                <select
                  required
                  value={editFormData.sectionId}
                  onChange={(e) => setEditFormData({ ...editFormData, sectionId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-bold"
                >
                  <option value="">Select Section</option>
                  {sections.map((sec) => (
                    <option key={sec._id} value={sec._id}>
                      {sec.name} ({sec.departmentId?.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year and Semester Selection in Edit Modal */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Year of Study *</label>
                <select
                  required
                  value={editFormData.year}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    const defaultSem = y * 2 - 1;
                    setEditFormData({ ...editFormData, year: y, semester: defaultSem });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold"
                >
                  <option value={1}>1st Year (Freshman)</option>
                  <option value={2}>2nd Year (Sophomore)</option>
                  <option value={3}>3rd Year (Junior)</option>
                  <option value={4}>4th Year (Senior)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Semester of Study *</label>
                <select
                  required
                  value={editFormData.semester}
                  onChange={(e) => {
                    const sem = Number(e.target.value);
                    const derivedYear = Math.ceil(sem / 2);
                    setEditFormData({ ...editFormData, semester: sem, year: derivedYear });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-cyan-400 font-bold font-mono"
                >
                  <option value={1}>Semester 1 (Year 1)</option>
                  <option value={2}>Semester 2 (Year 1)</option>
                  <option value={3}>Semester 3 (Year 2)</option>
                  <option value={4}>Semester 4 (Year 2)</option>
                  <option value={5}>Semester 5 (Year 3)</option>
                  <option value={6}>Semester 6 (Year 3)</option>
                  <option value={7}>Semester 7 (Year 4)</option>
                  <option value={8}>Semester 8 (Year 4)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                Update Student Profile
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Credentials Modal */}
      {selectedUserForCreds && (
        <Modal
          isOpen={!!selectedUserForCreds}
          onClose={() => setSelectedUserForCreds(null)}
          title={`Change Login Credentials (${selectedUserForCreds.registerNumber})`}
        >
          <form onSubmit={handleSaveCredentials} className="space-y-3 text-xs">
            {formError && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{formError}</div>}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Login Username / Email *</label>
              <input
                type="email"
                required
                value={credsFormData.email}
                onChange={(e) => setCredsFormData({ ...credsFormData, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">New Password (Leave blank to keep existing)</label>
              <input
                type="text"
                placeholder="Enter new password..."
                value={credsFormData.password}
                onChange={(e) => setCredsFormData({ ...credsFormData, password: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedUserForCreds(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                Save Login Credentials
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Webcam Biometric Face Enrollment Modal */}
      {selectedStudentForEnroll && (
        <WebcamEnrollmentModal
          isOpen={!!selectedStudentForEnroll}
          onClose={() => setSelectedStudentForEnroll(null)}
          student={selectedStudentForEnroll}
          onSuccess={() => {
            setSelectedStudentForEnroll(null);
            setSuccessMessage(`Biometric face descriptor enrolled for ${selectedStudentForEnroll.registerNumber}`);
            setTimeout(() => setSuccessMessage(''), 4000);
            fetchStudents();
          }}
        />
      )}

      {/* Student Department Subjects Inspection Modal */}
      {viewingSubjectsStudent && (
        <Modal
          isOpen={!!viewingSubjectsStudent}
          onClose={() => setViewingSubjectsStudent(null)}
          title={`Department Curriculum & Subjects: ${viewingSubjectsStudent.userId?.name}`}
        >
          <div className="space-y-4 text-xs">
            {/* Student & Department Info Banner */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-cyan-400 font-mono text-xs">
                  {viewingSubjectsStudent.registerNumber}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {viewingSubjectsStudent.departmentId?.code}
                </span>
              </div>
              <p className="text-slate-200 font-bold text-sm">
                {viewingSubjectsStudent.userId?.name}
              </p>
              <p className="text-slate-400 text-[11px]">
                Department of {viewingSubjectsStudent.departmentId?.name} · Year {viewingSubjectsStudent.year} (Semester {viewingSubjectsStudent.semester} - Section {viewingSubjectsStudent.sectionId?.name})
              </p>
            </div>

            {/* Semester Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setSubjectsFilterSem('CURRENT')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                  subjectsFilterSem === 'CURRENT'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Current Semester (Sem {viewingSubjectsStudent.semester})
              </button>
              <button
                onClick={() => setSubjectsFilterSem('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                  subjectsFilterSem === 'ALL'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                All Department Semesters ({studentSubjects.length})
              </button>
            </div>

            {/* Subjects Table */}
            {loadingSubjects ? (
              <div className="p-8 text-center text-slate-400">Loading department subjects...</div>
            ) : studentSubjects.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No subjects registered for department '{viewingSubjectsStudent.departmentId?.code}'.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2.5">Code</th>
                      <th className="p-2.5">Subject Name</th>
                      <th className="p-2.5">Semester</th>
                      <th className="p-2.5">Credits</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {studentSubjects
                      .filter((sub) =>
                        subjectsFilterSem === 'CURRENT' ? sub.semester === viewingSubjectsStudent.semester : true
                      )
                      .map((sub) => (
                        <tr
                          key={sub._id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            sub.semester === viewingSubjectsStudent.semester ? 'bg-cyan-950/20' : ''
                          }`}
                        >
                          <td className="p-2.5 font-mono font-bold text-cyan-400">
                            {sub.code}
                          </td>
                          <td className="p-2.5 font-semibold text-slate-100">
                            {sub.name}
                            {sub.semester === viewingSubjectsStudent.semester && (
                              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                                Current
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-300">
                            Sem {sub.semester}
                          </td>
                          <td className="p-2.5 font-mono text-purple-300 font-semibold">
                            {sub.credits || 3} Cr
                          </td>
                          <td className="p-2.5">
                            <span className="text-[10px] font-bold text-emerald-400">
                              {sub.status || 'ACTIVE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setViewingSubjectsStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
