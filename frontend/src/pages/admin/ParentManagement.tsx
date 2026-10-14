import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatErrorMessage } from '../../utils/errorUtils';
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  KeyRound,
  UserCheck,
  UserX,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';

export const ParentManagement: React.FC = () => {
  const [parents, setParents] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 1 });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignWardModal, setShowAssignWardModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<any>(null);

  // Forms
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: 'Father',
    password: '',
    studentId: '',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
  });

  const [assignWardData, setAssignWardData] = useState({
    studentId: '',
    relationship: 'Father',
  });

  const [tempPasswordModal, setTempPasswordModal] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchParents = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/parents', { params });
      if (res.data.success) {
        setParents(Array.isArray(res.data.data) ? res.data.data : []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      } else {
        setParents([]);
      }
    } catch (err) {
      console.error(err);
      setParents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/students?limit=200');
      if (res.data.success) {
        const list = Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data.data?.students)
          ? res.data.data.students
          : [];
        setStudentsList(list);
      } else {
        setStudentsList([]);
      }
    } catch (err) {
      console.error(err);
      setStudentsList([]);
    }
  };

  useEffect(() => {
    fetchParents();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchParents();
  };

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        relationship: formData.relationship,
      };
      if (formData.password) payload.password = formData.password;
      if (formData.studentId) payload.studentIds = [formData.studentId];

      const res = await api.post('/admin/parents', payload);
      if (res.data.success) {
        setShowAddModal(false);
        setFormData({ name: '', email: '', phone: '', relationship: 'Father', password: '', studentId: '' });
        fetchParents();
        if (res.data.data.initialPassword) {
          setTempPasswordModal(res.data.data.initialPassword);
        }
      }
    } catch (err: any) {
      setFormError(formatErrorMessage(err, 'Failed to create parent account.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewParent = async (parent: any) => {
    try {
      const pId = parent.id || parent._id;
      const res = await api.get(`/admin/parents/${pId}`);
      if (res.data.success) {
        setSelectedParent(res.data.data);
        setShowViewModal(true);
      }
    } catch (err) {
      console.error(err);
      alert(formatErrorMessage(err, 'Failed to fetch parent details.'));
    }
  };

  const handleOpenEdit = (parent: any) => {
    setSelectedParent(parent);
    setEditFormData({ name: parent.name || '', phone: parent.phone || '' });
    setShowEditModal(true);
  };

  const handleUpdateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const pId = selectedParent.id || selectedParent._id;
      const res = await api.patch(`/admin/parents/${pId}`, editFormData);
      if (res.data.success) {
        setShowEditModal(false);
        fetchParents();
      }
    } catch (err: any) {
      setFormError(formatErrorMessage(err, 'Failed to update parent.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (parent: any) => {
    const nextStatus = parent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to change this parent account to ${nextStatus}?`)) return;

    try {
      const pId = parent.id || parent._id;
      const res = await api.patch(`/admin/parents/${pId}/status`, { status: nextStatus });
      if (res.data.success) {
        fetchParents();
      }
    } catch (err) {
      alert(formatErrorMessage(err, 'Status update failed'));
    }
  };

  const handleOpenAssignWard = (parent: any) => {
    setSelectedParent(parent);
    setAssignWardData({ studentId: '', relationship: 'Father' });
    setFormError('');
    setShowAssignWardModal(true);
  };

  const handleAssignWard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignWardData.studentId) {
      setFormError('Please select a student.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const pId = selectedParent.id || selectedParent._id;
      const res = await api.post(`/admin/parents/${pId}/wards`, assignWardData);
      if (res.data.success) {
        setShowAssignWardModal(false);
        fetchParents();
        if (showViewModal && selectedParent) {
          handleViewParent(selectedParent);
        }
      }
    } catch (err: any) {
      setFormError(formatErrorMessage(err, 'Failed to assign ward.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveWard = async (parentId: string, studentId: string) => {
    if (!window.confirm('Are you sure you want to remove this ward association? The parent will immediately lose access to this student.')) return;
    try {
      const res = await api.delete(`/admin/parents/${parentId}/wards/${studentId}`);
      if (res.data.success) {
        fetchParents();
        if (selectedParent) {
          handleViewParent(selectedParent);
        }
      }
    } catch (err) {
      alert(formatErrorMessage(err, 'Failed to remove ward association.'));
    }
  };

  const handleResetPassword = async (parent: any) => {
    if (!window.confirm(`Reset password for parent "${parent.name || 'this parent'}"? A new secure temporary password will be generated.`)) return;
    try {
      const pId = parent.id || parent._id;
      const res = await api.post(`/admin/parents/${pId}/reset-password`);
      if (res.data.success) {
        setTempPasswordModal(res.data.data.temporaryPassword);
      }
    } catch (err) {
      alert(formatErrorMessage(err, 'Failed to reset password.'));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider font-mono">
            ADMINISTRATION CENTER
          </span>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Parent Management &amp; Ward Allocation</h1>
          <p className="text-xs text-slate-400">
            Provision verified parent accounts and securely associate one or more student wards for real-time monitoring.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setShowAddModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Parent
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center">
        <form onSubmit={handleSearch} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search parent name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" /> Status:
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
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Parents Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Parent Name &amp; Contact</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4 text-center">Linked Wards</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    Loading parent accounts...
                  </td>
                </tr>
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No parent accounts found matching your query.
                  </td>
                </tr>
              ) : (
                (parents || []).map((p: any) => {
                  const pId = p.id || p._id;
                  const initialLetter = (p.name || 'P').trim().charAt(0).toUpperCase() || 'P';
                  const dateStr = p.createdAt
                    ? new Date(p.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';

                  return (
                    <tr key={pId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 font-extrabold text-xs flex items-center justify-center">
                            {initialLetter}
                          </div>
                          <span className="font-bold text-slate-100">{p.name || 'Unnamed Parent'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{p.email}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{p.phone || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            (p.wardCount || 0) > 0 ? 'bg-blue-950/80 text-blue-400 border border-blue-800' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          <GraduationCap className="w-3 h-3" />
                          {p.wardCount || 0} {(p.wardCount || 0) === 1 ? 'Ward' : 'Wards'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={p.status === 'ACTIVE' ? 'SAFE' : 'CRITICAL'} text={p.status || 'INACTIVE'} />
                      </td>
                      <td className="py-3 px-4 text-slate-400">{dateStr}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewParent(p)}
                            title="View Parent & Linked Wards"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800/80 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAssignWard(p)}
                            title="Assign Student Ward"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 transition-colors"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(p)}
                            title="Reset Password"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(p)}
                            title={p.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              p.status === 'ACTIVE' ? 'text-slate-400 hover:text-rose-400' : 'text-slate-400 hover:text-emerald-400'
                            }`}
                          >
                            {p.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="py-3 px-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing Page {page} of {pagination.totalPages} ({pagination.total} Parents)
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

      {/* Modal: Create Parent */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Provision New Parent Account">
        <form onSubmit={handleCreateParent} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Parent Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                placeholder="ramesh@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Relationship to Ward</label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password (Optional)</label>
              <input
                type="password"
                placeholder="Auto-generated if empty"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Ward Association (Optional)</label>
            <select
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">— Select a student to link —</option>
              {Array.isArray(studentsList) &&
                studentsList.map((st: any) => {
                  const studentName = st.name || st.userId?.name || 'Unnamed Student';
                  const regNo = st.registerNumber || '';
                  const rollNo = st.rollNumber || '';
                  const code = regNo ? ` (${regNo}${rollNo ? ` - ${rollNo}` : ''})` : '';
                  return (
                    <option key={st._id || st.id} value={st._id || st.id}>
                      {studentName}{code}
                    </option>
                  );
                })}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">You can also link more students after creating the account.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs disabled:opacity-50"
            >
              {submitting ? 'Provisioning...' : 'Provision Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Parent & Linked Wards */}
      {selectedParent && (
        <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title={`Parent Profile: ${selectedParent.name}`}>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Email:</span>
                <span className="font-mono text-slate-200">{selectedParent.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Phone:</span>
                <span className="font-mono text-slate-200">{selectedParent.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Account Status:</span>
                <span className="font-bold text-slate-200">{selectedParent.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Account Created:</span>
                <span className="text-slate-200">{new Date(selectedParent.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider font-mono">
                  Linked Student Wards ({selectedParent.wards?.length || 0})
                </h3>
                <button
                  onClick={() => handleOpenAssignWard(selectedParent)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-[11px] hover:bg-blue-600/30 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Assign Another Ward
                </button>
              </div>

              {selectedParent.wards?.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  No student wards currently linked to this parent account.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedParent.wards?.map((w: any) => (
                    <div
                      key={w.wardLinkId}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{w.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-400 border border-blue-800">
                            {w.relationship}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Reg: <span className="font-mono text-slate-200">{w.registerNumber}</span> | Roll: {w.rollNumber} | {w.department} ({w.section})
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemoveWard(selectedParent.id, w.studentId)}
                        title="Remove Ward Link"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Edit Parent */}
      {selectedParent && (
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit Parent: ${selectedParent.name}`}>
          <form onSubmit={handleUpdateParent} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Parent Full Name</label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Assign Ward */}
      {selectedParent && (
        <Modal isOpen={showAssignWardModal} onClose={() => setShowAssignWardModal(false)} title={`Assign Student Ward to ${selectedParent.name}`}>
          <form onSubmit={handleAssignWard} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Student Ward *</label>
              <select
                required
                value={assignWardData.studentId}
                onChange={(e) => setAssignWardData({ ...assignWardData, studentId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">— Select Student —</option>
                {Array.isArray(studentsList) &&
                  studentsList.map((st: any) => {
                    const studentName = st.name || st.userId?.name || 'Unnamed Student';
                    const regNo = st.registerNumber || '';
                    const rollNo = st.rollNumber || '';
                    const code = regNo ? ` (${regNo}${rollNo ? ` - ${rollNo}` : ''})` : '';
                    return (
                      <option key={st._id || st.id} value={st._id || st.id}>
                        {studentName}{code}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Relationship to Student</label>
              <select
                value={assignWardData.relationship}
                onChange={(e) => setAssignWardData({ ...assignWardData, relationship: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAssignWardModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs disabled:opacity-50"
              >
                {submitting ? 'Linking...' : 'Confirm Ward Association'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Temporary Password Display Modal */}
      {tempPasswordModal && (
        <Modal isOpen={!!tempPasswordModal} onClose={() => setTempPasswordModal(null)} title="Temporary Setup Credentials">
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Provide this temporary password to the parent. It will not be shown again.</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="font-mono font-bold text-base text-cyan-400">{tempPasswordModal}</span>
              <button
                onClick={() => copyToClipboard(tempPasswordModal)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy Password'}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setTempPasswordModal(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
