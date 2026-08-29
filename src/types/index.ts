export type ClassName = '7E' | '7F' | '9E' | '9F' | '9G' | '9H';

export interface StudentProfile {
  fullName: string;
  className: ClassName | string;
  schoolYear: string;
}

export type AssessmentSlug =
  | 'biodata-siswa'
  | 'gaya-belajar'
  | 'kecerdasan-majemuk'
  | 'minat-bakat'
  | 'jenis-kepribadian'
  | 'kartu-sosiometri'
  | 'laporan-bdi';

export interface AssessmentItem {
  slug: AssessmentSlug | string;
  name: string;
  sortOrder: number;
  isAvailable: boolean;
}

export interface AuthSuccessPayload {
  token: string;
  expiresAt: number; // Unix timestamp in seconds
  student: StudentProfile;
  assessments: AssessmentItem[];
}

export interface DownloadResponse {
  downloadUrl: string;
  filename: string;
  expiresIn: number;
}

export interface ApiError {
  error: string;
  retryAfterSeconds?: number;
}
