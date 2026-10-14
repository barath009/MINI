import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import {
  BookOpen,
  GraduationCap,
  Award,
  CheckSquare,
  Clock,
  User,
  Search,
  Filter,
  Sparkles,
  ShieldCheck,
  Building,
  Calendar,
} from 'lucide-react';

export const StudentSubjects: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number | 'CURRENT' | 'ALL'>('CURRENT');

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/subjects');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load student subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs animate-pulse space-y-2">
        <BookOpen className="w-8 h-8 text-cyan-400 mx-auto animate-bounce opacity-50" />
        <p>Loading subjects according to your department curriculum...</p>
      </div>
    );
  }

  const dept = data?.department || {};
  const currentSemester = data?.currentSemester || 1;
  const allSubjects = data?.allSubjects || [];

  // Available semesters in this department
  const availableSemesters: number[] = Array.from(
    new Set(allSubjects.map((s: any) => s.semester))
  ).sort((a: any, b: any) => a - b) as number[];

  // Filtered subjects based on semester selection and search query
  const filteredSubjects = allSubjects.filter((sub: any) => {
    // Semester filter
    if (selectedSemester === 'CURRENT' && sub.semester !== currentSemester) {
      return false;
    }
    if (typeof selectedSemester === 'number' && sub.semester !== selectedSemester) {
      return false;
    }

    // Search query filter
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      sub.code?.toLowerCase().includes(q) ||
      sub.name?.toLowerCase().includes(q) ||
      sub.facultyName?.toLowerCase().includes(q)
    );
  });

  // Calculate current semester stats
  const currentSemSubjects = allSubjects.filter((s: any) => s.semester === currentSemester);
  const totalCredits = currentSemSubjects.reduce((sum: number, s: any) => sum + (s.credits || 3), 0);
  const avgAttendance = currentSemSubjects.length > 0
    ? (currentSemSubjects.reduce((sum: number, s: any) => sum + s.percentage, 0) / currentSemSubjects.length).toFixed(1)
    : '100.0';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Department Curriculum
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              {dept.code}
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-100">
            My Academic Subjects
          </h1>
          <p className="text-xs text-slate-400">
            Enrolled under <strong className="text-slate-200">{dept.name} ({dept.code})</strong> · Year {data?.year} (Semester {currentSemester} - Section {data?.section})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <p className="text-lg font-extrabold text-cyan-400">{currentSemSubjects.length}</p>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Semester Subjects</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <p className="text-lg font-extrabold text-purple-400">{totalCredits}</p>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Credits</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <p className={`text-lg font-extrabold ${Number(avgAttendance) >= 75 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {avgAttendance}%
            </p>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Avg Attendance</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Semester Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
          <button
            onClick={() => setSelectedSemester('CURRENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedSemester === 'CURRENT'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Current (Sem {currentSemester})
          </button>
          <button
            onClick={() => setSelectedSemester('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedSemester === 'ALL'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Semesters ({allSubjects.length})
          </button>
          {availableSemesters.map((sem) => (
            <button
              key={sem}
              onClick={() => setSelectedSemester(sem)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedSemester === sem
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sem {sem}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search subject code, name, faculty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Subjects Grid */}
      {filteredSubjects.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500 rounded-2xl border border-slate-800 space-y-2">
          <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
          <h3 className="font-bold text-slate-300 text-sm">No subjects found</h3>
          <p className="text-xs">
            {search ? `No subjects match '${search}'.` : 'No subjects registered for this department semester.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((sub: any) => (
            <div
              key={sub.id}
              className={`glass-card p-5 rounded-2xl border transition-all space-y-4 hover:border-slate-700 ${
                sub.isCurrentSemester ? 'border-cyan-900/60 shadow-lg shadow-cyan-950/20' : 'border-slate-800'
              }`}
            >
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-cyan-400 text-xs px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-800/80">
                    {sub.code}
                  </span>
                  {sub.isCurrentSemester && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Active Sem
                    </span>
                  )}
                </div>
                <Badge status={sub.status} />
              </div>

              {/* Subject Title */}
              <div>
                <h3 className="font-bold text-slate-100 text-sm line-clamp-2 leading-snug">
                  {sub.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>{sub.departmentName || dept.name}</span>
                </p>
              </div>

              {/* Details & Faculty */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 text-[11px]">Academic Level:</span>
                  <span className="font-bold font-mono text-slate-200">
                    Semester {sub.semester}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 text-[11px]">Credits:</span>
                  <span className="font-bold font-mono text-cyan-300 flex items-center gap-1">
                    <Award className="w-3 h-3" /> {sub.credits} Credits
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" /> Faculty:
                  </span>
                  <span className="font-semibold text-slate-200 truncate max-w-[140px]" title={sub.facultyName}>
                    {sub.facultyName}
                  </span>
                </div>
              </div>

              {/* Attendance Breakdown Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <CheckSquare className="w-3 h-3 text-cyan-400" />
                    <span>Attendance:</span>
                  </span>
                  <span className="font-bold font-mono text-slate-200">
                    {sub.attendedClasses} / {sub.totalClasses} classes ({sub.percentage}%)
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sub.percentage >= 75
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                        : sub.percentage >= 65
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                        : 'bg-gradient-to-r from-rose-500 to-pink-500'
                    }`}
                    style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
