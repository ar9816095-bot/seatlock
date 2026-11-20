import { Calendar, CheckCircle2, Clock, MapPin, QrCode, User } from 'lucide-react';
import type { BookingRecord } from '../types';
import { EventPoster } from './EventPoster';
import { SeatLockLogo } from './SeatLockLogo';

/**
 * Deterministic visual QR-style placeholder matrix derived from the booking ID
 * clearly labeled as a QR Code Placeholder per hackathon specification.
 */
function DeterministicQrPlaceholder({ payload }: { payload: string }) {
  const seed = payload.split('').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);
  const grid = 11;
  const cells: { x: number; y: number }[] = [];

  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const inTopLeft = x < 3 && y < 3;
      const inTopRight = x >= grid - 3 && y < 3;
      const inBottomLeft = x < 3 && y >= grid - 3;
      if (inTopLeft || inTopRight || inBottomLeft) {
        const edge =
          x === 0 ||
          y === 0 ||
          x === 2 ||
          y === 2 ||
          x === grid - 1 ||
          x === grid - 3 ||
          y === grid - 1 ||
          y === grid - 3;
        const center =
          (x === 1 && y === 1) ||
          (x === grid - 2 && y === 1) ||
          (x === 1 && y === grid - 2);
        if (edge || center) cells.push({ x, y });
      } else {
        const val = (seed + x * 19 + y * 31 + x * y * 7) % 11;
        if (val < 5) cells.push({ x, y });
      }
    }
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 dark:border-slate-700">
      <svg
        viewBox={`0 0 ${grid * 10} ${grid * 10}`}
        className="h-28 w-28"
        role="img"
        aria-label={`QR code placeholder for booking ${payload}`}
      >
        <rect width={grid * 10} height={grid * 10} fill="#FFFFFF" />
        {cells.map((c, idx) => (
          <rect
            key={idx}
            x={c.x * 10 + 1}
            y={c.y * 10 + 1}
            width="8"
            height="8"
            rx="1.5"
            fill="#090E1C"
          />
        ))}
      </svg>
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
        <QrCode className="h-3 w-3 text-[#4F46E5]" aria-hidden="true" />
        <span>QR Code Placeholder</span>
      </span>
    </div>
  );
}

export function SeatPassTicket({ booking }: { booking: BookingRecord }) {
  const formattedDate = new Date(booking.eventDate).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article
      aria-label={`SeatPass digital ticket for ${booking.eventTitle}`}
      className="print-ticket-only overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-700/70 dark:bg-[#151D30]"
    >
      {/* Gradient Header with Event Artwork */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#090E1C] via-[#1E1B4B] to-[#312E81] p-6 text-white">
        <div className="absolute inset-0 opacity-25">
          <EventPoster
            src={booking.eventPosterUrl}
            alt=""
            title={booking.eventTitle}
            className="h-full w-full"
          />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SeatLockLogo size="sm" showWordmark={false} inverted />
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">SEATPASS DIGITAL TICKET</p>
              <p className="font-mono-num text-xs text-slate-300">ID: {booking.id}</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{booking.status === 'confirmed' ? 'Confirmed Booking' : 'Cancelled'}</span>
          </div>
        </div>

        <div className="relative mt-5">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {booking.eventTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-200">
            {booking.eventCategory} · {booking.venue}
          </p>
        </div>
      </div>

      {/* Event Details Body */}
      <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-3">
        <div className="space-y-4 sm:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">Attendee</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                <User className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                <span>{booking.studentName}</span>
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">Date &amp; Time</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                <Calendar className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                <span>{formattedDate}</span>
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-600 dark:text-[#94A3B8]">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{booking.eventTime}</span>
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">Venue</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
              <MapPin className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
              <span>{booking.venue}</span>
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">Reserved Seats</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {booking.seats.map((seat) => (
                <span
                  key={seat.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#6366F1]/30 bg-[#6366F1]/10 px-3 py-1 font-mono-num text-sm font-bold text-[#4F46E5] dark:text-[#818CF8]"
                >
                  <span>{seat.id}</span>
                  <span className="text-xs font-normal text-slate-600 dark:text-slate-300">
                    ({seat.section})
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          <DeterministicQrPlaceholder payload={booking.qrPayload} />
        </div>
      </div>

      {/* Perforated Dashed Separator */}
      <div className="ticket-notch-left ticket-notch-right px-6">
        <div className="border-t-2 border-dashed border-slate-200 dark:border-slate-700" />
      </div>

      {/* Footer Totals */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/70 px-6 py-4 dark:bg-[#090E1C]/50">
        <div>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Booking Reference</p>
          <p className="font-mono-num text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
            {booking.id}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Total Confirmed Price</p>
          <p className="font-mono-num text-xl font-extrabold text-[#4F46E5] dark:text-[#22D3EE]">
            ₹{booking.totalPrice.toLocaleString('en-IN')}
          </p>
        </div>
      </div>
    </article>
  );
}

/**
 * Generates and downloads a clean standalone HTML SeatPass ticket file.
 */
export function downloadSeatPassHtml(booking: BookingRecord): void {
  const formattedDate = new Date(booking.eventDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const seatsStr = booking.seats.map((s) => `${s.id} (${s.section})`).join(', ');
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8" /><title>SeatPass — ${booking.id}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#090E1C;color:#F8FAFC;display:flex;justify-content:center;padding:40px 16px;}
  .ticket{max-width:540px;width:100%;background:#151D30;border-radius:20px;overflow:hidden;border:1px solid rgba(148,163,184,0.25);}
  .hdr{background:linear-gradient(120deg,#4F46E5,#8B5CF6);padding:24px;}
  .body{padding:24px;line-height:1.6;}
  .row{display:flex;justify-content:space-between;border-bottom:1px dashed rgba(148,163,184,0.3);padding:10px 0;}
  .mono{font-family:ui-monospace,monospace;font-weight:700;}
</style></head>
<body>
  <div class="ticket">
    <div class="hdr">
      <div style="font-size:12px;letter-spacing:1.5px;opacity:.9;">SEATLOCK · SEATPASS DIGITAL TICKET</div>
      <h1 style="margin:8px 0 4px;font-size:24px;">${booking.eventTitle}</h1>
      <div style="font-size:14px;opacity:.9;">${booking.venue}</div>
    </div>
    <div class="body">
      <div class="row"><span>Booking ID</span><span class="mono">${booking.id}</span></div>
      <div class="row"><span>Attendee</span><span>${booking.studentName}</span></div>
      <div class="row"><span>Date & Time</span><span>${formattedDate} · ${booking.eventTime}</span></div>
      <div class="row"><span>Seats</span><span class="mono">${seatsStr}</span></div>
      <div class="row"><span>Status</span><span style="color:#10B981;font-weight:700;">CONFIRMED</span></div>
      <div class="row" style="border:none;"><span>Total Price</span><span class="mono" style="font-size:18px;color:#22D3EE;">₹${booking.totalPrice}</span></div>
      <p style="margin-top:16px;font-size:12px;color:#94A3B8;text-align:center;">QR Payload (Placeholder): ${booking.qrPayload}</p>
    </div>
  </div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SeatPass-${booking.id}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
