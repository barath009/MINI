import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { BookOpen, Plus, Edit, Trash2, CheckCircle, Filter, Building } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const AdminSubjects: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [formData, setFormData] = useState({ code: '', name: '', departmentId: '', semester: 5, credits: 4 });
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');

  const fetchSubjects = async () => {
    const res = await api.get('/admin/subjects');
    if (res.data.success) setSubjects(res.data.data);
  };

  useEffect(() => {
    fetchSubjects();
    api.get('/admin/departments').then((r) => {
      if (r.data.success) {
        setDepartments(r.data.data);
      }
    });
  }, []);

  const handleOpenAddModal = () => {
    setEditingSubject(null);
    setFormData({ code: '', name: '', departmentId: departments[0]?._id || '', semester: 5, credits: 4 });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (sub: any) => {
    setEditingSubject(sub);
    setFormData({
      code: sub.code || '',
      name: sub.name || '',
      departmentId: sub.departmentId?._id || sub.departmentId || '',
      semester: sub.semester || 5,
      credits: sub.credits || 4,
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
          fetchSubjects();
        }
      } else {
        const res = await api.post('/admin/subjects', formData);
        if (res.data.success) {
          setShowModal(false);
          setFormData({ code: '', name: '', departmentId: '', semester: 5, credits: 4 });
          setSuccessMessage(`Subject '${formData.code} - ${formData.name}' created successfully!`);
          setTimeout(() => setSuccessMessage(''), 4000);
          fetchSubjects();
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save subject');
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectCode: string) => {
    if (!window.confirm(`Are you sure you want to delete course subject '${subjectCode}'?`)) return;
    try {
      await api.delete(`/admin/subjects/${subjectId}`);
      setSuccessMessage(`Subject '${subjectCode}' deleted successfully.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchSubjects();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete subject');
    }
  };

  const filteredSubjects = subjects.filter((sub) => {
    if (!selectedDeptId) return true;
    return sub.departmentId?._id === selectedDeptId || sub.departmentId === selectedDeptId;
  });

  // Group subjects by department
  const subjectsByDept: { [deptName: string]: any[] } = {};
  filteredSubjects.forEach((sub) => {
    const deptName = sub.departmentId?.name || sub.departmentId?.code || 'Engineering Department';
    if (!subjectsByDept[deptName]) subjectsByDept[deptName] = [];
    subjectsByDept[deptName].push(sub);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyan-400" />
            Engineering Department Subjects
          </h1>
          <p className="text-xs text-slate-400">Curriculum course codes organized with respect to Engineering Department.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/20"
        >
          <Plus className="w-4 h-4" /> Add New Subject
        </button>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {successMessage}
        </div>
      )}

      {/* Filter by Department Bar */}
      <div className="glass-card px-4 py-3 rounded-2xl border border-slate-800 flex items-center gap-3">
        <Filter className="w-4 h-4 text-cyan-400" />
        <div className="w-full">
          <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
            Filter Subjects by Department
          </label>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-100 w-full font-bold cursor-pointer"
          >
            <option value="" className="bg-slate-900 text-slate-200">
              All Engineering Departments ({departments.length})
            </option>
            {departments.map((d) => (
              <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">
                {d.code} - {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped Subjects Display */}
      {Object.keys(subjectsByDept).length === 0 ? (
        <div className="glass-card p-8 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
          No subjects found for the selected department. Click "Add New Subject" to create one.
        </div>
      ) : (
        <div className="space-y-6 text-xs">
          {Object.entries(subjectsByDept).map(([deptName, deptSubjects]) => (
            <div key={deptName} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <Building className="w-4 h-4 text-cyan-400" />
                <h2 className="font-extrabold text-sm text-slate-100">{deptName}</h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-cyan-400 border border-slate-800 text-[10px] font-mono">
                  {deptSubjects.length} Subject(s)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptSubjects.map((sub) => (
                  <div key={sub._id} className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400 text-xs px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60">
                        {sub.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1">{sub.credits} Credits</span>
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
                    <h3 className="font-extrabold text-slate-100 text-xs tracking-tight">{sub.name}</h3>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                      <span>Semester {sub.semester}</span>
                      <span className="text-cyan-400">{sub.departmentId?.code}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSubject ? "Edit Course Subject" : "Add Course Subject"}>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {formError && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{formError}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Subject Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. CS501"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
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
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
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
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
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
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Semester *</label>
              <input
                type="number"
                required
                min="1"
                max="8"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
              {editingSubject ? "Update Subject" : "Save Subject"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
