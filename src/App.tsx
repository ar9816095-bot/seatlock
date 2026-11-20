import { useState, type ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FloatingAiAssistant } from './components/FloatingAiAssistant';
import { OfflineBanner } from './components/PWAInstallButton';
import { QuickNav } from './components/QuickNav';
import { BookingSuccessPage } from './pages/BookingSuccessPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { EventSeatMapPage } from './pages/EventSeatMapPage';
import { ExploreEventsPage } from './pages/ExploreEventsPage';
import { LoginPage } from './pages/LoginPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { OfflinePage } from './pages/OfflinePage';

function RequireStudentAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AuthenticatedAppShell() {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className="sl-app-shell flex min-h-screen flex-col bg-[#F8FAFC] text-slate-900 dark:bg-[#090E1C] dark:text-[#F8FAFC]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-[#6366F1] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <QuickNav onOpenAiAssistant={() => setAiOpen(true)} />
      <OfflineBanner />

      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
      >
        <ErrorBoundary sectionName="SEATLOCK Workspace">
          <Outlet />
        </ErrorBoundary>
      </main>

      <footer className="no-print mt-auto border-t border-slate-200/80 py-6 pb-24 text-center text-xs text-slate-500 dark:border-slate-800/80 dark:text-[#94A3B8] md:pb-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <p>SEATLOCK UI · Your Seat. Your Choice. Zero Chaos.</p>
          <p>University Event Seat-Booking Platform · WCAG 2.2 AA &amp; Offline SeatPass PWA</p>
        </div>
      </footer>

      <FloatingAiAssistant open={aiOpen} onOpenChange={setAiOpen} />
    </div>
  );
}

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/events' : '/login'} replace />;
}

export default function App() {
  return (
    <PreferencesProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ErrorBoundary sectionName="SEATLOCK Application">
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Design system route is accessible anytime (with full nav when signed in) */}
                <Route
                  element={
                    <RequireStudentAuth>
                      <AuthenticatedAppShell />
                    </RequireStudentAuth>
                  }
                >
                  <Route path="/events" element={<ExploreEventsPage />} />
                  <Route path="/events/:eventId" element={<EventSeatMapPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route
                    path="/booking-success/:bookingId"
                    element={<BookingSuccessPage />}
                  />
                  <Route path="/bookings" element={<MyBookingsPage />} />
                  <Route path="/offline" element={<OfflinePage />} />
                </Route>

                {/* /design works both signed-in and direct-link */}
                <Route path="/design" element={<DesignRouteWrapper />} />

                <Route path="*" element={<RootRedirect />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </PreferencesProvider>
  );
}

function DesignRouteWrapper() {
  const { isAuthenticated } = useAuth();
  const [aiOpen, setAiOpen] = useState(false);

  if (isAuthenticated) {
    return (
      <div className="sl-app-shell flex min-h-screen flex-col bg-[#F8FAFC] text-slate-900 dark:bg-[#090E1C] dark:text-[#F8FAFC]">
        <QuickNav onOpenAiAssistant={() => setAiOpen(true)} />
        <OfflineBanner />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <DesignSystemPage />
        </main>
        <FloatingAiAssistant open={aiOpen} onOpenChange={setAiOpen} />
      </div>
    );
  }

  return (
    <div className="sl-app-shell min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-[#090E1C] dark:text-[#F8FAFC]">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DesignSystemPage />
      </main>
    </div>
  );
}
