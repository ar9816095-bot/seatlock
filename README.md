# SEATLOCK UI

**Tagline:** *Your Seat. Your Choice. Zero Chaos.*

SEATLOCK is a frontend-only, AI-powered university event seat-booking Progressive Web App (PWA) built with **React 19**, **TypeScript strict mode**, **React Compiler**, **React Router**, and **Tailwind CSS v4**.

---

## 1. Strict Booking Workflow

```
Student Login (/login)
  ↓
Explore Events (/events)
  ↓
Interactive Seat Map (/events/:eventId)
  ↓
Checkout — 5-Minute Seat Reservation (/checkout)
  ↓
Booking Successful — Digital SeatPass Ticket (/booking-success/:bookingId)
  ↓
My Bookings (/bookings)
```

Plus compulsory Design System route (`/design`) and Offline SeatPass Vault (`/offline`).

---

## 2. Installation & Local Development

```bash
npm install
npm run dev
```

### Environment Variables (`.env`)

Copy `.env.example` to `.env`:

- `VITE_API_BASE_URL` — Base URL of the organizer-provided Mock API. Leave blank to run in **Explicitly Labeled Local Demo Mode** (all 8 campus events, interactive auditorium seat maps, simulated concurrent SeatShield conflicts, temporary 5-minute holds, and English/Hindi SeatSense AI parsing).
- `VITE_FORCE_DEMO_MODE` — Set to `"true"` to explicitly force Local Demo Mode.

Demo student credentials in Local Demo Mode:
- **Email:** `student@seatlock.edu`
- **Password:** `seatlock2026` (enter `wrongpassword` to test inline incorrect-password handling)

### Running Unit Tests & Production Build

```bash
npx --yes tsx --test src/utils/seatLogic.test.ts
npm run lint
npm run build
```

---

## 3. Mandatory React 19 Features — Implementation Mapping

| React 19 Feature | Exact File Location | Purpose |
| :--- | :--- | :--- |
| **`useActionState`** | `src/pages/LoginPage.tsx`, `src/pages/EventSeatMapPage.tsx`, `src/pages/CheckoutPage.tsx` | Student login submission, explicit `POST /events/:id/hold`, and `POST /holds/:id/confirm` |
| **`useFormStatus`** | `src/components/FormControls.tsx` (`SubmitButton`) | Live pending spinner & disabled state inside Login, Hold Seats, and Confirm Booking forms |
| **`useOptimistic`** | `src/pages/EventSeatMapPage.tsx`, `src/pages/MyBookingsPage.tsx` | Instant optimistic seat selection and optimistic booking cancellation with automatic rollback on API failure |
| **`Suspense` + `use()`** | `src/pages/ExploreEventsPage.tsx`, `src/pages/EventSeatMapPage.tsx`, `src/services/resources.ts` | Declarative loading of event catalogs and interactive seat maps with skeleton fallbacks |
| **Error Boundaries** | `src/components/ErrorBoundary.tsx`, used in `App.tsx`, `ExploreEventsPage.tsx`, `EventSeatMapPage.tsx` | Isolates runtime/API failures with user-friendly Retry actions |
| **`useTransition`** | `src/pages/ExploreEventsPage.tsx` | Keeps search input and category/date/price/sort filters responsive |
| **React `ViewTransition`** | `src/pages/ExploreEventsPage.tsx` (`EventCard`), `src/components/seatmap/AuditoriumSeatMap.tsx` | Smooth native transitions for event cards and auditorium seat-state updates |
| **React Compiler** | `vite.config.ts` (`babel-plugin-react-compiler`) | Enabled at build time via `@vitejs/plugin-react` Babel plugin pipeline |
| **Ref as a normal prop** | `src/components/FormControls.tsx` (`Button`, `InputField`), `src/components/AccessibleModal.tsx` | Passes `ref` directly without legacy `forwardRef` wrappers |
| **Context as Provider** | `src/context/AuthContext.tsx`, `src/context/PreferencesContext.tsx`, `src/context/ToastContext.tsx` | Renders `<Context value={...}>` directly |
| **Component Metadata** | All page components (`<title>` and `<meta name="description">`) | Native React 19 document metadata hoisting |
| **TypeScript Strict Mode** | `tsconfig.json` (`"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`) | Zero `any` types across the codebase |

---

## 4. Key Architecture & Design Decisions

- **Midnight Indigo Premium & Daylight Light Mode**: Uses `#090E1C` canvas, `#151D30` cards, `#6366F1` primary, `#8B5CF6` secondary, `#22D3EE` accent with `Plus Jakarta Sans` headings, `Inter` body prose, and `JetBrains Mono` tabular figures. Respects OS `prefers-color-scheme` on first visit and persists choice via `localStorage`.
- **WCAG 2.2 AA & Keyboard-Only Booking**: Every auditorium seat meets the `44 × 44px` minimum hit target, pairs color with explicit icons/patterns, supports Arrow-key grid traversal + `Space`/`Enter` selection, and wraps modals in focus-trapping `AccessibleModal` dialogs.
- **Tab-Sleep-Safe 5-Minute Hold Timer**: `computeRemainingHoldTime` computes remaining milliseconds directly from the server `expiresAt` ISO timestamp rather than decrementing a fragile local counter.
- **PWA Safety Boundaries**: Workbox caches static shell assets and fonts for standalone installability and offline viewing of saved **SeatPass** tickets, while strictly enforcing `NetworkOnly` on `/auth`, `/seats`, `/hold`, `/holds`, and `/ai/assist` so stale availability or credentials are never cached.

---

## 5. Deployment (Vercel / Netlify)

- **Vercel**: Pre-configured with `vercel.json` (SPA fallback rewrites & fresh Service Worker headers). Run `vercel --prod`.
- **Netlify**: Pre-configured with `netlify.toml` (`npm run build`, publish `dist`, SPA redirect).

---

## 6. Eight-Minute Hackathon Demonstration Plan

1. **0:00–1:00 — Student Login & First Impression (`/login`)**: Show split-screen editorial design, toggle light/dark mode, test wrong password (`wrongpassword`) inline error, then click **Auto-fill** and sign in (`useActionState` + `useFormStatus`).
2. **1:00–2:15 — Personalized Event Dashboard (`/events`)**: Highlight personalized greeting, featured banner, instant search/filter (`useTransition`), category chips, Favorites, and Share. Click **Music Festival — Echoes Live**.
3. **2:15–3:45 — Interactive Auditorium Seat Map & SeatHeat (`/events/evt-music-fest`)**: Demonstrate 44×44px seats, keyboard Arrow-key + Space selection, 4-seat maximum guard, Zoom controls, and switching between **Seat Availability**, **Price Heatmap** (Budget/Mid-range/Premium), and **AI Recommended** views.
4. **3:45–5:00 — SeatSense AI, VoiceSeat & SquadSync**: Run a Hindi or English query (e.g., `"Mujhe stage ke paas do seats chahiye"`), show VoiceSeat waveform/fallback, inspect violet-highlighted recommendation card, and click **Use These Seats**. Open **SquadSync** to demonstrate group adjacency search.
5. **5:00–5:45 — SeatShield Conflict Recovery**: Click **Test SeatShield** while seats are selected. Show only the taken seat removed while valid seats stay selected, side-by-side comparison, and click **Switch to Alternative**.
6. **5:45–6:45 — Checkout & 5-Minute Hold (`/checkout`)**: Click **Hold Seats** -> inspect animated server-timestamp countdown ring -> click **Confirm Booking**.
7. **6:45–7:30 — Digital SeatPass Ticket & My Bookings (`/booking-success/:id`, `/bookings`)**: Reveal animated checkmark + SeatPass ticket with QR placeholder, demonstrate **Download Ticket** & **Add to Calendar (.ics)**, then visit **My Bookings** and test optimistic cancellation with confirmation dialog.
8. **7:30–8:00 — AccessPlus, PWA & Design System (`/design`)**: Open **AccessPlus** to toggle Hindi language + High-Contrast mode, show `/design` token library, and highlight installable PWA & offline SeatPass support.
