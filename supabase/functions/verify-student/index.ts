import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const GENERIC_ERROR = 'Data NISN belum sesuai atau belum terdaftar. Silakan periksa kembali nomor NISN Anda.';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { nisn } = await req.json();
    const cleanNisn = (nisn || '').trim();

    if (!cleanNisn) {
      return new Response(JSON.stringify({ error: GENERIC_ERROR }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('id, full_name, class_name, school_year, is_active')
      .eq('nisn', cleanNisn)
      .eq('is_active', true)
      .maybeSingle();

    if (sErr || !student) {
      return new Response(JSON.stringify({ error: GENERIC_ERROR }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch assessment types and files
    const { data: assessmentTypes } = await supabase
      .from('assessment_types')
      .select('id, slug, name, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const { data: files } = await supabase
      .from('assessment_files')
      .select('assessment_type_id, is_available')
      .eq('student_id', student.id);

    const availabilityMap = new Map();
    (files || []).forEach((f: any) => availabilityMap.set(f.assessment_type_id, f.is_available));

    const assessments = (assessmentTypes || []).map((t: any) => ({
      slug: t.slug,
      name: t.name,
      sortOrder: t.sort_order,
      isAvailable: availabilityMap.get(t.id) === true,
    }));

    // Create session token with expiration (20 mins)
    const exp = Math.floor(Date.now() / 1000) + 1200;
    const payload = {
      studentId: student.id,
      fullName: student.full_name,
      className: student.class_name,
      schoolYear: student.school_year,
      exp,
    };

    const token = btoa(JSON.stringify(payload));

    return new Response(
      JSON.stringify({
        token,
        expiresAt: exp,
        student: {
          fullName: student.full_name,
          className: student.class_name,
          schoolYear: student.school_year,
        },
        assessments,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan server.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
