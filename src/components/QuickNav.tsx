import { useState } from 'react';
import {
  CalendarDays,
  Compass,
  Globe,
  Home,
  LogOut,
  Moon,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Ticket,
  User,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { seatlockApi } from '../services/api';
import { AccessPlusDrawer } from './AccessPlusDrawer';
import { PWAInstallButton } from './PWAInstallButton';
import { SeatLockLogo } from './SeatLockLogo';

interface QuickNavProps {
  onOpenAiAssistant: () => void;
}

export function QuickNav({ onOpenAiAssistant }: QuickNavProps) {
  const { session, logout } = useAuth();
  const { preferences, resolvedTheme, t, toggleTheme, setLanguage } = usePreferences();
  const [profileOpen, setProfileOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    setProfileOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors pb-0.5 ${
      isActive
        ? 'text-[#4F46E5] dark:text-[#818CF8] border-b-2 border-[#6366F1]'
        : 'text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
    }`;

  return (
    <>
      {/* Desktop & Mobile Top Header */}
      <header className="no-print sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#090E1C]/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:gap-8 lg:px-8">
          {/* Zone 1: Brand Wordmark */}
          <Link
            to="/events"
            aria-label="SEATLOCK Home"
            className="flex items-center whitespace-nowrap shrink-0 focus-visible:rounded-lg"
          >
            <SeatLockLogo size="sm" />
          </Link>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-6 md:flex"
          >
            <NavLink to="/events" end className={navLinkClass}>
              {t.navHome}
            </NavLink>
            <NavLink
              to="/events#catalog"
              className={() =>
                `whitespace-nowrap shrink-0 text-sm font-medium transition-colors pb-0.5 ${
                  location.pathname.startsWith('/events') && location.hash === '#catalog'
                    ? 'text-[#4F46E5] dark:text-[#818CF8] border-b-2 border-[#6366F1]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
                }`
              }
            >
              {t.navEvents}
            </NavLink>
            <NavLink to="/bookings" className={navLinkClass}>
              {t.navBookings}
            </NavLink>
            <button
              type="button"
              onClick={onOpenAiAssistant}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 text-sm font-medium text-slate-600 transition-colors hover:text-[#4F46E5] dark:text-[#94A3B8] dark:hover:text-[#22D3EE]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#8B5CF6]" aria-hidden="true" />
              <span>{t.navAiAssist}</span>
            </button>
            <NavLink to="/design" className={navLinkClass}>
              {t.navDesign}
            </NavLink>
          </nav>

          {/* Zone 3: Quick utility controls & Student profile */}
          <div className="flex items-center gap-1.5 shrink-0 sm:gap-2">
            <PWAInstallButton compact />

            <button
              type="button"
              onClick={() => setLanguage(preferences.language === 'en' ? 'hi' : 'en')}
              aria-label={
                preferences.language === 'en' ? 'Switch language to Hindi' : 'Switch language to English'
              }
              title={preferences.language === 'en' ? 'हिन्दी' : 'English'}
              className="flex h-10 min-w-[40px] items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              <span className="uppercase">{preferences.language}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setAccessOpen(true)}
              aria-label="Open Theme Studio and accessibility settings"
              title="Themes, Background Colour, Border Radius & Access+"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
            >
              <Palette className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-label="Student profile menu"
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-sm font-semibold text-slate-900 transition hover:border-[#6366F1]/50 dark:border-slate-700/80 dark:bg-[#151D30] dark:text-[#F8FAFC]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#6366F1] text-xs font-bold text-white">
                  {session?.user.avatarInitials ?? 'ST'}
                </span>
                <span className="hidden max-w-[110px] truncate lg:inline">
                  {session?.user.name.split(' ')[0] ?? t.navProfile}
                </span>
              </button>

              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden="true"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700/80 dark:bg-[#151D30]"
                  >
                    <div className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                        {session?.user.name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-[#94A3B8]">
                        {session?.user.email}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-[#4F46E5] dark:text-[#22D3EE]">
                        {session?.user.studentId} ·{' '}
                        {seatlockApi.isDemoMode ? t.demoModeLabel : 'Organizer API'}
                      </p>
                    </div>

                    <div className="mt-1 space-y-0.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileOpen(false);
                          setAccessOpen(true);
                        }}
                        className="flex min-h-[42px] w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <SlidersHorizontal className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                        <span>{t.accessPlusTitle}</span>
                      </button>

                      <Link
                        to="/design"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="flex min-h-[42px] w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Palette className="h-4 w-4 text-[#8B5CF6]" aria-hidden="true" />
                        <span>{t.navDesign}</span>
                      </Link>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className="flex min-h-[42px] w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        <span>{t.signOut}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Bottom Tab Bar (<= 64px height to respect 15% mobile sticky cap) */}
      <nav
        aria-label="Mobile navigation"
        className="no-print fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#090E1C]/95 md:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-center px-1">
          <NavLink
            to="/events"
            end
            className={({ isActive }) =>
              `flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium ${
                isActive
                  ? 'text-[#4F46E5] dark:text-[#818CF8]'
                  : 'text-slate-500 dark:text-[#94A3B8]'
              }`
            }
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            <span className="truncate">{t.navHome}</span>
          </NavLink>

          <Link
            to="/events#catalog"
            className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium ${
              location.pathname.startsWith('/events/')
                ? 'text-[#4F46E5] dark:text-[#818CF8]'
                : 'text-slate-500 dark:text-[#94A3B8]'
            }`}
          >
            <Compass className="h-5 w-5" aria-hidden="true" />
            <span className="truncate">Events</span>
          </Link>

          <button
            type="button"
            onClick={onOpenAiAssistant}
            className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium text-[#6366F1] dark:text-[#22D3EE]"
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            <span className="truncate">AI Assist</span>
          </button>

          <NavLink
            to="/bookings"
            className={({ isActive }) =>
              `flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium ${
                isActive
                  ? 'text-[#4F46E5] dark:text-[#818CF8]'
                  : 'text-slate-500 dark:text-[#94A3B8]'
              }`
            }
          >
            <Ticket className="h-5 w-5" aria-hidden="true" />
            <span className="truncate">Bookings</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setAccessOpen(true)}
            className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium text-slate-500 dark:text-[#94A3B8]"
          >
            <User className="h-5 w-5" aria-hidden="true" />
            <span className="truncate">{t.navProfile}</span>
          </button>
        </div>
      </nav>

      <AccessPlusDrawer open={accessOpen} onClose={() => setAccessOpen(false)} />
    </>
  );
}

export function MobileCalendarIcon() {
  return <CalendarDays className="h-4 w-4" aria-hidden="true" />;
}
