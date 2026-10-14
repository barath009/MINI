import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { BookOpen, Clock, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FacultyClasses: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    api.get('/admin/sessions').then((res) => {
      if (res.data.success) setSessions(res.data.data);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">My Class Sessions &amp; Timetable</h1>
        <p className="text-xs text-slate-400">Scheduled classroom attendance sessions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {sessions.map((sess) => (
          <div key={sess._id} className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-cyan-400">{sess.sessionId}</span>
              <Badge status={sess.status} />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">{sess.subjectId?.name}</h3>
              <p className="text-[11px] text-slate-400">Classroom: {sess.classroomId?.building} - {sess.classroomId?.roomNumber}</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-slate-400">{sess.startTime} - {sess.endTime}</span>
              <Link
                to={`/faculty/attendance/${sess._id}`}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5" /> Monitor Session
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
