import React, { useEffect, useState } from 'react';
import { Calendar, Filter, Clock, Building, UserCheck } from 'lucide-react';
import { api } from '../../services/api';

export const AdminTimetable: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/departments'),
      api.get('/admin/sections'),
      api.get('/admin/sessions'),
    ]).then(([dRes, sRes, sessRes]) => {
      if (dRes.data.success) {
        setDepartments(dRes.data.data);
        if (dRes.data.data.length > 0) setSelectedDeptId(dRes.data.data[0]._id);
      }
      if (sRes.data.success) setSections(sRes.data.data);
      if (sessRes.data.success) setSessions(sessRes.data.data);
    });
  }, []);

  const filteredSections = sections.filter((s) => !selectedDeptId || s.departmentId?._id === selectedDeptId || s.departmentId === selectedDeptId);

  // Days of week schedule grid
  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  const getSessionsForDay = (dayIndex: number) => {
    return sessions.filter((sess) => {
      // Filter by Selected Department (Strict Mapping)
      if (selectedDeptId) {
        const matchesSectionDept =
          sess.sectionId?.departmentId?._id === selectedDeptId ||
          sess.sectionId?.departmentId === selectedDeptId;
        const matchesSubjectDept =
          sess.subjectId?.departmentId?._id === selectedDeptId ||
          sess.subjectId?.departmentId === selectedDeptId;
        const matchesClassroomDept =
          sess.classroomId?.departmentId?._id === selectedDeptId ||
          sess.classroomId?.departmentId === selectedDeptId;
        const matchesFacultyDept =
          sess.facultyId?.departmentId?._id === selectedDeptId ||
          sess.facultyId?.departmentId === selectedDeptId;

        if (!matchesSectionDept && !matchesSubjectDept && !matchesClassroomDept && !matchesFacultyDept) {
          return false;
        }
      }

      // Filter by Selected Section (Strict Mapping)
      if (selectedSectionId) {
        const matchesSection =
          sess.sectionId?._id === selectedSectionId ||
          sess.sectionId === selectedSectionId ||
          sess.classroomId?.sectionId?._id === selectedSectionId ||
          sess.classroomId?.sectionId === selectedSectionId;

        if (!matchesSection) {
          return false;
        }
      }

      return true;
    });
  };

  const currentDeptObj = departments.find((d) => d._id === selectedDeptId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-cyan-400" />
            Institutional Timetable Schedule
          </h1>
          <p className="text-xs text-slate-400">
            View master schedule filtered strictly by Department and Section.
          </p>
        </div>
      </div>

      {/* Filter Bar: Department & Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card px-4 py-3 rounded-2xl border border-slate-800 flex items-center gap-3">
          <Filter className="w-4 h-4 text-cyan-400" />
          <div className="w-full">
            <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Filter Department</label>
            <select
              value={selectedDeptId}
              onChange={(e) => {
                setSelectedDeptId(e.target.value);
                setSelectedSectionId('');
              }}
              className="bg-transparent border-none outline-none text-xs text-slate-100 w-full font-bold cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">
                All Engineering Departments ({departments.length})
              </option>
              {departments.map((d) => (
                <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="glass-card px-4 py-3 rounded-2xl border border-slate-800 flex items-center gap-3">
          <Filter className="w-4 h-4 text-cyan-400" />
          <div className="w-full">
            <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Filter Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-100 w-full font-bold cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">
                All Sections ({filteredSections.length})
              </option>
              {filteredSections.map((sec) => (
                <option key={sec._id} value={sec._id} className="bg-slate-900 text-slate-200">
                  {sec.name} ({sec.departmentId?.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Weekly Timetable Schedule Grid */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Weekly Master Timetable (1-Hour Slot Schedule)
          </div>
          <span className="px-3 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono font-bold">
            {currentDeptObj ? `${currentDeptObj.code} (${currentDeptObj.name})` : 'All Departments'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          {DAYS.map((day, idx) => {
            const daySessions = getSessionsForDay(idx);
            return (
              <div key={day} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-[11px] text-cyan-400 uppercase tracking-wider">{day}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{daySessions.length} Classes</span>
                </div>

                {daySessions.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic text-center py-4">No scheduled periods</p>
                ) : (
                  <div className="space-y-2">
                    {daySessions.map((sess) => {
                      const staffName =
                        sess.facultyId?.userId?.name ||
                        sess.facultyId?.name ||
                        'Staff Member';

                      return (
                        <div key={sess._id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 hover:border-cyan-500/50 transition-colors">
                          <p className="font-mono font-bold text-cyan-300 text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-400" /> {sess.startTime} - {sess.endTime}
                          </p>
                          <p className="font-bold text-slate-100">{sess.subjectId?.name || 'Class Session'}</p>
                          <p className="text-[10px] text-cyan-300 font-semibold flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-cyan-400" /> Staff: {staffName}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" /> Room {sess.classroomId?.roomNumber || 'A204'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
