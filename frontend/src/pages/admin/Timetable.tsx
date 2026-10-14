import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { Modal } from '../../components/common/Modal';
import { formatErrorMessage } from '../../utils/errorUtils';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Filter,
  Sparkles,
  Edit2,
  Trash2,
  AlertCircle,
  BookOpen,
  Building,
} from 'lucide-react';

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const PERIOD_PRESETS = [
  { period: 1, startTime: '08:45', endTime: '09:45', label: 'Period 1 (08:45 - 09:45)' },
  { period: 2, startTime: '09:45', endTime: '10:45', label: 'Period 2 (09:45 - 10:45)' },
  { period: 3, startTime: '11:00', endTime: '12:00', label: 'Period 3 (11:00 - 12:00)' },
  { period: 4, startTime: '12:00', endTime: '13:00', label: 'Period 4 (12:00 - 13:00)' },
  { period: 5, startTime: '13:45', endTime: '14:45', label: 'Period 5 (13:45 - 14:45)' },
  { period: 6, startTime: '14:45', endTime: '15:45', label: 'Period 6 (14:45 - 15:45)' },
  { period: 7, startTime: '15:45', endTime: '16:45', label: 'Period 7 (15:45 - 16:45)' },
];

export const AdminTimetable: React.FC = () => {
  const { socket } = useSocket();

  // Selection state
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);

  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('MONDAY');

  // Timetable schedule
  const [groupedSchedule, setGroupedSchedule] = useState<Record<string, any[]>>({});
  const [totalEntries, setTotalEntries] = useState(0);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Modals & Form
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    dayOfWeek: 'MONDAY',
    periodNumber: 1,
    startTime: '08:45',
    endTime: '09:45',
    subjectId: '',
    facultyId: '',
    classroomId: '',
  });

  // Today calculation
  const currentDayName = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date().getDay()];

  // 1. Initial Load: Academic metadata
  useEffect(() => {
    Promise.all([
      api.get('/admin/departments'),
      api.get('/admin/sections'),
      api.get('/admin/subjects'),
      api.get('/admin/faculty'),
      api.get('/admin/classrooms'),
    ])
      .then(([dRes, secRes, subRes, facRes, crRes]) => {
        if (dRes.data.success && Array.isArray(dRes.data.data)) {
          setDepartments(dRes.data.data);
          if (dRes.data.data.length > 0) setSelectedDeptId(dRes.data.data[0]._id);
        }
        if (secRes.data.success && Array.isArray(secRes.data.data)) {
          setSections(secRes.data.data);
        }
        if (subRes.data.success && Array.isArray(subRes.data.data)) {
          setSubjects(subRes.data.data);
        }
        if (facRes.data.success && Array.isArray(facRes.data.data)) {
          setFacultyList(facRes.data.data);
        }
        if (crRes.data.success && Array.isArray(crRes.data.data)) {
          setClassrooms(crRes.data.data);
        }
      })
      .catch((err) => console.error(err));

    if (WEEKDAYS.includes(currentDayName)) {
      setSelectedDay(currentDayName);
    }
  }, []);

  // Filter sections by department
  const filteredSections = sections.filter(
    (s) => !selectedDeptId || s.departmentId?._id === selectedDeptId || s.departmentId === selectedDeptId
  );

  // Auto-select first section when department changes
  useEffect(() => {
    if (filteredSections.length > 0) {
      if (!selectedSectionId || !filteredSections.some((s) => s._id === selectedSectionId)) {
        setSelectedSectionId(filteredSections[0]._id);
      }
    } else {
      setSelectedSectionId('');
    }
  }, [selectedDeptId, sections]);

  // 2. Fetch timetable schedule for selected section
  const fetchTimetableSchedule = () => {
    if (!selectedSectionId) {
      setGroupedSchedule({});
      setTotalEntries(0);
      return;
    }

    setLoadingSchedule(true);
    api
      .get(`/admin/timetable?sectionId=${selectedSectionId}`)
      .then((res) => {
        if (res.data.success) {
          setGroupedSchedule(res.data.data.groupedSchedule || {});
          setTotalEntries(res.data.data.totalEntries || 0);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingSchedule(false));
  };

  useEffect(() => {
    fetchTimetableSchedule();
  }, [selectedSectionId]);

  // 3. Real-time Socket.IO Sync
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchTimetableSchedule();
    };

    socket.on('TIMETABLE_UPDATED', handleUpdate);
    return () => {
      socket.off('TIMETABLE_UPDATED', handleUpdate);
    };
  }, [socket, selectedSectionId]);

  // Handle Preset Selection
  const handlePresetChange = (periodNum: number) => {
    const preset = PERIOD_PRESETS.find((p) => p.period === periodNum);
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        periodNumber: preset.period,
        startTime: preset.startTime,
        endTime: preset.endTime,
      }));
    } else {
      setFormData((prev) => ({ ...prev, periodNumber: periodNum }));
    }
  };

  // Open Assign Modal
  const handleOpenAssign = (day?: string) => {
    setEditingEntry(null);
    setFormError('');
    setFormData({
      dayOfWeek: day || selectedDay,
      periodNumber: 1,
      startTime: '08:45',
      endTime: '09:45',
      subjectId: filteredSubjects[0]?._id || '',
      facultyId: facultyList[0]?._id || '',
      classroomId: classrooms[0]?._id || '',
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (entry: any) => {
    setEditingEntry(entry);
    setFormError('');
    setFormData({
      dayOfWeek: entry.dayOfWeek,
      periodNumber: entry.periodNumber,
      startTime: entry.startTime,
      endTime: entry.endTime,
      subjectId: entry.subject?.id || entry.subjectId?._id || entry.subjectId || '',
      facultyId: entry.faculty?.id || entry.facultyId?._id || entry.facultyId || '',
      classroomId: entry.classroom?.id || entry.classroomId?._id || entry.classroomId || '',
    });
    setShowModal(true);
  };

  // Submit Slot (Create or Edit)
  const handleSubmitSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (editingEntry) {
        const res = await api.put(`/admin/timetable/${editingEntry.id || editingEntry._id}`, formData);
        if (res.data.success) {
          setShowModal(false);
          fetchTimetableSchedule();
        }
      } else {
        const payload = {
          ...formData,
          sectionId: selectedSectionId,
        };
        const res = await api.post('/admin/timetable', payload);
        if (res.data.success) {
          setShowModal(false);
          fetchTimetableSchedule();
        }
      }
    } catch (err: any) {
      setFormError(formatErrorMessage(err, 'Failed to save timetable slot.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Slot
  const handleDeleteSlot = async (slotId: string, periodNumber: number, day: string) => {
    if (!window.confirm(`Are you sure you want to remove Period ${periodNumber} from ${day}? This will immediately unassign the class.`)) {
      return;
    }

    try {
      const res = await api.delete(`/admin/timetable/${slotId}`);
      if (res.data.success) {
        fetchTimetableSchedule();
      }
    } catch (err) {
      alert(formatErrorMessage(err, 'Failed to delete period slot.'));
    }
  };

  // Filter subjects for the selected department
  const filteredSubjects = subjects.filter(
    (sub) => !selectedDeptId || sub.departmentId?._id === selectedDeptId || sub.departmentId === selectedDeptId
  );

  const selectedSectionObj = sections.find((s) => s._id === selectedSectionId);
  const scheduleForSelectedDay = groupedSchedule[selectedDay] || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider font-mono">
            ADMINISTRATION CENTER
          </span>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            Weekly Class Timetable &amp; Allocation
          </h1>
          <p className="text-xs text-slate-400">
            Official class schedule assigned to academic sections. Assigning periods here automatically updates faculty and student portals in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentDayName && (
            <div className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-300 font-mono text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Today is {currentDayName}</span>
            </div>
          )}

          <button
            onClick={() => handleOpenAssign()}
            disabled={!selectedSectionId}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> Assign Class Period
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Department & Section */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="w-full">
            <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
              Filter Department
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 font-bold focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Building className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="w-full">
            <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
              Select Academic Section ({filteredSections.length})
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 font-bold focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {filteredSections.length === 0 ? (
                <option value="">No sections found for this department</option>
              ) : (
                filteredSections.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    {sec.name} (Year {sec.year} - Sem {sec.semester})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Weekday Switcher Tabs (Matching Screenshot) */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800">
        {WEEKDAYS.map((day) => {
          const isSelected = selectedDay === day;
          const isToday = currentDayName === day;
          const dayCount = groupedSchedule[day]?.length || 0;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                isSelected
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>{day.slice(0, 3)}</span>
              {dayCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-cyan-800 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {dayCount}
                </span>
              )}
              {isToday && <span className="w-2 h-2 rounded-full bg-emerald-400" title="Today" />}
            </button>
          );
        })}
      </div>

      {/* Schedule Content Cards */}
      {loadingSchedule ? (
        <div className="p-12 text-center text-slate-400 text-xs animate-pulse">Loading Section Timetable...</div>
      ) : !selectedSectionId ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <Calendar className="w-10 h-10 mx-auto text-slate-500 opacity-40" />
          <h3 className="font-bold text-sm text-slate-200">Please Select an Academic Section</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Choose a department and section above to view, assign, or edit its weekly timetable schedule.
          </p>
        </div>
      ) : totalEntries === 0 ? (
        /* Empty State Matching Screenshot */
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-4">
          <Calendar className="w-12 h-12 mx-auto text-slate-500 opacity-40" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-200">No Published Timetable</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your department coordinator has not published an active timetable schedule for your section yet. Please check back soon or consult your class advisor.
            </p>
          </div>
          <button
            onClick={() => handleOpenAssign(selectedDay)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" /> Assign First Period for {selectedDay}
          </button>
        </div>
      ) : scheduleForSelectedDay.length === 0 ? (
        <div className="glass-card p-10 rounded-2xl border border-slate-800 text-center space-y-3">
          <p className="text-xs text-slate-400">No periods scheduled on {selectedDay} for this section.</p>
          <button
            onClick={() => handleOpenAssign(selectedDay)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-cyan-400 font-bold text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Class to {selectedDay}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">
              Scheduled Periods on {selectedDay}: <strong className="text-slate-100">{scheduleForSelectedDay.length}</strong>
            </span>
            <button
              onClick={() => handleOpenAssign(selectedDay)}
              className="px-3 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 font-bold hover:bg-cyan-600/30 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Period
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduleForSelectedDay.map((entry: any) => (
              <div
                key={entry.id || entry._id}
                className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3 hover:border-cyan-500/40 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                      Period {entry.periodNumber}
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-semibold">
                      {entry.startTime} - {entry.endTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(entry)}
                      title="Edit Period Slot"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSlot(entry.id || entry._id, entry.periodNumber, entry.dayOfWeek)}
                      title="Delete Period Slot"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-100">{entry.subject?.name || 'Class Subject'}</h3>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">{entry.subject?.code}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{entry.faculty?.name || 'Faculty Member'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{entry.classroom?.displayName || 'Room'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Assign or Edit Period Slot */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEntry ? `Edit Period ${editingEntry.periodNumber} (${editingEntry.dayOfWeek})` : `Assign Class Period for ${selectedSectionObj?.name || 'Section'}`}
      >
        <form onSubmit={handleSubmitSlot} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Day of Week *</label>
              <select
                required
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-bold"
              >
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Period Number &amp; Timing Preset</label>
              <select
                value={formData.periodNumber}
                onChange={(e) => handlePresetChange(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {PERIOD_PRESETS.map((p) => (
                  <option key={p.period} value={p.period}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time (HH:MM) *</label>
              <input
                type="text"
                required
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                placeholder="08:45"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">End Time (HH:MM) *</label>
              <input
                type="text"
                required
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                placeholder="09:45"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Subject *</label>
            <select
              required
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="">— Select Subject —</option>
              {filteredSubjects.map((sub) => (
                <option key={sub._id} value={sub._id}>
                  {sub.code} - {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Faculty Member *</label>
            <select
              required
              value={formData.facultyId}
              onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="">— Select Faculty —</option>
              {facultyList.map((fac) => {
                const facName = fac.userId?.name || fac.name || 'Faculty Member';
                const empId = fac.employeeId ? ` (${fac.employeeId})` : '';
                return (
                  <option key={fac._id} value={fac._id}>
                    {facName}{empId}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Classroom Location *</label>
            <select
              required
              value={formData.classroomId}
              onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="">— Select Classroom —</option>
              {classrooms.map((cr) => (
                <option key={cr._id} value={cr._id}>
                  {cr.building} - Room {cr.roomNumber} (Cap: {cr.capacity || 60})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : editingEntry ? 'Save Period Changes' : 'Confirm Class Period'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

