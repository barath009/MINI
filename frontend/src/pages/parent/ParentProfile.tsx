import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorUtils';
import { UserCheck, Mail, Phone, Shield, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export const ParentProfile: React.FC = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      if (res.data.success) {
        setSuccessMsg('Your account password has been successfully updated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setErrorMsg(formatErrorMessage(err, 'Failed to update password. Please check your current password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider font-mono">
          PARENT PORTAL
        </span>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Parent Account Profile</h1>
        <p className="text-xs text-slate-400">
          Manage your contact credentials and security settings for the BIT Smart Attendance System.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 font-extrabold text-lg flex items-center justify-center">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">{user?.name}</h2>
              <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                VERIFIED PARENT / GUARDIAN
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3 text-slate-300">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Registered Email</span>
                <span className="font-mono">{user?.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <Phone className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Contact Phone</span>
                <span className="font-mono">{user?.phone || 'Not provided'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <Shield className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Account Status</span>
                <span className="font-bold text-emerald-400">{user?.status || 'ACTIVE'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-blue-400" />
            <h2 className="font-bold text-xs text-slate-200 uppercase tracking-wider font-mono">
              Update Security Password
            </h2>
          </div>

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">New Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/20"
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
