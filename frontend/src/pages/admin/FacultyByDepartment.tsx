import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Building, Users, Search, UserCheck, ChevronRight, ArrowLeft, Mail, Award, BookOpen, Layers } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const FacultyByDepartment: React.FC = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, facultyRes] = await Promise.all([
        api.get('/admin/departments'),
        api.get('/admin/faculty'),
      ]);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (facultyRes.data.success) setFaculty(facultyRes.data.data);
    } catch (err) {
      console.error('Failed to load department faculty data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredFaculty = faculty.filter((f) => {
    const matchesDept = selectedDeptId === 'ALL' || f.departmentId?._id === selectedDeptId;
    const matchesSearch =
      f.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.userId?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.designation?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const selectedDeptObj = departments.find((d) => d._id === selectedDeptId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/admin/faculty')}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Back to All Faculty Directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
              Academic Structure
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Building className="w-6 h-6 text-blue-400" />
            Faculty Allocation by Department
          </h1>
          <p className="text-xs text-slate-400">
            Department-wise faculty breakdown, staff assignment roster, and departmental academic control.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/faculty')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700"
          >
            <Users className="w-4 h-4 text-cyan-400" />
            View All Faculty Roster
          </button>
        </div>
      </div>

      {/* Department Breakdown Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-400">
            Department Roster Breakdown
          </h2>
          <span className="text-[11px] font-semibold text-slate-500">
            Click any department to inspect faculty
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* All Departments Pill Card */}
          <div
            onClick={() => setSelectedDeptId('ALL')}
            className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all ${
              selectedDeptId === 'ALL'
                ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-1 rounded-lg bg-blue-950 text-blue-400 font-mono font-bold text-xs border border-blue-800">
                ALL
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {faculty.length} Total Faculty
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-100">All Departments Roster</h3>
            <p className="text-[11px] text-slate-400 mt-1">Full institutional faculty directory</p>
          </div>

          {/* Department Cards */}
          {departments.map((dept) => {
            const count = faculty.filter((f) => f.departmentId?._id === dept._id).length;
            const isSelected = selectedDeptId === dept._id;

            return (
              <div
                key={dept._id}
                onClick={() => setSelectedDeptId(dept._id)}
                className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-blue-400 font-mono font-bold text-xs border border-slate-800">
                    {dept.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {count} Faculty Staff
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-100 line-clamp-1">{dept.name}</h3>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  {dept.studentCount || 0} Enrolled Students
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Roster Header & Search Filter */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              {selectedDeptId === 'ALL'
                ? 'All Department Faculty Members'
                : `${selectedDeptObj?.code} - ${selectedDeptObj?.name} Faculty Roster`}
              <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-400 text-xs font-mono font-bold border border-blue-800">
                {filteredFaculty.length} Staff Members
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing active teaching staff assigned to {selectedDeptId === 'ALL' ? 'all departments' : selectedDeptObj?.name}.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, EMP ID, designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* Faculty Roster Table */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading department faculty roster...</div>
        ) : filteredFaculty.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No faculty members found for this department filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Faculty Member</th>
                  <th className="p-3">Employee ID</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredFaculty.map((f) => (
                  <tr key={f._id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center font-bold text-blue-400 text-xs">
                          {f.userId?.name ? f.userId.name.charAt(0).toUpperCase() : 'F'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-100">{f.userId?.name}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Mail className="w-3 h-3 text-slate-500" /> {f.userId?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-cyan-400 font-bold">{f.employeeId}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-mono font-semibold flex items-center gap-1.5 w-fit">
                        <Building className="w-3 h-3 text-blue-400" />
                        {f.departmentId?.code || 'GEN'} - {f.departmentId?.name || 'General'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-md bg-blue-950/60 text-blue-300 border border-blue-800/60 text-[11px] font-semibold">
                        {f.designation || 'Assistant Professor'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => navigate('/admin/allocations')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-colors"
                      >
                        Manage Allocation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
