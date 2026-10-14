import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Layers,
  Plus,
  Users,
  Trash2,
  Edit,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  X,
  Building,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const AdminSections: React.FC = () => {
  const navigate = useNavigate();

  // Data states
  const [sections, setSections] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal & Edit states
  const [showModal, setShowModal] = useState(false);
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    departmentId: '',
    year: 1,
    semester: 1,
    academicYear: '2026-2027',
    capacity: 60,
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch sections from API with cascading filter params
  const fetchSections = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedDept) params.departmentId = selectedDept;
      if (selectedAcademicYear) params.academicYear = selectedAcademicYear;
      if (selectedYear) params.year = selectedYear;
      if (selectedSemester) params.semester = selectedSemester;
      if (selectedStatus && selectedStatus !== 'ALL') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/admin/sections', { params });
      if (res.data.success) {
        setSections(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch sections', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/admin/departments').then((r) => {
      if (r.data.success) setDepartments(r.data.data);
    });
  }, []);

  useEffect(() => {
    fetchSections();
  }, [selectedDept, selectedAcademicYear, selectedYear, selectedSemester, selectedStatus, searchQuery]);

  // Derived list of unique academic years for filtering
  const availableAcademicYears = useMemo(() => {
    const defaultYears = ['2026-2027', '2025-2026', '2024-2025'];
    const extracted = sections.map((s) => s.academicYear).filter(Boolean);
    return Array.from(new Set([...defaultYears, ...extracted]));
  }, [sections]);

  // Available semesters based on selected year
  const availableSemesters = useMemo(() => {
    if (!selectedYear) return [1, 2, 3, 4, 5, 6, 7, 8];
    const y = Number(selectedYear);
    return [y * 2 - 1, y * 2];
  }, [selectedYear]);

  const handleClearFilters = () => {
    setSelectedDept('');
    setSelectedAcademicYear('');
    setSelectedYear('');
    setSelectedSemester('');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  const handleOpenAddModal = () => {
    setEditingSection(null);
    setFormData({
      name: '',
      departmentId: selectedDept || departments[0]?._id || '',
      year: selectedYear ? Number(selectedYear) : 1,
      semester: selectedSemester ? Number(selectedSemester) : 1,
      academicYear: selectedAcademicYear || '2026-2027',
      capacity: 60,
      status: 'ACTIVE',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (sec: any) => {
    setEditingSection(sec);
    setFormData({
      name: sec.name || '',
      departmentId: sec.departmentId?._id || sec.departmentId || '',
      year: sec.year || 1,
      semester: sec.semester || 1,
      academicYear: sec.academicYear || '2026-2027',
      capacity: sec.capacity !== undefined ? sec.capacity : 60,
      status: sec.status || 'ACTIVE',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingSection) {
        const res = await api.put(`/admin/sections/${editingSection._id}`, formData);
        if (res.data.success) {
          setShowModal(false);
          setSuccessMessage(`Section '${formData.name}' updated successfully.`);
          setTimeout(() => setSuccessMessage(''), 3000);
          fetchSections();
        }
      } else {
        const res = await api.post('/admin/sections', formData);
        if (res.data.success) {
          setShowModal(false);
          setSuccessMessage(`Section '${formData.name}' created successfully.`);
          setTimeout(() => setSuccessMessage(''), 3000);
          fetchSections();
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save section.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/admin/sections/${sectionToDelete._id}`);
      if (res.data.success) {
        setSuccessMessage(`Section '${sectionToDelete.name}' deleted successfully.`);
        setTimeout(() => setSuccessMessage(''), 3000);
        setSectionToDelete(null);
        fetchSections();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete section.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportSections = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (selectedDept) params.append('departmentId', selectedDept);
      if (selectedAcademicYear) params.append('academicYear', selectedAcademicYear);
      if (selectedYear) params.append('year', selectedYear);
      if (selectedSemester) params.append('semester', selectedSemester);
      if (selectedStatus && selectedStatus !== 'ALL') params.append('status', selectedStatus);

      const res = await api.get(`/import/export/sections?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sections_export_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccessMessage(`Exported sections successfully (${format.toUpperCase()}).`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      alert('Failed to export sections.');
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = Boolean(
    selectedDept || selectedAcademicYear || selectedYear || selectedSemester || (selectedStatus && selectedStatus !== 'ALL') || searchQuery
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            Academic Class Sections ({sections.length})
          </h1>
          <p className="text-xs text-slate-400">
            Organized by Department, Academic Year, Student Year and Semester with capacity tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExportSections('xlsx')}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            title="Export filtered sections to Excel"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export</span>
          </button>

          <button
            onClick={() => navigate('/admin/bulk-import?tab=SECTIONS')}
            className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            title="Import sections via Excel or CSV"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Import Sections</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Section
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Cascading Filter Controls Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Sections by Department, Year &amp; Semester</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* Department Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Academic Year</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Academic Years</option>
              {availableAcademicYears.map((ay) => (
                <option key={ay} value={ay}>
                  {ay}
                </option>
              ))}
            </select>
          </div>

          {/* Student Year Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Student Year</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                const y = e.target.value;
                setSelectedYear(y);
                if (y) {
                  const num = Number(y);
                  const validSems = [num * 2 - 1, num * 2];
                  if (selectedSemester && !validSems.includes(Number(selectedSemester))) {
                    setSelectedSemester('');
                  }
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Semesters</option>
              {availableSemesters.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          {/* Search by Section Name */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Search Section</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. CSE-A"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-2.5 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sections Cards Grid or Empty State */}
      {loading ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading academic sections...</p>
        </div>
      ) : sections.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <Layers className="w-8 h-8 text-slate-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-200">
              No sections found for this department, year and semester
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              There are no class sections matching your current filter criteria. You can clear your filters, create a section manually, or import sections in bulk.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
              >
                Clear All Filters
              </button>
            )}
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create New Section
            </button>
            <button
              onClick={() => navigate('/admin/bulk-import?tab=SECTIONS')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4" /> Bulk Import Sections
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {sections.map((s) => {
            const isExpanded = expandedSectionId === s._id;
            const studentList = s.students || [];
            const studentCount = s.studentCount !== undefined ? s.studentCount : studentList.length;
            const capacity = s.capacity !== undefined ? s.capacity : 60;
            const percentFilled = Math.min(100, Math.round((studentCount / Math.max(1, capacity)) * 100));
            const isInactive = s.status === 'INACTIVE';

            return (
              <div
                key={s._id}
                className={`glass-card p-5 rounded-2xl border transition-all space-y-3 relative ${
                  isInactive
                    ? 'border-slate-800/60 opacity-80 bg-slate-950/40'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                }`}
              >
                {/* Header: Section Name, Dept & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-100 text-base">{s.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isInactive
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {s.status || 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-[11px] text-cyan-400 font-mono flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3 text-cyan-400/80" />
                      {s.departmentId?.name || s.departmentId?.code || 'Department'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(s)}
                      className="p-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 transition-colors"
                      title="Edit Section"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSectionToDelete(s)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors"
                      title="Delete Section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cohort Info */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Cohort</span>
                    <span className="font-semibold text-slate-200">
                      Year {s.year} &bull; Sem {s.semester}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Academic Year</span>
                    <span className="font-mono text-slate-300">{s.academicYear || '2026-2027'}</span>
                  </div>
                </div>

                {/* Capacity & Enrollment Progress */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      Enrolled: <strong className="text-slate-200">{studentCount}</strong> / {capacity}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        percentFilled >= 100 ? 'text-amber-400' : 'text-cyan-400'
                      }`}
                    >
                      {percentFilled}% Filled
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentFilled >= 100
                          ? 'bg-amber-500'
                          : percentFilled >= 80
                          ? 'bg-cyan-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentFilled}%` }}
                    />
                  </div>
                </div>

                {/* Toggle Show Enrolled Students */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {s._id?.slice(-6)?.toUpperCase()}
                  </span>
                  <button
                    onClick={() => setExpandedSectionId(isExpanded ? null : s._id)}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        Hide Students <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Enrolled Students ({studentList.length}) <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Enrolled Students Expanded List */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Enrolled Students ({studentList.length}):
                    </p>
                    {studentList.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2 text-center bg-slate-950/40 rounded-xl">
                        No students assigned to this section yet.
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/60 bg-slate-950/60 p-2 space-y-1">
                        {studentList.map((st: any) => (
                          <div
                            key={st._id}
                            className="flex items-center justify-between text-xs py-1 px-1.5 hover:bg-slate-900/60 rounded"
                          >
                            <div>
                              <p className="font-semibold text-slate-200">{st.userId?.name || 'Student'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">Reg: {st.registerNumber}</p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">
                              {st.rollNumber}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Section Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => !isSubmitting && setShowModal(false)}
        title={editingSection ? `Edit Section: ${editingSection.name}` : 'Create New Academic Section'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              {formError}
            </div>
          )}

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Section Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. CSE-A, MECH-B, or A"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-cyan-500 uppercase transition-colors"
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
                value={formData.year}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setFormData({ ...formData, year: y, semester: (y - 1) * 2 + 1 });
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value={1}>Year 1</option>
                <option value={2}>Year 2</option>
                <option value={3}>Year 3</option>
                <option value={4}>Year 4</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Semester *</label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Academic Year *</label>
              <input
                type="text"
                required
                placeholder="e.g. 2026-2027"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Capacity (Max Students)</label>
              <input
                type="number"
                min={1}
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 60 })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
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
              {isSubmitting ? 'Saving...' : editingSection ? 'Update Section' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Section Confirmation Modal */}
      <Modal
        isOpen={!!sectionToDelete}
        onClose={() => !isDeleting && setSectionToDelete(null)}
        title="Confirm Delete Section"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-rose-200 text-sm">Delete Section: {sectionToDelete?.name}</h4>
              <p className="text-rose-300/90 leading-relaxed">
                Are you sure you want to delete this class section?
              </p>
              {(sectionToDelete?.studentCount > 0 || sectionToDelete?.students?.length > 0) && (
                <p className="text-amber-300 font-semibold pt-1">
                  ⚠️ Note: This section currently has {sectionToDelete?.studentCount || sectionToDelete?.students?.length} enrolled student(s). Deleting will safely unassign them from this section.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setSectionToDelete(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={confirmDeleteSection}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-all"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete Section'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
