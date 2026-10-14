import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Layers, Plus, Users, Trash2, Edit, CheckCircle, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const AdminSections: React.FC = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    departmentId: '',
    year: 3,
    semester: 5,
    academicYear: '2026-2027',
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSections = async () => {
    try {
      const res = await api.get('/admin/sections');
      if (res.data.success) setSections(res.data.data);
    } catch (err) {
      console.error('Failed to fetch sections', err);
    }
  };

  useEffect(() => {
    fetchSections();
    api.get('/admin/departments').then((r) => r.data.success && setDepartments(r.data.data));
  }, []);

  const handleOpenAddModal = () => {
    setEditingSection(null);
    setFormData({
      name: '',
      departmentId: departments[0]?._id || '',
      year: 1,
      semester: 1,
      academicYear: '2026-2027',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            Academic Class Sections ({sections.length})
          </h1>
          <p className="text-xs text-slate-400">Manage class sections, edit details, and inspect students assigned to each cohort.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/20"
        >
          <Plus className="w-4 h-4" /> Add New Section
        </button>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {sections.map((s) => {
          const isExpanded = expandedSectionId === s._id;
          const studentList = s.students || [];

          return (
            <div key={s._id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3 relative">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-100 text-sm">{s.name}</h3>
                  <p className="text-[11px] text-cyan-400 font-mono">{s.departmentId?.name || s.departmentId?.code}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 text-[11px] font-bold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-cyan-400" /> {s.studentCount || studentList.length} Students
                  </span>
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

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Year {s.year} (Sem {s.semester}) &bull; {s.academicYear || '2026-2027'}
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
                      Show Enrolled Students <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {/* Enrolled Students Expanded List */}
              {isExpanded && (
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Enrolled Students ({studentList.length}):
                  </p>
                  {studentList.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No students assigned to this section yet.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/60 bg-slate-950/60 p-2 space-y-1">
                      {studentList.map((st: any) => (
                        <div key={st._id} className="flex items-center justify-between text-xs py-1 px-1.5 hover:bg-slate-900/60 rounded">
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
              placeholder="e.g. CSE-A or AIDS-B"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-cyan-500 transition-colors"
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

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Academic Year</label>
            <input
              type="text"
              placeholder="e.g. 2026-2027"
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
            />
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
