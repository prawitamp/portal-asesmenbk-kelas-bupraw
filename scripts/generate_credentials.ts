import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { OFFICIAL_STUDENT_SEED } from '../src/data/studentsSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a cryptographically secure 6-digit PIN
 * (Avoids sequential digits and repeating simple patterns)
 */
function generateSecurePIN(): string {
  let pin = '';
  do {
    const randomBytes = crypto.randomBytes(4);
    const num = randomBytes.readUInt32BE(0) % 1000000;
    pin = num.toString().padStart(6, '0');
  } while (/^(\d)\1{5}$/.test(pin) || '012345 123456 234567 345678 456789 987654 876543 765432 654321 543210'.includes(pin));
  return pin;
}

/**
 * Hash PIN using PBKDF2 with a unique salt
 */
export function hashPin(pin: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, generatedSalt, 10000, 64, 'sha256').toString('hex');
  return { hash, salt: generatedSalt };
}

/**
 * Generate dummy NISN for local testing or populate from external list
 */
function generateTestNISN(index: number, classPrefix: string): string {
  // Format: 009 + prefix code + 4 digits (e.g. 0097100001)
  const classCode = classPrefix.replace(/[^0-9]/g, '') || '7';
  return `009${classCode}${String(index + 1).padStart(5, '0')}`;
}

async function main() {
  console.log('===========================================================');
  console.log('🔑 GENERATOR KREDENSIAL SISWA (NISN & PIN AMAN BK)');
  console.log('===========================================================\n');

  const args = process.argv.slice(2);
  const isTestMode = args.includes('--test') || args.includes('--demo');

  console.log(`Mode: ${isTestMode ? 'TEST / DEMO DATA (Menghasilkan NISN Uji Coba)' : 'PRODUKSI (Menyiapkan Template Hash & Ekspor)'}`);

  const studentCredentials: Array<{
    className: string;
    fullName: string;
    nisn: string;
    pin: string;
    pinSalt: string;
    pinHash: string;
  }> = [];

  OFFICIAL_STUDENT_SEED.forEach((s, idx) => {
    const nisn = isTestMode ? generateTestNISN(idx, s.className) : '';
    const pin = generateSecurePIN();
    const { hash, salt } = hashPin(pin);

    studentCredentials.push({
      className: s.className,
      fullName: s.fullName,
      nisn,
      pin,
      pinSalt: salt,
      pinHash: hash,
    });
  });

  // Export CSV for Guru BK to distribute / print
  const csvHeaders = 'Kelas,Nama Siswa,NISN,PIN Pribadi\n';
  const csvRows = studentCredentials
    .map(c => `"${c.className}","${c.fullName.replace(/"/g, '""')}","${c.nisn}","${c.pin}"`)
    .join('\n');
  const csvPath = path.join(__dirname, '../credentials_distribution_list.csv');
  fs.writeFileSync(csvPath, csvHeaders + csvRows, 'utf8');

  // Export SQL statements to update database
  const sqlUpdates = studentCredentials
    .filter(c => c.nisn)
    .map(c => {
      const escapedName = c.fullName.replace(/'/g, "''");
      return `UPDATE public.students SET nisn = '${c.nisn}', pin_hash = '${c.pinHash}', pin_salt = '${c.pinSalt}', updated_at = NOW() WHERE full_name = '${escapedName}' AND class_name = '${c.className}';`;
    })
    .join('\n');

  const sqlPath = path.join(__dirname, '../update_credentials.sql');
  fs.writeFileSync(sqlPath, sqlUpdates, 'utf8');

  // Export JSON for local test mocking
  const jsonPath = path.join(__dirname, '../src/data/mockCredentials.json');
  fs.writeFileSync(jsonPath, JSON.stringify(studentCredentials, null, 2), 'utf8');

  console.log(`\n✅ Berhasil memproses ${studentCredentials.length} siswa!`);
  console.log(`📄 File Distribusi Siswa (CSV): ${csvPath}`);
  console.log(`🗄️ File Query Update Database (SQL): ${sqlPath}`);
  console.log(`🧪 File Mock Dev (JSON): ${jsonPath}`);
  console.log('\n🔒 Catatan Keamanan:');
  console.log(' - File CSV berisi PIN plaintext hanya untuk dibagikan secara pribadi ke masing-masing siswa.');
  console.log(' - Database hanya menyimpan salted hash (pin_hash & pin_salt), bukan PIN plaintext.');
}

main().catch(console.error);
