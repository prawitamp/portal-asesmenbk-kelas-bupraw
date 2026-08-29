import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OFFICIAL_STUDENT_SEED } from '../src/data/studentsSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('===========================================================');
console.log('📝 PENGELOLA & IMPORT DATA NISN SISWA (246 SISWA)');
console.log('===========================================================\n');

const args = process.argv.slice(2);
const isTestMode = args.includes('--test') || args.includes('--demo');

// 1. Generate Template CSV for Guru BK to fill in
const templateCsvPath = path.join(__dirname, '../template_data_nisn_siswa.csv');
const templateHeaders = 'Kelas,Nama Siswa,NISN\n';
const templateRows = OFFICIAL_STUDENT_SEED.map((s, idx) => {
  const dummyNisn = isTestMode ? `009${s.className.replace(/[^0-9]/g, '') || '7'}${String(idx + 1).padStart(5, '0')}` : '';
  return `"${s.className}","${s.fullName.replace(/"/g, '""')}","${dummyNisn}"`;
}).join('\n');

fs.writeFileSync(templateCsvPath, templateHeaders + templateRows, 'utf8');

// 2. Generate SQL Update Statements if NISN is populated
const sqlUpdates = OFFICIAL_STUDENT_SEED.map((s, idx) => {
  const dummyNisn = `009${s.className.replace(/[^0-9]/g, '') || '7'}${String(idx + 1).padStart(5, '0')}`;
  const escapedName = s.fullName.replace(/'/g, "''");
  return `UPDATE public.students SET nisn = '${dummyNisn}', updated_at = NOW() WHERE full_name = '${escapedName}' AND class_name = '${s.className}';`;
}).join('\n');

const sqlPath = path.join(__dirname, '../update_nisn_sample.sql');
fs.writeFileSync(sqlPath, sqlUpdates, 'utf8');

console.log(`✅ File template CSV berhasil dibuat: ${templateCsvPath}`);
console.log(`📄 Contoh script update SQL: ${sqlPath}`);
console.log('\n💡 Panduan untuk Guru BK:');
console.log('1. Buka file "template_data_nisn_siswa.csv" di Excel / Google Sheets.');
console.log('2. Isi kolom NISN untuk masing-masing siswa.');
console.log('3. Simpan dan jalankan update ke database Supabase atau gunakan SQL editor.');
