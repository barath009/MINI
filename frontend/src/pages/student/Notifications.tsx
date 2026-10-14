import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  CheckCheck,
  Filter,
} from 'lucide-react';

export const StudentNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);
  const { socket } = useSocket();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/student/notifications');
      if (res.data.success) {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('notification.created', () => fetchNotifications());
    return () => {
      socket.off('notification.created');
    };
  }, [socket]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await api.patch(`/student/notifications/${id}/read`);
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id || n.id === id ? { ...n, readStatus: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.patch('/student/notifications/read-all');
      if (res.data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, readStatus: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = filterUnread ? notifications.filter((n) => !n.readStatus) : notifications;

  const getTypeIcon = (type: string, priority: string) => {
    if (type === 'LOW_ATTENDANCE_WARNING' || priority === 'HIGH' || priority === 'URGENT') {
      return <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />;
    }
    if (type === 'ATTENDANCE_MARKED') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
    }
    return <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider font-mono">
            STUDENT PORTAL
          </span>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Notification Center</h1>
          <p className="text-xs text-slate-400">
            Real-time biometric attendance punches, system alerts, and dispute resolution status.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-cyan-400" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setFilterUnread(false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            !filterUnread ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilterUnread(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            filterUnread ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="p-10 text-center text-slate-500 text-xs animate-pulse">Loading notifications...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-2">
          <Bell className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="font-bold text-sm text-slate-300">No notifications to show</p>
          <p className="text-xs text-slate-500">You're all caught up with attendance events and announcements.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const isUnread = !n.readStatus;
            return (
              <div
                key={n._id || n.id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  isUnread
                    ? 'bg-slate-900/90 border-cyan-800/60 shadow-md shadow-cyan-950/20'
                    : 'glass-card border-slate-800/80 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getTypeIcon(n.type, n.priority)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs text-slate-100">{n.title}</h3>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400" title="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300">{n.message}</p>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {isUnread && (
                  <button
                    onClick={() => handleMarkAsRead(n._id || n.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors shrink-0"
                    title="Mark as read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
