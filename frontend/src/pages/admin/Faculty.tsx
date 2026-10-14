import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { UserPlus, CheckCircle, Edit3, Trash2, Key, Building, Users, Filter, ArrowRight, FileSpreadsheet } from 'lucide-react';

export const AdminFaculty: React.FC = () => {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<any | null>(null);
  const [selectedUserForCreds, setSelectedUserForCreds] = useState<any | null>(null);

  // Form Data States
  const [addFormData, setAddFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    password: '',
    phone: '',
    departmentId: '',
    designation: 'Associate Professor',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    phone: '',
    departmentId: '',
    designation: '',
    status: 'ACTIVE',
  });

  const [credsFormData, setCredsFormData] = useState({ email: '', password: '' });

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchFaculty = async () => {
    try {
      const res = await api.get('/admin/faculty');
      if (res.data.success) setFaculty(res.data.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchFaculty();
    api.get('/admin/departments').then((res) => {
      if (res.data.success) setDepartments(res.data.data);
    });
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/admin/faculty', addFormData);
      if (res.data.success) {
        setShowAddModal(false);
        setAddFormData({
          name: '',
          employeeId: '',
          email: '',
          password: '',
          phone: '',
          departmentId: '',
          designation: 'Associate Professor',
        });
        setSuccessMessage(`Faculty account '${addFormData.name}' created successfully!`);
        setTimeout(() => setSuccessMessage(''), 4000);
        fetchFaculty();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create faculty account');
    }
  };

  const openEditModal = (fac: any) => {
    setEditingFaculty(fac);
    setEditFormData({
      name: fac.userId?.name || '',
      employeeId: fac.employeeId || '',
      email: fac.userId?.email || '',
      phone: fac.userId?.phone || '',
      departmentId: fac.departmentId?._id || fac.departmentId || '',
      designation: fac.designation || 'Associate Professor',
      status: fac.status || 'ACTIVE',
    });
    setError('');
  };

  const handleUpdateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.put(`/admin/faculty/${editingFaculty._id}`, editFormData);
      if (res.data.success) {
        setEditingFaculty(null);
        setSuccessMessage(`Updated profile for faculty ${editFormData.employeeId}`);
        setTimeout(() => setSuccessMessage(''), 4000);
        fetchFaculty();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update faculty profile');
    }
  };

  const handleDeleteFaculty = async (facultyId: string) => {
    if (!window.confirm('Are you sure you want to delete this faculty account and unassign their classes?')) return;
    try {
      await api.delete(`/admin/faculty/${facultyId}`);
      setSuccessMessage('Faculty account deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchFaculty();
    } catch (err) {
      console.error('Failed to delete faculty', err);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.put(`/admin/users/${selectedUserForCreds.userId?._id || selectedUserForCreds.userId}/credentials`, credsFormData);
      if (res.data.success) {
        setSelectedUserForCreds(null);
        setSuccessMessage('Faculty login credentials updated successfully!');
        setTimeout(() => setSuccessMessage(''), 4000);
        fetchFaculty();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update credentials');
    }
  };

  const filteredFaculty = faculty.filter(
    (f) => selectedDeptId === 'ALL' || f.departmentId?._id === selectedDeptId
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Faculty Account Management</h1>
          <p className="text-xs text-slate-400">Institutional staff members, login credentials &amp; department allocations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/faculty-departments')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2"
          >
            <Building className="w-4 h-4 text-blue-400" />
            Faculty by Department View
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate('/admin/bulk-import')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import Faculty
          </button>
          <button
            onClick={() => {
              setError('');
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <UserPlus className="w-4 h-4" />
            Add Faculty Account
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-blue-400" />
            Department Faculty Distribution ({departments.length} Departments)
          </h2>
          <span className="text-[11px] text-slate-500">Click any card to filter directory</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div
            onClick={() => setSelectedDeptId('ALL')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedDeptId === 'ALL'
                ? 'bg-blue-950/60 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs">ALL</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-400">
                {faculty.length} Staff
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">All Departments</p>
          </div>

          {departments.map((d) => {
            const count = faculty.filter((f) => f.departmentId?._id === d._id).length;
            const isSelected = selectedDeptId === d._id;
            return (
              <div
                key={d._id}
                onClick={() => setSelectedDeptId(d._id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-950/60 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                    : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-400">{d.code}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400">
                    {count} Staff
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-400 mt-1 truncate">{d.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Directory Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-slate-200">Filter Faculty by Department:</span>
        </div>

        <select
          value={selectedDeptId}
          onChange={(e) => setSelectedDeptId(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Engineering Departments ({faculty.length} Faculty Members)</option>
          {departments.map((d) => {
            const count = faculty.filter((f) => f.departmentId?._id === d._id).length;
            return (
              <option key={d._id} value={d._id}>
                {d.code} - {d.name} ({count} Faculty Staff)
              </option>
            );
          })}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Employee ID</th>
              <th className="py-3 px-4">Faculty Name</th>
              <th className="py-3 px-4">Designation</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Login Username / Email</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredFaculty.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                  No faculty members found for the selected department.
                </td>
              </tr>
            ) : (
              filteredFaculty.map((f) => (
                <tr key={f._id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-400">{f.employeeId}</td>
                  <td className="py-3 px-4 font-semibold text-slate-100">{f.userId?.name}</td>
                  <td className="py-3 px-4 text-slate-300">{f.designation}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px]">
                      {f.departmentId?.code || 'GEN'} - {f.departmentId?.name || 'General'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono">{f.userId?.email}</td>
                  <td className="py-3 px-4">
                    <Badge status={f.status} />
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => {
                        setSelectedUserForCreds(f);
                        setCredsFormData({ email: f.userId?.email || '', password: '' });
                        setError('');
                      }}
                      className="px-2 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-300 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                      title="Change Credentials (Username / Password)"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Pass
                    </button>

                    <button
                      onClick={() => openEditModal(f)}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                      title="Edit Faculty Details"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteFaculty(f._id)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px] inline-flex items-center transition-colors"
                      title="Delete Faculty Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Faculty Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register New Faculty Account">
        <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
          {error && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{error}</div>}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="Dr. Anand Kumar"
              value={addFormData.name}
              onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Employee ID *</label>
              <input
                type="text"
                required
                placeholder="EMP_CSE_001"
                value={addFormData.employeeId}
                onChange={(e) => setAddFormData({ ...addFormData, employeeId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Designation *</label>
              <input
                type="text"
                required
                placeholder="Associate Professor"
                value={addFormData.designation}
                onChange={(e) => setAddFormData({ ...addFormData, designation: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Login Username / Email *</label>
              <input
                type="email"
                required
                placeholder="faculty@bit.edu"
                value={addFormData.email}
                onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Account Password *</label>
              <input
                type="text"
                placeholder="Custom pass or Faculty@123"
                value={addFormData.password}
                onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Department *</label>
            <select
              required
              value={addFormData.departmentId}
              onChange={(e) => setAddFormData({ ...addFormData, departmentId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
            >
              <option value="">Select Department</option>
              {departments.map((d) => {
                const count = faculty.filter((f) => f.departmentId?._id === d._id).length;
                return (
                  <option key={d._id} value={d._id}>
                    {d.code} - {d.name} ({count} assigned faculty staff)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold">
              Create Faculty Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Faculty Modal */}
      {editingFaculty && (
        <Modal isOpen={!!editingFaculty} onClose={() => setEditingFaculty(null)} title={`Edit Faculty Profile (${editingFaculty.employeeId})`}>
          <form onSubmit={handleUpdateFaculty} className="space-y-3 text-xs">
            {error && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{error}</div>}
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
                <label className="block text-slate-400 font-semibold mb-1">Employee ID *</label>
                <input
                  type="text"
                  required
                  value={editFormData.employeeId}
                  onChange={(e) => setEditFormData({ ...editFormData, employeeId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Designation *</label>
                <input
                  type="text"
                  required
                  value={editFormData.designation}
                  onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Email / Username *</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department *</label>
                <select
                  required
                  value={editFormData.departmentId}
                  onChange={(e) => setEditFormData({ ...editFormData, departmentId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="">Select Dept</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingFaculty(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold">
                Save Faculty Changes
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
          title={`Change Login Credentials (${selectedUserForCreds.employeeId})`}
        >
          <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs">
            {error && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{error}</div>}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Login Email / Username *</label>
              <input
                type="email"
                required
                value={credsFormData.email}
                onChange={(e) => setCredsFormData({ ...credsFormData, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">New Password (Leave blank to keep unchanged)</label>
              <input
                type="text"
                placeholder="Enter new password (min 6 chars)..."
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
              <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold">
                Update Login Credentials
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
