import fs from 'fs';
import path from 'path';

const BASE_9G = path.join(process.cwd(), 'Data Asesmen Siswa 7E 7F 9E 9F 9G 9H 2026-2027/9G');

const CATEGORY_MAP: Record<string, string> = {
  'IX G BDI': 'bdi',
  'IX G Biodata': 'biodata',
  'IX G GayaBelajar': 'gaya-belajar',
  'IX G JenisKepribadian': 'jenis-kepribadian',
  'IX G KecerdasanMajemuk': 'kecerdasan-majemuk',
  'IX G MinatBakat': 'minat-bakat',
  'IX G Sosiometri': 'sosiometri',
};

// List all 41 student folder names in 9G
const studentFolders = fs.readdirSync(BASE_9G).filter(f => {
  if (f.startsWith('.') || f.startsWith('IX G')) return false;
  return fs.statSync(path.join(BASE_9G, f)).isDirectory();
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

console.log(`Ditemukan ${studentFolders.length} folder siswa di kelas 9G.`);

let totalMoved = 0;
const unmatchedFiles: string[] = [];

for (const [catFolder, catSlug] of Object.entries(CATEGORY_MAP)) {
  const catPath = path.join(BASE_9G, catFolder);
  if (!fs.existsSync(catPath)) {
    console.log(`Folder kategori ${catFolder} tidak ditemukan, lewati.`);
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
    // Destination filename: e.g. "Abdan Pary-bdi.pdf"
    const destFileName = `${rawStudentName}-${catSlug}.pdf`;
    const destFile = path.join(BASE_9G, targetFolder, destFileName);

    fs.copyFileSync(srcFile, destFile);
    totalMoved++;
  }
}

console.log(`\n===========================================================`);
console.log(`✅ Total file berhasil disalin ke folder masing-masing siswa: ${totalMoved}`);
if (unmatchedFiles.length > 0) {
  console.log(`⚠️ File tidak cocok (${unmatchedFiles.length}):`, unmatchedFiles);
} else {
  console.log(`🎉 100% SEMUA FILE (287 FILE) COCOK DAN TERDISTRIBUSI!`);
}
console.log(`===========================================================`);

// Clean up original category folders once successfully distributed
if (unmatchedFiles.length === 0 && totalMoved === 287) {
  console.log('\n🧹 Membersihkan folder kategori sumber IX G...');
  for (const catFolder of Object.keys(CATEGORY_MAP)) {
    const catPath = path.join(BASE_9G, catFolder);
    if (fs.existsSync(catPath)) {
      fs.rmSync(catPath, { recursive: true, force: true });
      console.log(`  🗑️ Folder kategori ${catFolder} berhasil dibersihkan.`);
    }
  }
  console.log('✨ Struktur folder kelas 9G sekarang rapi dan siap digunakan!');
}
