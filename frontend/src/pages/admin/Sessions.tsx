import React, { useEffect, useState } from 'react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { Clock, Plus, Play, Square } from 'lucide-react';

export const AdminSessions: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    subjectId: '',
    facultyId: '',
    sectionId: '',
    classroomId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    gracePeriodMinutes: 10,
    academicYear: '2026-2027',
    semester: 5,
  });

  const fetchSessions = async () => {
    try {
      const res = await api.get('/admin/sessions');
      if (res.data.success) setSessions(res.data.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchSessions();
    Promise.all([
      api.get('/admin/subjects'),
      api.get('/admin/faculty'),
      api.get('/admin/sections'),
      api.get('/admin/classrooms'),
    ]).then(([subRes, facRes, secRes, roomRes]) => {
      if (subRes.data.success) setSubjects(subRes.data.data);
      if (facRes.data.success) setFaculty(facRes.data.data);
      if (secRes.data.success) setSections(secRes.data.data);
      if (roomRes.data.success) setClassrooms(roomRes.data.data);
    });
  }, []);

  const handleStart = async (id: string) => {
    await api.post(`/admin/sessions/${id}/start`);
    fetchSessions();
  };

  const handleEnd = async (id: string) => {
    await api.post(`/admin/sessions/${id}/end`);
    fetchSessions();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/sessions', formData);
      if (res.data.success) {
        setShowAddModal(false);
        fetchSessions();
      }
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Attendance Session Manager</h1>
          <p className="text-xs text-slate-400">Classroom attendance sessions &amp; period tracking.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Session
        </button>
      </div>

      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Session ID</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Faculty</th>
              <th className="py-3 px-4">Classroom</th>
              <th className="py-3 px-4">Timing</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {sessions.map((s) => (
              <tr key={s._id} className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-mono font-bold text-cyan-400">{s.sessionId}</td>
                <td className="py-3 px-4 font-semibold text-slate-100">{s.subjectId?.name}</td>
                <td className="py-3 px-4">{s.facultyId?.userId?.name}</td>
                <td className="py-3 px-4">
                  {s.classroomId?.building} - {s.classroomId?.roomNumber}
                </td>
                <td className="py-3 px-4">
                  {s.startTime} - {s.endTime} ({s.gracePeriodMinutes}m grace)
                </td>
                <td className="py-3 px-4">
                  <Badge status={s.status} />
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  {s.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleStart(s._id)}
                      className="px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> Start
                    </button>
                  )}
                  {s.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleEnd(s._id)}
                      className="px-3 py-1 rounded-lg bg-rose-950 border border-rose-800 text-rose-400 font-bold text-[10px] inline-flex items-center gap-1"
                    >
                      <Square className="w-3 h-3" /> End Session
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create New Attendance Session">
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Subject *</label>
            <select
              required
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            >
              <option value="">Select Subject</option>
              {subjects.map((sub) => (
                <option key={sub._id} value={sub._id}>
                  {sub.code} - {sub.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Faculty *</label>
              <select
                required
                value={formData.facultyId}
                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="">Select Faculty</option>
                {faculty.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.userId?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Section *</label>
              <select
                required
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="">Select Section</option>
                {sections.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Classroom *</label>
            <select
              required
              value={formData.classroomId}
              onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            >
              <option value="">Select Classroom</option>
              {classrooms.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.building} - {c.roomNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-bold">
              Create Session
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
