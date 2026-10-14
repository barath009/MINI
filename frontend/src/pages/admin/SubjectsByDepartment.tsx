import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Building,
  Search,
  Filter,
  ArrowLeft,
  LayoutGrid,
  List,
  GraduationCap,
  Award,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const SubjectsByDepartment: React.FC = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    departmentId: '',
    year: 3,
    semester: 5,
    credits: 3,
  });

  // Delete All Modal State
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, subRes] = await Promise.all([
        api.get('/admin/departments'),
        api.get('/admin/subjects'),
      ]);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (subRes.data.success) setSubjects(subRes.data.data);
    } catch (err) {
      console.error('Failed to load department subjects data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedDeptObj = departments.find((d) => d._id === selectedDeptId);

  // Filter subjects based on department, year, semester, and search query
  const filteredSubjects = subjects.filter((sub) => {
    const matchesDept =
      selectedDeptId === 'ALL' ||
      sub.departmentId?._id === selectedDeptId ||
      sub.departmentId === selectedDeptId;

    const subYear = sub.year || Math.ceil((sub.semester || 1) / 2);
    const matchesYear =
      selectedYear === 'ALL' || subYear === Number(selectedYear);

    const matchesSemester =
      selectedSemester === 'ALL' || sub.semester === Number(selectedSemester);

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      sub.code?.toLowerCase().includes(q) ||
      sub.name?.toLowerCase().includes(q) ||
      sub.departmentId?.code?.toLowerCase().includes(q) ||
      sub.departmentId?.name?.toLowerCase().includes(q);

    return matchesDept && matchesYear && matchesSemester && matchesSearch;
  });

  // Statistics for selected department
  const currentDeptSubjects = subjects.filter(
    (s) =>
      selectedDeptId === 'ALL' ||
      s.departmentId?._id === selectedDeptId ||
      s.departmentId === selectedDeptId
  );
  const totalCredits = currentDeptSubjects.reduce((acc, s) => acc + (s.credits || 0), 0);

  const handleOpenAddModal = () => {
    setEditingSubject(null);
    const sem = selectedSemester !== 'ALL' ? Number(selectedSemester) : 5;
    const yr = selectedYear !== 'ALL' ? Number(selectedYear) : Math.ceil(sem / 2);
    setFormData({
      code: '',
      name: '',
      departmentId: selectedDeptId !== 'ALL' ? selectedDeptId : departments[0]?._id || '',
      year: yr,
      semester: sem,
      credits: 3,
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
      credits: sub.credits || 3,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editingSubject) {
        const res = await api.put(`/admin/subjects/${editingSubject._id}`, formData);
        if (res.data.success) {
          setShowModal(false);
          setSuccessMessage(`Subject '${formData.code} - ${formData.name}' updated successfully!`);
          setTimeout(() => setSuccessMessage(''), 4000);
          fetchData();
        }
      } else {
        const res = await api.post('/admin/subjects', formData);
        if (res.data.success) {
          setShowModal(false);
          setSuccessMessage(`Subject '${formData.code} - ${formData.name}' created successfully!`);
          setTimeout(() => setSuccessMessage(''), 4000);
          fetchData();
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save subject.');
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectCode: string) => {
    if (!window.confirm(`Are you sure you want to delete course subject '${subjectCode}'?`)) return;
    try {
      await api.delete(`/admin/subjects/${subjectId}`);
      setSuccessMessage(`Subject '${subjectCode}' deleted successfully.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete subject.');
    }
  };

  const handleDeleteAllSubjects = async () => {
    setIsDeleting(true);
    try {
      if (selectedDeptId !== 'ALL') {
        const res = await api.delete('/admin/subjects', {
          data: { departmentId: selectedDeptId },
        });
        setSuccessMessage(res.data?.message || `Removed subjects for ${selectedDeptObj?.name}.`);
      } else {
        const res = await api.delete('/admin/subjects/all');
        setSuccessMessage(res.data?.message || 'All curriculum subjects removed successfully.');
      }
      setShowDeleteAllModal(false);
      setTimeout(() => setSuccessMessage(''), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete subjects.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/admin/subjects')}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Back to All Subjects Directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              Academic Curriculum Structure
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyan-400" />
            Curriculum Subjects by Department
          </h1>
          <p className="text-xs text-slate-400">
            Browse, manage, and assign institutional course curriculum organized specifically with respect to each Engineering Department.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {subjects.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/70 border border-rose-800/60 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Delete All Subjects"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              {selectedDeptId !== 'ALL'
                ? `Delete ${selectedDeptObj?.code || ''} Subjects`
                : 'Delete All Subjects'}
            </button>
          )}

          <button
            onClick={() => navigate(`/admin/bulk-import?tab=SUBJECTS${selectedDeptId !== 'ALL' ? `&dept=${selectedDeptId}` : ''}`)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition-colors border border-cyan-800/60"
            title="Bulk Import Courses via Excel Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" /> Bulk Import
          </button>

          <button
            onClick={() => navigate('/admin/subjects')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" /> All Subjects View
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/20"
          >
            <Plus className="w-4 h-4" />
            Add Subject {selectedDeptId !== 'ALL' ? `to ${selectedDeptObj?.code}` : ''}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {successMessage}
        </div>
      )}

      {/* Department Breakdown Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Building className="w-4 h-4 text-cyan-400" />
            Engineering Departments ({departments.length})
          </h2>
          <span className="text-[11px] font-semibold text-slate-500">
            Click any department below to view its curriculum
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* All Departments Pill Card */}
          <div
            onClick={() => setSelectedDeptId('ALL')}
            className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all ${
              selectedDeptId === 'ALL'
                ? 'border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500 shadow-lg shadow-cyan-950/30'
                : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-400 font-mono font-bold text-xs border border-cyan-800">
                ALL DEPTS
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {subjects.length} Subjects
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-100">All Institutional Subjects</h3>
            <p className="text-[11px] text-slate-400 mt-1">Full engineering curriculum catalog</p>
          </div>

          {/* Department Cards */}
          {departments.map((dept) => {
            const deptSubs = subjects.filter(
              (s) => s.departmentId?._id === dept._id || s.departmentId === dept._id
            );
            const count = deptSubs.length;
            const deptCredits = deptSubs.reduce((acc, s) => acc + (s.credits || 0), 0);
            const isSelected = selectedDeptId === dept._id;

            return (
              <div
                key={dept._id}
                onClick={() => setSelectedDeptId(dept._id)}
                className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500 shadow-lg shadow-cyan-950/30'
                    : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-cyan-400 font-mono font-bold text-xs border border-slate-800">
                    {dept.code}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      count > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {count} Subject{count !== 1 ? 's' : ''}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-100 line-clamp-1">{dept.name}</h3>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-mono">
                  <span>{deptCredits} Total Credits</span>
                  <span className="text-cyan-400/80">Active</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & View Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              {selectedDeptId === 'ALL'
                ? 'All Department Curriculum Subjects'
                : `${selectedDeptObj?.code} - ${selectedDeptObj?.name} Curriculum`}
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 text-xs font-mono font-bold border border-cyan-800">
                {filteredSubjects.length} of {currentDeptSubjects.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing active subjects for {selectedDeptId === 'ALL' ? 'all departments' : selectedDeptObj?.name} (Total {totalCredits} Credits).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search subject code, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-cyan-950 text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-cyan-950 text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Year & Semester Filter Tabs */}
        <div className="space-y-2.5 pt-1 border-t border-slate-800/60">
          {/* Year Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-cyan-400" /> Year:
            </span>
            <button
              onClick={() => setSelectedYear('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedYear === 'ALL'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
            >
              All Years
            </button>
            {[1, 2, 3, 4].map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(String(yr))}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedYear === String(yr)
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                Year {yr}
              </button>
            ))}
          </div>

          {/* Semester Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-cyan-400" /> Semester:
            </span>
            <button
              onClick={() => setSelectedSemester('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSemester === 'ALL'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
            >
              All Semesters
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <button
                key={sem}
                onClick={() => setSelectedSemester(String(sem))}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedSemester === String(sem)
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                Sem {sem}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subjects Display (Grid or Table) */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading department subjects...</div>
      ) : filteredSubjects.length === 0 ? (
        <div className="glass-card p-10 rounded-2xl border border-slate-800 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Subjects Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No course subjects match your current department, semester, or search filter. Click "Add Subject" above to register course codes for this department.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Cards Grid View grouped by Semester */
        selectedSemester === 'ALL' ? (
          <div className="space-y-6">
            {Array.from(new Set(filteredSubjects.map((s) => s.semester || 1)))
              .sort((a, b) => a - b)
              .map((sem) => {
                const semSubs = filteredSubjects.filter((s) => (s.semester || 1) === sem);
                const semYear = Math.ceil(sem / 2);
                const semCredits = semSubs.reduce((acc, s) => acc + (s.credits || 0), 0);

                return (
                  <div key={sem} className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950 text-cyan-300 font-mono font-bold text-xs border border-cyan-800/80">
                          Semester {sem}
                        </span>
                        <span className="text-slate-300 font-bold text-xs">
                          Year {semYear} Curriculum
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          ({semSubs.length} Subject{semSubs.length !== 1 ? 's' : ''} &bull; {semCredits} Credits)
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingSubject(null);
                          setFormData({
                            code: '',
                            name: '',
                            departmentId: selectedDeptId !== 'ALL' ? selectedDeptId : departments[0]?._id || '',
                            year: semYear,
                            semester: sem,
                            credits: 3,
                          });
                          setFormError('');
                          setShowModal(true);
                        }}
                        className="text-[11px] text-slate-400 hover:text-cyan-400 font-semibold flex items-center gap-1 transition-colors"
                        title={`Add subject to Semester ${sem}`}
                      >
                        <Plus className="w-3 h-3" /> Add to Sem {sem}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-xs">
                      {semSubs.map((sub) => (
                        <div
                          key={sub._id}
                          className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2.5 hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-cyan-950/20"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-cyan-400 text-xs px-2.5 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60">
                              {sub.code}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
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
                                onClick={() => handleDeleteSubject(sub._id, sub.code)}
                                className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors"
                                title="Delete Subject"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-extrabold text-slate-100 text-sm tracking-tight leading-snug">
                              {sub.name}
                            </h3>
                            <p className="text-[11px] text-cyan-400/90 font-medium mt-1 flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {sub.departmentId?.name || sub.departmentId?.code || 'Department'}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span className="font-semibold text-cyan-300">
                              Year {sub.year || Math.ceil((sub.semester || 1) / 2)} · Sem {sub.semester}
                            </span>
                            <span className="text-cyan-400 font-semibold">{sub.departmentId?.code}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-xs">
            {filteredSubjects.map((sub) => (
              <div
                key={sub._id}
                className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2.5 hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-cyan-950/20"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-400 text-xs px-2.5 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60">
                    {sub.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
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
                      onClick={() => handleDeleteSubject(sub._id, sub.code)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-100 text-sm tracking-tight leading-snug">
                    {sub.name}
                  </h3>
                  <p className="text-[11px] text-cyan-400/90 font-medium mt-1 flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {sub.departmentId?.name || sub.departmentId?.code || 'Department'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="font-semibold text-cyan-300">
                    Year {sub.year || Math.ceil((sub.semester || 1) / 2)} · Sem {sub.semester}
                  </span>
                  <span className="text-cyan-400 font-semibold">{sub.departmentId?.code}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Table List View */
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Course Code</th>
                  <th className="p-3.5">Course Name</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Year / Semester</th>
                  <th className="p-3.5">Credits</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSubjects.map((sub) => (
                  <tr key={sub._id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-cyan-400">{sub.code}</td>
                    <td className="p-3.5 font-bold text-slate-100">{sub.name}</td>
                    <td className="p-3.5 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-[11px]">
                        {sub.departmentId?.code}
                      </span>{' '}
                      <span className="text-slate-400 text-xs hidden sm:inline">
                        {sub.departmentId?.name}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      <span className="font-semibold text-cyan-300">Year {sub.year || Math.ceil((sub.semester || 1) / 2)}</span>
                      <span className="text-slate-400 text-[11px] block">Sem {sub.semester}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{sub.credits} Credits</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(sub)}
                          className="p-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 transition-colors"
                          title="Edit Subject"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(sub._id, sub.code)}
                          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSubject ? 'Edit Course Subject' : 'Add Course Subject'}
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Subject Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. CS501 / MZ3501"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold"
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
                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Subject Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Microcontrollers and Embedded Systems"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Department *</label>
            <select
              required
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Year of Study *</label>
              <select
                required
                value={formData.year}
                onChange={(e) => {
                  const newYear = parseInt(e.target.value);
                  const validSemesters = [newYear * 2 - 1, newYear * 2];
                  const newSem = validSemesters.includes(formData.semester) ? formData.semester : validSemesters[0];
                  setFormData({ ...formData, year: newYear, semester: newSem });
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
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
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
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
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
            >
              {editingSubject ? 'Update Subject' : 'Save Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete All Confirmation Modal */}
      <Modal
        isOpen={showDeleteAllModal}
        onClose={() => !isDeleting && setShowDeleteAllModal(false)}
        title="Confirm Delete Subjects"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-rose-200 text-sm">Permanent Action Warning</h4>
              <p className="text-rose-300/90 leading-relaxed">
                Deleting course subjects will remove them from the academic curriculum catalog.
              </p>
            </div>
          </div>

          <p className="text-slate-300 leading-relaxed">
            {selectedDeptId !== 'ALL' ? (
              <>
                Are you sure you want to delete all{' '}
                <strong className="text-rose-400 font-bold">{currentDeptSubjects.length}</strong> subjects
                registered under <strong className="text-cyan-400">{selectedDeptObj?.name} ({selectedDeptObj?.code})</strong>?
              </>
            ) : (
              <>
                Are you sure you want to delete all{' '}
                <strong className="text-rose-400 font-bold">{subjects.length}</strong> course subjects across ALL departments?
              </>
            )}
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setShowDeleteAllModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteAllSubjects}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-900/30"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
