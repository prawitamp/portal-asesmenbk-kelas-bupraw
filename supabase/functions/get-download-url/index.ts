import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const STORAGE_BUCKET = Deno.env.get('STORAGE_BUCKET') || 'assessment-results';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Sesi tidak valid.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawToken = authHeader.replace('Bearer ', '').trim();
    let session: any;
    try {
      session = JSON.parse(atob(rawToken));
    } catch {
      return new Response(JSON.stringify({ error: 'Sesi kedaluwarsa.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!session.studentId || session.exp < Math.floor(Date.now() / 1000)) {
      return new Response(JSON.stringify({ error: 'Sesi Anda telah kedaluwarsa.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { slug } = await req.json();
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Parameter asesmen tidak valid.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: typeData } = await supabase
      .from('assessment_types')
      .select('id, filename')
      .eq('slug', slug)
      .maybeSingle();

    if (!typeData) {
      return new Response(JSON.stringify({ error: 'Asesmen tidak ditemukan.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: fileRecord } = await supabase
      .from('assessment_files')
      .select('storage_path, original_filename, is_available')
      .eq('student_id', session.studentId)
      .eq('assessment_type_id', typeData.id)
      .maybeSingle();

    if (!fileRecord || !fileRecord.is_available) {
      return new Response(JSON.stringify({ error: 'Dokumen belum tersedia.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: signedData, error: signErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(fileRecord.storage_path, 60, {
        download: fileRecord.original_filename || typeData.filename,
      });

    if (signErr || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: 'Gagal membuat tautan unduhan.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        downloadUrl: signedData.signedUrl,
        filename: fileRecord.original_filename || typeData.filename,
        expiresIn: 60,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan sistem.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
