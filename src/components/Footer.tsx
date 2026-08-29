import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto py-8 text-center text-xs text-slate-500">
      <div className="max-w-4xl mx-auto px-4 space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-slate-600 font-medium">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Data hasil asesmen bersifat pribadi dan hanya dapat diakses oleh siswa yang bersangkutan.</span>
        </div>
        <p className="text-slate-400 text-[11px]">
          © 2026/2027 Layanan Bimbingan dan Konseling Bu Praw (Kelas 7E, 7F, 9E, 9F, 9G, 9H) • Portal Hasil Asesmen Siswa
        </p>
      </div>
    </footer>
  );
};
