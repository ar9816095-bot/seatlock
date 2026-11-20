import { Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Button } from '../components/FormControls';
import { SeatPassTicket } from '../components/SeatPassTicket';

export function OfflinePage() {
  const { savedOfflineTickets } = useAuth();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <title>Offline Tickets — SEATLOCK UI</title>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-[#151D30]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
          {isOnline ? (
            <Wifi className="h-6 w-6 text-emerald-500" aria-hidden="true" />
          ) : (
            <WifiOff className="h-6 w-6" aria-hidden="true" />
          )}
        </div>
        <h1 className="mt-4 font-heading text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
          {isOnline ? 'Connection Restored' : 'Offline Mode — Saved SeatPass Vault'}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600 dark:text-[#94A3B8]">
          {isOnline
            ? 'You are back online. Live auditorium availability and seat booking are fully active.'
            : 'New bookings and live seat map updates require connectivity. Cached seat maps are never treated as live availability, while your confirmed SeatPass tickets below stay ready for gate entry.'}
        </p>
        {isOnline && (
          <div className="mt-4">
            <Button type="button" onClick={() => navigate('/events')}>
              Return to Live Events
            </Button>
          </div>
        )}
      </section>

      {savedOfflineTickets.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-[#151D30] dark:text-[#94A3B8]">
          No confirmed tickets saved on this device yet. Confirmed bookings automatically save here
          for offline gate viewing.
        </div>
      ) : (
        <div className="space-y-6">
          {savedOfflineTickets.map((ticket) => (
            <SeatPassTicket key={ticket.id} booking={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
