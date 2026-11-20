import { useState } from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePreferences } from '../context/PreferencesContext';
import { AccessibleModal } from './AccessibleModal';
import { Button } from './FormControls';

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void install()}
        aria-label="Install SEATLOCK App"
        className="shrink-0"
      >
        <Download className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
        {!compact && <span>Install App</span>}
      </Button>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install SEATLOCK on iOS"
        >
          <Smartphone className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
          {!compact && <span>Install App</span>}
        </Button>

        <AccessibleModal
          open={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Install SEATLOCK on iPhone / iPad"
          description="Add SEATLOCK to your home screen for standalone access and offline SeatPass tickets."
        >
          <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <li>1. Tap the <strong>Share</strong> button in Safari&apos;s toolbar.</li>
            <li>2. Scroll down and select <strong>Add to Home Screen</strong>.</li>
            <li>3. Tap <strong>Add</strong> to launch SEATLOCK like a native app.</li>
          </ol>
          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={() => setShowIOSGuide(false)}>
              Got it
            </Button>
          </div>
        </AccessibleModal>
      </>
    );
  }

  return null;
}

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { t } = usePreferences();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="no-print border-b border-amber-500/30 bg-amber-500/15 px-4 py-2.5 text-amber-900 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs font-medium sm:text-sm">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t.offlineBanner}</span>
        </div>
        <Link
          to="/offline"
          className="font-semibold underline underline-offset-4 hover:opacity-80"
        >
          Saved Tickets
        </Link>
      </div>
    </div>
  );
}
