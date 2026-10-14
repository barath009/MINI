import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/common/ThemeToggle';
import {
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Camera,
  Cpu,
  UserCheck,
  GraduationCap,
  Briefcase,
  Sparkles,
  Users,
} from 'lucide-react';

import { formatErrorMessage } from '../utils/errorUtils';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'FACULTY' | 'ADMIN' | 'PARENT'>('ADMIN');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN' || user.role === 'MODERATOR') navigate('/admin/dashboard');
      else if (user.role === 'FACULTY') navigate('/faculty/dashboard');
      else if (user.role === 'PARENT') navigate('/parent/dashboard');
      else navigate('/student/dashboard');
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Invalid email or password credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectRolePreset = (role: 'STUDENT' | 'FACULTY' | 'ADMIN' | 'PARENT') => {
    setActiveTab(role);
    setError('');
    if (role === 'ADMIN') {
      setEmail('admin@bit.edu');
      setPassword('Admin@123');
    } else if (role === 'FACULTY') {
      setEmail('faculty1@bit.edu');
      setPassword('Faculty@123');
    } else if (role === 'PARENT') {
      setEmail('parent@example.com');
      setPassword('Parent@123');
    } else {
      setEmail('student1@bit.edu');
      setPassword('Student@123');
    }
  };

  return (
    <div className="min-h-screen bg-[#080d1a] flex items-center justify-center p-4 relative overflow-hidden text-slate-100">
      {/* Background Glow Mesh */}
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-cyan-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Top Header Controls */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-3">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10 my-8">
        {/* Institutional Branding Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3.5 rounded-3xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 shadow-2xl shadow-cyan-500/30 ring-4 ring-white/10 text-white font-extrabold text-2xl tracking-wider">
            BIT
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">
              Bannari Amman Institute of Technology
            </h1>
            
          </div>
        </div>

        {/* Main Professional Login Card */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800/80 shadow-2xl space-y-6 relative">
          {/* Role Preset Selector Tabs */}
          <div className="space-y-2">
            <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider text-center">
              Select Portal Profession / Role
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleSelectRolePreset('ADMIN')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'ADMIN'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleSelectRolePreset('FACULTY')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'FACULTY'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Faculty
              </button>
              <button
                type="button"
                onClick={() => handleSelectRolePreset('STUDENT')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'STUDENT'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Student
              </button>
              <button
                type="button"
                onClick={() => handleSelectRolePreset('PARENT')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'PARENT'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Parent
              </button>
            </div>
          </div>

          {/* Form Error Alert */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-950/90 border border-rose-800 flex items-center gap-2.5 text-xs text-rose-300 shadow-md">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Credentials Sign In Form */}
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                {activeTab === 'STUDENT'
                  ? 'Student Email / Username'
                  : activeTab === 'FACULTY'
                  ? 'Faculty Employee Email'
                  : 'Administrator Email / Username'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder={
                    activeTab === 'STUDENT'
                      ? 'student1@bit.edu'
                      : activeTab === 'FACULTY'
                      ? 'faculty1@bit.edu'
                      : 'admin@bit.edu'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-bold">Account Password</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder=""
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {submitting ? (
                'Authenticating Session...'
              ) : (
                <>
                  <span>Sign In as {activeTab}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Biometric Camera Hardware Device Login */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => navigate('/device-login')}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-extrabold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Biometric Camera  Device Login</span>
            </button>
          </div>
        </div>

   
        

        {/* Institutional Footer */}
        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          Bannari Amman Institute of Technology &copy; 2026. <br />
          
        </p>
      </div>
    </div>
  );
};
