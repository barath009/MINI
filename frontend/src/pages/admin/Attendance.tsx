import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { CheckSquare, Search } from 'lucide-react';

export const AdminAttendance: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    api.get('/reports/export').then((res) => {
      if (res.data.success) setRecords(res.data.data);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Institutional Attendance Explorer</h1>
        <p className="text-xs text-slate-400">Complete historical &amp; realtime attendance logs across all departments.</p>
      </div>

      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Register No / Student</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Classroom</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Recognition Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {records.map((r) => (
              <tr key={r._id} className="hover:bg-slate-800/40">
                <td className="py-3 px-4 text-slate-400">
                  {new Date(r.timestamp).toLocaleDateString()} {new Date(r.timestamp).toLocaleTimeString()}
                </td>
                <td className="py-3 px-4 font-mono font-bold text-slate-200">
                  {r.studentId?.registerNumber}
                  <span className="block text-[10px] text-slate-400 font-normal">{r.studentId?.userId?.name}</span>
                </td>
                <td className="py-3 px-4 font-semibold text-slate-100">{r.subjectId?.name}</td>
                <td className="py-3 px-4">{r.classroomId?.roomNumber || 'A204'}</td>
                <td className="py-3 px-4"><Badge status={r.status} /></td>
                <td className="py-3 px-4 text-cyan-400 font-medium">{r.recognitionMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
