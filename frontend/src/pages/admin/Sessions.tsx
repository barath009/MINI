import React, { useEffect, useState, useMemo } from 'react';
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
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
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
      api.get('/admin/departments'),
    ]).then(([subRes, facRes, secRes, roomRes, deptRes]) => {
      if (subRes.data.success) setSubjects(subRes.data.data);
      if (facRes.data.success) setFaculty(facRes.data.data);
      if (secRes.data.success) setSections(secRes.data.data);
      if (roomRes.data.success) setClassrooms(roomRes.data.data);
      if (deptRes?.data?.success) setDepartments(deptRes.data.data);
    });
  }, []);

  const selectedSection = sections.find((s) => s._id === formData.sectionId);

  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      if (!selectedDeptId) return true;
      const deptId = s.departmentId?._id || s.departmentId;
      return deptId && deptId.toString() === selectedDeptId.toString();
    });
  }, [sections, selectedDeptId]);

  const filteredSubjectsForSession = useMemo(() => {
    const targetDeptId =
      selectedDeptId ||
      selectedSection?.departmentId?._id ||
      selectedSection?.departmentId;
    const targetSem = selectedSection?.semester || formData.semester;
    const targetYear = selectedSection?.year;

    // Filter by department AND section semester
    const matching = subjects.filter((sub) => {
      const subDeptId = sub.departmentId?._id || sub.departmentId;
      if (targetDeptId && subDeptId && subDeptId.toString() !== targetDeptId.toString()) {
        return false;
      }
      if (targetSem && sub.semester && sub.semester !== targetSem) {
        return false;
      }
      if (targetYear && sub.year && sub.year !== targetYear) {
        return false;
      }
      return true;
    });

    if (matching.length > 0) return matching;

    // Fallback: If section has no exact semester subjects in DB, fallback to department's subjects
    if (targetDeptId) {
      return subjects.filter((sub) => {
        const subDeptId = sub.departmentId?._id || sub.departmentId;
        return subDeptId && subDeptId.toString() === targetDeptId.toString();
      });
    }

    return subjects;
  }, [subjects, selectedDeptId, selectedSection, formData.semester]);

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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Department</label>
              <select
                value={selectedDeptId}
                onChange={(e) => {
                  const deptId = e.target.value;
                  setSelectedDeptId(deptId);
                  setFormData((prev) => ({
                    ...prev,
                    sectionId: '',
                    subjectId: '',
                  }));
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Target Section *</label>
              <select
                required
                value={formData.sectionId}
                onChange={(e) => {
                  const secId = e.target.value;
                  const sec = sections.find((s) => s._id === secId);
                  if (sec) {
                    const secDeptId = sec.departmentId?._id || sec.departmentId;
                    if (secDeptId && !selectedDeptId) {
                      setSelectedDeptId(secDeptId.toString());
                    }
                    setFormData((prev) => ({
                      ...prev,
                      sectionId: secId,
                      semester: sec.semester || prev.semester,
                      academicYear: sec.academicYear || prev.academicYear,
                      subjectId: '',
                    }));
                  } else {
                    setFormData((prev) => ({ ...prev, sectionId: '', subjectId: '' }));
                  }
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="">Select Section</option>
                {filteredSections.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    {sec.name} {sec.semester ? `(Sem ${sec.semester})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-400 font-semibold">Subject *</label>
              {selectedSection && (
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-md">
                  Sec {selectedSection.name} • Sem {selectedSection.semester}
                </span>
              )}
            </div>
            <select
              required
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            >
              <option value="">
                {selectedSection
                  ? `-- Select Subject (Sem ${selectedSection.semester}) --`
                  : 'Select Subject'}
              </option>
              {filteredSubjectsForSession.map((sub) => (
                <option key={sub._id} value={sub._id}>
                  [{sub.code}] {sub.name} {sub.semester ? `(Sem ${sub.semester})` : ''}
                </option>
              ))}
            </select>
            {selectedSection && filteredSubjectsForSession.length === 0 && (
              <p className="text-[11px] text-amber-400/80 mt-1">
                No subjects found for Semester {selectedSection.semester} in this department.
              </p>
            )}
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
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Start Time</label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">End Time</label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>
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
