import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Shield, ShieldAlert, Filter, Search, User, Clock, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';

export const AdminAudit: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MODERATOR' | 'ADMIN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let endpoint = '/admin/audit';
      if (activeFilter === 'MODERATOR') endpoint += '?role=MODERATOR';
      else if (activeFilter === 'ADMIN') endpoint += '?role=ADMIN';

      const res = await api.get(endpoint);
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeFilter]);

  // Compute summary metrics
  const moderatorLogCount = useMemo(() => {
    return logs.filter(l => l.actorId?.role === 'MODERATOR').length;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const actorName = log.actorId?.name?.toLowerCase() || '';
      const actorEmail = log.actorId?.email?.toLowerCase() || '';
      const action = log.action?.toLowerCase() || '';
      const target = log.targetEntity?.toLowerCase() || '';
      const details = JSON.stringify(log.details || {}).toLowerCase();
      return (
        actorName.includes(q) ||
        actorEmail.includes(q) ||
        action.includes(q) ||
        target.includes(q) ||
        details.includes(q)
      );
    });
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            Institutional Audit &amp; Activity Trail
          </h1>
          <p className="text-xs text-slate-400">
            Immutable log of all administrative modifications, override operations, and sensitive events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Admin Highlight: Dedicated Moderator Activity Card */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => setActiveFilter('MODERATOR')}
            className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all ${
              activeFilter === 'MODERATOR'
                ? 'bg-amber-950/20 border-amber-500/60 ring-2 ring-amber-500/20'
                : 'bg-slate-900/40 border-slate-800 hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Moderator Actions (Admin-Only Audit)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                Dedicated View
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 font-medium">
              Filter exclusively what actions and changes were made by Moderator accounts.
            </p>
            <div className="mt-3 text-[11px] text-amber-300/80 font-mono font-semibold">
              Click to isolate Moderator logs &rarr;
            </div>
          </div>

          <div
            onClick={() => setActiveFilter('ADMIN')}
            className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all ${
              activeFilter === 'ADMIN'
                ? 'bg-rose-950/20 border-rose-500/60 ring-2 ring-rose-500/20'
                : 'bg-slate-900/40 border-slate-800 hover:border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-rose-400" />
                Primary Admin Trail
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 font-medium">
              Records initiated by Primary Administrator accounts.
            </p>
            <div className="mt-3 text-[11px] text-rose-300/80 font-mono font-semibold">
              Click to isolate Admin logs &rarr;
            </div>
          </div>

          <div
            onClick={() => setActiveFilter('ALL')}
            className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all ${
              activeFilter === 'ALL'
                ? 'bg-cyan-950/20 border-cyan-500/60 ring-2 ring-cyan-500/20'
                : 'bg-slate-900/40 border-slate-800 hover:border-cyan-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                All System Logs
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 font-medium">
              Complete chronological audit trail across the institution.
            </p>
            <div className="mt-3 text-[11px] text-cyan-300/80 font-mono font-semibold">
              Click to view all logs &rarr;
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="glass-card p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search action, actor, email, entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'ALL'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Logs
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveFilter('MODERATOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeFilter === 'MODERATOR'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Moderator Actions Only</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveFilter('ADMIN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFilter === 'ADMIN'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Admin Only
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-mono">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor &amp; Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Details / Changed Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-xs text-slate-400">
                      No audit log entries matching this view.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isMod = log.actorId?.role === 'MODERATOR';
                  const isAdm = log.actorId?.role === 'ADMIN';

                  return (
                    <tr
                      key={log._id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isMod ? 'bg-amber-950/5' : ''
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Actor & Role */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-semibold text-slate-100">
                              {log.actorId?.name || 'System Auto-Engine'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {log.actorId?.email || 'N/A'}
                            </p>
                          </div>
                          {log.actorId?.role && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                                isMod
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : isAdm
                                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {log.actorId.role}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isMod ? 'text-amber-400' : 'text-cyan-400'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Target Entity */}
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono">
                          {log.targetEntity} {log.targetId ? `#${String(log.targetId).slice(-6)}` : ''}
                        </span>
                      </td>

                      {/* Details / Changed Values */}
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                        <div className="max-w-md break-words bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                          {log.details && Object.keys(log.details).length > 0 ? (
                            <div className="space-y-0.5">
                              {Object.entries(log.details).map(([k, v]) => (
                                <div key={k} className="flex gap-1.5">
                                  <span className="text-slate-400 font-semibold">{k}:</span>
                                  <span className="text-cyan-300">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-600 italic">No additional payload</span>
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
    </div>
  );
};

