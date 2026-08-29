import type { Handler, HandlerEvent } from '@netlify/functions';
import { getServerSupabase } from './utils/supabase.js';
import { createSessionToken } from './utils/auth.js';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from './utils/rate-limit.js';

const GENERIC_AUTH_ERROR = 'Data NISN belum sesuai atau belum terdaftar. Silakan periksa kembali NISN Anda atau hubungi Guru BK.';
const RATE_LIMIT_ERROR = 'Untuk keamanan, silakan tunggu beberapa saat sebelum mencoba kembali.';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // 1. Extract IP for rate limiting
  const clientIp =
    event.headers['x-forwarded-for']?.split(',')[0].trim() ||
    event.headers['client-ip'] ||
    '127.0.0.1';

  // Check rate limit on client IP
  const rateLimitStatus = checkRateLimit(clientIp);
  if (!rateLimitStatus.isAllowed) {
    return {
      statusCode: 429,
      headers: {
        ...CORS_HEADERS,
        'Retry-After': String(rateLimitStatus.retryAfterSeconds || 900),
      },
      body: JSON.stringify({ error: RATE_LIMIT_ERROR }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const rawNisn = typeof body.nisn === 'string' ? body.nisn.trim() : '';

    if (!rawNisn || !/^\d{4,12}$/.test(rawNisn)) {
      recordFailedAttempt(clientIp);
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: GENERIC_AUTH_ERROR }),
      };
    }

    const supabase = getServerSupabase();

    if (!supabase) {
      console.warn('⚠️ Supabase environment variables not configured on server.');
      return {
        statusCode: 503,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Layanan verifikasi sedang dalam pemeliharaan. Silakan hubungi Guru BK.',
        }),
      };
    }

    // 2. Fetch student by NISN (only active students)
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id, nisn, full_name, class_name, school_year, is_active')
      .eq('nisn', rawNisn)
      .eq('is_active', true)
      .maybeSingle();

    if (studentErr || !student) {
      recordFailedAttempt(clientIp);
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: GENERIC_AUTH_ERROR }),
      };
    }

    // Reset rate limit upon successful verification
    resetRateLimit(clientIp);

    // 3. Fetch available assessment metadata for student
    const { data: assessmentTypes, error: typesErr } = await supabase
      .from('assessment_types')
      .select('id, slug, name, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (typesErr || !assessmentTypes) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Gagal memuat data asesmen.' }),
      };
    }

    // Fetch file availability
    const { data: files } = await supabase
      .from('assessment_files')
      .select('assessment_type_id, is_available')
      .eq('student_id', student.id);

    const availabilityMap = new Map<string, boolean>();
    (files || []).forEach(f => {
      availabilityMap.set(f.assessment_type_id, f.is_available);
    });

    const assessmentsList = assessmentTypes.map(t => ({
      slug: t.slug,
      name: t.name,
      sortOrder: t.sort_order,
      isAvailable: availabilityMap.get(t.id) === true,
    }));

    // 4. Generate short-lived session token (20 minutes)
    const { token, exp } = createSessionToken({
      id: student.id,
      fullName: student.full_name,
      className: student.class_name,
      schoolYear: student.school_year,
    });

    // 5. Return sanitized payload (Never leak secrets, keys, or internal storage paths)
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        token,
        expiresAt: exp,
        student: {
          fullName: student.full_name,
          className: student.class_name,
          schoolYear: student.school_year,
        },
        assessments: assessmentsList,
      }),
    };
  } catch (err) {
    console.error('Login handler unexpected error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Terjadi kesalahan sistem. Silakan coba lagi.' }),
    };
  }
};
