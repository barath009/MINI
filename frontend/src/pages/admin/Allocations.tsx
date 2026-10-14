import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { UserCheck, Plus, Users, Trash2, CheckCircle, Search, ShieldCheck } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const AdminAllocations: React.FC = () => {
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [facRes, stRes, allocRes] = await Promise.all([
        api.get('/admin/faculty'),
        api.get('/admin/students?limit=100'),
        api.get('/admin/allocations'),
      ]);
      if (facRes.data.success) setFacultyList(facRes.data.data);
      if (stRes.data.success) setStudentsList(stRes.data.data.students);
      if (allocRes.data.success) setAllocations(allocRes.data.data);
    } catch (err) {
      console.error('Failed to load allocations data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStudent = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!selectedStaffId) {
      setFormError('Please select a Staff member.');
      return;
    }
    if (selectedStudentIds.length === 0) {
      setFormError('Please select at least one student to allocate.');
      return;
    }  

    try {
      const res = await api.post('/admin/allocations', {
        facultyId: selectedStaffId,
        studentIds: selectedStudentIds,
      });
      if (res.data.success) {
        setShowAddModal(false);
        setSelectedStaffId('');
        setSelectedStudentIds([]);
        setSuccessMessage('Students successfully allocated to Staff member!');
        setTimeout(() => setSuccessMessage(''), 4000);
        fetchData();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create allocations');
    }
  };

  const handleRemoveAllocation = async (allocationId: string) => {
    try {
      await api.delete(`/admin/allocations/${allocationId}`);
      setSuccessMessage('Student unassigned from Staff member.');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchData();
    } catch (err) {
      console.error('Failed to remove allocation', err);
    }
  };

  // Group allocations by Staff member
  const facultyAllocationsMap: { [facultyId: string]: any[] } = {};
  allocations.forEach((alloc) => {
    const fId = alloc.facultyId?._id || alloc.facultyId;
    if (!facultyAllocationsMap[fId]) {
      facultyAllocationsMap[fId] = [];
    }
    facultyAllocationsMap[fId].push(alloc);
  });

  const filteredStudentsForModal = studentsList.filter(
    (s) =>
      s.userId?.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.registerNumber?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-cyan-400" />
            Staff &amp; Student Direct Allocations
          </h1>
          <p className="text-xs text-slate-400">
            Allocate students directly to Staff members. Staff will only have access to view and monitor their allocated students.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError('');
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/20"
        >
          <Plus className="w-4 h-4" /> Add Student to Staff
        </button>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading staff allocations...</div>
      ) : (
        <div className="space-y-4">
          {facultyList.map((fac) => {
            const assignedAllocations = facultyAllocationsMap[fac._id] || [];
            return (
              <div key={fac._id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
                {/* Staff Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-bold text-sm">
                      {fac.userId?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                        {fac.userId?.name}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 font-mono">
                          {fac.employeeId}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {fac.designation} • {fac.departmentId?.name || 'Department'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-800/60 text-xs font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Allocated Students: {assignedAllocations.length}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedStaffId(fac._id);
                        setSelectedStudentIds([]);
                        setFormError('');
                        setShowAddModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-cyan-400" /> Add Students
                    </button>
                  </div>
                </div>

                {/* Allocated Students Table */}
                {assignedAllocations.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No students currently allocated to this Staff member.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Register No</th>
                          <th className="p-3">Roll No</th>
                          <th className="p-3">Department</th>
                          <th className="p-3">Access Scope</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {assignedAllocations.map((alloc) => {
                          const st = alloc.studentId;
                          if (!st) return null;
                          return (
                            <tr key={alloc._id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-3 font-semibold text-slate-100">{st.userId?.name}</td>
                              <td className="p-3 font-mono text-cyan-400">{st.registerNumber}</td>
                              <td className="p-3 font-mono text-slate-400">{st.rollNumber}</td>
                              <td className="p-3 text-slate-300">{st.departmentId?.name || 'Department'}</td>
                              <td className="p-3 text-xs">
                                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold text-[10px] inline-flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Attendance Visible
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleRemoveAllocation(alloc._id)}
                                  className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                  title="Unassign Student from Staff"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Allocate Students Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Allocate Students Directly to Staff Member"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{formError}</div>}

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Select Staff Member (Faculty) *</label>
            <select
              required
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
            >
              <option value="">Select Staff Member</option>
              {facultyList.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.userId?.name} ({f.employeeId} - {f.designation})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Select Students to Assign ({selectedStudentIds.length} selected) *
            </label>
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search students by name or register number..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200"
              />
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/60 bg-slate-950/60 p-1">
              {filteredStudentsForModal.map((st) => {
                const isChecked = selectedStudentIds.includes(st._id);
                return (
                  <label
                    key={st._id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      isChecked ? 'bg-cyan-950/60 text-cyan-200' : 'hover:bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleStudent(st._id)}
                        className="rounded border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                      />
                      <div>
                        <p className="font-semibold text-slate-100">{st.userId?.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Reg: {st.registerNumber} • Roll: {st.rollNumber}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400">{st.departmentId?.code}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold"
            >
              Assign Selected Students
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
