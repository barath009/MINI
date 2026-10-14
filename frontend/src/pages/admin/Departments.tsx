import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Building, Plus, Users, Search, GraduationCap, X, CheckCircle, Clock, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const AdminDepartments: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '' });
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');

  // Delete Modals State
  const [deptToDelete, setDeptToDelete] = useState<any | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selected Department for Student Inspection Modal
  const [selectedDept, setSelectedDept] = useState<any | null>(null);
  const [deptStudents, setDeptStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/departments');
      if (res.data.success) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load departments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const openDeptDetails = async (dept: any) => {
    setSelectedDept(dept);
    setLoadingStudents(true);
    try {
      const res = await api.get(`/admin/students?departmentId=${dept._id}&limit=100`);
      if (res.data.success) {
        setDeptStudents(res.data.data.students || []);
      }
    } catch (err) {
      console.error('Failed to load department students', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingDept(null);
    setFormData({ code: '', name: '' });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, dept: any) => {
    e.stopPropagation(); // Don't trigger roster inspection drawer
    setEditingDept(dept);
    setFormData({ code: dept.code || '', name: dept.name || '' });
    setFormError('');
    setShowModal(true);
  };

  const confirmDeleteDepartment = async () => {
    if (!deptToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/admin/departments/${deptToDelete._id}`);
      setSuccessMessage(res.data?.message || `Department '${deptToDelete.code}' deleted successfully.`);
      setDeptToDelete(null);
      setTimeout(() => setSuccessMessage(''), 4000);
      fetchDepts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete department');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllDepartments = async () => {
    setIsDeleting(true);
    try {
      const res = await api.delete('/admin/departments/all');
      setSuccessMessage(res.data?.message || 'All departments removed successfully.');
      setShowDeleteAllModal(false);
      setTimeout(() => setSuccessMessage(''), 4000);
      fetchDepts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete all departments');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editingDept) {
        const res = await api.put(`/admin/departments/${editingDept._id}`, formData);
        if (res.data.success) {
          setShowModal(false);
          setSuccessMessage(`Department '${formData.code}' updated successfully!`);
          setTimeout(() => setSuccessMessage(''), 4000);
          fetchDepts();
        }
      } else {
        const res = await api.post('/admin/departments', formData);
        if (res.data.success) {
          setShowModal(false);
          setFormData({ code: '', name: '' });
          setSuccessMessage(`Department '${formData.code}' created successfully!`);
          setTimeout(() => setSuccessMessage(''), 4000);
          fetchDepts();
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save department');
    }
  };

  const filteredDeptStudents = deptStudents.filter(
    (s) =>
      s.userId?.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.registerNumber?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Building className="w-6 h-6 text-cyan-400" />
            Engineering Departments ({departments.length})
          </h1>
          <p className="text-xs text-slate-400">
            Institutional academic departments directory. Click on any department to view enrolled students.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {departments.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/70 border border-rose-800/60 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Delete All Departments"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Delete All Departments
            </button>
          )}
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/20"
          >
            <Plus className="w-4 h-4" /> Add Department
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {successMessage}
        </div>
      )}

      {/* Grid of Department Cards */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading engineering departments...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-xs">
          {departments.map((d) => (
            <div
              key={d._id}
              onClick={() => openDeptDetails(d)}
              className="glass-card p-4 rounded-2xl border border-slate-800/80 hover:border-cyan-500/50 transition-all duration-200 cursor-pointer group space-y-3 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-all pointer-events-none" />

              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs group-hover:scale-105 transition-transform">
                  {d.code}
                </div>
                <div className="flex items-center gap-1.5 relative z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenEditModal(e, d);
                    }}
                    className="p-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 transition-colors"
                    title="Edit Department"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeptToDelete(d);
                    }}
                    className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors"
                    title="Delete Department"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-100 text-sm group-hover:text-cyan-300 transition-colors line-clamp-2">
                  {d.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Code: {d.code}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-semibold text-cyan-400">
                  <Users className="w-3.5 h-3.5" /> {d.studentCount || 0} Students
                </span>
                <span className="font-mono text-slate-400 text-[10px]">Click to inspect</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Drawer for Department Student Roster */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="glass-card w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#0d1527] p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedDept(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono font-bold text-xs">
                    {selectedDept.code}
                  </span>
                  <h2 className="text-lg font-bold text-slate-100">{selectedDept.name}</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Showing enrolled student roster for {selectedDept.name} department.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300">
                <Users className="w-4 h-4 text-cyan-400" /> Total Enrolled: {deptStudents.length} Students
              </div>
            </div>

            {/* Filter Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={`Search students in ${selectedDept.code} (e.g. Aarav, 7376221CS101)...`}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Students Roster Table */}
            {loadingStudents ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading student roster...</div>
            ) : filteredDeptStudents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                {deptStudents.length === 0
                  ? `No students currently registered in ${selectedDept.name}.`
                  : 'No matching students found.'}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-800/80">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Register No</th>
                      <th className="p-3">Roll No</th>
                      <th className="p-3">Section</th>
                      <th className="p-3">Year / Sem</th>
                      <th className="p-3 text-right">Biometric Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredDeptStudents.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-semibold text-slate-100">{s.userId?.name}</td>
                        <td className="p-3 font-mono text-cyan-400">{s.registerNumber}</td>
                        <td className="p-3 font-mono text-slate-400">{s.rollNumber}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                            {s.sectionId?.name || 'A'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">
                          Year {s.year} (Sem {s.semester})
                        </td>
                        <td className="p-3 text-right">
                          <Badge status={s.biometricStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDept(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Department Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingDept ? "Edit Department" : "Create Department"}>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{formError}</div>}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Department Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. AIDS, CSE, ECE, MECH"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 uppercase font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Department Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Artificial Intelligence and Data Science"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
              {editingDept ? "Update Department" : "Save Department"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Department Confirmation Modal */}
      <Modal
        isOpen={!!deptToDelete}
        onClose={() => !isDeleting && setDeptToDelete(null)}
        title="Confirm Delete Department"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-rose-200 text-sm">Permanent Action Warning</h4>
              <p className="text-rose-300/90 leading-relaxed">
                Are you sure you want to delete department <strong className="text-cyan-300 font-bold">{deptToDelete?.code} - {deptToDelete?.name}</strong>?
              </p>
              {deptToDelete?.studentCount > 0 && (
                <p className="text-amber-300 text-[11px] font-semibold mt-1">
                  ⚠️ Note: This department currently has {deptToDelete.studentCount} enrolled student(s). Deleting will safely dissociate them from this department.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeptToDelete(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={confirmDeleteDepartment}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-900/30"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete Department'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete All Departments Confirmation Modal */}
      <Modal
        isOpen={showDeleteAllModal}
        onClose={() => !isDeleting && setShowDeleteAllModal(false)}
        title="Confirm Delete All Departments"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-rose-200 text-sm">Destructive Action Warning</h4>
              <p className="text-rose-300/90 leading-relaxed">
                Are you sure you want to delete <strong className="text-rose-400 font-bold">ALL {departments.length}</strong> engineering departments across the institution?
              </p>
            </div>
          </div>

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
              onClick={handleDeleteAllDepartments}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-900/30"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete All'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
