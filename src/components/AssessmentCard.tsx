import React from 'react';
import {
  Download,
  Loader2,
  FileText,
  Brain,
  Lightbulb,
  Award,
  Users,
  CheckSquare,
  UserCheck,
  HeartHandshake,
  BookOpen,
  Clock,
} from 'lucide-react';
import { AssessmentItem } from '../types';

interface AssessmentCardProps {
  assessment: AssessmentItem;
  onDownload: (slug: string) => void;
  isDownloading: boolean;
}

// Icon mapper for 9 assessment types
function getAssessmentIcon(slug: string) {
  switch (slug) {
    case 'imu-pd':
      return <FileText className="w-5 h-5 text-teal-600" />;
    case 'jawaban-imu-pd':
      return <CheckSquare className="w-5 h-5 text-emerald-600" />;
    case 'biodata-siswa':
      return <UserCheck className="w-5 h-5 text-sky-600" />;
    case 'gaya-belajar':
      return <Lightbulb className="w-5 h-5 text-amber-500" />;
    case 'kecerdasan-majemuk':
      return <Brain className="w-5 h-5 text-purple-600" />;
    case 'minat-bakat':
      return <Award className="w-5 h-5 text-orange-500" />;
    case 'jenis-kepribadian':
      return <HeartHandshake className="w-5 h-5 text-pink-600" />;
    case 'kartu-sosiometri':
      return <Users className="w-5 h-5 text-indigo-600" />;
    case 'laporan-bdi':
      return <BookOpen className="w-5 h-5 text-cyan-600" />;
    default:
      return <FileText className="w-5 h-5 text-teal-600" />;
  }
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
  assessment,
  onDownload,
  isDownloading,
}) => {
  return (
    <div
      className={`group relative flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border transition-all duration-200 ${
        assessment.isAvailable
          ? 'border-slate-200/90 hover:border-teal-300 hover:shadow-card'
          : 'border-slate-200/60 bg-slate-50/50'
      }`}
    >
      <div className="flex items-center gap-3.5 sm:gap-4 pr-3">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
            assessment.isAvailable
              ? 'bg-slate-100/80 group-hover:bg-teal-50'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {getAssessmentIcon(assessment.slug)}
        </div>

        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight leading-snug">
            {assessment.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {assessment.isAvailable ? 'Format PDF • Siap diunduh' : 'Dokumen belum diunggah'}
          </p>
        </div>
      </div>

      <div className="shrink-0">
        {assessment.isAvailable ? (
          <button
            onClick={() => onDownload(assessment.slug)}
            disabled={isDownloading}
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            aria-label={`Unduh ${assessment.name}`}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span className="hidden sm:inline">Mengunduh...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Unduh</span>
              </>
            )}
          </button>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200/80 select-none cursor-default"
            aria-label={`${assessment.name} belum tersedia`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Belum tersedia
          </span>
        )}
      </div>
    </div>
  );
};
