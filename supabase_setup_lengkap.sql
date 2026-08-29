-- ====================================================================
-- MASTER SETUP PORTAL ASESMEN BK (LENGKAP 1 FILE)
-- Jalankan file ini di SQL Editor Supabase -> Klik "Run"
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABEL: students
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

CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn) WHERE nisn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_class_year ON public.students(class_name, school_year);
CREATE INDEX IF NOT EXISTS idx_students_full_name ON public.students(full_name);

-- 3. TABEL: assessment_types (7 Jenis Asesmen Resmi)
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

-- 4. TABEL: assessment_files
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

-- 5. TABEL: login_rate_limits
CREATE TABLE IF NOT EXISTS public.login_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT UNIQUE NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 1,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    locked_until TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_login_rate_limits_id ON public.login_rate_limits(identifier);

-- 6. PRIVATE STORAGE BUCKET: assessment-results
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'assessment-results',
    'assessment-results',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false,
    allowed_mime_types = ARRAY['application/pdf'];

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public assessment_types read only"
    ON public.assessment_types
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- 8. SEED 7 JENIS ASESMEN RESMI
INSERT INTO public.assessment_types (slug, name, filename, sort_order, is_active)
VALUES
    ('biodata-siswa', 'Biodata Siswa', 'biodata-siswa.pdf', 1, true),
    ('gaya-belajar', 'Gaya Belajar', 'gaya-belajar.pdf', 2, true),
    ('kecerdasan-majemuk', 'Kecerdasan Majemuk', 'kecerdasan-majemuk.pdf', 3, true),
    ('minat-bakat', 'Minat Bakat', 'minat-bakat.pdf', 4, true),
    ('jenis-kepribadian', 'Jenis Kepribadian', 'jenis-kepribadian.pdf', 5, true),
    ('kartu-sosiometri', 'Kartu Sosiometri', 'kartu-sosiometri.pdf', 6, true),
    ('laporan-bdi', 'Laporan BDI', 'laporan-bdi.pdf', 7, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    filename = EXCLUDED.filename,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- 9. SEED 246 SISWA
DO $$
DECLARE
    rec RECORD;
    v_type RECORD;
    v_year TEXT := '2026/2027';
    v_year_slug TEXT := '2026-2027';
BEGIN
    CREATE TEMP TABLE tmp_seed_students (
        class_name TEXT NOT NULL,
        full_name TEXT NOT NULL
    ) ON COMMIT DROP;

    -- 7E (40 Siswa)
    INSERT INTO tmp_seed_students (class_name, full_name) VALUES
    ('7E', 'ABIDZAR PUTRA YOGI'), ('7E', 'ABIYYU EMIRUL KHAIR'), ('7E', 'ACQUILA AZZALEA QISYA'),
    ('7E', 'AFIQA HAMIDAH'), ('7E', 'ALPIAN MUHAMAD RAPA'), ('7E', 'ANINDIA RABIA PUTRI'),
    ('7E', 'AQILA AZIZATUL FADHLA'), ('7E', 'ARAFAH PUTRAYANA ADITYA'), ('7E', 'ARJUNA PRATAMA AKBAR'),
    ('7E', 'AYESHA HEBA ASSYAKIRA'), ('7E', 'AZKA MAULANA ARRAIHAN'), ('7E', 'CAPRILIA XANZA'),
    ('7E', 'CINTA NAURA SECHAN'), ('7E', 'DARPATUL LAILA RAHMADANI'), ('7E', 'DIMAS PRASONGKO'),
    ('7E', 'FADYA ASSYIFA'), ('7E', 'HAMDUN ABDUL KARIM'), ('7E', 'IFFA ASTILA RAHMA'),
    ('7E', 'KHANZA SHAZIA RIFA'), ('7E', 'KHAYURA ASYABIYA RAHMAN'), ('7E', 'KHOIRUNISA'),
    ('7E', 'MUHAMAD FILAN BAIHAKI'), ('7E', 'MUHAMAD REHAN ARIYAN'), ('7E', 'MUHAMAD RIZKY AL-QOWI'),
    ('7E', 'MUHAMMAD AFKAR ALQISTHI'), ('7E', 'MUHAMMAD AKMAL FALLAH'), ('7E', 'MUHAMMAD DIRGHAM HAIDAR NUGRAHA'),
    ('7E', 'MUHAMMAD RIZKY MAULANA'), ('7E', 'MUHAMMAD SAUGI AL-GHIFARI'), ('7E', 'NAJWA A''ISYATUL AFIFAH'),
    ('7E', 'NASYAH AGUSTINA'), ('7E', 'NAURA NADHIFA MALADI'), ('7E', 'NAYLA NEHAYATUL KAMILAH'),
    ('7E', 'PARULIAN LEE SIAHAAN'), ('7E', 'RAIHAN ALFA RISKI'), ('7E', 'RIANGGUN HAERUTAMA'),
    ('7E', 'RIKO DUTA DAMARA'), ('7E', 'SABINA AYLA QAIREEN'), ('7E', 'SIPA ALISA AJAHRA'),
    ('7E', 'ZIANDRA NAZMU NUGRAHA'),

    -- 7F (40 Siswa)
    ('7F', 'AKHMAD JEN'), ('7F', 'AKILLA DESFINDA'), ('7F', 'AKSA ALHAFIZH MARGONO'),
    ('7F', 'AMARA NABILA ZAKIA'), ('7F', 'ANGEL HABIBAH'), ('7F', 'AQILA SASABILA RAMADHANI'),
    ('7F', 'AULIYA ARISTA FIRDIYANA'), ('7F', 'AZKHA MAULANA'), ('7F', 'BILQIS UFAIRA'),
    ('7F', 'CANTIKA KAYLA PUTRI'), ('7F', 'DIKI MAULANA FAUZAN'), ('7F', 'DZAKI SURYA MAHESA'),
    ('7F', 'ERINDA FAZYLA SUSANTO'), ('7F', 'FAIQ RAFIQI NURA'), ('7F', 'FARHAN SEPTIYANI'),
    ('7F', 'FARIZ NAUFAL RAHARDIAN'), ('7F', 'FAUZIYAH'), ('7F', 'HANIFAIHA RAMADHANI'),
    ('7F', 'HANY RIZKIYA'), ('7F', 'KENZY ASSYIFA MAGHDALENA'), ('7F', 'M.ZHILDAN RAMADHAN'),
    ('7F', 'MEISHADIVIA SANTOSO'), ('7F', 'MUHAMMAD AQLAN RHOMDONY'), ('7F', 'MUHAMMAD AZZAM MAJIID SANTOSO'),
    ('7F', 'MUHAMMAD FATHIR MAULANA'), ('7F', 'MUHAMMAD FATIR AS-SYAQIR'), ('7F', 'MUHAMMAD HASURI'),
    ('7F', 'MUHAMMAD JABIL RUSYAIDI'), ('7F', 'MUHAMMAD JULIANSAH'), ('7F', 'MUHAMMAD SYUJA'),
    ('7F', 'NAURA SHAFWAN MASITA'), ('7F', 'RAFELLA RAISHA'), ('7F', 'RATU ADZKIARA VAHLEVI'),
    ('7F', 'RATU NAFISAH ELZHAR'), ('7F', 'RIFAL AKBAR'), ('7F', 'RISKA RAMADANI'),
    ('7F', 'ROBIATUL ADAWIYAH APDI'), ('7F', 'SALSA NABILA JUANDINI'), ('7F', 'SANDY'),
    ('7F', 'SATRIO SANTOSO'),

    -- 9E (42 Siswa)
    ('9E', 'ABDUL SAHID'), ('9E', 'AHMAD FAUZAN SHOFA'), ('9E', 'AHMAD SABIL AUFA'),
    ('9E', 'ALISHBA NAYYARA FILZAH'), ('9E', 'ARYA DZAKY NATAKUSUMAH'), ('9E', 'ATIKAH RAMADANI'),
    ('9E', 'AZWAN SYAHRIL FAUJI'), ('9E', 'BILAL ATHAR'), ('9E', 'CHARISSA GALUH BACHTIAR'),
    ('9E', 'DANI ARDIANSYAH'), ('9E', 'FAHRY AHMAD'), ('9E', 'FAQIH RAMADHAN'),
    ('9E', 'FAUZAN AVIAN MUNIR'), ('9E', 'KHOLIFAH MEYLANI PUTRI'), ('9E', 'LINTANG NAGA CAESAR'),
    ('9E', 'LISDA NINGSIH RAMADHANI'), ('9E', 'MUHAMAD FADHIL LUKMAN'), ('9E', 'MUHAMAD ILYAS DZULKARNAIN'),
    ('9E', 'MUHAMAD WILDAN SEBASTIAN'), ('9E', 'MUHAMMAD FARIS MULYAWAN'), ('9E', 'MUHAMMAD KHAIRUL FAHMI'),
    ('9E', 'MUHAMMAD MIRZA ARIFIN'), ('9E', 'MUHAMMAD RADITHYA PRATAMA RONIE'), ('9E', 'MUHAMMAD RAFLY MAULANA'),
    ('9E', 'NAURA BELLA'), ('9E', 'NISA ULPA DILA'), ('9E', 'NOVA AZZAHRA'),
    ('9E', 'RAMA FAHRURROZI'), ('9E', 'RATU PARAMITA ANANTA'), ('9E', 'RAYA RIZQINA RAMADHANI'),
    ('9E', 'RENAFA DWI CAHYANI'), ('9E', 'RIFDA MUHNINA PUTRI'), ('9E', 'SADIRA KASYIFAQILA TRIADI'),
    ('9E', 'SALLY KIRANA APRILIA SIREGAR'), ('9E', 'SHAVA AULIA WAHYUDI'), ('9E', 'SINTA SEFTIANI'),
    ('9E', 'SYIFA MAULIDATUL FITRIA'), ('9E', 'TUBAGUS FAEYZA MAJID'), ('9E', 'YOLANDA FITRIA'),
    ('9E', 'YULIANA SUCI WULANDARI'), ('9E', 'AULIA FAUZIAH'), ('9E', 'DARRY PUTRA DIGDAYA'),

    -- 9F (41 Siswa)
    ('9F', 'AHYA''I AMWATULLAH'), ('9F', 'ALIYA DITA ZAFIRA'), ('9F', 'AMIRA TYAS MARGONO'),
    ('9F', 'ARJUNA MAHARDIKA PRATAMA'), ('9F', 'AZZAHNY PUTRI HERMAWAN'), ('9F', 'BRIAND JABBAR NOVANTO'),
    ('9F', 'DESWITA OKTADINA'), ('9F', 'EKA SULPATRI'), ('9F', 'FATURROHMAN SYAPUTRA'),
    ('9F', 'FERDY ADITIYA'), ('9F', 'GALVIN ZAKY PRANIANSYAH'), ('9F', 'GINAA AAFIYAH'),
    ('9F', 'HASINA NAYYARA AL GHOJALI'), ('9F', 'JAHROTUN NAKIYAH'), ('9F', 'KANZA MAYDINA PUTRI'),
    ('9F', 'KAYLA UDZMA'), ('9F', 'KHOIRUL DWIANJAYA'), ('9F', 'LIA AULIA'),
    ('9F', 'LUSI AGUSTINA RHAMADANI'), ('9F', 'MAS ANANDA AZRIE MAULANA R'), ('9F', 'MAULIDIYA ASSIFA'),
    ('9F', 'MOHAMMAD FAKHRI AZHAR'), ('9F', 'MUHAMAD MAHESA AL-FIZAN'), ('9F', 'MUHAMAD RHEZA RAMADHAN'),
    ('9F', 'MUHAMMAD RIZKY RAMADAN'), ('9F', 'NAURA SESILIA PUTRI'), ('9F', 'NESSYA FAHIRA MEGA'),
    ('9F', 'NUR HIKMAH'), ('9F', 'OLIVIA DARA PUTRI'), ('9F', 'PUTRI RAHAYU'),
    ('9F', 'RAEYA SAABIRA GUNAWAN'), ('9F', 'RISKA NATALIA SIMARMATA'), ('9F', 'SALSABILA SUHANAH'),
    ('9F', 'SEP RAHMAN'), ('9F', 'SHIFA KHANSA AFIRA'), ('9F', 'SYAKIRA ALMIRA ZAHARANI'),
    ('9F', 'SYIFA CORDELIA RAFANI'), ('9F', 'VANESHA NOVIANATA'), ('9F', 'MUHAMMAD IZHAM ADRIANSYAH'),
    ('9F', 'ALMAY RAYYAN RUBY FALAH'), ('9F', 'AL BAIHAQI MARTIAN'),

    -- 9G (41 Siswa)
    ('9G', 'ABDAN PARY'), ('9G', 'ALLONA PUTRI ZANETA'), ('9G', 'ANDIKA RIZKI FIRDAUS'),
    ('9G', 'ANISA RAMADANI'), ('9G', 'ASRA DIPA SURIYANTO'), ('9G', 'CHESTER ABIA RACHMAD'),
    ('9G', 'DHINA PUTRIANA'), ('9G', 'ELOISE MEGHAN PRANATA'), ('9G', 'FADHILAH AFZA NAIFA'),
    ('9G', 'FATIH ABDI BUDIMAN'), ('9G', 'FAZILA BELVA'), ('9G', 'FRISKA AFISTA AULIA'),
    ('9G', 'HAYATI NUFUS'), ('9G', 'JELITA ARYANTI PUTRI'), ('9G', 'KARUNIA EKA NINGSIH'),
    ('9G', 'KEYLA AULIA PUTRI'), ('9G', 'LAILATUL QOMARIAH'), ('9G', 'M. FEBRIYANSYAH'),
    ('9G', 'MARSHA OKTAVIA LATIFANISA'), ('9G', 'MICHAELA AZKIA ISLAMADINA'), ('9G', 'MOH IKBAR FAAD'),
    ('9G', 'MUHAMAD ADI FIRMANSYAH'), ('9G', 'MUHAMAD RAPAEL'), ('9G', 'MUHAMMAD IBNU AL-JABBAR'),
    ('9G', 'MUHAMMAD IHWANUL KARIM'), ('9G', 'NABIL ATHA SAKHI'), ('9G', 'NEYSA AYU DESTIANA'),
    ('9G', 'NIKEN APRILIANI'), ('9G', 'REGITA CAHYANI'), ('9G', 'RIZKI AL SEBASTIAN'),
    ('9G', 'RIZKI MAULANA SOPIAN'), ('9G', 'SANTI KURNIAWATI'), ('9G', 'SHAALIHUDDIN AL-AYUBI'),
    ('9G', 'SRI ULYATI'), ('9G', 'SYAUQI JALADARA PUTRI'), ('9G', 'TAHTA DHIKA SINATRIA'),
    ('9G', 'VICKY REVALKA ALKHI'), ('9G', 'VONDRA KASIH RIZKIA DETHAN'), ('9G', 'ZAHRA FITRIA SARI'),
    ('9G', 'DESTIANA SAPUTRI'), ('9G', 'MUHAMAD RIDO'),

    -- 9H (42 Siswa)
    ('9H', 'ABDUL FAQRY'), ('9H', 'ACHMAD FARIZKY'), ('9H', 'AJENG PAMUNGKAS'),
    ('9H', 'ALMIRA IRGI BILQIST'), ('9H', 'ANDIKA GALANG RAMADHAN'), ('9H', 'APRILIA'),
    ('9H', 'AQILNABIGH PUTRA RAHMAN'), ('9H', 'ASYIFA RAMADHANI HAFID'), ('9H', 'CITRA FAHIRA'),
    ('9H', 'DHINI PUTRIANI'), ('9H', 'ELVINA REZKYA P'), ('9H', 'FATIMATUL ZAHRO'),
    ('9H', 'FAUZUL AMARULLAH'), ('9H', 'FEISYA AULIA ALMAS'), ('9H', 'GANESH AZALIA GAYATRI'),
    ('9H', 'KALFAN DANAR IBRAHIM'), ('9H', 'MANDALIKA CAHYA PUTRI'), ('9H', 'MERLY MUTIARA'),
    ('9H', 'MOHAMAD RAFA EMERALDIANTO'), ('9H', 'MUH RAFA RAMDANI'), ('9H', 'MUHAMAD AL GHAZALI'),
    ('9H', 'MUHAMAD FARHAN TRIDARMA'), ('9H', 'MUHAMAD KHA KURNIAWAN'), ('9H', 'MUHAMAD RAFQI RAMADHAN'),
    ('9H', 'MUHAMAD RAZKA IRSYA PRATAMA'), ('9H', 'MUHAMAD ZAKI ALHAFIDZ'), ('9H', 'MUHAMMAD RAFA SAEFUL'),
    ('9H', 'MUHAMMAD RICO ALFIAN'), ('9H', 'NADHIRA RAYSA SARAH'), ('9H', 'NAJWA ANANDA PUTRI'),
    ('9H', 'NIVA NIRVANA ZAFIRA'), ('9H', 'PUTRI GENDIS NOVIAUTAMI'), ('9H', 'RATU AURELIA ANEIRA RAIHANAH'),
    ('9H', 'RD.M SAID YUSUP'), ('9H', 'RENADA HANIFAH'), ('9H', 'RIFKI ADRIANSYAH'),
    ('9H', 'SAFIRA ANGRAENI'), ('9H', 'SATRIA MAULANA'), ('9H', 'SINTA WULAN SAPUTRI'),
    ('9H', 'SUCI DWI PURWANTI'), ('9H', 'TEDAS AWAN TANTULAR'), ('9H', 'ZAHRA SEPTIANI PUTRI');

    -- Insert or update students
    FOR rec IN SELECT class_name, full_name FROM tmp_seed_students LOOP
        INSERT INTO public.students (full_name, class_name, school_year, is_active)
        VALUES (rec.full_name, rec.class_name, v_year, true)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Create assessment_files placeholder for 7 assessment types
    FOR rec IN SELECT id, class_name FROM public.students WHERE school_year = v_year LOOP
        FOR v_type IN SELECT id, slug, filename FROM public.assessment_types WHERE is_active = true LOOP
            INSERT INTO public.assessment_files (
                student_id,
                assessment_type_id,
                storage_path,
                original_filename,
                is_available
            )
            VALUES (
                rec.id,
                v_type.id,
                v_year_slug || '/' || rec.class_name || '/' || rec.id || '/' || v_type.filename,
                v_type.filename,
                false
            )
            ON CONFLICT (student_id, assessment_type_id) DO NOTHING;
        END LOOP;
    END LOOP;

END $$;

-- 10. UPDATE NISN SELURUH KELAS 9 (9E, 9F, 9G, 9H - 166 SISWA)
UPDATE public.students SET nisn = '0114298092', updated_at = NOW() WHERE full_name = 'ABDUL SAHID' AND class_name = '9E';
UPDATE public.students SET nisn = '0113947347', updated_at = NOW() WHERE full_name = 'AHMAD FAUZAN SHOFA' AND class_name = '9E';
UPDATE public.students SET nisn = '0117066303', updated_at = NOW() WHERE full_name = 'AHMAD SABIL AUFA' AND class_name = '9E';
UPDATE public.students SET nisn = '0122742361', updated_at = NOW() WHERE full_name = 'ALISHBA NAYYARA FILZAH' AND class_name = '9E';
UPDATE public.students SET nisn = '0127087227', updated_at = NOW() WHERE full_name = 'ARYA DZAKY NATAKUSUMAH' AND class_name = '9E';
UPDATE public.students SET nisn = '0112308014', updated_at = NOW() WHERE full_name = 'ATIKAH RAMADANI' AND class_name = '9E';
UPDATE public.students SET nisn = '0118396071', updated_at = NOW() WHERE full_name = 'AZWAN SYAHRIL FAUJI' AND class_name = '9E';
UPDATE public.students SET nisn = '0117392717', updated_at = NOW() WHERE full_name = 'BILAL ATHAR' AND class_name = '9E';
UPDATE public.students SET nisn = '0111827722', updated_at = NOW() WHERE full_name = 'CHARISSA GALUH BACHTIAR' AND class_name = '9E';
UPDATE public.students SET nisn = '0128215171', updated_at = NOW() WHERE full_name = 'DANI ARDIANSYAH' AND class_name = '9E';
UPDATE public.students SET nisn = '0122232608', updated_at = NOW() WHERE full_name = 'FAHRY AHMAD' AND class_name = '9E';
UPDATE public.students SET nisn = '0111924372', updated_at = NOW() WHERE full_name = 'FAQIH RAMADHAN' AND class_name = '9E';
UPDATE public.students SET nisn = '0129880030', updated_at = NOW() WHERE full_name = 'FAUZAN AVIAN MUNIR' AND class_name = '9E';
UPDATE public.students SET nisn = '0124745061', updated_at = NOW() WHERE full_name = 'KHOLIFAH MEYLANI PUTRI' AND class_name = '9E';
UPDATE public.students SET nisn = '0121652480', updated_at = NOW() WHERE full_name = 'LINTANG NAGA CAESAR' AND class_name = '9E';
UPDATE public.students SET nisn = '0122383286', updated_at = NOW() WHERE full_name = 'LISDA NINGSIH RAMADHANI' AND class_name = '9E';
UPDATE public.students SET nisn = '0112859566', updated_at = NOW() WHERE full_name = 'MUHAMAD FADHIL LUKMAN' AND class_name = '9E';
UPDATE public.students SET nisn = '3126546563', updated_at = NOW() WHERE full_name = 'MUHAMAD ILYAS DZULKARNAIN' AND class_name = '9E';
UPDATE public.students SET nisn = '0111185919', updated_at = NOW() WHERE full_name = 'MUHAMAD WILDAN SEBASTIAN' AND class_name = '9E';
UPDATE public.students SET nisn = '0112277011', updated_at = NOW() WHERE full_name = 'MUHAMMAD FARIS MULYAWAN' AND class_name = '9E';
UPDATE public.students SET nisn = '0112669759', updated_at = NOW() WHERE full_name = 'MUHAMMAD KHAIRUL FAHMI' AND class_name = '9E';
UPDATE public.students SET nisn = '3128542782', updated_at = NOW() WHERE full_name = 'MUHAMMAD MIRZA ARIFIN' AND class_name = '9E';
UPDATE public.students SET nisn = '0123328809', updated_at = NOW() WHERE full_name = 'MUHAMMAD RADITHYA PRATAMA RONIE' AND class_name = '9E';
UPDATE public.students SET nisn = '0124542360', updated_at = NOW() WHERE full_name = 'MUHAMMAD RAFLY MAULANA' AND class_name = '9E';
UPDATE public.students SET nisn = '0123664687', updated_at = NOW() WHERE full_name = 'NAURA BELLA' AND class_name = '9E';
UPDATE public.students SET nisn = '0128861324', updated_at = NOW() WHERE full_name = 'NISA ULPA DILA' AND class_name = '9E';
UPDATE public.students SET nisn = '0129455640', updated_at = NOW() WHERE full_name = 'NOVA AZZAHRA' AND class_name = '9E';
UPDATE public.students SET nisn = '0129234388', updated_at = NOW() WHERE full_name = 'RAMA FAHRURROZI' AND class_name = '9E';
UPDATE public.students SET nisn = '0122584723', updated_at = NOW() WHERE full_name = 'RATU PARAMITA ANANTA' AND class_name = '9E';
UPDATE public.students SET nisn = '0112571872', updated_at = NOW() WHERE full_name = 'RAYA RIZQINA RAMADHANI' AND class_name = '9E';
UPDATE public.students SET nisn = '0112260901', updated_at = NOW() WHERE full_name = 'RENAFA DWI CAHYANI' AND class_name = '9E';
UPDATE public.students SET nisn = '3129163406', updated_at = NOW() WHERE full_name = 'RIFDA MUHNINA PUTRI' AND class_name = '9E';
UPDATE public.students SET nisn = '0128479767', updated_at = NOW() WHERE full_name = 'SADIRA KASYIFAQILA TRIADI' AND class_name = '9E';
UPDATE public.students SET nisn = '0125282872', updated_at = NOW() WHERE full_name = 'SALLY KIRANA APRILIA SIREGAR' AND class_name = '9E';
UPDATE public.students SET nisn = '0115445399', updated_at = NOW() WHERE full_name = 'SHAVA AULIA WAHYUDI' AND class_name = '9E';
UPDATE public.students SET nisn = '0118128282', updated_at = NOW() WHERE full_name = 'SINTA SEFTIANI' AND class_name = '9E';
UPDATE public.students SET nisn = '0126446856', updated_at = NOW() WHERE full_name = 'SYIFA MAULIDATUL FITRIA' AND class_name = '9E';
UPDATE public.students SET nisn = '0127987664', updated_at = NOW() WHERE full_name = 'TUBAGUS FAEYZA MAJID' AND class_name = '9E';
UPDATE public.students SET nisn = '0127589272', updated_at = NOW() WHERE full_name = 'YOLANDA FITRIA' AND class_name = '9E';
UPDATE public.students SET nisn = '0126300851', updated_at = NOW() WHERE full_name = 'YULIANA SUCI WULANDARI' AND class_name = '9E';
UPDATE public.students SET nisn = '0127344720', updated_at = NOW() WHERE full_name = 'AULIA FAUZIAH' AND class_name = '9E';
UPDATE public.students SET nisn = '0122491639', updated_at = NOW() WHERE full_name = 'DARRY PUTRA DIGDAYA' AND class_name = '9E';
UPDATE public.students SET nisn = '0128478175', updated_at = NOW() WHERE full_name = 'AHYA''I AMWATULLAH' AND class_name = '9F';
UPDATE public.students SET nisn = '0117815253', updated_at = NOW() WHERE full_name = 'ALIYA DITA ZAFIRA' AND class_name = '9F';
UPDATE public.students SET nisn = '0121795570', updated_at = NOW() WHERE full_name = 'AMIRA TYAS MARGONO' AND class_name = '9F';
UPDATE public.students SET nisn = '0124357273', updated_at = NOW() WHERE full_name = 'ARJUNA MAHARDIKA PRATAMA' AND class_name = '9F';
UPDATE public.students SET nisn = '0129712478', updated_at = NOW() WHERE full_name = 'AZZAHNY PUTRI HERMAWAN' AND class_name = '9F';
UPDATE public.students SET nisn = '0113054857', updated_at = NOW() WHERE full_name = 'BRIAND JABBAR NOVANTO' AND class_name = '9F';
UPDATE public.students SET nisn = '3116033736', updated_at = NOW() WHERE full_name = 'DESWITA OKTADINA' AND class_name = '9F';
UPDATE public.students SET nisn = '0129459826', updated_at = NOW() WHERE full_name = 'EKA SULPATRI' AND class_name = '9F';
UPDATE public.students SET nisn = '0113374881', updated_at = NOW() WHERE full_name = 'FATURROHMAN SYAPUTRA' AND class_name = '9F';
UPDATE public.students SET nisn = '0128851648', updated_at = NOW() WHERE full_name = 'FERDY ADITIYA' AND class_name = '9F';
UPDATE public.students SET nisn = '3126600498', updated_at = NOW() WHERE full_name = 'GALVIN ZAKY PRANIANSYAH' AND class_name = '9F';
UPDATE public.students SET nisn = '0123634987', updated_at = NOW() WHERE full_name = 'GINAA AAFIYAH' AND class_name = '9F';
UPDATE public.students SET nisn = '0129090902', updated_at = NOW() WHERE full_name = 'HASINA NAYYARA AL GHOJALI' AND class_name = '9F';
UPDATE public.students SET nisn = '0125082581', updated_at = NOW() WHERE full_name = 'JAHROTUN NAKIYAH' AND class_name = '9F';
UPDATE public.students SET nisn = '0121299696', updated_at = NOW() WHERE full_name = 'KANZA MAYDINA PUTRI' AND class_name = '9F';
UPDATE public.students SET nisn = '3123635819', updated_at = NOW() WHERE full_name = 'KAYLA UDZMA' AND class_name = '9F';
UPDATE public.students SET nisn = '0113695829', updated_at = NOW() WHERE full_name = 'KHOIRUL DWIANJAYA' AND class_name = '9F';
UPDATE public.students SET nisn = '0118313794', updated_at = NOW() WHERE full_name = 'LIA AULIA' AND class_name = '9F';
UPDATE public.students SET nisn = '0126889748', updated_at = NOW() WHERE full_name = 'LUSI AGUSTINA RHAMADANI' AND class_name = '9F';
UPDATE public.students SET nisn = '0117229418', updated_at = NOW() WHERE full_name = 'MAS ANANDA AZRIE MAULANA R' AND class_name = '9F';
UPDATE public.students SET nisn = '0124763210', updated_at = NOW() WHERE full_name = 'MAULIDIYA ASSIFA' AND class_name = '9F';
UPDATE public.students SET nisn = '0124817005', updated_at = NOW() WHERE full_name = 'MOHAMMAD FAKHRI AZHAR' AND class_name = '9F';
UPDATE public.students SET nisn = '0117928161', updated_at = NOW() WHERE full_name = 'MUHAMAD MAHESA AL-FIZAN' AND class_name = '9F';
UPDATE public.students SET nisn = '0124204537', updated_at = NOW() WHERE full_name = 'MUHAMAD RHEZA RAMADHAN' AND class_name = '9F';
UPDATE public.students SET nisn = '0125946267', updated_at = NOW() WHERE full_name = 'MUHAMMAD RIZKY RAMADAN' AND class_name = '9F';
UPDATE public.students SET nisn = '0105864685', updated_at = NOW() WHERE full_name = 'NAURA SESILIA PUTRI' AND class_name = '9F';
UPDATE public.students SET nisn = '0123017640', updated_at = NOW() WHERE full_name = 'NESSYA FAHIRA MEGA' AND class_name = '9F';
UPDATE public.students SET nisn = '0121064027', updated_at = NOW() WHERE full_name = 'NUR HIKMAH' AND class_name = '9F';
UPDATE public.students SET nisn = '0122908516', updated_at = NOW() WHERE full_name = 'OLIVIA DARA PUTRI' AND class_name = '9F';
UPDATE public.students SET nisn = '0127238199', updated_at = NOW() WHERE full_name = 'PUTRI RAHAYU' AND class_name = '9F';
UPDATE public.students SET nisn = '0123477533', updated_at = NOW() WHERE full_name = 'RAEYA SAABIRA GUNAWAN' AND class_name = '9F';
UPDATE public.students SET nisn = '0119617448', updated_at = NOW() WHERE full_name = 'RISKA NATALIA SIMARMATA' AND class_name = '9F';
UPDATE public.students SET nisn = '0108044729', updated_at = NOW() WHERE full_name = 'SALSABILA SUHANAH' AND class_name = '9F';
UPDATE public.students SET nisn = '3121884450', updated_at = NOW() WHERE full_name = 'SEP RAHMAN' AND class_name = '9F';
UPDATE public.students SET nisn = '0113292263', updated_at = NOW() WHERE full_name = 'SHIFA KHANSA AFIRA' AND class_name = '9F';
UPDATE public.students SET nisn = '0125580723', updated_at = NOW() WHERE full_name = 'SYAKIRA ALMIRA ZAHARANI' AND class_name = '9F';
UPDATE public.students SET nisn = '0127708158', updated_at = NOW() WHERE full_name = 'SYIFA CORDELIA RAFANI' AND class_name = '9F';
UPDATE public.students SET nisn = '0122901432', updated_at = NOW() WHERE full_name = 'VANESHA NOVIANATA' AND class_name = '9F';
UPDATE public.students SET nisn = '0127442757', updated_at = NOW() WHERE full_name = 'MUHAMMAD IZHAM ADRIANSYAH' AND class_name = '9F';
UPDATE public.students SET nisn = '3124538467', updated_at = NOW() WHERE full_name = 'ALMAY RAYYAN RUBY FALAH' AND class_name = '9F';
UPDATE public.students SET nisn = '0123971343', updated_at = NOW() WHERE full_name = 'AL BAIHAQI MARTIAN' AND class_name = '9F';
UPDATE public.students SET nisn = '0126291184', updated_at = NOW() WHERE full_name = 'ABDAN PARY' AND class_name = '9G';
UPDATE public.students SET nisn = '0123395587', updated_at = NOW() WHERE full_name = 'ALLONA PUTRI ZANETA' AND class_name = '9G';
UPDATE public.students SET nisn = '0125961844', updated_at = NOW() WHERE full_name = 'ANDIKA RIZKI FIRDAUS' AND class_name = '9G';
UPDATE public.students SET nisn = '0123442143', updated_at = NOW() WHERE full_name = 'ANISA RAMADANI' AND class_name = '9G';
UPDATE public.students SET nisn = '0118984552', updated_at = NOW() WHERE full_name = 'ASRA DIPA SURIYANTO' AND class_name = '9G';
UPDATE public.students SET nisn = '0118705770', updated_at = NOW() WHERE full_name = 'CHESTER ABIA RACHMAD' AND class_name = '9G';
UPDATE public.students SET nisn = '0126795110', updated_at = NOW() WHERE full_name = 'DHINA PUTRIANA' AND class_name = '9G';
UPDATE public.students SET nisn = '0129990784', updated_at = NOW() WHERE full_name = 'ELOISE MEGHAN PRANATA' AND class_name = '9G';
UPDATE public.students SET nisn = '0116455207', updated_at = NOW() WHERE full_name = 'FADHILAH AFZA NAIFA' AND class_name = '9G';
UPDATE public.students SET nisn = '0117427455', updated_at = NOW() WHERE full_name = 'FATIH ABDI BUDIMAN' AND class_name = '9G';
UPDATE public.students SET nisn = '0118963696', updated_at = NOW() WHERE full_name = 'FAZILA BELVA' AND class_name = '9G';
UPDATE public.students SET nisn = '0129687268', updated_at = NOW() WHERE full_name = 'FRISKA AFISTA AULIA' AND class_name = '9G';
UPDATE public.students SET nisn = '0123794629', updated_at = NOW() WHERE full_name = 'HAYATI NUFUS' AND class_name = '9G';
UPDATE public.students SET nisn = '0122917533', updated_at = NOW() WHERE full_name = 'JELITA ARYANTI PUTRI' AND class_name = '9G';
UPDATE public.students SET nisn = '0124374937', updated_at = NOW() WHERE full_name = 'KARUNIA EKA NINGSIH' AND class_name = '9G';
UPDATE public.students SET nisn = '0122832226', updated_at = NOW() WHERE full_name = 'KEYLA AULIA PUTRI' AND class_name = '9G';
UPDATE public.students SET nisn = '0115381344', updated_at = NOW() WHERE full_name = 'LAILATUL QOMARIAH' AND class_name = '9G';
UPDATE public.students SET nisn = '0125266213', updated_at = NOW() WHERE full_name = 'M. FEBRIYANSYAH' AND class_name = '9G';
UPDATE public.students SET nisn = '0113134833', updated_at = NOW() WHERE full_name = 'MARSHA OKTAVIA LATIFANISA' AND class_name = '9G';
UPDATE public.students SET nisn = '0128676406', updated_at = NOW() WHERE full_name = 'MICHAELA AZKIA ISLAMADINA' AND class_name = '9G';
UPDATE public.students SET nisn = '0129180890', updated_at = NOW() WHERE full_name = 'MOH IKBAR FAAD' AND class_name = '9G';
UPDATE public.students SET nisn = '0124807557', updated_at = NOW() WHERE full_name = 'MUHAMAD ADI FIRMANSYAH' AND class_name = '9G';
UPDATE public.students SET nisn = '0116011417', updated_at = NOW() WHERE full_name = 'MUHAMAD RAPAEL' AND class_name = '9G';
UPDATE public.students SET nisn = '0117128895', updated_at = NOW() WHERE full_name = 'MUHAMMAD IBNU AL-JABBAR' AND class_name = '9G';
UPDATE public.students SET nisn = '0116287409', updated_at = NOW() WHERE full_name = 'MUHAMMAD IHWANUL KARIM' AND class_name = '9G';
UPDATE public.students SET nisn = '0124889849', updated_at = NOW() WHERE full_name = 'NABIL ATHA SAKHI' AND class_name = '9G';
UPDATE public.students SET nisn = '0116456328', updated_at = NOW() WHERE full_name = 'NEYSA AYU DESTIANA' AND class_name = '9G';
UPDATE public.students SET nisn = '3121348414', updated_at = NOW() WHERE full_name = 'NIKEN APRILIANI' AND class_name = '9G';
UPDATE public.students SET nisn = '0119887036', updated_at = NOW() WHERE full_name = 'REGITA CAHYANI' AND class_name = '9G';
UPDATE public.students SET nisn = '3126826923', updated_at = NOW() WHERE full_name = 'RIZKI AL SEBASTIAN' AND class_name = '9G';
UPDATE public.students SET nisn = '0116859301', updated_at = NOW() WHERE full_name = 'RIZKI MAULANA SOPIAN' AND class_name = '9G';
UPDATE public.students SET nisn = '0123406631', updated_at = NOW() WHERE full_name = 'SANTI KURNIAWATI' AND class_name = '9G';
UPDATE public.students SET nisn = '3128699121', updated_at = NOW() WHERE full_name = 'SHAALIHUDDIN AL-AYUBI' AND class_name = '9G';
UPDATE public.students SET nisn = '3117521079', updated_at = NOW() WHERE full_name = 'SRI ULYATI' AND class_name = '9G';
UPDATE public.students SET nisn = '0129179041', updated_at = NOW() WHERE full_name = 'SYAUQI JALADARA PUTRI' AND class_name = '9G';
UPDATE public.students SET nisn = '0115266483', updated_at = NOW() WHERE full_name = 'TAHTA DHIKA SINATRIA' AND class_name = '9G';
UPDATE public.students SET nisn = '0124812866', updated_at = NOW() WHERE full_name = 'VICKY REVALKA ALKHI' AND class_name = '9G';
UPDATE public.students SET nisn = '0114653482', updated_at = NOW() WHERE full_name = 'VONDRA KASIH RIZKIA DETHAN' AND class_name = '9G';
UPDATE public.students SET nisn = '0116982436', updated_at = NOW() WHERE full_name = 'ZAHRA FITRIA SARI' AND class_name = '9G';
UPDATE public.students SET nisn = '0117841505', updated_at = NOW() WHERE full_name = 'DESTIANA SAPUTRI' AND class_name = '9G';
UPDATE public.students SET nisn = '0116203684', updated_at = NOW() WHERE full_name = 'MUHAMAD RIDO' AND class_name = '9G';
UPDATE public.students SET nisn = '0114257880', updated_at = NOW() WHERE full_name = 'ABDUL FAQRY' AND class_name = '9H';
UPDATE public.students SET nisn = '0115601261', updated_at = NOW() WHERE full_name = 'ACHMAD FARIZKY' AND class_name = '9H';
UPDATE public.students SET nisn = '0115123146', updated_at = NOW() WHERE full_name = 'AJENG PAMUNGKAS' AND class_name = '9H';
UPDATE public.students SET nisn = '0118338879', updated_at = NOW() WHERE full_name = 'ALMIRA IRGI BILQIST' AND class_name = '9H';
UPDATE public.students SET nisn = '0111779074', updated_at = NOW() WHERE full_name = 'ANDIKA GALANG RAMADHAN' AND class_name = '9H';
UPDATE public.students SET nisn = '0128422131', updated_at = NOW() WHERE full_name = 'APRILIA' AND class_name = '9H';
UPDATE public.students SET nisn = '0122980800', updated_at = NOW() WHERE full_name = 'AQILNABIGH PUTRA RAHMAN' AND class_name = '9H';
UPDATE public.students SET nisn = '0122976226', updated_at = NOW() WHERE full_name = 'ASYIFA RAMADHANI HAFID' AND class_name = '9H';
UPDATE public.students SET nisn = '3110171468', updated_at = NOW() WHERE full_name = 'CITRA FAHIRA' AND class_name = '9H';
UPDATE public.students SET nisn = '0122647056', updated_at = NOW() WHERE full_name = 'DHINI PUTRIANI' AND class_name = '9H';
UPDATE public.students SET nisn = '0121313467', updated_at = NOW() WHERE full_name = 'ELVINA REZKYA P' AND class_name = '9H';
UPDATE public.students SET nisn = '0118401282', updated_at = NOW() WHERE full_name = 'FATIMATUL ZAHRO' AND class_name = '9H';
UPDATE public.students SET nisn = '0129057761', updated_at = NOW() WHERE full_name = 'FAUZUL AMARULLAH' AND class_name = '9H';
UPDATE public.students SET nisn = '0128086971', updated_at = NOW() WHERE full_name = 'FEISYA AULIA ALMAS' AND class_name = '9H';
UPDATE public.students SET nisn = '0121029063', updated_at = NOW() WHERE full_name = 'GANESH AZALIA GAYATRI' AND class_name = '9H';
UPDATE public.students SET nisn = '0116273142', updated_at = NOW() WHERE full_name = 'KALFAN DANAR IBRAHIM' AND class_name = '9H';
UPDATE public.students SET nisn = '3128305922', updated_at = NOW() WHERE full_name = 'MANDALIKA CAHYA PUTRI' AND class_name = '9H';
UPDATE public.students SET nisn = '0123937054', updated_at = NOW() WHERE full_name = 'MERLY MUTIARA' AND class_name = '9H';
UPDATE public.students SET nisn = '0115695071', updated_at = NOW() WHERE full_name = 'MOHAMAD RAFA EMERALDIANTO' AND class_name = '9H';
UPDATE public.students SET nisn = '0129457706', updated_at = NOW() WHERE full_name = 'MUH RAFA RAMDANI' AND class_name = '9H';
UPDATE public.students SET nisn = '0117459722', updated_at = NOW() WHERE full_name = 'MUHAMAD AL GHAZALI' AND class_name = '9H';
UPDATE public.students SET nisn = '0117133193', updated_at = NOW() WHERE full_name = 'MUHAMAD FARHAN TRIDARMA' AND class_name = '9H';
UPDATE public.students SET nisn = '0121752842', updated_at = NOW() WHERE full_name = 'MUHAMAD KHA KURNIAWAN' AND class_name = '9H';
UPDATE public.students SET nisn = '0114210397', updated_at = NOW() WHERE full_name = 'MUHAMAD RAFQI RAMADHAN' AND class_name = '9H';
UPDATE public.students SET nisn = '0121312438', updated_at = NOW() WHERE full_name = 'MUHAMAD RAZKA IRSYA PRATAMA' AND class_name = '9H';
UPDATE public.students SET nisn = '3138508943', updated_at = NOW() WHERE full_name = 'MUHAMAD ZAKI ALHAFIDZ' AND class_name = '9H';
UPDATE public.students SET nisn = '0119214833', updated_at = NOW() WHERE full_name = 'MUHAMMAD RAFA SAEFUL' AND class_name = '9H';
UPDATE public.students SET nisn = '0125068493', updated_at = NOW() WHERE full_name = 'MUHAMMAD RICO ALFIAN' AND class_name = '9H';
UPDATE public.students SET nisn = '0112196130', updated_at = NOW() WHERE full_name = 'NADHIRA RAYSA SARAH' AND class_name = '9H';
UPDATE public.students SET nisn = '3118012004', updated_at = NOW() WHERE full_name = 'NAJWA ANANDA PUTRI' AND class_name = '9H';
UPDATE public.students SET nisn = '0126795093', updated_at = NOW() WHERE full_name = 'NIVA NIRVANA ZAFIRA' AND class_name = '9H';
UPDATE public.students SET nisn = '0113860611', updated_at = NOW() WHERE full_name = 'PUTRI GENDIS NOVIAUTAMI' AND class_name = '9H';
UPDATE public.students SET nisn = '0124209710', updated_at = NOW() WHERE full_name = 'RATU AURELIA ANEIRA RAIHANAH' AND class_name = '9H';
UPDATE public.students SET nisn = '0115044299', updated_at = NOW() WHERE full_name = 'RD.M SAID YUSUP' AND class_name = '9H';
UPDATE public.students SET nisn = '0112137379', updated_at = NOW() WHERE full_name = 'RENADA HANIFAH' AND class_name = '9H';
UPDATE public.students SET nisn = '3127431309', updated_at = NOW() WHERE full_name = 'RIFKI ADRIANSYAH' AND class_name = '9H';
UPDATE public.students SET nisn = '3129531251', updated_at = NOW() WHERE full_name = 'SAFIRA ANGRAENI' AND class_name = '9H';
UPDATE public.students SET nisn = '0112529516', updated_at = NOW() WHERE full_name = 'SATRIA MAULANA' AND class_name = '9H';
UPDATE public.students SET nisn = '0116193724', updated_at = NOW() WHERE full_name = 'SINTA WULAN SAPUTRI' AND class_name = '9H';
UPDATE public.students SET nisn = '0103319302', updated_at = NOW() WHERE full_name = 'SUCI DWI PURWANTI' AND class_name = '9H';
UPDATE public.students SET nisn = '0111643765', updated_at = NOW() WHERE full_name = 'TEDAS AWAN TANTULAR' AND class_name = '9H';
UPDATE public.students SET nisn = '0119330180', updated_at = NOW() WHERE full_name = 'ZAHRA SEPTIANI PUTRI' AND class_name = '9H';
