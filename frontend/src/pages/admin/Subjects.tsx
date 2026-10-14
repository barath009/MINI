import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Filter,
  Building,
  ChevronRight,
  FileSpreadsheet,
  Search,
  GraduationCap,
  Calendar,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const AdminSubjects: React.FC = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    departmentId: '',
    year: 3,
    semester: 5,
    credits: 4,
  });

  // Delete Modal State
  const [subjectToDelete, setSubjectToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/admin/subjects');
      if (res.data.success) setSubjects(res.data.data);
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  };

  useEffect(() => {
    fetchSubjects();
    api.get('/admin/departments').then((r) => {
      if (r.data.success) {
        setDepartments(r.data.data);
      }
    });
  }, []);

  const handleOpenAddModal = (defaultDeptId?: string, defaultSemester?: number) => {
    setEditingSubject(null);
    const sem = defaultSemester || (selectedSemester !== 'ALL' ? Number(selectedSemester) : 5);
    const yr = Math.ceil(sem / 2);
    setFormData({
      code: '',
      name: '',
      departmentId: defaultDeptId || (selectedDeptId || departments[0]?._id || ''),
      year: yr,
      semester: sem,
      credits: 4,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (sub: any) => {
    setEditingSubject(sub);
    const sem = sub.semester || 5;
    const yr = sub.year || Math.ceil(sem / 2);
    setFormData({
      code: sub.code || '',
      name: sub.name || '',
      departmentId: sub.departmentId?._id || sub.departmentId || '',
      year: yr,
      semester: sem,
      credits: sub.credits || 4,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      if (editingSubject) {
        const res = await api.put(`/admin/subjects/${editingSubject._id}`, formData);
        if (res.data.success) {
          setShowModal(false);
          setSuccessMessage(`Subject '${formData.code} - ${formData.name}' updated successfully!`);
          setTimeout(() => setSuccessMessage(''), 4000);
          fetchSubjects();
        }
      } else {
        const res = await api.post('/admin/subjects', formData);
        if (res.data.success) {
          setShowModal(false);
          setFormData({ code: '', name: '', departmentId: '', year: 3, semester: 5, credits: 4 });
          setSuccessMessage(`Subject '${formData.code} - ${formData.name}' created successfully!`);
          setTimeout(() => setSuccessMessage(''), 4000);
          fetchSubjects();
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteSubject = async () => {
    if (!subjectToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/admin/subjects/${subjectToDelete._id}`);
      if (res.data.success) {
        setSuccessMessage(`Subject '${subjectToDelete.code}' deleted successfully.`);
        setTimeout(() => setSuccessMessage(''), 3000);
        setSubjectToDelete(null);
        fetchSubjects();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete subject');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = () => {
    setSelectedDeptId('');
    setSelectedSemester('ALL');
    setSelectedYear('ALL');
    setSearchQuery('');
  };

  // Filter subjects by Department, Semester, Year, and Search
  const filteredSubjects = subjects.filter((sub) => {
    const matchesDept =
      !selectedDeptId ||
      sub.departmentId?._id === selectedDeptId ||
      sub.departmentId === selectedDeptId;

    const subYear = sub.year || Math.ceil((sub.semester || 1) / 2);
    const matchesYear =
      selectedYear === 'ALL' || subYear === Number(selectedYear);

    const matchesSemester =
      selectedSemester === 'ALL' || sub.semester === Number(selectedSemester);

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      sub.code?.toLowerCase().includes(q) ||
      sub.name?.toLowerCase().includes(q) ||
      sub.departmentId?.code?.toLowerCase().includes(q) ||
      sub.departmentId?.name?.toLowerCase().includes(q);

    return matchesDept && matchesYear && matchesSemester && matchesSearch;
  });

  // Group by Department and then by Semester:
  // { [deptKey]: { dept: any, semesters: { [sem: number]: any[] } } }
  interface GroupedDepartment {
    deptId: string;
    deptName: string;
    deptCode: string;
    deptRaw: any;
    semesters: { [sem: number]: any[] };
    totalSubjects: number;
    totalCredits: number;
  }

  const groupedData: { [key: string]: GroupedDepartment } = {};

  filteredSubjects.forEach((sub) => {
    const deptObj = sub.departmentId;
    const deptId = deptObj?._id || deptObj || 'unknown';
    const deptName = deptObj?.name || 'Engineering Department';
    const deptCode = deptObj?.code || 'DEPT';
    const sem = sub.semester || 1;

    if (!groupedData[deptId]) {
      groupedData[deptId] = {
        deptId,
        deptName,
        deptCode,
        deptRaw: deptObj,
        semesters: {},
        totalSubjects: 0,
        totalCredits: 0,
      };
    }

    if (!groupedData[deptId].semesters[sem]) {
      groupedData[deptId].semesters[sem] = [];
    }

    groupedData[deptId].semesters[sem].push(sub);
    groupedData[deptId].totalSubjects += 1;
    groupedData[deptId].totalCredits += sub.credits || 0;
  });

  const departmentGroups = Object.values(groupedData);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyan-400" />
            Curriculum Subjects by Department & Semester
          </h1>
          <p className="text-xs text-slate-400">
            Institutional academic courses organized systematically by Department and Semester.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              navigate(
                `/admin/bulk-import?tab=SUBJECTS${selectedDeptId ? `&dept=${selectedDeptId}` : ''}`
              )
            }
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-2 border border-cyan-800/60 transition-colors"
            title="Bulk Import Courses via Excel Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            Bulk Import Subjects
          </button>
          <button
            onClick={() => navigate('/admin/subject-departments')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Building className="w-4 h-4 text-cyan-400" />
            Curriculum Breakdown <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/20"
          >
            <Plus className="w-4 h-4" /> Add New Subject
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {successMessage}
        </div>
      )}

      {/* Primary Department Selector Tabs */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
          <span className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-cyan-400" /> Select Department
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {departments.length} Departments Registered
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedDeptId('')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              !selectedDeptId
                ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-900/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            <span>All Departments</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                !selectedDeptId ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-cyan-400'
              }`}
            >
              {subjects.length}
            </span>
          </button>
          {departments.map((d) => {
            const count = subjects.filter(
              (s) => s.departmentId?._id === d._id || s.departmentId === d._id
            ).length;
            const isSelected = selectedDeptId === d._id;
            return (
              <button
                key={d._id}
                onClick={() => setSelectedDeptId(d._id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-900/30'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <span>{d.code}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-cyan-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Semester Selector Tabs */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Filter by Semester
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {selectedSemester === 'ALL' ? 'Showing All 8 Semesters' : `Showing Semester ${selectedSemester}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedSemester('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSemester === 'ALL'
                ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-900/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            All Semesters
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
            const isSelected = selectedSemester === String(sem);
            const semCount = subjects.filter((s) => {
              const matchesDept =
                !selectedDeptId ||
                s.departmentId?._id === selectedDeptId ||
                s.departmentId === selectedDeptId;
              return matchesDept && s.semester === sem;
            }).length;

            return (
              <button
                key={sem}
                onClick={() => setSelectedSemester(String(sem))}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                  isSelected
                    ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-900/30'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <span>Sem {sem}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {semCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-3 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search subject code, name, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Year Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">
                All Years
              </option>
              <option value="1" className="bg-slate-900 text-slate-200">
                Year 1 (Sem 1 & 2)
              </option>
              <option value="2" className="bg-slate-900 text-slate-200">
                Year 2 (Sem 3 & 4)
              </option>
              <option value="3" className="bg-slate-900 text-slate-200">
                Year 3 (Sem 5 & 6)
              </option>
              <option value="4" className="bg-slate-900 text-slate-200">
                Year 4 (Sem 7 & 8)
              </option>
            </select>
          </div>

          {(selectedDeptId || selectedSemester !== 'ALL' || selectedYear !== 'ALL' || searchQuery) && (
            <button
              onClick={resetFilters}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}

          <span className="text-[11px] text-cyan-400 font-mono font-bold px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-800/60">
            {filteredSubjects.length} of {subjects.length} Subjects
          </span>
        </div>
      </div>

      {/* Main Subjects Display: Grouped by Department AND Semester */}
      {departmentGroups.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Subjects Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No course subjects match your active Department or Semester filter. Click "Add New Subject" to create one or reset your filters.
          </p>
          <button
            onClick={() => handleOpenAddModal(selectedDeptId, selectedSemester !== 'ALL' ? Number(selectedSemester) : undefined)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs inline-flex items-center gap-2 mt-2"
          >
            <Plus className="w-4 h-4" /> Add Subject to this Category
          </button>
        </div>
      ) : (
        <div className="space-y-8 text-xs">
          {departmentGroups.map((deptGroup) => {
            const sortedSemesters = Object.keys(deptGroup.semesters)
              .map(Number)
              .sort((a, b) => a - b);

            return (
              <div
                key={deptGroup.deptId}
                className="glass-card p-5 rounded-2xl border border-slate-800 space-y-6 relative overflow-hidden"
              >
                {/* Department Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-extrabold text-base text-slate-100 tracking-tight">
                          {deptGroup.deptName}
                        </h2>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                          {deptGroup.deptCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {deptGroup.totalSubjects} Subject(s) across curriculum &bull; {deptGroup.totalCredits} Total Credits
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenAddModal(deptGroup.deptId)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-800 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Subject to {deptGroup.deptCode}
                  </button>
                </div>

                {/* Semesters under this Department */}
                <div className="space-y-6">
                  {sortedSemesters.map((sem) => {
                    const semSubjects = deptGroup.semesters[sem] || [];
                    const semYear = Math.ceil(sem / 2);
                    const semCredits = semSubjects.reduce((acc, s) => acc + (s.credits || 0), 0);

                    return (
                      <div key={sem} className="space-y-3">
                        {/* Semester Group Header */}
                        <div className="flex items-center justify-between bg-slate-950/50 px-3.5 py-2 rounded-xl border border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950 text-cyan-300 font-mono font-bold text-xs border border-cyan-800/80">
                              Semester {sem}
                            </span>
                            <span className="text-slate-300 font-bold text-xs">
                              Year {semYear} Curriculum
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              ({semSubjects.length} Subject{semSubjects.length !== 1 ? 's' : ''} &bull; {semCredits} Credits)
                            </span>
                          </div>

                          <button
                            onClick={() => handleOpenAddModal(deptGroup.deptId, sem)}
                            className="text-[11px] text-slate-400 hover:text-cyan-400 font-semibold flex items-center gap-1 transition-colors"
                            title={`Add subject to Semester ${sem}`}
                          >
                            <Plus className="w-3 h-3" /> Add to Sem {sem}
                          </button>
                        </div>

                        {/* Subject Cards Grid for this Semester */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {semSubjects.map((sub) => (
                            <div
                              key={sub._id}
                              className="glass-card p-4 rounded-xl border border-slate-800/90 space-y-2.5 hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-cyan-950/20 bg-slate-900/40"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-cyan-400 text-xs px-2.5 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60">
                                  {sub.code}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                                    {sub.credits} Credits
                                  </span>
                                  <button
                                    onClick={() => handleOpenEditModal(sub)}
                                    className="p-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 transition-colors"
                                    title="Edit Subject"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setSubjectToDelete(sub)}
                                    className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors"
                                    title="Delete Subject"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-extrabold text-slate-100 text-xs tracking-tight line-clamp-2">
                                  {sub.name}
                                </h4>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60 font-mono">
                                <span className="font-semibold text-cyan-300">
                                  Year {sub.year || semYear} &bull; Sem {sub.semester || sem}
                                </span>
                                <span className="text-cyan-400 font-semibold">
                                  {deptGroup.deptCode}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => !isSubmitting && setShowModal(false)}
        title={editingSubject ? `Edit Course Subject: ${editingSubject.code}` : 'Add Course Subject'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Subject Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. CS501"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors uppercase"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Credits *</label>
              <input
                type="number"
                required
                min="1"
                max="10"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Subject Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Database Management Systems"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-medium focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Department *</label>
            <select
              required
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Year of Study *</label>
              <select
                required
                value={formData.year}
                onChange={(e) => {
                  const newYear = parseInt(e.target.value);
                  const validSemesters = [newYear * 2 - 1, newYear * 2];
                  const newSem = validSemesters.includes(formData.semester)
                    ? formData.semester
                    : validSemesters[0];
                  setFormData({ ...formData, year: newYear, semester: newSem });
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value={1}>Year 1 (Sem 1 & 2)</option>
                <option value={2}>Year 2 (Sem 3 & 4)</option>
                <option value={3}>Year 3 (Sem 5 & 6)</option>
                <option value={4}>Year 4 (Sem 7 & 8)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Semester of Study *</label>
              <select
                required
                value={formData.semester}
                onChange={(e) => {
                  const newSem = parseInt(e.target.value);
                  const derivedYear = Math.ceil(newSem / 2);
                  setFormData({ ...formData, semester: newSem, year: derivedYear });
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s} (Year {Math.ceil(s / 2)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all shadow-lg shadow-cyan-900/20"
            >
              {isSubmitting ? 'Saving...' : editingSubject ? 'Update Subject' : 'Save Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Subject Confirmation Modal */}
      <Modal
        isOpen={!!subjectToDelete}
        onClose={() => !isDeleting && setSubjectToDelete(null)}
        title="Confirm Delete Subject"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-rose-200 text-sm">
                Delete Subject: {subjectToDelete?.code}
              </h4>
              <p className="text-rose-300/90 leading-relaxed">
                Are you sure you want to permanently delete course subject{' '}
                <strong className="text-rose-200 font-bold">
                  {subjectToDelete?.code} - {subjectToDelete?.name}
                </strong>
                ?
              </p>
              <p className="text-amber-300/90 text-[11px] pt-1">
                Semester {subjectToDelete?.semester} &bull; Year {subjectToDelete?.year || Math.ceil((subjectToDelete?.semester || 1) / 2)} &bull; {subjectToDelete?.credits} Credits
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setSubjectToDelete(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={confirmDeleteSubject}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-all"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete Subject'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
