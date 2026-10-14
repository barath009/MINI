import React, { useEffect, useState } from 'react';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { Users, UserCheck, Clock, Cpu, AlertTriangle, CheckCircle, Scan, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, analyticsRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/analytics'),
        ]);
        if (dashRes.data.success) setData(dashRes.data.data);
        if (analyticsRes.data.success) setAnalytics(analyticsRes.data.data);
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Admin Intelligence...</div>;
  }

  const s = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Institution Administration Dashboard</h1>
        <p className="text-xs text-slate-400">Campus-wide attendance status, IoT hardware monitoring, and recognition analytics.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Present Today" value={s.presentToday || 0} subtext={`${s.overallPercentage || 92}% Overall Rate`} icon={UserCheck} color="emerald" />
        <StatCard title="Absent Today" value={s.absentToday || 0} subtext="Auto-calculated" icon={AlertTriangle} color="rose" />
        <StatCard title="Active Sessions" value={s.activeSessions || 0} subtext="Live Classes" icon={Clock} color="cyan" />
        <StatCard title="Online Devices" value={s.onlineDevices || 0} subtext={`${s.offlineDevices || 0} Offline`} icon={Cpu} color="purple" />
        <StatCard title="Pending Biometrics" value={s.pendingBiometrics || 0} subtext="Require Face Sample" icon={Scan} color="amber" />
        <StatCard title="Active Students" value={s.activeStudents || 0} subtext={`Of ${s.totalStudents || 0} Enrolled`} icon={Users} color="cyan" />
      </div>

      {/* Analytics Chart & Live Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Chart */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-200">7-Day Attendance Trend</h2>
              <p className="text-[11px] text-slate-400">Daily present vs. absent records</p>
            </div>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-800">
              Live Database Stream
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.dailyTrend || []}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="_id" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="present" stroke="#06b6d4" fillOpacity={1} fill="url(#presentGrad)" name="Present Students" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Recognition Log Feed */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-sm text-slate-200">Recent Face Events</h2>
            </div>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {data?.recentRecognitions?.map((evt: any) => (
              <div key={evt._id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-200">{evt.deviceId}</p>
                  <p className="text-[10px] text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</p>
                </div>
                <Badge status={evt.result} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
