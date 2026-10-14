import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Camera, LogOut, Search, Menu, ShieldCheck, Key, Settings as SettingsIcon } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

export const Navbar: React.FC<{ onToggleSidebar?: () => void }> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full glass-nav px-4 lg:px-6 py-2.5 flex items-center justify-between border-b border-[#26334d] shadow-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-white text-xs shadow-md shadow-blue-900/40 tracking-tight font-mono">
            BIT
          </div>
          <div>
            <h1 className="font-extrabold text-slate-100 text-xs tracking-tight leading-none uppercase">BIT Enterprise Suite</h1>
            <p className="text-[10px] text-blue-400 font-semibold tracking-wide">IoT Biometric Attendance System</p>
          </div>
        </div>
      </div>

      {/* Global Search Input */}
      <div className="hidden md:flex items-center gap-2 bg-[#151c2c] border border-[#26334d] rounded-lg px-3 py-1.5 w-80 text-xs shadow-inner">
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search students, faculty, rooms, departments..."
          className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 w-full text-xs font-semibold"
        />
      </div>

      <div className="flex items-center gap-2.5">
        {/* Global Theme Toggle */}
        <ThemeToggle />

        {/* Live Biometric Scanner Button for Admin/Moderator */}
        {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
          <button
            onClick={() => navigate('/biometric-scanner')}
            className="px-3 py-1.5 rounded-lg bg-blue-950/90 hover:bg-blue-900 border border-blue-800 text-blue-300 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            title="Open Live Biometric Camera Scanner"
          >
            <Camera className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span className="hidden sm:inline">Live Scanner Kiosk</span>
          </button>
        )}

        {/* Real-time Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#151c2c] border border-[#26334d] text-[11px]">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          <span className="text-slate-300 font-semibold">{connected ? 'Live Sync Active' : 'Offline'}</span>
        </div>

        {/* User Role Badge */}
        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-800/80">
          {user?.role}
        </span>

        {/* Profile Menu Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
          >
            <div className="w-7 h-7 rounded-md bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-300 font-bold text-xs font-mono">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden md:inline-block text-xs font-bold text-slate-200">{user?.name}</span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl glass-card py-1.5 shadow-2xl border border-[#26334d] z-50 text-xs">
              <div className="px-3.5 py-2 border-b border-[#26334d]">
                <p className="font-bold text-slate-100">{user?.name}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
              </div>

              {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
                <>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/admin/settings');
                    }}
                    className="w-full text-left px-3.5 py-2 text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-2 transition-colors font-semibold"
                  >
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    Account &amp; Password
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/biometric-scanner');
                    }}
                    className="w-full text-left px-3.5 py-2 text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 transition-colors font-semibold"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Live Biometric Scanner
                  </button>
                </>
              )}

              <button
                onClick={logout}
                className="w-full text-left px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors font-semibold border-t border-[#26334d]"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
