import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Cpu, Lock, ShieldCheck, Camera, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

import { formatErrorMessage } from '../../utils/errorUtils';

export const DeviceLogin: React.FC = () => {
  const [deviceId, setDeviceId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleDeviceLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/devices/login', { deviceId, password });
      if (res.data.success) {
        const { token, device } = res.data.data;
        localStorage.setItem('deviceToken', token);
        localStorage.setItem('activeDevice', JSON.stringify(device));
        navigate('/biometric-scanner');
      }
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Device authentication failed. Check Device ID & Password.'));
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoDevice = (id: string, pass: string) => {
    setDeviceId(id);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#060b17] flex items-center justify-center p-4 relative overflow-hidden text-slate-100">
      {/* Background Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />

      {/* Top Controls */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-3">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10 my-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3.5 rounded-3xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 shadow-2xl ring-4 ring-cyan-500/20 text-white font-extrabold">
            <Camera className="w-8 h-8 text-cyan-200 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">
              Biometric Camera Device Login
            </h1>
            <p className="text-xs text-cyan-400 font-semibold mt-1 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Dedicated IoT Camera Hardware Terminal
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-5">
          <div className="border-b border-slate-800/80 pb-3 text-center">
            <h2 className="text-sm font-bold text-slate-200">IoT Device Authentication</h2>
            <p className="text-[11px] text-slate-400">
              Enter registered Device ID and Passcode assigned by Administrator.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-950/90 border border-rose-800 flex items-center gap-2.5 text-xs text-rose-300 shadow-md">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleDeviceLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">IoT Device ID *</label>
              <div className="relative">
                <Cpu className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. CAM_CSE_101 or DEV_A204_02"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-cyan-300 font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">Device Password / Passcode *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all hover:scale-[1.01]"
            >
              {submitting ? (
                'Connecting IoT Camera...'
              ) : (
                <>
                  <span>Authenticate &amp; Start Camera Scanner</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Devices */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 text-center">
              Quick Fill Demo Camera Accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <button
                type="button"
                onClick={() => fillDemoDevice('CAM_CSE_101', 'Device@123')}
                className="py-2 px-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-cyan-400 font-semibold text-center truncate flex items-center justify-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5" /> CSE Cam 101
              </button>
              <button
                type="button"
                onClick={() => fillDemoDevice('DEV_A204_02', 'device_api_secret_key_bit_iot_2026')}
                className="py-2 px-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-emerald-400 font-semibold text-center truncate flex items-center justify-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5" /> Room A204
              </button>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-slate-400 hover:text-cyan-400 transition-colors font-medium"
          >
            &larr; Back to Regular User Portal Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
