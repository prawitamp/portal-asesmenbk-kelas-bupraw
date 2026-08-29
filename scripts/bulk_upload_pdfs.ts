import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'assessment-results';
const SCHOOL_YEAR_SLUG = '2026-2027';

/**
 * Smart matching for assessment slug based on file name
 * Supports exact names (e.g. 'gaya-belajar.pdf') as well as prefixed names (e.g. 'Abdul Faqry-gaya-belajar.pdf')
 */
export function resolveAssessmentSlug(fileName: string): string | null {
  const lower = fileName.toLowerCase().replace(/_/g, '-');

  // Check specific types first
  if (lower.includes('jawaban-imu') || lower.includes('jawaban imu')) {
    return 'jawaban-imu-pd';
  }
  if (lower.includes('imu-pd') || lower.includes('imu pd')) {
    return 'imu-pd';
  }
  if (lower.includes('biodata')) {
    return 'biodata-siswa';
  }
  if (lower.includes('gaya-belajar') || lower.includes('gaya belajar')) {
    return 'gaya-belajar';
  }
  if (lower.includes('kecerdasan-majemuk') || lower.includes('kecerdasan majemuk') || lower.includes('kecerdasan')) {
    return 'kecerdasan-majemuk';
  }
  if (lower.includes('minat-bakat') || lower.includes('minat bakat') || lower.includes('minat')) {
    return 'minat-bakat';
  }
  if (lower.includes('jenis-kepribadian') || lower.includes('jenis kepribadian') || lower.includes('kepribadian')) {
    return 'jenis-kepribadian';
  }
  if (lower.includes('sosiometri')) {
    return 'kartu-sosiometri';
  }
  if (lower.includes('bdi') || lower.includes('laporan-bdi')) {
    return 'laporan-bdi';
  }

  return null;
}

const ASSESSMENT_CANONICAL_FILENAMES: Record<string, string> = {
  'imu-pd': 'imu-pd.pdf',
  'jawaban-imu-pd': 'jawaban-imu-pd.pdf',
  'biodata-siswa': 'biodata-siswa.pdf',
  'gaya-belajar': 'gaya-belajar.pdf',
  'kecerdasan-majemuk': 'kecerdasan-majemuk.pdf',
  'minat-bakat': 'minat-bakat.pdf',
  'jenis-kepribadian': 'jenis-kepribadian.pdf',
  'kartu-sosiometri': 'kartu-sosiometri.pdf',
  'laporan-bdi': 'laporan-bdi.pdf',
};

async function main() {
  console.log('===========================================================');
  console.log('📤 BULK UPLOAD ASESMEN BK SISWA KE PRIVATE SUPABASE STORAGE');
  console.log('===========================================================\n');

  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const targetDir = args.find(a => !a.startsWith('--')) || 'Data Asesmen Siswa 7E 7F 9E 9F 9G 9H 2026-2027';

  const fullTargetDirPath = path.isAbsolute(targetDir) ? targetDir : path.join(process.cwd(), targetDir);

  console.log(`📁 Folder Sumber: ${fullTargetDirPath}`);
  console.log(`🛡️ Mode: ${isDryRun ? 'DRY-RUN (Simulasi / Validasi Saja)' : 'UPLOAD LANGSUNG KE SUPABASE'}`);

  if (!fs.existsSync(fullTargetDirPath)) {
    console.error(`\n❌ Folder tidak ditemukan: ${fullTargetDirPath}`);
    process.exit(1);
  }

  if (!isDryRun && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('\n❌ ERROR: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus disetel di environment.');
    console.log('Gunakan: export SUPABASE_URL="..." export SUPABASE_SERVICE_ROLE_KEY="..."');
    process.exit(1);
  }

  const supabase = !isDryRun
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
        realtime: { transport: ws as any },
      })
    : null;

  // 1. Fetch students & assessment types from DB
  let studentsMap = new Map<string, { id: string; className: string; fullName: string }>();
  let assessmentTypesMap = new Map<string, string>(); // slug -> id

  if (supabase) {
    console.log('📡 Mengambil metadata siswa dan jenis asesmen dari database...');
    const { data: students, error: sErr } = await supabase.from('students').select('id, class_name, full_name');
    if (sErr || !students) {
      console.error('❌ Gagal mengambil data siswa:', sErr);
      process.exit(1);
    }
    students.forEach(s => {
      const key = `${s.class_name}:${s.full_name.trim().toUpperCase()}`;
      studentsMap.set(key, { id: s.id, className: s.class_name, fullName: s.full_name });
    });

    const { data: types, error: tErr } = await supabase.from('assessment_types').select('id, slug');
    if (tErr || !types) {
      console.error('❌ Gagal mengambil jenis asesmen:', tErr);
      process.exit(1);
    }
    types.forEach(t => assessmentTypesMap.set(t.slug, t.id));
    console.log(`✅ Dimuat: ${students.length} siswa, ${types.length} jenis asesmen.`);
  }

  // 2. Scan folders
  const classes = fs.readdirSync(fullTargetDirPath).filter(f => !f.startsWith('.'));
  let totalFoundFiles = 0;
  let totalSuccessUploads = 0;
  let totalErrors = 0;

  for (const className of classes) {
    const classDir = path.join(fullTargetDirPath, className);
    if (!fs.statSync(classDir).isDirectory()) continue;

    const studentDirs = fs.readdirSync(classDir).filter(f => !f.startsWith('.'));

    for (const studentDirName of studentDirs) {
      const studentDir = path.join(classDir, studentDirName);
      if (!fs.statSync(studentDir).isDirectory()) continue;

      const normalizedName = studentDirName.trim().toUpperCase();
      const studentKey = `${className}:${normalizedName}`;
      const studentInfo = studentsMap.get(studentKey);

      if (supabase && !studentInfo) {
        console.warn(`  ⚠️ Siswa tidak ditemukan di database: [${className}] "${studentDirName}"`);
        totalErrors++;
        continue;
      }

      const files = fs.readdirSync(studentDir).filter(f => f.toLowerCase().endsWith('.pdf'));

      if (files.length > 0) {
        console.log(`\n📂 [Kelas ${className}] Siswa: ${studentDirName} (${files.length} file PDF terdeteksi)`);
      }

      for (const fileName of files) {
        totalFoundFiles++;
        const slug = resolveAssessmentSlug(fileName);
        if (!slug) {
          console.warn(`  ⚠️ Nama file tidak dikenali polanya: "${fileName}" di folder "${studentDirName}"`);
          totalErrors++;
          continue;
        }

        const canonicalFilename = ASSESSMENT_CANONICAL_FILENAMES[slug] || `${slug}.pdf`;
        const filePath = path.join(studentDir, fileName);
        const studentId = studentInfo ? studentInfo.id : 'student-uuid-sample';
        const storagePath = `${SCHOOL_YEAR_SLUG}/${className}/${studentId}/${canonicalFilename}`;

        if (isDryRun) {
          console.log(`  📄 [${slug}] ${fileName} -> ${storagePath}`);
        } else if (supabase) {
          try {
            const fileBuffer = fs.readFileSync(filePath);
            const { error: uploadErr } = await supabase.storage
              .from(STORAGE_BUCKET)
              .upload(storagePath, fileBuffer, {
                contentType: 'application/pdf',
                upsert: true,
              });

            if (uploadErr) {
              console.error(`  ❌ Gagal upload ${storagePath}:`, uploadErr.message);
              totalErrors++;
              continue;
            }

            const typeId = assessmentTypesMap.get(slug);
            if (typeId) {
              const { error: dbErr } = await supabase
                .from('assessment_files')
                .update({
                  storage_path: storagePath,
                  original_filename: canonicalFilename,
                  is_available: true,
                  uploaded_at: new Date().toISOString(),
                })
                .match({
                  student_id: studentId,
                  assessment_type_id: typeId,
                });

              if (dbErr) {
                console.error(`  ❌ Gagal update status DB untuk ${fileName}:`, dbErr.message);
                totalErrors++;
                continue;
              }
            }

            console.log(`  ✅ Berhasil upload: ${canonicalFilename} (${studentDirName})`);
            totalSuccessUploads++;
          } catch (err: any) {
            console.error(`  ❌ Error processing file ${fileName}:`, err.message);
            totalErrors++;
          }
        }
      }
    }
  }

  console.log('\n===========================================================');
  console.log('📊 RINGKASAN PROSES BULK UPLOAD:');
  console.log(` - Total File PDF Terdeteksi: ${totalFoundFiles}`);
  if (!isDryRun) {
    console.log(` - Berhasil Diupload & Terverifikasi: ${totalSuccessUploads}`);
    console.log(` - File Gagal / Error: ${totalErrors}`);
  }
  console.log('===========================================================');
}

main().catch(console.error);
