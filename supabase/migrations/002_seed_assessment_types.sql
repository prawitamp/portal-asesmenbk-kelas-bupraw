-- ====================================================================
-- MIGRATION 002: SEED 7 OFFICIAL BK ASSESSMENT TYPES
-- ====================================================================

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
