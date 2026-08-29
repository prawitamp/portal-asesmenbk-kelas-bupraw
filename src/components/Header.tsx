import React from 'react';
import { ShieldCheck, GraduationCap } from 'lucide-react';

interface HeaderProps {
  onLogout?: () => void;
  showLogout?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, showLogout }) => {
  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-soft">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-800">
                Portal Hasil Asesmen BK
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                <ShieldCheck className="w-3 h-3 mr-1 text-teal-600" />
                Aman
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Bimbingan Bu Praw (7E, 7F, 9E, 9F, 9G, 9H) • T.A. 2026/2027
            </p>
          </div>
        </div>

        {showLogout && onLogout && (
          <button
            onClick={onLogout}
            type="button"
            className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 active:scale-95 border border-rose-200 rounded-xl transition-all cursor-pointer"
          >
            Keluar
          </button>
        )}
      </div>
    </header>
  );
};
