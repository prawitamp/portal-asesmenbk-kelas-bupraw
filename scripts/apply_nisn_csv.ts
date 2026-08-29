import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE = path.join(__dirname, '../template_data_nisn_siswa.csv');
const OUTPUT_SQL = path.join(__dirname, '../update_nisn_final.sql');
const MOCK_DATA_JSON = path.join(__dirname, '../src/data/realStudentNisn.json');

console.log('===========================================================');
console.log('🔄 PROSES IMPORT DATA NISN ASLI DARI CSV KE DATABASE & LOKAL');
console.log('===========================================================\n');

if (!fs.existsSync(CSV_FILE)) {
  console.error(`❌ File ${CSV_FILE} tidak ditemukan.`);
  process.exit(1);
}

const content = fs.readFileSync(CSV_FILE, 'utf8');
const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

if (lines.length <= 1) {
  console.error('❌ File CSV masih kosong.');
  process.exit(1);
}

// Parse CSV (Skip header)
const dataRows = lines.slice(1);

interface StudentEntry {
  className: string;
  fullName: string;
  nisn: string;
}

const studentEntries: StudentEntry[] = [];
let populatedCount = 0;

for (const row of dataRows) {
  // Simple CSV parser for quoted fields
  const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
  if (!matches || matches.length < 2) continue;

  const className = matches[0].replace(/^"|"$/g, '').trim();
  const fullName = matches[1].replace(/^"|"$/g, '').trim();
  const nisn = (matches[2] || '').replace(/^"|"$/g, '').trim();

  if (nisn) {
    populatedCount++;
  }

  studentEntries.push({ className, fullName, nisn });
}

console.log(`📊 Membaca ${studentEntries.length} data siswa dari CSV.`);
console.log(`✅ Siswa dengan NISN terisi: ${populatedCount} siswa.`);

// 1. Generate SQL UPDATE script for Supabase
const sqlStatements = studentEntries
  .filter(s => s.nisn)
  .map(s => {
    const escapedName = s.fullName.replace(/'/g, "''");
    return `UPDATE public.students SET nisn = '${s.nisn}', updated_at = NOW() WHERE full_name = '${escapedName}' AND class_name = '${s.className}';`;
  })
  .join('\n');

fs.writeFileSync(OUTPUT_SQL, sqlStatements, 'utf8');

// 2. Save JSON for local dev testing immediately
const jsonMap: Record<string, string> = {};
studentEntries.forEach(s => {
  if (s.nisn) {
    jsonMap[`${s.className}:${s.fullName.toUpperCase()}`] = s.nisn;
  }
});
fs.writeFileSync(MOCK_DATA_JSON, JSON.stringify(jsonMap, null, 2), 'utf8');

console.log(`\n📄 File SQL siap dijalankan di Supabase: ${OUTPUT_SQL}`);
console.log(`🧪 Data lokal berhasil diperbarui untuk pengetesan di browser!`);

if (populatedCount === 0) {
  console.log('\n💡 TIPS: Buka file "template_data_nisn_siswa.csv" di Excel, isi kolom NISN untuk masing-masing siswa, lalu jalankan kembali perintah ini:');
  console.log('   npm run apply-nisn');
} else {
  console.log('\n✨ NISN berhasil diproses!');
}
