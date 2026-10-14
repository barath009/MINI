import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Building, Plus, Clock, Users, UserCheck, Eye, X, CheckCircle, Trash2, Edit, Filter } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const AdminClassrooms: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');

  // Modals state
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);

  // Selected Classroom Slot Inspector State
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [slotRoster, setSlotRoster] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Add/Edit Room Form
  const [roomFormData, setRoomFormData] = useState({
    building: 'Main Academic Block',
    roomNumber: '',
    floor: 2,
    capacity: 60,
    departmentId: '',
    sectionId: '',
  });

  // 1-Hour Slot Form
  const [slotFormData, setSlotFormData] = useState({
    departmentId: '',
    sectionId: '',
    subjectId: '',
    classroomId: '',
    facultyId: '',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '09:00 - 10:00',
    gracePeriodMinutes: 10,
  });

  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const TIME_SLOTS = [
    { label: '09:00 AM - 10:00 AM (1 Hour Slot)', start: '09:00', end: '10:00' },
    { label: '10:00 AM - 11:00 AM (1 Hour Slot)', start: '10:00', end: '11:00' },
    { label: '11:00 AM - 12:00 PM (1 Hour Slot)', start: '11:00', end: '12:00' },
    { label: '02:00 PM - 03:00 PM (1 Hour Slot)', start: '14:00', end: '15:00' },
    { label: '03:00 PM - 04:00 PM (1 Hour Slot)', start: '15:00', end: '16:00' },
  ];

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [roomRes, sessRes, facRes, deptRes, secRes, subRes] = await Promise.all([
        api.get('/admin/classrooms'),
        api.get('/admin/sessions'),
        api.get('/admin/faculty'),
        api.get('/admin/departments'),
        api.get('/admin/sections'),
        api.get('/admin/subjects'),
      ]);
      if (roomRes.data.success) setClassrooms(roomRes.data.data);
      if (sessRes.data.success) setSessions(sessRes.data.data);
      if (facRes.data.success) setFacultyList(facRes.data.data);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (secRes.data.success) setSections(secRes.data.data);
      if (subRes.data.success) setSubjects(subRes.data.data);
    } catch (err) {
      console.error('Failed to load classrooms data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const filteredSectionsForFilter = sections.filter(
    (s) => !filterDeptId || s.departmentId?._id === filterDeptId || s.departmentId === filterDeptId
  );

  const filteredSectionsForRoomModal = sections.filter(
    (s) => !roomFormData.departmentId || s.departmentId?._id === roomFormData.departmentId || s.departmentId === roomFormData.departmentId
  );

  const filteredSectionsForSlotModal = sections.filter(
    (s) => !slotFormData.departmentId || s.departmentId?._id === slotFormData.departmentId || s.departmentId === slotFormData.departmentId
  );

  const filteredSubjectsForSlotModal = subjects.filter(
    (sub) => !slotFormData.departmentId || sub.departmentId?._id === slotFormData.departmentId || sub.departmentId === slotFormData.departmentId
  );

  // Filter classrooms by selected Dept & Section
  const displayClassrooms = classrooms.filter((c) => {
    if (filterDeptId && c.departmentId && c.departmentId._id !== filterDeptId && c.departmentId !== filterDeptId) {
      return false;
    }
    if (filterSectionId && c.sectionId && c.sectionId._id !== filterSectionId && c.sectionId !== filterSectionId) {
      return false;
    }
    return true;
  });

  // Filter sessions by selected Dept & Section
  const displaySessions = sessions.filter((s) => {
    if (filterDeptId && s.sectionId?.departmentId && s.sectionId.departmentId._id !== filterDeptId && s.sectionId.departmentId !== filterDeptId) {
      return false;
    }
    if (filterSectionId && s.sectionId && s.sectionId._id !== filterSectionId && s.sectionId !== filterSectionId) {
      return false;
    }
    return true;
  });

  const handleOpenAddRoom = () => {
    setEditingRoom(null);
    setRoomFormData({
      building: 'Main Academic Block',
      roomNumber: '',
      floor: 2,
      capacity: 60,
      departmentId: departments[0]?._id || '',
      sectionId: '',
    });
    setShowAddRoomModal(true);
  };

  const handleOpenEditRoom = (room: any) => {
    setEditingRoom(room);
    setRoomFormData({
      building: room.building || 'Main Academic Block',
      roomNumber: room.roomNumber || '',
      floor: room.floor || 2,
      capacity: room.capacity || 60,
      departmentId: room.departmentId?._id || room.departmentId || '',
      sectionId: room.sectionId?._id || room.sectionId || '',
    });
    setShowAddRoomModal(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await api.put(`/admin/classrooms/${editingRoom._id}`, roomFormData);
        setSuccessMessage(`Classroom 'Room ${roomFormData.roomNumber}' updated and mapped successfully!`);
      } else {
        await api.post('/admin/classrooms', roomFormData);
        setSuccessMessage('Classroom created and mapped to Department + Section!');
      }
      setShowAddRoomModal(false);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save classroom');
    }
  };

  const handleScheduleSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const selectedSlotObj = TIME_SLOTS.find((s) => `${s.start} - ${s.end}` === slotFormData.timeSlot) || TIME_SLOTS[0];

    try {
      const res = await api.post('/admin/sessions', {
        classroomId: slotFormData.classroomId,
        facultyId: slotFormData.facultyId,
        subjectId: slotFormData.subjectId,
        sectionId: slotFormData.sectionId,
        date: slotFormData.date,
        startTime: selectedSlotObj.start,
        endTime: selectedSlotObj.end,
        gracePeriodMinutes: slotFormData.gracePeriodMinutes,
        academicYear: '2026-2027',
      });

      if (res.data.success) {
        setShowAddSlotModal(false);
        setSuccessMessage('1-Hour Time Slot mapped strictly to Department & Section!');
        setTimeout(() => setSuccessMessage(''), 4000);
        fetchAllData();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to schedule 1-Hour time slot');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Are you sure you want to delete this classroom?')) return;
    try {
      await api.delete(`/admin/classrooms/${roomId}`);
      setSuccessMessage('Classroom removed successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchAllData();
    } catch (err) {}
  };

  const handleDeleteSlot = async (sessionId: string) => {
    try {
      await api.delete(`/admin/sessions/${sessionId}`);
      setSuccessMessage('1-Hour Classroom Time Slot removed.');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchAllData();
    } catch (err) {}
  };

  const openSlotInspector = async (slotSession: any) => {
    setSelectedSlot(slotSession);
    setLoadingRoster(true);
    try {
      const res = await api.get(`/faculty/attendance/${slotSession._id}`);
      if (res.data.success) {
        setSlotRoster(res.data.data.records || []);
      }
    } catch (err) {
      console.error('Failed to load classroom slot roster', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Building className="w-6 h-6 text-cyan-400" />
            Classroom &amp; Section Allocation Manager
          </h1>
          <p className="text-xs text-slate-400">
            Map classrooms to specific Department + Section and schedule 1-hour timeline slots for mapped students.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddRoom}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4 text-cyan-400" /> Add Mapped Classroom
          </button>
          <button
            onClick={() => {
              setFormError('');
              setShowAddSlotModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/20"
          >
            <Clock className="w-4 h-4" /> Schedule 1-Hour Time Slot
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {successMessage}
        </div>
      )}

      {/* Filter Bar by Department & Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card px-4 py-3 rounded-2xl border border-slate-800 flex items-center gap-3">
          <Filter className="w-4 h-4 text-cyan-400" />
          <div className="w-full">
            <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Filter Department</label>
            <select
              value={filterDeptId}
              onChange={(e) => {
                setFilterDeptId(e.target.value);
                setFilterSectionId('');
              }}
              className="bg-transparent border-none outline-none text-xs text-slate-100 w-full font-bold cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">
                All Departments ({departments.length})
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
              value={filterSectionId}
              onChange={(e) => setFilterSectionId(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-100 w-full font-bold cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">
                All Sections ({filteredSectionsForFilter.length})
              </option>
              {filteredSectionsForFilter.map((sec) => (
                <option key={sec._id} value={sec._id} className="bg-slate-900 text-slate-200">
                  {sec.name} ({sec.departmentId?.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Classrooms Grid & Slotted Sessions */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading classrooms...</div>
      ) : (
        <div className="space-y-6">
          {/* Classrooms Section */}
          <div>
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              Mapped Campus Classrooms ({displayClassrooms.length})
            </h2>
            {displayClassrooms.length === 0 ? (
              <div className="glass-card p-6 text-center text-xs text-slate-500 rounded-2xl border border-slate-800 italic">
                No classrooms mapped to the selected Department &amp; Section filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {displayClassrooms.map((c) => (
                  <div key={c._id} className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100">{c.building}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                        Cap: {c.capacity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-black text-cyan-400 font-mono">
                        Room {c.roomNumber}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditRoom(c)}
                          className="p-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 transition-colors"
                          title="Edit Classroom Mapping"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(c._id)}
                          className="p-1 rounded-lg hover:bg-rose-950/80 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remove Classroom"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
                      <p className="text-slate-300 font-bold flex items-center justify-between">
                        <span>Dept: {c.departmentId?.code || 'General'}</span>
                        <span className="text-cyan-400">Sec: {c.sectionId?.name || 'All'}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Floor {c.floor} • IoT Sensor Unit</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1-Hour Timeline Slots List */}
          <div>
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Scheduled 1-Hour Classroom Time Slots ({displaySessions.length})
            </h2>

            {displaySessions.length === 0 ? (
              <div className="glass-card p-8 text-center text-xs text-slate-500 rounded-2xl border border-slate-800 italic">
                No 1-hour timeline slots scheduled for the selected Department &amp; Section filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {displaySessions.map((s) => (
                  <div key={s._id} className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-xl bg-cyan-950 text-cyan-400 font-mono font-bold text-xs border border-cyan-800/60 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {s.startTime} - {s.endTime} (1 Hr)
                      </span>
                      <Badge status={s.status} />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-100 text-sm">
                        Room {s.classroomId?.roomNumber || 'A204'} ({s.classroomId?.building || 'Main Block'})
                      </h3>
                      <p className="text-xs text-cyan-400 font-bold mt-1">
                        Mapped to: {s.sectionId?.name || 'All Sections'} ({s.sectionId?.departmentId?.code || 'Dept'})
                      </p>
                      <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400" /> Staff: <span className="font-bold text-slate-200">{s.facultyId?.userId?.name || 'Staff Member'}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 font-mono">
                        Date: {new Date(s.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDeleteSlot(s._id)}
                          className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                          title="Remove Classroom Time Slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                        <button
                          onClick={() => openSlotInspector(s)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Classroom Slot Inspector Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="glass-card w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#0d1527] p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedSlot(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono font-bold text-xs">
                    Room {selectedSlot.classroomId?.roomNumber || 'A204'}
                  </span>
                  <h2 className="text-lg font-bold text-slate-100">
                    Classroom 1-Hour Time Slot ({selectedSlot.startTime} - {selectedSlot.endTime})
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Building: {selectedSlot.classroomId?.building} • Mapped Section: {selectedSlot.sectionId?.name || 'All'}
                </p>
              </div>
              <Badge status={selectedSlot.status} />
            </div>

            {/* Staff info */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold text-lg">
                {selectedSlot.facultyId?.userId?.name?.charAt(0) || 'S'}
              </div>
              <div>
                <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Assigned Staff Member</p>
                <h3 className="text-sm font-extrabold text-slate-100">
                  {selectedSlot.facultyId?.userId?.name || 'Staff Member'}
                </h3>
                <p className="text-xs text-slate-400">
                  Employee ID: <span className="font-mono text-slate-300">{selectedSlot.facultyId?.employeeId}</span>
                </p>
              </div>
            </div>

            {/* Students roster */}
            <div>
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Mapped Students Roster ({slotRoster.length} Records)
              </h3>

              {loadingRoster ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading classroom roster...</div>
              ) : slotRoster.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 italic border border-slate-800 rounded-xl">
                  No attendance records logged for this time slot yet. Camera unit will recognize allocated students upon entry.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-80 rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Register No</th>
                        <th className="p-3">Time Marked</th>
                        <th className="p-3">Method</th>
                        <th className="p-3 text-right">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {slotRoster.map((r) => (
                        <tr key={r._id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3 font-semibold text-slate-100">{r.studentId?.userId?.name}</td>
                          <td className="p-3 font-mono text-cyan-400">{r.studentId?.registerNumber}</td>
                          <td className="p-3 font-mono text-slate-400">
                            {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{r.recognitionMethod}</td>
                          <td className="p-3 text-right">
                            <Badge status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSlot(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Mapped Classroom Modal */}
      <Modal isOpen={showAddRoomModal} onClose={() => setShowAddRoomModal(false)} title={editingRoom ? "Edit Classroom Department & Section Mapping" : "Add Mapped Classroom"}>
        <form onSubmit={handleSaveRoom} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Building Block *</label>
            <input
              type="text"
              required
              value={roomFormData.building}
              onChange={(e) => setRoomFormData({ ...roomFormData, building: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Department Mapping *</label>
              <select
                required
                value={roomFormData.departmentId}
                onChange={(e) => setRoomFormData({ ...roomFormData, departmentId: e.target.value, sectionId: '' })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Section Mapping *</label>
              <select
                required
                value={roomFormData.sectionId}
                onChange={(e) => setRoomFormData({ ...roomFormData, sectionId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
              >
                <option value="">Select Section</option>
                {filteredSectionsForRoomModal.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    {sec.name} ({sec.departmentId?.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Room Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. Room A204"
                value={roomFormData.roomNumber}
                onChange={(e) => setRoomFormData({ ...roomFormData, roomNumber: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Capacity *</label>
              <input
                type="number"
                required
                min="10"
                max="200"
                value={roomFormData.capacity}
                onChange={(e) => setRoomFormData({ ...roomFormData, capacity: parseInt(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowAddRoomModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
              {editingRoom ? "Update Mapping" : "Save Mapped Classroom"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule 1-Hour Time Slot Modal */}
      <Modal
        isOpen={showAddSlotModal}
        onClose={() => setShowAddSlotModal(false)}
        title="Schedule 1-Hour Time Slot mapped to Dept & Section"
      >
        <form onSubmit={handleScheduleSlot} className="space-y-3 text-xs">
          {formError && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{formError}</div>}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Target Department *</label>
              <select
                required
                value={slotFormData.departmentId}
                onChange={(e) => setSlotFormData({ ...slotFormData, departmentId: e.target.value, sectionId: '', subjectId: '' })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
              >
                <option value="">Select Department</option>
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
                value={slotFormData.sectionId}
                onChange={(e) => setSlotFormData({ ...slotFormData, sectionId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
              >
                <option value="">Select Section</option>
                {filteredSectionsForSlotModal.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    {sec.name} ({sec.departmentId?.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Subject *</label>
              <select
                required
                value={slotFormData.subjectId}
                onChange={(e) => setSlotFormData({ ...slotFormData, subjectId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
              >
                <option value="">Select Subject</option>
                {filteredSubjectsForSlotModal.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.code} - {sub.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Select Classroom *</label>
              <select
                required
                value={slotFormData.classroomId}
                onChange={(e) => setSlotFormData({ ...slotFormData, classroomId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
              >
                <option value="">Select Classroom</option>
                {classrooms.map((c) => (
                  <option key={c._id} value={c._id}>
                    Room {c.roomNumber} ({c.building})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Assign Staff Member (Faculty) *</label>
            <select
              required
              value={slotFormData.facultyId}
              onChange={(e) => setSlotFormData({ ...slotFormData, facultyId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
            >
              <option value="">Select Staff Member</option>
              {facultyList.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.userId?.name} ({f.employeeId} - {f.designation})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Date *</label>
              <input
                type="date"
                required
                value={slotFormData.date}
                onChange={(e) => setSlotFormData({ ...slotFormData, date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">1-Hour Time Slot *</label>
              <select
                value={slotFormData.timeSlot}
                onChange={(e) => setSlotFormData({ ...slotFormData, timeSlot: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold"
              >
                {TIME_SLOTS.map((ts, idx) => (
                  <option key={idx} value={`${ts.start} - ${ts.end}`}>
                    {ts.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddSlotModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
              Schedule Mapped 1-Hour Slot
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
