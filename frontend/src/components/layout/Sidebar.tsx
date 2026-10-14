import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  Calendar,
  Building,
  Cpu,
  Clock,
  CheckSquare,
  FileText,
  Scan,
  Shield,
  Settings,
  HelpCircle,
  BarChart3,
  Layers,
  Link as LinkIcon,
  ShieldAlert,
  FileSpreadsheet,
} from 'lucide-react';

export const Sidebar: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({ isOpen = false, onClose }) => {
  const { user } = useAuth();
  const role = user?.role;

  const getNavSections = () => {
    if (role === 'ADMIN' || role === 'MODERATOR') {
      return [
        {
          category: 'OVERVIEW & MANAGEMENT',
          items: [
            { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
            { label: 'Students', path: '/admin/students', icon: Users },
            { label: 'Faculty', path: '/admin/faculty', icon: UserCheck },
            { label: 'Faculty by Department', path: '/admin/faculty-departments', icon: Building },
            { label: 'Allocations', path: '/admin/allocations', icon: LinkIcon },
            { label: 'Bulk Import / Export', path: '/admin/bulk-import', icon: FileSpreadsheet },
            { label: 'Biometric Enrollment', path: '/admin/biometric', icon: Scan },
            { label: 'Account Status & Suspension', path: '/admin/user-status-control', icon: ShieldAlert },
            
          ],
        },
        {
          category: 'ACADEMIC STRUCTURE',
          items: [
            
            { label: 'Departments', path: '/admin/departments', icon: Building },
            { label: 'Sections', path: '/admin/sections', icon: Layers },
            { label: 'Subjects', path: '/admin/subjects', icon: BookOpen },
            { label: 'Timetable Schedule', path: '/admin/timetable', icon: Calendar },
            { label: 'Classrooms', path: '/admin/classrooms', icon: Building },
          ],
        },
        {
          category: 'HARDWARE & BIOMETRICS',
          items: [
            { label: 'IoT Devices', path: '/admin/devices', icon: Cpu },
            { label: '1-Hour Sessions', path: '/admin/sessions', icon: Clock },
            { label: 'Attendance Explorer', path: '/admin/attendance', icon: CheckSquare },
            { label: 'Reports & Analytics', path: '/admin/reports', icon: FileText },
            { label: 'Biometric Registry', path: '/admin/biometric', icon: Scan },
            { label: 'System Audit Logs', path: '/admin/audit', icon: Shield },
            { label: 'Manage & Settings', path: '/admin/settings', icon: Settings },
          ],
        },
      ];
    }

    if (role === 'FACULTY') {
      return [
        {
          category: 'FACULTY CONTROL',
          items: [
            { label: 'Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard },
            { label: 'My Classes', path: '/faculty/classes', icon: BookOpen },
            { label: 'Allocated Students', path: '/faculty/students', icon: Users },
            { label: 'Attendance Explorer', path: '/faculty/attendance/active', icon: CheckSquare },
            { label: 'Disputes & Support', path: '/faculty/disputes', icon: HelpCircle },
          ],
        },
      ];
    }

    // STUDENT Role
    return [
      {
        category: 'STUDENT PORTAL',
        items: [
          { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
          { label: 'My Attendance Logs', path: '/student/history', icon: CheckSquare },
          { label: 'Analytics Breakdown', path: '/student/analytics', icon: BarChart3 },
          { label: 'Biometric Profile', path: '/student/biometric-status', icon: Scan },
          { label: 'Dispute Requests', path: '/student/disputes', icon: HelpCircle },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-30 w-60 theme-sidebar flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-lg ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="py-4 px-2.5 space-y-4 overflow-y-auto">
        {navSections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-500">
              {sec.category}
            </div>
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border-l-4 border-blue-500 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Enterprise Footer Info */}
      <div className="p-3 m-2.5 rounded-xl bg-[#151c2c] border border-[#26334d] text-[11px] text-slate-400">
        <p className="font-bold text-slate-200">Bannari Amman Institute</p>
        <p className="text-[10px] text-slate-500 font-mono">Enterprise Platform v3.0</p>
      </div>
    </aside>
  );
};
