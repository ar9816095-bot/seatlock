import { useActionState, useRef, useState } from 'react';
import {
  ArrowRight,
  BookmarkCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Moon,
  Palette,
  ShieldCheck,
  Sparkles,
  Sun,
  Ticket,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AccessPlusDrawer } from '../components/AccessPlusDrawer';
import { AccessibleModal } from '../components/AccessibleModal';
import { EventPoster } from '../components/EventPoster';
import { Button, InputField, SubmitButton } from '../components/FormControls';
import { SeatLockLogo } from '../components/SeatLockLogo';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { LOGIN_HERO_IMAGE } from '../data/demoEvents';
import { ApiError, seatlockApi } from '../services/api';
import type { AuthSession } from '../types';
import {
  evaluatePasswordStrength,
  extractNameFromEmail,
  getInitialsFromName,
  isGmailAddress,
  isValidEmail,
} from '../utils/authHelpers';

type AuthMode = 'signin' | 'create';

interface LoginActionState {
  error?: string;
  errorCode?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}

function GmailMark({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.29v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.3a7.18 7.18 0 0 1 0-4.6V6.6H1.29a12 12 0 0 0 0 10.8l3.99-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.94 1.19 15.23 0 12 0 7.31 0 3.26 2.69 1.29 6.6l3.99 3.1c.95-2.84 3.6-4.95 6.72-4.95z"
      />
    </svg>
  );
}

export function LoginPage() {
  const { isAuthenticated, savedLoginProfile, setSession, forgetSavedLogin } = useAuth();
  const { resolvedTheme, t, toggleTheme } = usePreferences();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingSession, setPendingSession] = useState<AuthSession | null>(null);
  const [resumingSaved, setResumingSaved] = useState(false);
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);

  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const trimmedEmail = email.trim();
  const emailValid = isValidEmail(trimmedEmail);
  const isGmail = isGmailAddress(trimmedEmail);
  const derivedName = emailValid
    ? trimmedEmail.toLowerCase() === 'student@seatlock.edu'
      ? 'Aarav Sharma'
      : extractNameFromEmail(trimmedEmail)
    : '';
  const derivedInitials = derivedName ? getInitialsFromName(derivedName) : '';
  const hasExistingCustomPassword = emailValid && seatlockApi.hasRegisteredAccount(trimmedEmail);
  const passwordStrength = evaluatePasswordStrength(password);

  const [actionState, formAction] = useActionState<LoginActionState, FormData>(
    async (_prevState, formData) => {
      const submittedMode = (String(formData.get('mode') ?? 'signin') as AuthMode);
      const submittedEmail = String(formData.get('email') ?? '').trim();
      const submittedPassword = String(formData.get('password') ?? '');
      const submittedConfirm = String(formData.get('confirmPassword') ?? '');

      const fieldErrors: LoginActionState['fieldErrors'] = {};
      if (!submittedEmail) {
        fieldErrors.email = 'Please enter your Gmail or university email ID.';
      } else if (!isValidEmail(submittedEmail)) {
        fieldErrors.email = 'Enter a valid email address (e.g. akash.rana@gmail.com).';
      }

      if (!submittedPassword) {
        fieldErrors.password =
          submittedMode === 'create'
            ? 'Please create your own password.'
            : 'Please enter your password.';
      } else if (submittedPassword.length < 6) {
        fieldErrors.password = 'Password must be at least 6 characters.';
      }

      if (submittedMode === 'create') {
        if (!submittedConfirm) {
          fieldErrors.confirmPassword = 'Please confirm your password.';
        } else if (submittedConfirm !== submittedPassword) {
          fieldErrors.confirmPassword = 'Passwords do not match.';
        }
      }

      if (fieldErrors.email || fieldErrors.password || fieldErrors.confirmPassword) {
        return { fieldErrors };
      }

      try {
        const nextSession =
          submittedMode === 'create'
            ? await seatlockApi.register(submittedEmail, submittedPassword)
            : await seatlockApi.login(submittedEmail, submittedPassword);

        // Open the explicit "Save login info?" choice modal before navigating
        setPendingSession(nextSession);
        return {};
      } catch (err) {
        if (err instanceof ApiError) {
          return { error: err.message, errorCode: err.code };
        }
        return { error: 'Unable to continue right now. Please try again.' };
      }
    },
    {}
  );

  if (isAuthenticated) {
    return <Navigate to="/events" replace />;
  }

  const handleSaveChoice = (rememberLogin: boolean) => {
    if (!pendingSession) return;
    const firstName = pendingSession.user.name.split(' ')[0];
    setSession(pendingSession, { rememberLogin });
    setPendingSession(null);
    addToast({
      title: `Welcome, ${firstName}!`,
      description: rememberLogin
        ? 'Login info saved on this device for faster sign-in.'
        : 'Signed in for this session only (login info not saved).',
      variant: 'success',
    });
    navigate('/events', { replace: true });
  };

  const handleQuickGmailConnect = () => {
    const clean = email.trim();
    if (!clean) {
      setEmail('');
      emailInputRef.current?.focus();
      addToast({
        title: 'Connect with your Gmail ID',
        description: 'Enter your @gmail.com address — your display name is detected automatically.',
        variant: 'info',
      });
      return;
    }
    if (!clean.includes('@')) {
      setEmail(`${clean}@gmail.com`);
      passwordInputRef.current?.focus();
    } else if (!isGmailAddress(clean)) {
      const localPart = clean.split('@')[0];
      setEmail(`${localPart}@gmail.com`);
      passwordInputRef.current?.focus();
    } else {
      passwordInputRef.current?.focus();
    }
  };

  const handleResumeSavedAccount = async () => {
    if (!savedLoginProfile || resumingSaved) return;
    setResumingSaved(true);
    try {
      const resumed = await seatlockApi.resumeSavedProfile(
        savedLoginProfile.email,
        savedLoginProfile.name,
        savedLoginProfile.provider
      );
      setSession(resumed, { rememberLogin: true });
      addToast({
        title: `Welcome back, ${resumed.user.name.split(' ')[0]}!`,
        description: `Signed in using saved ${resumed.user.provider === 'gmail' ? 'Gmail' : 'account'} login info.`,
        variant: 'success',
      });
      navigate('/events', { replace: true });
    } finally {
      setResumingSaved(false);
    }
  };

  const handleForgetSaved = () => {
    forgetSavedLogin();
    addToast({
      title: 'Saved login removed',
      description: 'Your login info has been cleared from this device.',
      variant: 'info',
    });
  };

  const fillDemoCredentials = () => {
    setMode('signin');
    setEmail('student@seatlock.edu');
    setPassword('seatlock2026');
    setConfirmPassword('');
    emailInputRef.current?.focus();
  };

  const strengthBarColors = [
    'bg-slate-200 dark:bg-slate-700',
    'bg-red-500',
    'bg-amber-500',
    'bg-indigo-500',
    'bg-emerald-500',
  ];

  return (
    <div className="sl-app-shell min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-[#090E1C] dark:text-[#F8FAFC]">
      {/* React 19 native document metadata hoisted from component */}
      <title>{mode === 'create' ? 'Create Account — SEATLOCK UI' : 'Sign In — SEATLOCK UI'}</title>
      <meta
        name="description"
        content="Sign in or create your SEATLOCK student password using your Gmail or university email."
      />

      <div className="grid min-h-screen grid-cols-1 items-stretch lg:grid-cols-12">
        {/* Left Section: Brand Showcase & Editorial Auditorium Photography */}
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#090E1C] p-6 text-white sm:p-10 lg:col-span-7 lg:p-14">
          <div className="absolute inset-0">
            <EventPoster
              src={LOGIN_HERO_IMAGE}
              alt="Modern university concert auditorium with warm timber acoustics and tiered indigo seating"
              title="SEATLOCK Auditorium"
              priority
              className="h-full w-full opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#090E1C] via-[#090E1C]/80 to-[#312E81]/40" />
          </div>

          <div className="relative flex items-center justify-between gap-4">
            <SeatLockLogo size="md" inverted />
            <span className="text-xs font-medium text-slate-300">
              {seatlockApi.isDemoMode ? 'Local Demo Environment' : 'Campus Organizer API'}
            </span>
          </div>

          <div className="relative my-10 max-w-xl space-y-6 lg:my-0">
            <p className="text-sm font-semibold tracking-wide text-[#22D3EE]">
              {t.brandTagline}
            </p>
            <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              Reserve campus seats with zero chaos.
            </h1>
            <p className="text-base leading-relaxed text-slate-300">
              Connect with your Gmail or campus email, create your own secure password, inspect live
              auditorium sightlines, and let SeatSense AI recommend ideal seats for your squad.
            </p>

            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#151D30]/75 p-4 backdrop-blur-md">
                <Sparkles className="h-5 w-5 text-[#22D3EE]" aria-hidden="true" />
                <h2 className="mt-2.5 text-sm font-bold text-white">SeatSense AI</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  English &amp; Hindi voice or text recommendations matched to your budget.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#151D30]/75 p-4 backdrop-blur-md">
                <ShieldCheck className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
                <h2 className="mt-2.5 text-sm font-bold text-white">SeatShield</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Instant nearby alternatives if another student grabs your seat first.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#151D30]/75 p-4 backdrop-blur-md">
                <Ticket className="h-5 w-5 text-[#818CF8]" aria-hidden="true" />
                <h2 className="mt-2.5 text-sm font-bold text-white">5-Min Lock &amp; Pass</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Server-timed checkout holds and offline-ready digital SeatPass tickets.
                </p>
              </div>
            </div>
          </div>

          <p className="relative text-xs text-slate-400">
            SEATLOCK University Portal · WCAG 2.2 AA Keyboard Accessible · Offline PWA Ready
          </p>
        </section>

        {/* Right Section: Student Login / Create Password Form */}
        <main className="flex flex-col justify-between p-6 sm:p-10 lg:col-span-5 lg:p-14">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setThemeDrawerOpen(true)}
              aria-label="Open Theme Studio and Border Radius settings"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#151D30] dark:text-slate-200"
            >
              <Palette className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
              <span>Themes</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#151D30] dark:text-slate-200"
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>

          <div className="mx-auto my-auto w-full max-w-md py-6">
            {/* Saved Login Info Quick-Continue Card (shown only if user previously opted to save) */}
            {savedLoginProfile && (
              <div className="mb-6 rounded-2xl border border-[#6366F1]/35 bg-[#6366F1]/5 p-4 dark:bg-[#151D30]">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#4F46E5] uppercase dark:text-[#818CF8]">
                    <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Saved Login Info
                  </span>
                  <button
                    type="button"
                    onClick={handleForgetSaved}
                    aria-label="Remove saved login info"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-red-500/10 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Forget</span>
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-xs font-bold text-white">
                      {savedLoginProfile.avatarInitials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                        {savedLoginProfile.name}
                      </p>
                      <p className="flex items-center gap-1.5 truncate text-xs text-slate-600 dark:text-[#94A3B8]">
                        {savedLoginProfile.provider === 'gmail' && <GmailMark className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{savedLoginProfile.email}</span>
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleResumeSavedAccount}
                    disabled={resumingSaved}
                    className="shrink-0"
                  >
                    {resumingSaved ? 'Signing in...' : 'Continue'}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                {mode === 'create' ? 'Create Your Account' : t.welcomeBack}
              </h2>
              <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
                {mode === 'create'
                  ? 'Enter your Gmail or email ID and create your own password. Your profile name is pulled automatically from your email.'
                  : 'Sign in with your Gmail or campus email ID to explore events and reserve seats.'}
              </p>
            </div>

            {/* Mode Switcher: Sign In vs Create Password */}
            <div
              role="tablist"
              aria-label="Authentication mode"
              className="mt-5 grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-[#151D30]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                onClick={() => {
                  setMode('signin');
                  setConfirmPassword('');
                }}
                className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${
                  mode === 'signin'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-[#6366F1] dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-white'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'create'}
                onClick={() => setMode('create')}
                className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${
                  mode === 'create'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-[#6366F1] dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-white'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Create Password</span>
              </button>
            </div>

            {actionState.error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-sm font-medium text-red-700 dark:text-red-300"
              >
                <p>{actionState.error}</p>
                {actionState.errorCode === 'ACCOUNT_EXISTS' && (
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold underline underline-offset-2"
                  >
                    Switch to Sign In
                  </button>
                )}
              </div>
            )}

            <form action={formAction} noValidate className="mt-5 space-y-4">
              <input type="hidden" name="mode" value={mode} />

              <div className="space-y-2">
                <InputField
                  ref={emailInputRef}
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  label="Email ID (Connect via Gmail)"
                  placeholder="akash.rana@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={actionState.fieldErrors?.email}
                  required
                  endAdornment={
                    !isGmail ? (
                      <button
                        type="button"
                        onClick={handleQuickGmailConnect}
                        title="Connect using @gmail.com"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-700 transition hover:border-[#6366F1]/50 hover:bg-white dark:border-slate-700 dark:bg-[#090E1C] dark:text-slate-200"
                      >
                        <GmailMark className="h-3.5 w-3.5" />
                        <span>@gmail</span>
                      </button>
                    ) : (
                      <span
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-500/15 px-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
                        title="Gmail address detected"
                      >
                        <GmailMark className="h-3.5 w-3.5" />
                        <span>Gmail</span>
                      </span>
                    )
                  }
                />

                {/* Live Name-from-Email / Gmail Profile Preview */}
                {emailValid && derivedName && (
                  <div
                    aria-live="polite"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-[#151D30]"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#22D3EE] text-[11px] font-bold text-white">
                        {derivedInitials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-500 dark:text-[#94A3B8]">
                          {isGmail ? 'Name from Gmail ID' : 'Name from Email ID'}
                        </p>
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                          {derivedName}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {hasExistingCustomPassword && mode === 'signin' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#6366F1]/15 px-2 py-0.5 text-[11px] font-semibold text-[#4F46E5] dark:text-[#818CF8]">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Saved account
                        </span>
                      )}
                      {isGmail && !hasExistingCustomPassword && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <Mail className="h-3 w-3" aria-hidden="true" />
                          Gmail ready
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <InputField
                  ref={passwordInputRef}
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                  label={mode === 'create' ? 'Create Your Own Password' : t.passwordLabel}
                  placeholder={
                    mode === 'create' ? 'Create a password (min. 6 characters)' : 'Enter your password'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={actionState.fieldErrors?.password}
                  required
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                {mode === 'create' && password.length > 0 && (
                  <div className="space-y-1.5 px-0.5">
                    <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                      {[1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className={`h-1.5 rounded-full transition-colors ${
                            passwordStrength.score >= step
                              ? strengthBarColors[passwordStrength.score]
                              : strengthBarColors[0]
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 dark:text-[#94A3B8]">
                      Password strength:{' '}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {passwordStrength.label}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {mode === 'create' && (
                <InputField
                  id="login-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={actionState.fieldErrors?.confirmPassword}
                  required
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                />
              )}

              <SubmitButton
                pendingLabel={mode === 'create' ? 'Creating Account...' : t.signingIn}
                className="w-full"
              >
                <span>{mode === 'create' ? 'Create Account & Continue' : t.signIn}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </SubmitButton>
            </form>

            {seatlockApi.isDemoMode && mode === 'signin' && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#151D30]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                      Demo Student Account
                    </p>
                    <p className="font-mono-num mt-0.5 text-xs text-slate-600 dark:text-[#94A3B8]">
                      student@seatlock.edu · seatlock2026
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fillDemoCredentials}
                    className="min-h-[38px] rounded-xl border border-[#6366F1]/40 bg-[#6366F1]/10 px-3 text-xs font-semibold text-[#4F46E5] transition hover:bg-[#6366F1]/20 dark:text-[#818CF8]"
                  >
                    Auto-fill
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-[#94A3B8]">
                  Or switch to <span className="font-semibold text-slate-700 dark:text-slate-200">Create Password</span> to sign up with your own Gmail ID and custom password.
                </p>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-slate-500 dark:text-[#94A3B8]">
            Protected campus authentication · Passwords are never stored in plaintext
          </p>
        </main>
      </div>

      {/* Explicit "Save login info?" Confirmation Modal */}
      <AccessibleModal
        open={Boolean(pendingSession)}
        onClose={() => setPendingSession(null)}
        title="Save your login info?"
        description="Choose whether SEATLOCK should remember your account on this device for future visits."
        maxWidthClass="max-w-md"
      >
        {pendingSession && (
          <div className="space-y-5">
            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#090E1C]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-sm font-bold text-white">
                {pendingSession.user.avatarInitials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                  {pendingSession.user.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-600 dark:text-[#94A3B8]">
                  {pendingSession.user.provider === 'gmail' && (
                    <GmailMark className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{pendingSession.user.email}</span>
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-[#94A3B8]">
              If you choose <strong className="text-slate-900 dark:text-white">Save Login Info</strong>,
              your account stays signed in across reloads and appears as a one-click card on the
              login screen. You can remove it anytime.
            </p>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button
                type="button"
                variant="primary"
                onClick={() => handleSaveChoice(true)}
                className="flex-1"
              >
                <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
                <span>Save Login Info</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSaveChoice(false)}
                className="flex-1"
              >
                <span>Don&apos;t Save</span>
              </Button>
            </div>
          </div>
        )}
      </AccessibleModal>

      <AccessPlusDrawer open={themeDrawerOpen} onClose={() => setThemeDrawerOpen(false)} />
    </div>
  );
}
