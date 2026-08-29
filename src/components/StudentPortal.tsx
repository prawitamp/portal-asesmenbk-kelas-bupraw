import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AssessmentCard } from './AssessmentCard';
import { Alert } from './Alert';
import { LogOut, Calendar, GraduationCap, ShieldAlert, Sparkles, Clock } from 'lucide-react';

export const StudentPortal: React.FC = () => {
  const {
    student,
    assessments,
    logout,
    downloadAssessment,
    downloadingSlug,
    error,
    clearError,
    sessionRemainingSeconds,
  } = useAuth();

  if (!student) return null;

  // Format session minutes and seconds
  const minutes = Math.floor(sessionRemainingSeconds / 60);
  const seconds = sessionRemainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-fadeIn">
      {/* Student Welcome Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-slate-100/90 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/50 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  Portal Siswa
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Sesi: {timeFormatted}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                Halo, {student.fullName} 👋
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Berikut hasil asesmen BK kamu.
              </p>
            </div>

            {/* Logout Action */}
            <button
              onClick={logout}
              type="button"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all self-start sm:self-auto border border-slate-200/80 hover:border-rose-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>

          {/* Student Badges */}
          <div className="flex flex-wrap items-center gap-2.5 pt-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200/60">
              <GraduationCap className="w-4 h-4 text-teal-600" />
              <span>Kelas {student.className}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200/70">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Tahun Ajaran {student.schoolYear}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert Display */}
      {error && (
        <Alert type="error" message={error} onClose={clearError} />
      )}

      {/* Assessment List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Daftar Dokumen Asesmen (7 Jenis)
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Format: PDF Pribadi
          </span>
        </div>

        <div className="space-y-2.5">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.slug}
              assessment={assessment}
              onDownload={downloadAssessment}
              isDownloading={downloadingSlug === assessment.slug}
            />
          ))}
        </div>
      </div>

      {/* Privacy Notice Box */}
      <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100 flex items-start gap-3 text-xs text-teal-900 leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Privasi Dokumen:</span> File hasil asesmen diunduh melalui tautan aman yang hanya aktif sementara. Pastikan Anda mengklik <span className="font-semibold text-teal-950">Keluar</span> setelah selesai mengunduh jika menggunakan perangkat bersama.
        </div>
      </div>
    </div>
  );
};
