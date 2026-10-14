import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { CheckSquare, MapPin, Clock, Calendar, User, BookOpen } from 'lucide-react';

export const StudentAttendanceHistory: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/history')
      .then((res) => {
        if (res.data.success) setRecords(res.data.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Detailed Attendance History ("Where &amp; When")</h1>
        <p className="text-xs text-slate-400">Complete institutional record showing exact subject, faculty, classroom location, and timestamp.</p>
      </div>

      <div className="space-y-3">
        {records.map((r) => (
          <div
            key={r.id || r._id}
            className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-cyan-400 text-xs">{r.subjectCode}</span>
                <h3 className="font-bold text-slate-100 text-sm">{r.subjectName}</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>{r.facultyName}</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{r.classroom}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{r.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{r.time}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-slate-800 pt-2 md:pt-0">
              <Badge status={r.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
