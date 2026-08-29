import type { Handler, HandlerEvent } from '@netlify/functions';
import { getServerSupabase } from './utils/supabase.js';
import { verifySessionToken } from './utils/auth.js';

const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'assessment-results';
const SIGNED_URL_EXPIRES_SECONDS = 60; // 60 seconds short-lived download link

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

  try {
    // 1. Extract and verify session token from Authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.' }),
      };
    }

    const token = authHeader.substring(7).trim();
    const session = verifySessionToken(token);

    if (!session) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Sesi Anda telah kedaluwarsa. Silakan masuk kembali.' }),
      };
    }

    // 2. Extract assessment slug from request body
    const body = JSON.parse(event.body || '{}');
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';

    if (!slug) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Parameter asesmen tidak valid.' }),
      };
    }

    const supabase = getServerSupabase();

    if (!supabase) {
      return {
        statusCode: 503,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Layanan unduh sedang dalam pemeliharaan. Silakan hubungi Guru BK.',
        }),
      };
    }

    // 3. Find assessment type by slug
    const { data: assessmentType, error: typeErr } = await supabase
      .from('assessment_types')
      .select('id, name, filename')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (typeErr || !assessmentType) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Jenis asesmen tidak ditemukan.' }),
      };
    }

    // 4. Find assessment file specifically belonging to the verified student_id
    const { data: fileRecord, error: fileErr } = await supabase
      .from('assessment_files')
      .select('storage_path, original_filename, is_available')
      .eq('student_id', session.studentId)
      .eq('assessment_type_id', assessmentType.id)
      .maybeSingle();

    if (fileErr || !fileRecord || !fileRecord.is_available) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Dokumen hasil asesmen belum tersedia.' }),
      };
    }

    // 5. Generate short-lived signed URL from private Supabase Storage
    const { data: signedData, error: signErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(fileRecord.storage_path, SIGNED_URL_EXPIRES_SECONDS, {
        download: fileRecord.original_filename || assessmentType.filename,
      });

    if (signErr || !signedData?.signedUrl) {
      console.error('Error generating signed URL:', signErr);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Gagal membuat tautan unduhan dokumen.' }),
      };
    }

    // 6. Return short-lived signed URL
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        downloadUrl: signedData.signedUrl,
        filename: fileRecord.original_filename || assessmentType.filename,
        expiresIn: SIGNED_URL_EXPIRES_SECONDS,
      }),
    };
  } catch (err) {
    console.error('Download handler unexpected error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Terjadi kesalahan saat memproses unduhan.' }),
    };
  }
};
