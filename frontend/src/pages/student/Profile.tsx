import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorUtils';
import {
  User,
  Mail,
  Phone,
  Building,
  GraduationCap,
  Calendar,
  Layers,
  Scan,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

export const StudentProfile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Phone update
  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Password update
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/profile');
      if (res.data.success) {
        setProfile(res.data.data);
        setPhone(res.data.data.phone || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    setPhoneSuccess('');
    setSavingPhone(true);
    try {
      const res = await api.patch('/student/profile', { phone });
      if (res.data.success) {
        setPhoneSuccess('Contact phone number updated successfully.');
        setTimeout(() => setPhoneSuccess(''), 4000);
      }
    } catch (err: any) {
      setPhoneError(formatErrorMessage(err, 'Failed to update phone number.'));
    } finally {
      setSavingPhone(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      if (res.data.success) {
        setPasswordSuccess('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(''), 4000);
      }
    } catch (err: any) {
      setPasswordError(formatErrorMessage(err, 'Failed to update password. Check your current password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Student Profile...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider font-mono">
          STUDENT PORTAL
        </span>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Student Identity &amp; Profile</h1>
        <p className="text-xs text-slate-400">
          Official institutional profile and academic credentials registered with Bannari Amman Institute of Technology.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Credentials (Read-Only) */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 font-extrabold text-lg flex items-center justify-center">
              {profile?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">{profile?.name}</h2>
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                ACTIVE STUDENT
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3 text-slate-300">
              <GraduationCap className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Register &amp; Roll Number</span>
                <span className="font-mono font-bold text-slate-200">
                  {profile?.registerNumber} ({profile?.rollNumber})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Institutional Email</span>
                <span className="font-mono">{profile?.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <Building className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Academic Department</span>
                <span className="font-semibold text-slate-200">
                  {profile?.department} ({profile?.departmentCode})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <Layers className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Year, Semester &amp; Section</span>
                <span className="text-slate-200">
                  Year {profile?.year} | Semester {profile?.semester} | Section {profile?.section}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Academic Session</span>
                <span className="font-mono text-slate-200">{profile?.academicYear}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <Scan className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Biometric Status</span>
                <span className="font-bold text-cyan-400">
                  {profile?.biometricStatus === 'ENROLLED' ? 'Biometrics Enrolled & Active' : 'Biometrics Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information & Password Management */}
        <div className="space-y-6">
          {/* Editable Contact Info */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Phone className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-xs text-slate-200 uppercase tracking-wider font-mono">
                Contact Phone Information
              </h2>
            </div>

            {phoneSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{phoneSuccess}</span>
              </div>
            )}

            {phoneError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{phoneError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePhone} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Mobile Contact Number</label>
                <input
                  type="text"
                  required
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingPhone}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {savingPhone ? 'Saving...' : 'Update Phone'}
              </button>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Lock className="w-4 h-4 text-purple-400" />
              <h2 className="font-bold text-xs text-slate-200 uppercase tracking-wider font-mono">
                Update Security Password
              </h2>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs disabled:opacity-50 transition-colors shadow-lg shadow-purple-600/20"
              >
                {savingPassword ? 'Updating...' : 'Save New Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
