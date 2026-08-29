import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// 7 official assessment types
const ASSESSMENT_TYPES = [
  { slug: 'biodata-siswa', name: 'Biodata Siswa', filename: 'biodata-siswa.pdf', sortOrder: 1 },
  { slug: 'gaya-belajar', name: 'Gaya Belajar', filename: 'gaya-belajar.pdf', sortOrder: 2 },
  { slug: 'kecerdasan-majemuk', name: 'Kecerdasan Majemuk', filename: 'kecerdasan-majemuk.pdf', sortOrder: 3 },
  { slug: 'minat-bakat', name: 'Minat Bakat', filename: 'minat-bakat.pdf', sortOrder: 4 },
  { slug: 'jenis-kepribadian', name: 'Jenis Kepribadian', filename: 'jenis-kepribadian.pdf', sortOrder: 5 },
  { slug: 'kartu-sosiometri', name: 'Kartu Sosiometri', filename: 'kartu-sosiometri.pdf', sortOrder: 6 },
  { slug: 'laporan-bdi', name: 'Laporan BDI', filename: 'laporan-bdi.pdf', sortOrder: 7 },
];

function resolveSlug(fileName: string): string | null {
  const lower = fileName.toLowerCase().replace(/_/g, '-');
  if (lower.includes('biodata')) return 'biodata-siswa';
  if (lower.includes('gaya-belajar') || lower.includes('gaya belajar')) return 'gaya-belajar';
  if (lower.includes('kecerdasan-majemuk') || lower.includes('kecerdasan majemuk') || lower.includes('kecerdasan')) return 'kecerdasan-majemuk';
  if (lower.includes('minat-bakat') || lower.includes('minat bakat') || lower.includes('minat')) return 'minat-bakat';
  if (lower.includes('jenis-kepribadian') || lower.includes('jenis kepribadian') || lower.includes('kepribadian')) return 'jenis-kepribadian';
  if (lower.includes('sosiometri')) return 'kartu-sosiometri';
  if (lower.includes('bdi') || lower.includes('laporan-bdi')) return 'laporan-bdi';
  return null;
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-api-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = new URL(req.url || '', 'http://localhost:5173');

          // 1. Dynamic Login Verification: Scans the actual folder on disk in real-time
          if (url.pathname === '/api/verify-student' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const rawNisn = (parsed.nisn || '').trim();

                // Read real student NISN mapping and seed
                let realNisnMap: Record<string, string> = {};
                const nisnJsonPath = path.join(process.cwd(), 'src/data/realStudentNisn.json');
                if (fs.existsSync(nisnJsonPath)) {
                  realNisnMap = JSON.parse(fs.readFileSync(nisnJsonPath, 'utf8'));
                }

                const baseDir = path.join(process.cwd(), 'Data Asesmen Siswa 7E 7F 9E 9F 9G 9H 2026-2027');

                // Find matching student
                let matchedStudent: { className: string; fullName: string } | null = null;

                for (const [key, nisnVal] of Object.entries(realNisnMap)) {
                  if (nisnVal === rawNisn) {
                    const [cls, ...nameParts] = key.split(':');
                    matchedStudent = { className: cls, fullName: nameParts.join(':') };
                    break;
                  }
                }

                // If not found in realNisnMap, search directories directly or check demo prefix
                if (!matchedStudent && fs.existsSync(baseDir)) {
                  const classes = fs.readdirSync(baseDir);
                  for (const cls of classes) {
                    const classDir = path.join(baseDir, cls);
                    if (!fs.statSync(classDir).isDirectory()) continue;
                    const students = fs.readdirSync(classDir);
                    for (const st of students) {
                      const key = `${cls}:${st.toUpperCase()}`;
                      if (realNisnMap[key] === rawNisn) {
                        matchedStudent = { className: cls, fullName: st };
                        break;
                      }
                    }
                    if (matchedStudent) break;
                  }
                }

                if (!matchedStudent) {
                  res.writeHead(401, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Data NISN belum sesuai atau belum terdaftar. Silakan periksa kembali nomor NISN Anda.' }));
                  return;
                }

                // Scan this student's local folder in real time
                const studentDir = path.join(baseDir, matchedStudent.className, matchedStudent.fullName);
                const availableSlugs = new Set<string>();

                if (fs.existsSync(studentDir)) {
                  const files = fs.readdirSync(studentDir);
                  for (const file of files) {
                    if (file.toLowerCase().endsWith('.pdf')) {
                      const slug = resolveSlug(file);
                      if (slug) availableSlugs.add(slug);
                    }
                  }
                }

                const assessments = ASSESSMENT_TYPES.map(t => ({
                  slug: t.slug,
                  name: t.name,
                  sortOrder: t.sortOrder,
                  isAvailable: availableSlugs.has(t.slug),
                }));

                const exp = Math.floor(Date.now() / 1000) + 1200;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  token: `local-session-token-${exp}`,
                  expiresAt: exp,
                  student: {
                    fullName: matchedStudent.fullName,
                    className: matchedStudent.className,
                    schoolYear: '2026/2027',
                  },
                  assessments,
                }));
              } catch {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Terjadi kesalahan pada server lokal.' }));
              }
            });
            return;
          }

          // 2. Real-Time PDF Streaming: Serves the exact PDF from the student folder
          if (url.pathname === '/api/download-file') {
            const className = url.searchParams.get('class') || '';
            const studentName = url.searchParams.get('student') || '';
            const slug = url.searchParams.get('slug') || '';

            const baseDir = path.join(process.cwd(), 'Data Asesmen Siswa 7E 7F 9E 9F 9G 9H 2026-2027');
            const studentDir = path.join(baseDir, className, studentName);

            if (fs.existsSync(studentDir)) {
              const files = fs.readdirSync(studentDir);
              const matchedFile = files.find(f => resolveSlug(f) === slug && f.toLowerCase().endsWith('.pdf'));

              if (matchedFile) {
                const filePath = path.join(studentDir, matchedFile);
                const fileStat = fs.statSync(filePath);
                const fileBuffer = fs.readFileSync(filePath);

                res.writeHead(200, {
                  'Content-Type': 'application/pdf',
                  'Content-Length': fileStat.size,
                  'Content-Disposition': `attachment; filename="${matchedFile}"`,
                });
                res.end(fileBuffer);
                return;
              }
            }

            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File tidak ditemukan di folder lokal' }));
            return;
          }

          next();
        });
      },
    },
  ],
  server: {
    port: 5173,
    host: true,
  },
});
