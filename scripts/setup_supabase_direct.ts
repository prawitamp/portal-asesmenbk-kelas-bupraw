import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase PostgreSQL connection
const connectionString = 'postgresql://postgres:portalasesmenbk@db.wpkivdonerwjlkiehndq.supabase.co:5432/postgres';

async function main() {
  console.log('===========================================================');
  console.log('🚀 MENJALANKAN SETUP DATABASE LANGSUNG KE SUPABASE CLOUD');
  console.log('===========================================================\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('📡 Menghubungkan ke database Supabase...');
    await client.connect();
    console.log('✅ Berhasil terhubung ke Supabase PostgreSQL!');

    const sqlFilePath = path.join(__dirname, '../supabase_setup_lengkap.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('⚙️  Mengeksekusi skema tabel, 7 jenis asesmen, 246 siswa, dan data NISN...');
    await client.query(sqlContent);
    console.log('✅ Skema tabel dan data awal berhasil dibuat!');

    // Verify counts in Supabase
    const { rows: studentRows } = await client.query('SELECT COUNT(*) as count FROM public.students;');
    const { rows: typesRows } = await client.query('SELECT COUNT(*) as count FROM public.assessment_types;');
    const { rows: nisnRows } = await client.query('SELECT COUNT(*) as count FROM public.students WHERE nisn IS NOT NULL;');

    console.log('\n📊 Ringkasan Database Supabase:');
    console.log(` - Total Siswa Terdaftar: ${studentRows[0].count} siswa`);
    console.log(` - Total Jenis Asesmen: ${typesRows[0].count} jenis`);
    console.log(` - Siswa dengan NISN Terisi: ${nisnRows[0].count} siswa`);

    console.log('\n✨ SETUP DATABASE SUPABASE SELESAI 100%!');
  } catch (err: any) {
    console.error('❌ Error executing Supabase setup:', err.message);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
