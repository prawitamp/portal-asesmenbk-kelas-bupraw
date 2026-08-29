import { AuthSuccessPayload, DownloadResponse, AssessmentItem } from '../types';
import { OFFICIAL_STUDENT_SEED, ASSESSMENT_TYPES_SEED } from '../data/studentsSeed';
import realNisnJson from '../data/realStudentNisn.json';

const API_BASE_URL = '/api';

const realNisnMap = (realNisnJson || {}) as Record<string, string>;

// In-memory mock store for local development preview when backend server is running in standalone Vite mode
const mockStudentDatabase = OFFICIAL_STUDENT_SEED.map((student, idx) => {
  const classCode = student.className.replace(/[^0-9]/g, '') || '7';
  const defaultNisn = `009${classCode}${String(idx + 1).padStart(5, '0')}`;
  const key = `${student.className}:${student.fullName.toUpperCase()}`;
  const nisn = realNisnMap[key] || defaultNisn;

  // Available assessments mapping for test/preview
  let availableAssessments: string[] = [];
  if (student.fullName === 'ABDUL FAQRY' && student.className === '9H') {
    availableAssessments = ['laporan-bdi', 'gaya-belajar', 'jenis-kepribadian', 'kecerdasan-majemuk', 'minat-bakat'];
  } else if (idx === 0) {
    availableAssessments = ['imu-pd', 'gaya-belajar', 'minat-bakat'];
  } else if (idx === 1) {
    availableAssessments = ['biodata-siswa', 'jenis-kepribadian'];
  }

  return {
    id: `student-uuid-${idx + 1}`,
    nisn: String(nisn).trim(),
    fullName: student.fullName,
    className: student.className,
    schoolYear: '2026/2027',
    availableAssessments,
  };
});

let mockRateLimitAttempts = 0;
let mockRateLimitLockedUntil = 0;

export async function verifyStudentLogin(nisn: string): Promise<AuthSuccessPayload> {
  const cleanNisn = nisn.trim();

  try {
    const response = await fetch(`${API_BASE_URL}/verify-student`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nisn: cleanNisn }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // In standalone Vite dev server, route to local mock engine
      return executeMockLogin(cleanNisn);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Data NISN belum sesuai. Silakan periksa kembali NISN Anda.');
    }

    return data as AuthSuccessPayload;
  } catch (err: any) {
    if (
      err.message &&
      !err.message.includes('Unexpected') &&
      !err.message.includes('Failed to fetch') &&
      !err.message.includes('NetworkError') &&
      !err.message.includes('404')
    ) {
      throw err;
    }

    return executeMockLogin(cleanNisn);
  }
}

function executeMockDownload(slug: string): DownloadResponse {
  const targetType = ASSESSMENT_TYPES_SEED.find(t => t.slug === slug);
  const filename = targetType ? targetType.filename : `${slug}.pdf`;

  // Get current logged-in student info from sessionStorage to locate real PDF
  let className = '9H';
  let studentName = 'ABDUL FAQRY';
  try {
    const saved = sessionStorage.getItem('bk_portal_session_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.student) {
        className = parsed.student.className || className;
        studentName = parsed.student.fullName || studentName;
      }
    }
  } catch {
    // fallback
  }

  // Direct URL to Vite dev local file streaming endpoint
  const downloadUrl = `/api/download-file?class=${encodeURIComponent(className)}&student=${encodeURIComponent(studentName)}&slug=${encodeURIComponent(slug)}`;

  return {
    downloadUrl,
    filename,
    expiresIn: 60,
  };
}

export async function getAssessmentDownloadUrl(token: string, slug: string): Promise<DownloadResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/get-download-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ slug }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return executeMockDownload(slug);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Gagal memproses unduhan asesmen.');
    }

    return data as DownloadResponse;
  } catch (err: any) {
    if (
      err.message &&
      !err.message.includes('Unexpected') &&
      !err.message.includes('Failed to fetch') &&
      !err.message.includes('NetworkError') &&
      !err.message.includes('404')
    ) {
      throw err;
    }

    return executeMockDownload(slug);
  }
}

function executeMockLogin(nisn: string): AuthSuccessPayload {
  const now = Date.now();

  // Check rate limit in mock mode
  if (mockRateLimitLockedUntil > now) {
    throw new Error('Untuk keamanan, silakan tunggu beberapa saat sebelum mencoba kembali.');
  }

  const student = mockStudentDatabase.find(s => s.nisn === nisn);

  if (!student) {
    mockRateLimitAttempts++;
    if (mockRateLimitAttempts >= 5) {
      mockRateLimitLockedUntil = now + 15 * 60 * 1000;
      mockRateLimitAttempts = 0;
      throw new Error('Untuk keamanan, silakan tunggu beberapa saat sebelum mencoba kembali.');
    }
    throw new Error('Data NISN belum sesuai atau belum terdaftar. Silakan periksa kembali nomor NISN Anda.');
  }

  // Reset rate limits
  mockRateLimitAttempts = 0;
  mockRateLimitLockedUntil = 0;

  const assessments: AssessmentItem[] = ASSESSMENT_TYPES_SEED.map(t => ({
    slug: t.slug,
    name: t.name,
    sortOrder: t.sortOrder,
    isAvailable: student.availableAssessments.includes(t.slug),
  }));

  const expiresAt = Math.floor(Date.now() / 1000) + 1200; // 20 mins

  return {
    token: `mock-session-jwt-${student.id}-${expiresAt}`,
    expiresAt,
    student: {
      fullName: student.fullName,
      className: student.className,
      schoolYear: student.schoolYear,
    },
    assessments,
  };
}

export function getMockTestAccounts() {
  const abdulFaqry = mockStudentDatabase.find(s => s.fullName === 'ABDUL FAQRY' && s.className === '9H');
  const sample9E = mockStudentDatabase.filter(s => s.className === '9E').slice(0, 2);
  const sample7E = mockStudentDatabase.filter(s => s.className === '7E').slice(0, 1);
  const list = abdulFaqry ? [abdulFaqry, ...sample9E, ...sample7E] : [...sample9E, ...sample7E];
  return list.map(s => ({
    fullName: s.fullName,
    className: s.className,
    nisn: s.nisn,
  }));
}
