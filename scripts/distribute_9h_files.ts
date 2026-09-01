import fs from 'fs';
import path from 'path';

const BASE_9H = path.join(process.cwd(), 'Data Asesmen Siswa 7E 7F 9E 9F 9G 9H 2026-2027/9H');

const CATEGORY_MAP: Record<string, string> = {
  'IX H BDI': 'bdi',
  'IX H Biodata': 'biodata',
  'IX H GayaBelajar': 'gaya-belajar',
  'IX H JenisKepribadian': 'jenis-kepribadian',
  'IX H KecerdasanMajemuk': 'kecerdasan-majemuk',
  'IX H MinatBakat': 'minat-bakat',
  'IX H Sosiometri': 'sosiometri',
};

// List all 42 student folder names in 9H
const studentFolders = fs.readdirSync(BASE_9H).filter(f => {
  if (f.startsWith('.') || f.startsWith('IX H')) return false;
  return fs.statSync(path.join(BASE_9H, f)).isDirectory();
});

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9]/g, '');
}

// Map normalized name to student folder name
const studentLookup: Record<string, string> = {};
studentFolders.forEach(folder => {
  studentLookup[normalizeName(folder)] = folder;
});

// Add aliases for slight variations
studentLookup[normalizeName('Muhamad Khalifa Kurniawan')] = 'MUHAMAD KHA KURNIAWAN';
studentLookup[normalizeName('Safira Angreani')] = 'SAFIRA ANGRAENI';
studentLookup[normalizeName('Safira Angreani ')] = 'SAFIRA ANGRAENI';

console.log(`Found ${studentFolders.length} student folders in 9H.`);

let totalMoved = 0;
let unmatchedFiles: string[] = [];

for (const [catFolder, catSlug] of Object.entries(CATEGORY_MAP)) {
  const catPath = path.join(BASE_9H, catFolder);
  if (!fs.existsSync(catPath)) {
    console.log(`Category folder ${catFolder} not found, skipping.`);
    continue;
  }

  const files = fs.readdirSync(catPath).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`\n📂 Memproses ${catFolder} (${files.length} file):`);

  for (const fileName of files) {
    const rawStudentName = fileName.replace(/\.pdf$/i, '').trim();
    const norm = normalizeName(rawStudentName);
    const targetFolder = studentLookup[norm];

    if (!targetFolder) {
      console.warn(`  ⚠️ Tidak cocok dengan siswa manapun: "${fileName}" (norm: ${norm})`);
      unmatchedFiles.push(`${catFolder}/${fileName}`);
      continue;
    }

    const srcFile = path.join(catPath, fileName);
    // Destination filename: e.g. "Mandalika Cahya Putri-bdi.pdf"
    const destFileName = `${rawStudentName}-${catSlug}.pdf`;
    const destFile = path.join(BASE_9H, targetFolder, destFileName);

    fs.copyFileSync(srcFile, destFile);
    totalMoved++;
  }
}

console.log(`\n===========================================================`);
console.log(`✅ Total file berhasil dipindahkan ke folder masing-masing siswa: ${totalMoved}`);
if (unmatchedFiles.length > 0) {
  console.log(`⚠️ File tidak cocok (${unmatchedFiles.length}):`, unmatchedFiles);
} else {
  console.log(`🎉 100% SEMUA FILE COCOK DAN TERDISTRIBUSI!`);
}
console.log(`===========================================================`);
