import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useSystemClock } from '../../context/SystemClockContext';
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
  ChevronLeft,
  ChevronRight,
  Ban,
  CalendarDays,
  Coffee,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const STANDARD_PERIODS = [
  { period: 1, startTime: '09:00', endTime: '10:00', label: 'Hour 1 (09:00 - 10:00)', slot: 'Forenoon' },
  { period: 2, startTime: '10:00', endTime: '11:00', label: 'Hour 2 (10:00 - 11:00)', slot: 'Forenoon' },
  { period: 3, startTime: '11:00', endTime: '12:00', label: 'Hour 3 (11:00 - 12:00)', slot: 'Forenoon' },
  // Lunch Break is 12:00 - 13:00
  { period: 4, startTime: '13:00', endTime: '14:00', label: 'Hour 4 (01:00 - 02:00)', slot: 'Afternoon' },
  { period: 5, startTime: '14:00', endTime: '15:00', label: 'Hour 5 (02:00 - 03:00)', slot: 'Afternoon' },
  { period: 6, startTime: '15:00', endTime: '16:00', label: 'Hour 6 (03:00 - 04:00)', slot: 'Afternoon' },
];

export const AdminTimetable: React.FC = () => {
  const { socket } = useSocket();
  const { effectiveDate } = useSystemClock();

  // Selected date state (defaults to effective system date)
  const initialDateStr = useMemo(() => {
    const y = effectiveDate.getFullYear();
    const m = String(effectiveDate.getMonth() + 1).padStart(2, '0');
    const d = String(effectiveDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(initialDateStr);

  // Academic metadata
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);

  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Scheduled records for selected date
  const [records, setRecords] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: selectedDate,
    periodNumber: 1,
    startTime: '09:00',
    endTime: '10:00',
    subjectId: '',
    facultyId: '',
    classroomId: '',
    sectionId: '',
    notes: '',
    status: 'ACTIVE',
  });

  // Calculate day name of selected date
  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return new Date();
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }, [selectedDate]);

  const selectedDayName = useMemo(() => {
    return selectedDateObj.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' });
  }, [selectedDateObj]);

  const fullFormattedDate = useMemo(() => {
    return selectedDateObj.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDateObj]);

  // Initial Load: Academic metadata
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
  }, []);

  // Filter sections by selected department
  const filteredSections = useMemo(() => {
    return sections.filter(
      (s) => !selectedDeptId || s.departmentId?._id === selectedDeptId || s.departmentId === selectedDeptId
    );
  }, [sections, selectedDeptId]);

  // Current active section for scheduling
  const currentSection = useMemo(() => {
    const secId = formData.sectionId || selectedSectionId;
    return sections.find((s) => s._id === secId) || filteredSections[0] || null;
  }, [sections, formData.sectionId, selectedSectionId, filteredSections]);

  // Filter subjects strictly by target department and section semester
  const filteredSubjectsForTimetable = useMemo(() => {
    const targetDeptId = currentSection?.departmentId?._id || currentSection?.departmentId || selectedDeptId;
    const targetSem = currentSection?.semester;
    const targetYear = currentSection?.year;

    const matching = subjects.filter((s) => {
      const subDeptId = s.departmentId?._id || s.departmentId;
      if (targetDeptId && subDeptId && subDeptId.toString() !== targetDeptId.toString()) {
        return false;
      }
      if (targetSem && s.semester && s.semester !== targetSem) {
        return false;
      }
      if (targetYear && s.year && s.year !== targetYear) {
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
  }, [subjects, currentSection, selectedDeptId]);

  // Auto-select first section when department changes
  useEffect(() => {
    if (filteredSections.length > 0) {
      if (!selectedSectionId || !filteredSections.some((s) => s._id === selectedSectionId)) {
        setSelectedSectionId(filteredSections[0]._id);
      }
    } else {
      setSelectedSectionId('');
    }
  }, [selectedDeptId, filteredSections]);

  // Fetch timetable schedule for selected date & section
  const fetchTimetableSchedule = () => {
    if (!selectedDate) return;

    setLoadingSchedule(true);
    let url = `/admin/timetable?date=${selectedDate}`;
    if (selectedSectionId) {
      url += `&sectionId=${selectedSectionId}`;
    }

    api
      .get(url)
      .then((res) => {
        if (res.data.success && res.data.data) {
          setRecords(res.data.data.records || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingSchedule(false));
  };

  useEffect(() => {
    fetchTimetableSchedule();
  }, [selectedDate, selectedSectionId]);

  // Socket.IO real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchTimetableSchedule();
    };

    socket.on('timetable.updated', handleUpdate);
    socket.on('timetable.deleted', handleUpdate);
    socket.on('session.deleted', handleUpdate);
    socket.on('TIMETABLE_UPDATED', handleUpdate);
    socket.on('attendance.session_status', handleUpdate);

    return () => {
      socket.off('timetable.updated', handleUpdate);
      socket.off('timetable.deleted', handleUpdate);
      socket.off('session.deleted', handleUpdate);
      socket.off('TIMETABLE_UPDATED', handleUpdate);
      socket.off('attendance.session_status', handleUpdate);
    };
  }, [socket, selectedDate, selectedSectionId]);

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d - 1));
    const py = prev.getUTCFullYear();
    const pm = String(prev.getUTCMonth() + 1).padStart(2, '0');
    const pd = String(prev.getUTCDate()).padStart(2, '0');
    setSelectedDate(`${py}-${pm}-${pd}`);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const ny = next.getUTCFullYear();
    const nm = String(next.getUTCMonth() + 1).padStart(2, '0');
    const nd = String(next.getUTCDate()).padStart(2, '0');
    setSelectedDate(`${ny}-${nm}-${nd}`);
  };

  const handleToday = () => {
    const y = effectiveDate.getFullYear();
    const m = String(effectiveDate.getMonth() + 1).padStart(2, '0');
    const d = String(effectiveDate.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Open modal for creating new slot
  const handleOpenAddModal = (presetPeriod?: number) => {
    setEditingEntry(null);
    setFormError('');

    const periodNum = presetPeriod || 1;
    const preset = STANDARD_PERIODS.find((p) => p.period === periodNum);

    setFormData({
      date: selectedDate,
      periodNumber: periodNum,
      startTime: preset?.startTime || '09:00',
      endTime: preset?.endTime || '10:00',
      subjectId: filteredSubjectsForTimetable[0]?._id || subjects[0]?._id || '',
      facultyId: facultyList[0]?._id || '',
      classroomId: classrooms[0]?._id || '',
      sectionId: selectedSectionId || filteredSections[0]?._id || '',
      notes: '',
      status: 'ACTIVE',
    });
    setShowModal(true);
  };

  // Open modal for editing slot
  const handleOpenEditModal = (entry: any) => {
    setEditingEntry(entry);
    setFormError('');

    const entryDateStr = entry.dateStr || (entry.date ? new Date(entry.date).toISOString().slice(0, 10) : selectedDate);

    setFormData({
      date: entryDateStr,
      periodNumber: entry.periodNumber,
      startTime: entry.startTime,
      endTime: entry.endTime,
      subjectId: entry.subject?.id || entry.subjectId?._id || entry.subjectId || '',
      facultyId: entry.faculty?.id || entry.facultyId?._id || entry.facultyId || '',
      classroomId: entry.classroom?.id || entry.classroomId?._id || entry.classroomId || '',
      sectionId: entry.section?.id || entry.sectionId?._id || entry.sectionId || selectedSectionId,
      notes: entry.notes || '',
      status: entry.status || 'ACTIVE',
    });
    setShowModal(true);
  };

  // Quick Cancel class
  const handleCancelClass = async (entry: any) => {
    if (!window.confirm(`Cancel Period ${entry.periodNumber} (${entry.subject?.name}) on ${selectedDate}?`)) return;
    try {
      await api.put(`/admin/timetable/${entry.id || entry._id}`, { status: 'CANCELLED' });
      fetchTimetableSchedule();
    } catch (err) {
      alert(formatErrorMessage(err));
    }
  };

  // Delete timetable slot
  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm('Delete this scheduled class? Any upcoming attendance sessions will also be cancelled.')) return;
    try {
      await api.delete(`/admin/timetable/${id}`);
      fetchTimetableSchedule();
    } catch (err) {
      alert(formatErrorMessage(err));
    }
  };

  // Handle Form Submit (Create / Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (editingEntry) {
        await api.put(`/admin/timetable/${editingEntry.id || editingEntry._id}`, formData);
      } else {
        await api.post('/admin/timetable', formData);
      }
      setShowModal(false);
      fetchTimetableSchedule();
    } catch (err) {
      setFormError(formatErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Group records by period
  const periodMap = useMemo(() => {
    const map = new Map<number, any>();
    records.forEach((r) => {
      map.set(r.periodNumber, r);
    });
    return map;
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Admin</span>
            <span>•</span>
            <span>Academic Structure</span>
            <span>•</span>
            <span className="text-cyan-400 font-semibold">Date-Based Timetable Schedule</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="w-7 h-7 text-cyan-400" />
            Class Schedule &amp; Timetable
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Schedule individual date-based classes with zero automatic weekly recurrence.
          </p>
        </div>

        {/* Schedule Class Button */}
        <button
          onClick={() => handleOpenAddModal()}
          disabled={!selectedSectionId}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition-all disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Class</span>
        </button>
      </div>

      {/* Date Navigation & Section Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
          />

          <button
            onClick={handleNextDay}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/70 border border-cyan-800 text-cyan-300 hover:bg-cyan-900 text-xs font-bold transition-all"
          >
            Today
          </button>
        </div>

        {/* Concrete Date Display Header */}
        <div className="flex items-center gap-2 text-center lg:text-left">
          <CalendarDays className="w-4 h-4 text-cyan-400 shrink-0 hidden sm:inline" />
          <div>
            <div className="text-sm font-black text-white">{fullFormattedDate}</div>
            <div className="text-[10px] text-slate-400 font-mono">Date-driven hourly schedule</div>
          </div>
        </div>

        {/* Academic Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Select */}
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold"
          >
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>

          {/* Section Select */}
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold"
          >
            {filteredSections.map((s) => (
              <option key={s._id} value={s._id}>
                Section {s.name} (Sem {s.semester})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hourly Schedule View */}
      <div className="space-y-4">
        {loadingSchedule ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
            Loading scheduled classes for {fullFormattedDate}...
          </div>
        ) : (
          <div className="space-y-3">
            {/* Hour 1, 2, 3 (Forenoon) */}
            {STANDARD_PERIODS.slice(0, 3).map((p) => {
              const entry = periodMap.get(p.period);
              return (
                <PeriodScheduleRow
                  key={p.period}
                  preset={p}
                  entry={entry}
                  onAdd={() => handleOpenAddModal(p.period)}
                  onEdit={() => handleOpenEditModal(entry)}
                  onCancel={() => handleCancelClass(entry)}
                  onDelete={() => handleDeleteSlot(entry.id || entry._id)}
                />
              );
            })}

            {/* Official College Lunch Break Banner (12:00 PM - 01:00 PM) */}
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 flex items-center justify-between text-xs text-amber-200 shadow-md">
              <div className="flex items-center gap-3">
                <Coffee className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-amber-300 tracking-wide uppercase font-mono">
                    Official College Lunch Break
                  </span>
                  <span className="text-[11px] text-amber-200/80 ml-2 font-mono">
                    (12:00 PM – 01:00 PM)
                  </span>
                  <p className="text-[10px] text-amber-300/70 mt-0.5">
                    No academic classes scheduled. Biometric punches during lunch are automatically blocked.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-amber-900/60 border border-amber-700/80 text-amber-300 uppercase">
                Rest Period
              </span>
            </div>

            {/* Hour 4, 5, 6 (Afternoon) */}
            {STANDARD_PERIODS.slice(3, 6).map((p) => {
              const entry = periodMap.get(p.period);
              return (
                <PeriodScheduleRow
                  key={p.period}
                  preset={p}
                  entry={entry}
                  onAdd={() => handleOpenAddModal(p.period)}
                  onEdit={() => handleOpenEditModal(entry)}
                  onCancel={() => handleCancelClass(entry)}
                  onDelete={() => handleDeleteSlot(entry.id || entry._id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule / Edit Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingEntry ? `Edit Class — Hour ${formData.periodNumber}` : `Schedule Class — ${selectedDayName}`}
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Date & Day Name Display */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Class Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Day of Week (Derived)</label>
                <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-cyan-300 font-bold font-mono">
                  {selectedDayName}
                </div>
              </div>
            </div>

            {/* Period & Timings */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Period Hour</label>
                <select
                  value={formData.periodNumber}
                  onChange={(e) => {
                    const p = parseInt(e.target.value, 10);
                    const preset = STANDARD_PERIODS.find((pr) => pr.period === p);
                    setFormData({
                      ...formData,
                      periodNumber: p,
                      startTime: preset?.startTime || formData.startTime,
                      endTime: preset?.endTime || formData.endTime,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  {STANDARD_PERIODS.map((p) => (
                    <option key={p.period} value={p.period}>
                      Hour {p.period} ({p.slot})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            {/* Subject Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-400 font-semibold">Subject *</label>
                {currentSection && (
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded-md">
                    Sec {currentSection.name} • Sem {currentSection.semester || 1}
                  </span>
                )}
              </div>
              <select
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
              >
                <option value="">
                  {filteredSubjectsForTimetable.length === 0
                    ? 'No subjects mapped for this Department & Semester'
                    : 'Select Academic Subject'}
                </option>
                {filteredSubjectsForTimetable.map((s) => (
                  <option key={s._id} value={s._id}>
                    [{s.code}] {s.name} (Sem {s.semester})
                  </option>
                ))}
              </select>
            </div>

            {/* Faculty Selector */}
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Assigned Faculty</label>
              <select
                value={formData.facultyId}
                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
              >
                <option value="">Select Faculty Member</option>
                {facultyList.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.userId?.name || f.name} ({f.employeeId || 'STAFF'})
                  </option>
                ))}
              </select>
            </div>

            {/* Classroom Selector */}
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Classroom Hall</label>
              <select
                value={formData.classroomId}
                onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
              >
                <option value="">Select Classroom</option>
                {classrooms.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.building} - {c.roomNumber} ({c.type || 'Hall'})
                  </option>
                ))}
              </select>
            </div>

            {/* Status & Optional Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Schedule Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CANCELLED">CANCELLED (Leave/Holiday)</option>
                  <option value="RESCHEDULED">RESCHEDULED</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Lab Session / Unit Test"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingEntry ? 'Update Schedule' : 'Schedule Class'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// Component for Individual Period Row in the Schedule
interface PeriodRowProps {
  preset: { period: number; startTime: string; endTime: string; label: string; slot: string };
  entry?: any;
  onAdd: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

const PeriodScheduleRow: React.FC<PeriodRowProps> = ({
  preset,
  entry,
  onAdd,
  onEdit,
  onCancel,
  onDelete,
}) => {
  if (!entry) {
    // Unscheduled Period Slot
    return (
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center font-mono text-slate-400">
            <span className="text-[10px] uppercase">Hour</span>
            <span className="text-sm font-black text-slate-200">{preset.period}</span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400">
              {preset.label} <span className="text-slate-600">•</span> {preset.slot}
            </div>
            <div className="text-[11px] text-slate-600">No class scheduled for this date</div>
          </div>
        </div>

        <button
          onClick={onAdd}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-700 text-slate-300 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule</span>
        </button>
      </div>
    );
  }

  // Scheduled Class Slot
  const isCancelled = entry.status === 'CANCELLED';
  const isRescheduled = entry.status === 'RESCHEDULED';

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      isCancelled
        ? 'bg-rose-950/20 border-rose-900/60'
        : isRescheduled
        ? 'bg-amber-950/20 border-amber-900/60'
        : 'bg-slate-900/90 border-slate-800 hover:border-cyan-900/60 shadow-lg'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Hour & Subject Details */}
        <div className="flex items-start sm:items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono border shrink-0 ${
            isCancelled
              ? 'bg-rose-950 text-rose-300 border-rose-800'
              : 'bg-cyan-950 text-cyan-300 border-cyan-800 shadow-md'
          }`}>
            <span className="text-[9px] uppercase font-bold">Hour</span>
            <span className="text-base font-black">{entry.periodNumber}</span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-white text-sm">
                {entry.subject?.name}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                {entry.subject?.code}
              </span>

              {isCancelled && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900/80 text-rose-200 border border-rose-700">
                  CANCELLED
                </span>
              )}
              {isRescheduled && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/80 text-amber-200 border border-amber-700">
                  RESCHEDULED
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1 font-mono text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {entry.startTime} – {entry.endTime} ({preset.slot})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <User className="w-3.5 h-3.5 text-slate-500" />
                {entry.faculty?.name}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {entry.classroom?.displayName || 'Campus Hall'}
              </span>
            </div>

            {entry.notes && (
              <div className="text-[11px] text-amber-300/80 mt-1 italic">
                Note: {entry.notes}
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-center">
          {!isCancelled && (
            <button
              onClick={onCancel}
              className="p-2 rounded-xl bg-slate-950 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700 text-slate-400 hover:text-rose-300 transition-colors text-xs flex items-center gap-1"
              title="Cancel class for this date"
            >
              <Ban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
          )}

          <button
            onClick={onEdit}
            className="p-2 rounded-xl bg-slate-950 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-700 text-slate-400 hover:text-cyan-300 transition-colors text-xs flex items-center gap-1"
            title="Edit / Reschedule"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          <button
            onClick={onDelete}
            className="p-2 rounded-xl bg-slate-950 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700 text-slate-400 hover:text-rose-300 transition-colors"
            title="Delete from schedule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
