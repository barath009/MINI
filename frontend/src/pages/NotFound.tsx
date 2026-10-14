import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080d1a] flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-6xl font-extrabold text-cyan-400 font-mono mb-2">404</h1>
      <h2 className="text-xl font-bold text-slate-100 mb-2">Page Not Found</h2>
      <p className="text-xs text-slate-400 mb-6">The requested campus route or resource does not exist.</p>
      <Link to="/login" className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs">
        Return to Sign In Portal
      </Link>
    </div>
  );
};
