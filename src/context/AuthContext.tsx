import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AuthSession, BookingRecord, HoldRecord, SavedLoginInfo } from '../types';

const SESSION_KEY = 'seatlock_session_v1';
const SAVED_SESSION_KEY = 'seatlock_saved_session_v1';
const SAVED_LOGIN_PROFILE_KEY = 'seatlock_saved_login_profile_v1';
const HOLD_KEY = 'seatlock_active_hold_v1';
const SAVED_TICKETS_KEY = 'seatlock_saved_offline_tickets_v1';

function loadSession(): AuthSession | null {
  try {
    const raw =
      sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SAVED_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function loadSavedLoginProfile(): SavedLoginInfo | null {
  try {
    const raw = localStorage.getItem(SAVED_LOGIN_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedLoginInfo;
  } catch {
    return null;
  }
}

function loadActiveHold(): HoldRecord | null {
  try {
    const raw = sessionStorage.getItem(HOLD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HoldRecord;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(HOLD_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function loadSavedTickets(): BookingRecord[] {
  try {
    const raw = localStorage.getItem(SAVED_TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BookingRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface SetSessionOptions {
  rememberLogin?: boolean;
}

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  savedLoginProfile: SavedLoginInfo | null;
  activeHold: HoldRecord | null;
  savedOfflineTickets: BookingRecord[];
  setSession: (session: AuthSession | null, options?: SetSessionOptions) => void;
  forgetSavedLogin: () => void;
  logout: () => void;
  setActiveHold: (hold: HoldRecord | null) => void;
  saveConfirmedTicketOffline: (booking: BookingRecord) => void;
  markOfflineTicketCancelled: (bookingId: string, updated?: Partial<BookingRecord>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(loadSession);
  const [savedLoginProfile, setSavedLoginProfile] = useState<SavedLoginInfo | null>(
    loadSavedLoginProfile
  );
  const [activeHold, setActiveHoldState] = useState<HoldRecord | null>(loadActiveHold);
  const [savedOfflineTickets, setSavedOfflineTickets] =
    useState<BookingRecord[]>(loadSavedTickets);

  const setSession = (next: AuthSession | null, options?: SetSessionOptions) => {
    setSessionState(next);
    try {
      if (next) {
        const serialized = JSON.stringify(next);
        sessionStorage.setItem(SESSION_KEY, serialized);
        if (options?.rememberLogin) {
          localStorage.setItem(SAVED_SESSION_KEY, serialized);
          const profile: SavedLoginInfo = {
            email: next.user.email,
            name: next.user.name,
            avatarInitials: next.user.avatarInitials,
            provider: next.user.provider ?? 'email',
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(SAVED_LOGIN_PROFILE_KEY, JSON.stringify(profile));
          setSavedLoginProfile(profile);
        } else {
          localStorage.removeItem(SAVED_SESSION_KEY);
        }
      } else {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SAVED_SESSION_KEY);
      }
    } catch {
      // ignore storage errors
    }
  };

  const forgetSavedLogin = () => {
    setSavedLoginProfile(null);
    try {
      localStorage.removeItem(SAVED_LOGIN_PROFILE_KEY);
      localStorage.removeItem(SAVED_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const setActiveHold = (hold: HoldRecord | null) => {
    setActiveHoldState(hold);
    try {
      if (hold) {
        sessionStorage.setItem(HOLD_KEY, JSON.stringify(hold));
      } else {
        sessionStorage.removeItem(HOLD_KEY);
      }
    } catch {
      // ignore
    }
  };

  const saveConfirmedTicketOffline = (booking: BookingRecord) => {
    setSavedOfflineTickets((prev) => {
      const next = [booking, ...prev.filter((b) => b.id !== booking.id)].slice(0, 20);
      try {
        localStorage.setItem(SAVED_TICKETS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const markOfflineTicketCancelled = (bookingId: string, updated?: Partial<BookingRecord>) => {
    setSavedOfflineTickets((prev) => {
      const next = prev.map((b) =>
        b.id === bookingId ? { ...b, ...updated, status: 'cancelled' as const } : b
      );
      try {
        localStorage.setItem(SAVED_TICKETS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const logout = () => {
    setSession(null);
    setActiveHold(null);
  };

  return (
    <AuthContext
      value={{
        session,
        isAuthenticated: Boolean(session),
        savedLoginProfile,
        activeHold,
        savedOfflineTickets,
        setSession,
        forgetSavedLogin,
        logout,
        setActiveHold,
        saveConfirmedTicketOffline,
        markOfflineTicketCancelled,
      }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
