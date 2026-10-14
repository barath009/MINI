import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Layers, Plus, Users, Trash2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const AdminSections: React.FC = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', departmentId: '', year: 3, semester: 5, academicYear: '2026-2027' });
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSections = async () => {
    const res = await api.get('/admin/sections');
    if (res.data.success) setSections(res.data.data);
  };

  useEffect(() => {
    fetchSections();
    api.get('/admin/departments').then((r) => r.data.success && setDepartments(r.data.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/admin/sections', formData);
    setShowAddModal(false);
    setSuccessMessage('Section created successfully.');
    setTimeout(() => setSuccessMessage(''), 3000);
    fetchSections();
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this section? Associated students will be unassigned.')) return;
    try {
      await api.delete(`/admin/sections/${sectionId}`);
      setSuccessMessage('Section deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchSections();
    } catch (err) {
      console.error('Failed to delete section', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            Academic Class Sections
          </h1>
          <p className="text-xs text-slate-400">Manage class sections and inspect students assigned to each section cohort.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
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
                    onClick={() => handleDeleteSection(s._id)}
                    className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors"
                    title="Delete Section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Year {s.year} (Sem {s.semester})
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

      {/* Add Section Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create New Academic Section">
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Section Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. CSE-A"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Department *</label>
            <select
              required
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
              Save Section
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
