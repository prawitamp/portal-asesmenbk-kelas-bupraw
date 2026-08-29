import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OFFICIAL_STUDENT_SEED } from '../src/data/studentsSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR_NAME = 'Data Asesmen Siswa 7E 7F 9E 9F 9G 9H 2026-2027';
const fullBasePath = path.join(__dirname, '..', BASE_DIR_NAME);

console.log('===========================================================');
console.log('📁 MEMBUAT STRUKTUR FOLDER ASESMEN SISWA DI MACBOOK');
console.log('===========================================================\n');

if (!fs.existsSync(fullBasePath)) {
  fs.mkdirSync(fullBasePath, { recursive: true });
}

let folderCount = 0;

for (const student of OFFICIAL_STUDENT_SEED) {
  const classDir = path.join(fullBasePath, student.className);
  if (!fs.existsSync(classDir)) {
    fs.mkdirSync(classDir, { recursive: true });
  }

  const studentDir = path.join(classDir, student.fullName);
  if (!fs.existsSync(studentDir)) {
    fs.mkdirSync(studentDir, { recursive: true });
    folderCount++;
  }
}

console.log(`✅ Berhasil membuat struktur folder untuk ${OFFICIAL_STUDENT_SEED.length} siswa!`);
console.log(`📍 Lokasi Folder Utama:`);
console.log(`   ${fullBasePath}`);
console.log(`\n📂 Khusus Kelas 9H siap diisi file PDF di:`);
console.log(`   ${path.join(fullBasePath, '9H')}`);
