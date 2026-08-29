-- ====================================================================
-- MIGRATION 001: INITIAL SCHEMA FOR PORTAL HASIL ASESMEN BK SISWA
-- ====================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table: students
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn TEXT UNIQUE,
    full_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    school_year TEXT NOT NULL DEFAULT '2026/2027',
    pin_hash TEXT,
    pin_salt TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn) WHERE nisn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_class_year ON public.students(class_name, school_year);
CREATE INDEX IF NOT EXISTS idx_students_full_name ON public.students(full_name);

-- 2. Table: assessment_types
CREATE TABLE IF NOT EXISTS public.assessment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_assessment_types_sort ON public.assessment_types(sort_order);

-- 3. Table: assessment_files
CREATE TABLE IF NOT EXISTS public.assessment_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    assessment_type_id UUID NOT NULL REFERENCES public.assessment_types(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT false,
    uploaded_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_student_assessment UNIQUE (student_id, assessment_type_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_files_student_id ON public.assessment_files(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_files_available ON public.assessment_files(student_id, is_available);

-- 4. Table: login_rate_limits (Server-side Rate Limiting)
CREATE TABLE IF NOT EXISTS public.login_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT UNIQUE NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 1,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    locked_until TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_login_rate_limits_id ON public.login_rate_limits(identifier);

-- 5. Private Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'assessment-results',
    'assessment-results',
    false,
    10485760, -- 10MB limit per file
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false,
    allowed_mime_types = ARRAY['application/pdf'];

-- 6. Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_rate_limits ENABLE ROW LEVEL SECURITY;

-- Note: All student access is mediated through serverless API functions using service_role.
-- RLS default policy blocks direct unauthenticated public access.
CREATE POLICY "Public assessment_types read only"
    ON public.assessment_types
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);
