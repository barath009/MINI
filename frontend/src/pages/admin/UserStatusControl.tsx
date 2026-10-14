import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Users, Search, Filter, ShieldCheck, UserCheck, GraduationCap, RefreshCw } from 'lucide-react';

export const UserStatusControl: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Suspension Modal State
  const [targetUser, setTargetUser] = useState<any | null>(null);
  const [pendingStatus, setPendingStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('SUSPENDED');
  const [reason, setReason] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load user accounts for status control', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenStatusModal = (user: any, newStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    if (currentUser?.role === 'MODERATOR' && (user.role === 'ADMIN' || user.role === 'MODERATOR')) {
      alert('Access Denied: Moderators are not permitted to alter the status of Primary Administrator or Moderator accounts.');
      return;
    }
    setTargetUser(user);
    setPendingStatus(newStatus);
    setReason('');
    setErrorMsg('');
  };

  const handleConfirmStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    setErrorMsg('');
    try {
      const res = await api.put(`/admin/users/${targetUser._id}/status`, {
        status: pendingStatus,
        reason,
      });

      if (res.data.success) {
        setActionMessage(`Account '${targetUser.email}' status updated to ${pendingStatus}!`);
        setTimeout(() => setActionMessage(''), 4000);
        setTargetUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update account status');
    }
  };

  // Filter Logic
  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRole === 'ALL' || u.role === selectedRole;
    const matchesStatus = selectedStatus === 'ALL' || u.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  // Summary Metrics
  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const suspendedCount = users.filter((u) => u.status === 'SUSPENDED').length;
  const inactiveCount = users.filter((u) => u.status === 'INACTIVE').length;

  const studentCount = users.filter((u) => u.role === 'STUDENT').length;
  const facultyCount = users.filter((u) => u.role === 'FACULTY').length;
  const moderatorCount = users.filter((u) => u.role === 'MODERATOR' || u.role === 'ADMIN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            User Account Status &amp; Suspension Control
          </h1>
          <p className="text-xs text-slate-400">
            Dedicated administrative control center to Activate, Suspend, or Deactivate accounts for Students, Faculty, and Moderators.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700"
        >
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          Refresh Statuses
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {actionMessage}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Active Accounts</p>
            <p className="text-2xl font-black font-mono text-emerald-400 mt-0.5">{activeCount}</p>
            <p className="text-[10px] text-slate-500 font-medium">Full system access</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Suspended Accounts</p>
            <p className="text-2xl font-black font-mono text-rose-400 mt-0.5">{suspendedCount}</p>
            <p className="text-[10px] text-slate-500 font-medium">Blocked from login</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Inactive Accounts</p>
            <p className="text-2xl font-black font-mono text-amber-400 mt-0.5">{inactiveCount}</p>
            <p className="text-[10px] text-slate-500 font-medium">Deactivated/Archived</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400 font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Total Users</p>
            <p className="text-2xl font-black font-mono text-slate-100 mt-0.5">{users.length}</p>
            <p className="text-[10px] text-slate-500 font-medium">Registered in system</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400 font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Role Navigation Filter Tabs (Matches requested "separate page for every role") */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-400">
            Account Categories by Role
          </h2>
          <span className="text-[11px] text-slate-500">Filter controls by specific user role</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <button
            onClick={() => setSelectedRole('ALL')}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              selectedRole === 'ALL'
                ? 'bg-blue-950/60 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              <Users className="w-4 h-4 text-blue-400" />
              <span>All Roles</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedRole('STUDENT')}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              selectedRole === 'STUDENT'
                ? 'bg-blue-950/60 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              <span>Student Accounts</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
              {studentCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedRole('FACULTY')}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              selectedRole === 'FACULTY'
                ? 'bg-blue-950/60 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span>Faculty Accounts</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-400 border border-purple-800">
              {facultyCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedRole('MODERATOR')}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              selectedRole === 'MODERATOR'
                ? 'bg-blue-950/60 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Moderator Accounts</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              {moderatorCount}
            </span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <h2 className="font-extrabold text-sm text-slate-100">
              {selectedRole === 'ALL' ? 'All User Accounts' : `${selectedRole} User Accounts`} Roster
              <span className="ml-2 px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-400 text-xs font-mono font-bold border border-blue-800">
                {filteredUsers.length} Users
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses (Active, Suspended, Inactive)</option>
              <option value="ACTIVE">ACTIVE Only ({users.filter(u => u.status === 'ACTIVE').length})</option>
              <option value="SUSPENDED">SUSPENDED Only ({users.filter(u => u.status === 'SUSPENDED').length})</option>
              <option value="INACTIVE">INACTIVE Only ({users.filter(u => u.status === 'INACTIVE').length})</option>
            </select>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Users Roster Table with 1-Click Status Switches */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading user account roster...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No user accounts found matching the filter.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Login Email / Username</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Current Status</th>
                  <th className="p-3 text-right">Instant Status Action Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const isProtected =
                    currentUser?.role === 'MODERATOR' && (u.role === 'ADMIN' || u.role === 'MODERATOR');

                  return (
                    <tr key={u._id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-semibold text-slate-100">{u.name}</td>
                      <td className="p-3 font-mono text-cyan-400 font-bold">{u.email}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            u.role === 'ADMIN'
                              ? 'bg-rose-950 text-rose-400 border-rose-800'
                              : u.role === 'FACULTY'
                              ? 'bg-purple-950 text-purple-300 border-purple-800'
                              : u.role === 'STUDENT'
                              ? 'bg-blue-950 text-blue-300 border-blue-800'
                              : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge status={u.status} />
                      </td>
                      <td className="p-3 text-right">
                        {isProtected ? (
                          <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-[10px] font-mono font-bold border border-slate-700">
                            Protected Account
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Activate Button */}
                            {u.status !== 'ACTIVE' && (
                              <button
                                onClick={() => handleOpenStatusModal(u, 'ACTIVE')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                                title="Set Account Status to ACTIVE"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                Activate
                              </button>
                            )}

                            {/* Suspend Button */}
                            {u.status !== 'SUSPENDED' && (
                              <button
                                onClick={() => handleOpenStatusModal(u, 'SUSPENDED')}
                                className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                                title="Suspend Account Access"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                Suspend
                              </button>
                            )}

                            {/* Inactive Button */}
                            {u.status !== 'INACTIVE' && (
                              <button
                                onClick={() => handleOpenStatusModal(u, 'INACTIVE')}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                                title="Set Account Status to INACTIVE"
                              >
                                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                Deactivate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Confirmation Modal */}
      {targetUser && (
        <Modal
          isOpen={!!targetUser}
          onClose={() => setTargetUser(null)}
          title={`Confirm Account Status Change (${targetUser.email})`}
        >
          <form onSubmit={handleConfirmStatusChange} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{errorMsg}</div>
            )}

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <p className="font-bold text-slate-100">
                User: <span className="text-cyan-400 font-mono">{targetUser.name}</span> ({targetUser.role})
              </p>
              <p className="text-slate-400">
                Changing status from <span className="font-bold text-slate-200">{targetUser.status}</span> to{' '}
                <span className="font-bold text-blue-400">{pendingStatus}</span>.
              </p>
            </div>

            {pendingStatus === 'SUSPENDED' && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Suspension Warning
                </p>
                <p className="text-[11px] text-rose-200/80">
                  Suspending this account will immediately block the user from logging in or scanning biometrics.
                </p>
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Reason for Status Change (Optional, logged in audit trail):
              </label>
              <input
                type="text"
                placeholder="e.g. Fee pending, administrative review, temporary leave..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTargetUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-xl text-white font-bold transition-colors ${
                  pendingStatus === 'SUSPENDED'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : pendingStatus === 'ACTIVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                Confirm {pendingStatus} Status
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
