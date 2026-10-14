import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  UserPlus,
  Trash2,
  CheckCircle,
  Lock,
  Edit,
  Key,
  Search,
  Users,
  UserCheck,
  AlertTriangle,
  Save,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';

export const AdminSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [settings, setSettings] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [moderators, setModerators] = useState<any[]>([]);
  const [userAccounts, setUserAccounts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Current Admin Profile Credentials Form State
  const [profileFormData, setProfileFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Modals
  const [showModModal, setShowModModal] = useState(false);
  const [modFormData, setModFormData] = useState({ name: '', email: '', password: '' });

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminFormData, setAdminFormData] = useState({ name: '', email: '', password: '' });
  const [adminError, setAdminError] = useState('');

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', password: '', role: 'FACULTY', status: 'ACTIVE' });

  const [savedMsg, setSavedMsg] = useState('');
  const [modError, setModError] = useState('');
  const [userError, setUserError] = useState('');

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/admin/admins');
      if (res.data.success) setAdmins(res.data.data);
    } catch (err) {}
  };

  const fetchModerators = async () => {
    try {
      const res = await api.get('/admin/moderators');
      if (res.data.success) setModerators(res.data.data);
    } catch (err) {}
  };

  const fetchUserAccounts = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) setUserAccounts(res.data.data);
    } catch (err) {}
  };

  useEffect(() => {
    api.get('/admin/settings').then((res) => {
      if (res.data.success) setSettings(res.data.data);
    });
    fetchAdmins();
    fetchModerators();
    fetchUserAccounts();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileFormData((prev) => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleUpdateSetting = async (key: string, val: any) => {
    await api.put('/admin/settings', { key, value: parseFloat(val) });
    setSavedMsg(`System Setting '${key}' updated to ${val}`);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  // Update Current Admin Profile (Name, Email, Password)
  const handleUpdateCurrentAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (profileFormData.newPassword && profileFormData.newPassword.trim() !== '') {
      if (profileFormData.newPassword !== profileFormData.confirmPassword) {
        setProfileError('New password and confirmation password do not match.');
        return;
      }
      if (profileFormData.newPassword.length < 6) {
        setProfileError('New password must be at least 6 characters long.');
        return;
      }
    }

    setProfileSaving(true);
    try {
      const payload: any = {
        name: profileFormData.name.trim(),
        email: profileFormData.email.trim(),
      };
      if (profileFormData.newPassword && profileFormData.newPassword.trim() !== '') {
        payload.newPassword = profileFormData.newPassword;
        payload.currentPassword = profileFormData.currentPassword;
      }

      const res = await api.put('/auth/profile', payload);
      if (res.data.success) {
        updateUser(res.data.data);
        setProfileSuccess('Your Administrator credentials (name, email, password) have been updated successfully!');
        setProfileFormData((prev) => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
        setTimeout(() => setProfileSuccess(''), 5000);
        fetchAdmins();
        fetchUserAccounts();
      }
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to update credentials.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCreateModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    setModError('');
    try {
      const res = await api.post('/admin/moderators', modFormData);
      if (res.data.success) {
        setShowModModal(false);
        setModFormData({ name: '', email: '', password: '' });
        setSavedMsg(`Moderator '${modFormData.name}' created successfully!`);
        setTimeout(() => setSavedMsg(''), 4000);
        fetchModerators();
        fetchUserAccounts();
      }
    } catch (err: any) {
      setModError(err.response?.data?.message || 'Failed to create moderator account');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    try {
      const res = await api.post('/admin/admins', adminFormData);
      if (res.data.success) {
        setShowAdminModal(false);
        setAdminFormData({ name: '', email: '', password: '' });
        setSavedMsg(`Administrator account '${adminFormData.name}' provisioned successfully!`);
        setTimeout(() => setSavedMsg(''), 4000);
        fetchAdmins();
        fetchUserAccounts();
      }
    } catch (err: any) {
      setAdminError(err.response?.data?.message || 'Failed to create administrator account');
    }
  };

  const handleDeleteAdmin = async (adminId: string, adminEmail: string) => {
    if (!window.confirm(`Are you sure you want to remove Administrator account '${adminEmail}'? This action cannot be undone.`)) return;
    try {
      const res = await api.delete(`/admin/admins/${adminId}`);
      if (res.data.success) {
        setSavedMsg(res.data.message || `Administrator '${adminEmail}' removed.`);
        setTimeout(() => setSavedMsg(''), 4000);
        fetchAdmins();
        fetchUserAccounts();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete administrator');
    }
  };

  const handleDeleteModerator = async (modId: string) => {
    if (!window.confirm('Are you sure you want to remove this Moderator account?')) return;
    try {
      await api.delete(`/admin/moderators/${modId}`);
      setSavedMsg('Moderator account deleted.');
      setTimeout(() => setSavedMsg(''), 3000);
      fetchModerators();
      fetchUserAccounts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete moderator');
    }
  };

  const handleOpenUserEdit = (acc: any) => {
    setEditingUser(acc);
    setUserFormData({
      name: acc.name || '',
      email: acc.email || '',
      password: '', // Blank unless changing
      role: acc.role || 'FACULTY',
      status: acc.status || 'ACTIVE',
    });
    setUserError('');
    setShowUserModal(true);
  };

  const handleSaveUserCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    try {
      const payload: any = {
        name: userFormData.name.trim(),
        email: userFormData.email.trim(),
        role: userFormData.role,
        status: userFormData.status,
      };
      if (userFormData.password && userFormData.password.trim() !== '') {
        payload.password = userFormData.password;
      }

      const res = await api.put(`/admin/users/${editingUser._id}/credentials`, payload);
      if (res.data.success) {
        setShowUserModal(false);
        setSavedMsg(`User credentials updated for '${userFormData.email}'!`);
        setTimeout(() => setSavedMsg(''), 4000);

        if (user && editingUser._id === user.id) {
          updateUser(res.data.data);
        }

        fetchUserAccounts();
        fetchAdmins();
        fetchModerators();
      }
    } catch (err: any) {
      setUserError(err.response?.data?.message || 'Failed to update user credentials');
    }
  };

  const filteredUsers = userAccounts.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-cyan-400" />
          System Settings &amp; Administrator Account Management
        </h1>
        <p className="text-xs text-slate-400">
          Update current administrator credentials, provision secondary administrators, manage moderators, and configure attendance thresholds.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {savedMsg}
        </div>
      )}

      {/* 1. Current Administrator Profile & Credentials (Your Account) */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-400" />
              Current Administrator Credentials (Your Account)
            </h2>
            <p className="text-xs text-slate-400">
              Change your active administrator login username, email address, or update your password.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[11px] font-bold self-start sm:self-auto flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> Logged In as {user?.role || 'ADMIN'}
          </span>
        </div>

        {profileError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            {profileSuccess}
          </div>
        )}

        <form onSubmit={handleUpdateCurrentAdmin} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Full Display Name / Username <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={profileFormData.name}
                onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                placeholder="Administrator Name"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Login Email Address (Account Username) <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={profileFormData.email}
                onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                placeholder="admin@bit.edu"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono font-medium focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Change Password (Leave blank to keep your current password)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 text-[11px] font-medium mb-1">
                  Current Password {profileFormData.newPassword ? <span className="text-rose-400">*</span> : ''}
                </label>
                <input
                  type="password"
                  value={profileFormData.currentPassword}
                  onChange={(e) => setProfileFormData({ ...profileFormData, currentPassword: e.target.value })}
                  placeholder={profileFormData.newPassword ? 'Verify current password' : 'Enter if changing password'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] font-medium mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={profileFormData.newPassword}
                  onChange={(e) => setProfileFormData({ ...profileFormData, newPassword: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] font-medium mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={profileFormData.confirmPassword}
                  onChange={(e) => setProfileFormData({ ...profileFormData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/40 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              {profileSaving ? 'Saving Changes...' : 'Save My Admin Credentials'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Institutional Administrators Management */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-rose-400" />
              Institutional Administrators ({admins.length})
            </h2>
            <p className="text-xs text-slate-400">
              Administrators hold full unrestricted system privileges. You can provision secondary administrators or manage access credentials.
            </p>
          </div>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => {
                setAdminError('');
                setAdminFormData({ name: '', email: '', password: '' });
                setShowAdminModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-900/30 shrink-0 transition-transform active:scale-95"
            >
              <UserPlus className="w-4 h-4" /> Provision New Administrator
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Administrator Name</th>
                <th className="p-3">Login Email / Username</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                    Loading administrators...
                  </td>
                </tr>
              ) : (
                admins.map((adm) => {
                  const isCurrent = user && (adm._id === user.id || adm.email === user.email);
                  return (
                    <tr key={adm._id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-semibold text-slate-100 flex items-center gap-2">
                        {adm.name}
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                            You
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-cyan-400 font-bold">{adm.email}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                          {adm.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold text-emerald-400">{adm.status || 'ACTIVE'}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenUserEdit(adm)}
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                            title="Edit Administrator Credentials"
                          >
                            <Key className="w-3 h-3 text-cyan-400" /> Edit Credentials
                          </button>
                          {user?.role === 'ADMIN' && (
                            <button
                              disabled={isCurrent || admins.length <= 1}
                              onClick={() => handleDeleteAdmin(adm._id, adm.email)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title={
                                isCurrent
                                  ? 'You cannot delete your own active administrator account'
                                  : admins.length <= 1
                                  ? 'Cannot delete the only administrator account'
                                  : 'Remove Administrator Account'
                              }
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Moderator Management */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-cyan-400" />
              Administrative Moderators ({moderators.length})
            </h2>
            <p className="text-xs text-slate-400">
              Moderators have administrative rights to manage classes, attendance, and classrooms. Only Administrators can provision or revoke Moderator roles.
            </p>
          </div>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => {
                setModError('');
                setModFormData({ name: '', email: '', password: '' });
                setShowModModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-900/20 shrink-0 transition-transform active:scale-95"
            >
              <UserPlus className="w-4 h-4" /> Add Moderator
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Moderator Name</th>
                <th className="p-3">Login Email / Username</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {moderators.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                    No moderator accounts registered.
                  </td>
                </tr>
              ) : (
                moderators.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 font-semibold text-slate-100">{m.name}</td>
                    <td className="p-3 font-mono text-cyan-400">{m.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold">
                        {m.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold text-emerald-400">{m.status || 'ACTIVE'}</span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenUserEdit(m)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                          title="Edit Moderator Credentials"
                        >
                          <Key className="w-3 h-3 text-cyan-400" /> Edit Credentials
                        </button>
                        {user?.role === 'ADMIN' ? (
                          <button
                            onClick={() => handleDeleteModerator(m._id)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                            title="Delete Moderator Account"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Protected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. All Registered Accounts — Username & Password Management */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-cyan-400" />
              All Registered Accounts ({userAccounts.length}) — Username &amp; Password Management
            </h2>
            <p className="text-xs text-slate-400">
              Change login email (username) or reset password for any Student, Faculty, Moderator, or Admin account.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user, email, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80 max-h-96">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800 sticky top-0">
              <tr>
                <th className="p-3">User Name</th>
                <th className="p-3">Login Email (Username)</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((acc) => (
                <tr key={acc._id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 font-semibold text-slate-100">{acc.name}</td>
                  <td className="p-3 font-mono text-cyan-400 font-bold">{acc.email}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        acc.role === 'ADMIN'
                          ? 'bg-rose-950 text-rose-400 border-rose-800'
                          : acc.role === 'FACULTY'
                          ? 'bg-purple-950 text-purple-300 border-purple-800'
                          : acc.role === 'STUDENT'
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : 'bg-cyan-950 text-cyan-400 border-cyan-800'
                      }`}
                    >
                      {acc.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] font-bold text-emerald-400">{acc.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    {user?.role === 'MODERATOR' && (acc.role === 'ADMIN' || acc.role === 'MODERATOR') ? (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono font-bold">
                        Protected Account
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenUserEdit(acc)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors"
                        title="Edit Account Username & Password"
                      >
                        <Key className="w-3.5 h-3.5 text-cyan-400" /> Edit Username / Pass
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. System Settings & Late Timing Configuration */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-cyan-400" />
          Attendance Recognition &amp; Late Timing Thresholds
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {settings.map((s) => (
            <div key={s._id} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div>
                <label className="font-bold text-slate-200 block">{s.key}</label>
                <p className="text-[10px] text-slate-400">{s.description}</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  step={s.key.includes('SIMILARITY') || s.key.includes('CONFIDENCE') ? '0.05' : '1'}
                  defaultValue={s.value}
                  onBlur={(e) => handleUpdateSetting(s.key, e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-cyan-300 font-mono w-full text-xs font-bold"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit User Account Modal (Username & Password) */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={`Edit Credentials for '${editingUser?.name}'`}>
        <form onSubmit={handleSaveUserCredentials} className="space-y-3 text-xs">
          {userError && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{userError}</div>}
          
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Full Display Name *</label>
            <input
              type="text"
              required
              value={userFormData.name}
              onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Login Email / Username *</label>
            <input
              type="email"
              required
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">New Password (Leave blank to keep existing)</label>
            <input
              type="text"
              placeholder="Enter new password..."
              value={userFormData.password}
              onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Account Role *</label>
              <select
                value={userFormData.role}
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="FACULTY">FACULTY</option>
                <option value="STUDENT">STUDENT</option>
                {user?.role === 'ADMIN' && <option value="MODERATOR">MODERATOR</option>}
                {user?.role === 'ADMIN' && <option value="ADMIN">ADMIN</option>}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Account Status *</label>
              <select
                value={userFormData.status}
                onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5">
              <Key className="w-4 h-4" /> Save User Credentials
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Moderator Modal */}
      <Modal isOpen={showModModal} onClose={() => setShowModModal(false)} title="Register New Moderator Account">
        <form onSubmit={handleCreateModerator} className="space-y-3 text-xs">
          {modError && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{modError}</div>}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Moderator Officer"
              value={modFormData.name}
              onChange={(e) => setModFormData({ ...modFormData, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Login Email / Username *</label>
            <input
              type="email"
              required
              placeholder="moderator@bit.edu"
              value={modFormData.email}
              onChange={(e) => setModFormData({ ...modFormData, email: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Account Password *</label>
            <input
              type="text"
              required
              placeholder="Enter password..."
              value={modFormData.password}
              onChange={(e) => setModFormData({ ...modFormData, password: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" onClick={() => setShowModModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
              Create Moderator Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Admin Modal */}
      <Modal isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} title="Provision New Primary Administrator Account">
        <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
          {adminError && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{adminError}</div>}
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200">
            <p className="font-bold text-[11px] flex items-center gap-1.5 text-rose-300">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              Full System Administrative Privileges
            </p>
            <p className="text-[10px] text-slate-300 mt-1">
              Admin accounts have unrestricted root access including provisioning administrators, managing moderators, and full database override controls.
            </p>
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Full Admin Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Chief Executive Admin"
              value={adminFormData.name}
              onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Login Email / Username *</label>
            <input
              type="email"
              required
              placeholder="admin.new@bitsathy.ac.in"
              value={adminFormData.email}
              onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Account Password *</label>
            <input
              type="text"
              required
              placeholder="Enter secure admin password..."
              value={adminFormData.password}
              onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" onClick={() => setShowAdminModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-900/20">
              Provision Administrator Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
