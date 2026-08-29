import React, { useState } from 'react';
import { UserCheck, Loader2, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from './Alert';

export const LoginForm: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const [nisn, setNisn] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisn.trim()) return;
    try {
      await login(nisn);
    } catch {
      // Error handled by AuthContext
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fadeIn">
      {/* Main Login Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-100/90 relative overflow-hidden">
        {/* Top Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600" />

        {/* Branding & Subtitle */}
        <div className="text-center mb-6 pt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 mb-3 shadow-inner">
            <UserCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            Portal Hasil Asesmen BK
          </h1>

          {/* Custom Bu Praw Guidance Badge & Announcement */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80 text-xs font-bold">
            <HeartHandshake className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>Khusus Siswa Bimbingan Bu Praw</span>
          </div>

          <p className="text-xs sm:text-[13px] text-slate-500 mt-2 font-medium leading-relaxed">
            Kelas <span className="font-bold text-slate-700">7E, 7F, 9E, 9F, 9G, 9H</span> • Tahun Ajaran <span className="font-bold text-slate-700">2026/2027</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Masukkan NISN kamu untuk melihat dan mengunduh hasil asesmen secara aman.
          </p>
        </div>

        {/* Error Alert Display */}
        {error && (
          <div className="mb-5">
            <Alert type="error" message={error} onClose={clearError} />
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NISN Input */}
          <div>
            <label htmlFor="nisn" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Nomor Induk Siswa Nasional (NISN)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <input
                id="nisn"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={12}
                required
                autoFocus
                value={nisn}
                onChange={(e) => {
                  setNisn(e.target.value);
                  if (error) clearError();
                }}
                placeholder="Contoh: 0114257880"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-400 font-mono tracking-wide"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 pl-1">
              Gunakan 10 digit nomor NISN resmi yang terdaftar di sekolah.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !nisn.trim()}
            className="w-full mt-3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-[0.98] text-white text-sm font-bold shadow-soft hover:shadow-card transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Memverifikasi NISN...</span>
              </>
            ) : (
              <>
                <span>Lihat Hasil Asesmen</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Notice Footer Inside Card */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Akses terproteksi & data bersifat pribadi</span>
          </div>
        </div>
      </div>
    </div>
  );
};
