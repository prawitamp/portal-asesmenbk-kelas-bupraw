import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { StudentProfile, AssessmentItem } from '../types';
import { verifyStudentLogin, getAssessmentDownloadUrl } from '../services/api';

interface AuthContextType {
  student: StudentProfile | null;
  assessments: AssessmentItem[];
  isAuthenticated: boolean;
  isLoading: boolean;
  downloadingSlug: string | null;
  error: string | null;
  sessionRemainingSeconds: number;
  login: (nisn: string) => Promise<void>;
  logout: () => void;
  downloadAssessment: (slug: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'bk_portal_session_data';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [sessionRemainingSeconds, setSessionRemainingSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [downloadingSlug, setDownloadingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    setToken(null);
    setStudent(null);
    setAssessments([]);
    setExpiresAt(null);
    setSessionRemainingSeconds(0);
    setError(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Restore session from sessionStorage if still valid
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = Math.floor(Date.now() / 1000);
        if (parsed.expiresAt && parsed.expiresAt > now && parsed.token && parsed.student) {
          setToken(parsed.token);
          setStudent(parsed.student);
          setAssessments(parsed.assessments || []);
          setExpiresAt(parsed.expiresAt);
          setSessionRemainingSeconds(parsed.expiresAt - now);
        } else {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  // Session countdown and auto-logout timer
  useEffect(() => {
    if (!expiresAt || !token) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        clearInterval(interval);
        logout();
        setError('Sesi Anda telah kedaluwarsa demi keamanan. Silakan masukkan NISN kembali.');
      } else {
        setSessionRemainingSeconds(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, token, logout]);

  const login = async (nisn: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await verifyStudentLogin(nisn);
      setToken(result.token);
      setStudent(result.student);
      setAssessments(result.assessments);
      setExpiresAt(result.expiresAt);
      setSessionRemainingSeconds(result.expiresAt - Math.floor(Date.now() / 1000));

      // Save short-lived token and student info in sessionStorage
      try {
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            token: result.token,
            expiresAt: result.expiresAt,
            student: result.student,
            assessments: result.assessments,
          })
        );
      } catch {
        // ignore
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat verifikasi NISN.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAssessment = async (slug: string) => {
    if (!token) {
      setError('Sesi tidak valid. Silakan login kembali.');
      return;
    }

    setDownloadingSlug(slug);
    try {
      const result = await getAssessmentDownloadUrl(token, slug);

      // Trigger safe download
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.setAttribute('download', result.filename);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message || 'Gagal mengunduh dokumen hasil asesmen.');
    } finally {
      setDownloadingSlug(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        student,
        assessments,
        isAuthenticated: !!token && !!student,
        isLoading,
        downloadingSlug,
        error,
        sessionRemainingSeconds,
        login,
        logout,
        downloadAssessment,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
