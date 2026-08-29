import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OFFICIAL_STUDENT_SEED, ASSESSMENT_TYPES_SEED } from '../src/data/studentsSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('🔍 VALIDASI SEED DATA SISWA & ASESMEN BK 2026/2027');
console.log('====================================================\n');

// 1. Group by class
const classCounts: Record<string, number> = {};
const duplicates: string[] = [];
const seenByClass = new Map<string, Set<string>>();

for (const student of OFFICIAL_STUDENT_SEED) {
  classCounts[student.className] = (classCounts[student.className] || 0) + 1;

  if (!seenByClass.has(student.className)) {
    seenByClass.set(student.className, new Set());
  }
  const classSet = seenByClass.get(student.className)!;
  if (classSet.has(student.fullName)) {
    duplicates.push(`[${student.className}] ${student.fullName}`);
  }
  classSet.add(student.fullName);
}

const expectedCounts: Record<string, number> = {
  '7E': 40,
  '7F': 40,
  '9E': 42,
  '9F': 41,
  '9G': 41,
  '9H': 42,
};

let hasError = false;

console.log('📊 Rincian Jumlah Siswa per Kelas:');
for (const [className, expected] of Object.entries(expectedCounts)) {
  const actual = classCounts[className] || 0;
  const isMatch = actual === expected;
  console.log(` - Kelas ${className}: ${actual} siswa (Diharapkan: ${expected}) ${isMatch ? '✅' : '❌'}`);
  if (!isMatch) hasError = true;
}

const totalActual = OFFICIAL_STUDENT_SEED.length;
const totalExpected = 246;
console.log(`\n📌 Total Keseluruhan: ${totalActual} siswa (Diharapkan: ${totalExpected}) ${totalActual === totalExpected ? '✅' : '❌'}`);
if (totalActual !== totalExpected) hasError = true;

if (duplicates.length > 0) {
  console.error('\n❌ Ditemukan nama duplikat dalam kelas yang sama:');
  duplicates.forEach(d => console.error(`  - ${d}`));
  hasError = true;
} else {
  console.log('✅ Tidak ada nama duplikat dalam kelas yang sama.');
}

console.log(`\n📋 Verifikasi 7 Jenis Asesmen Resmi:`);
console.log(` - Total Jenis Asesmen: ${ASSESSMENT_TYPES_SEED.length} (Diharapkan: 7) ${ASSESSMENT_TYPES_SEED.length === 7 ? '✅' : '❌'}`);
ASSESSMENT_TYPES_SEED.forEach(t => {
  console.log(`   • [${t.sortOrder}] ${t.name} -> ${t.slug} (${t.filename})`);
});
if (ASSESSMENT_TYPES_SEED.length !== 7) hasError = true;

// Check SQL migration file
const sqlFilePath = path.join(__dirname, '../supabase/migrations/003_seed_students_246.sql');
if (fs.existsSync(sqlFilePath)) {
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  let sqlStudentMatches = 0;
  for (const s of OFFICIAL_STUDENT_SEED) {
    const escapedName = s.fullName.replace(/'/g, "''");
    if (sqlContent.includes(`('${s.className}', '${escapedName}')`)) {
      sqlStudentMatches++;
    }
  }
  console.log(`\n🗄️  Verifikasi File SQL (003_seed_students_246.sql):`);
  console.log(` - Siswa ditemukan di file SQL: ${sqlStudentMatches} / ${totalExpected} ${sqlStudentMatches === totalExpected ? '✅' : '❌'}`);
  if (sqlStudentMatches !== totalExpected) hasError = true;
}

if (hasError) {
  console.error('\n❌ VALIDASI GAGAL! Periksa kembali data siswa.');
  process.exit(1);
} else {
  console.log('\n✨ SEMUA VALIDASI BERHASIL! Data siswa 100% akurat & siap digunakan.');
  process.exit(0);
}
