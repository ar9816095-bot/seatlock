import type { BookingRecord, EventItem, Seat, SeatSection, SeatStatus } from '../types';

export const LOGIN_HERO_IMAGE = '/src/assets/images/login_auditorium_hero_1795154855607.jpg';

export const DEMO_EVENTS: EventItem[] = [
  {
    id: 'evt-music-fest',
    title: 'Music Festival — Echoes Live',
    subtitle: 'Indie bands, orchestral fusion, and sunset acoustic sets under the stars',
    category: 'Music',
    date: '2026-12-05T18:30:00.000Z',
    time: '6:30 PM IST',
    venue: 'Central Open-Air Amphitheater',
    hall: 'Main Bowl · Gate 2',
    startingPrice: 220,
    maxPrice: 520,
    totalSeats: 108,
    remainingSeats: 74,
    posterUrl: '/src/assets/images/event_music_festival_1795154865596.jpg',
    description:
      'Campus flagship twilight concert featuring student ensembles and national indie headliners with studio-grade acoustics and tiered sightlines.',
    trendingScore: 98,
    tags: ['Live Bands', 'Outdoor', 'Flagship'],
    featured: true,
  },
  {
    id: 'evt-ai-summit',
    title: 'AI Innovation Summit',
    subtitle: 'Applied foundation models, robotics keynotes, and live research demos',
    category: 'Technology',
    date: '2026-12-08T10:00:00.000Z',
    time: '10:00 AM IST',
    venue: 'Turing Lecture Auditorium',
    hall: 'Grand Hall A',
    startingPrice: 180,
    maxPrice: 450,
    totalSeats: 108,
    remainingSeats: 62,
    posterUrl: '/src/assets/images/event_ai_summit_1795154865304.jpg',
    description:
      'Full-day symposium bringing together university AI labs, systems engineers, and founders for technical deep-dives and live architecture showcases.',
    trendingScore: 95,
    tags: ['Keynote', 'AI Labs', 'Certification'],
  },
  {
    id: 'evt-tech-fest',
    title: 'University Tech Fest',
    subtitle: 'Autonomous robotics arena, precision hardware demos, and build-off finals',
    category: 'Technology',
    date: '2026-12-11T14:00:00.000Z',
    time: '2:00 PM IST',
    venue: 'Innovation Atrium & Expo Hall',
    hall: 'Pavilion West',
    startingPrice: 150,
    maxPrice: 380,
    totalSeats: 108,
    remainingSeats: 81,
    posterUrl: '/src/assets/images/event_tech_fest_1795154864377.jpg',
    description:
      'Annual engineering exposition highlighting student-built rovers, embedded hardware, and live hackathon pitch demonstrations.',
    trendingScore: 91,
    tags: ['Robotics', 'Hardware', 'Expo'],
  },
  {
    id: 'evt-cultural-night',
    title: 'Cultural Night — Kala Utsav',
    subtitle: 'Classical ensembles, contemporary theatre, and heritage showcases',
    category: 'Cultural',
    date: '2026-12-14T19:00:00.000Z',
    time: '7:00 PM IST',
    venue: 'Convocation Grand Theater',
    hall: 'Auditorium 1',
    startingPrice: 200,
    maxPrice: 480,
    totalSeats: 108,
    remainingSeats: 58,
    posterUrl: '/src/assets/images/event_cultural_night_1795154864441.jpg',
    description:
      'An evening celebrating campus cultural societies with live percussion, dramatic choreography, and curated lighting design.',
    trendingScore: 94,
    tags: ['Theatre', 'Music', 'Heritage'],
  },
  {
    id: 'evt-standup-comedy',
    title: 'Stand-Up Comedy Night',
    subtitle: 'Unfiltered campus observational comedy and touring headliner sets',
    category: 'Comedy',
    date: '2026-12-17T20:00:00.000Z',
    time: '8:00 PM IST',
    venue: 'Blackbox Studio Theatre',
    hall: 'Stage B',
    startingPrice: 160,
    maxPrice: 360,
    totalSeats: 108,
    remainingSeats: 43,
    posterUrl: '/src/assets/images/event_standup_comedy_1795154863855.jpg',
    description:
      'Intimate late-evening comedy lineup with sharp storytelling, improv crowd work, and front-row acoustic clarity.',
    trendingScore: 96,
    tags: ['Headliner', 'Intimate', 'Evening'],
  },
  {
    id: 'evt-gaming-tournament',
    title: 'Gaming Tournament — Apex Collegiate',
    subtitle: 'Inter-university tactical arena finals with live commentary casters',
    category: 'Esports',
    date: '2026-12-20T16:00:00.000Z',
    time: '4:00 PM IST',
    venue: 'Sports & Esports Arena',
    hall: 'Center Court',
    startingPrice: 140,
    maxPrice: 340,
    totalSeats: 108,
    remainingSeats: 69,
    posterUrl: '/src/assets/images/event_gaming_esports_1795154865832.jpg',
    description:
      'Championship bracket showdown projected on dual 4K panoramic stage displays with surround sound and live tactical analysis.',
    trendingScore: 93,
    tags: ['Esports', 'Finals', 'Live Cast'],
  },
  {
    id: 'evt-entrepreneur-summit',
    title: 'Entrepreneur Summit',
    subtitle: 'Founder fireside chats, venture office hours, and campus seed pitches',
    category: 'Business',
    date: '2026-12-23T11:30:00.000Z',
    time: '11:30 AM IST',
    venue: 'School of Management Amphitheater',
    hall: 'Leadership Hall',
    startingPrice: 190,
    maxPrice: 440,
    totalSeats: 108,
    remainingSeats: 77,
    posterUrl: '/src/assets/images/event_entrepreneur_summit_1795154866615.jpg',
    description:
      'Candid conversations with alumni founders and early-stage operators covering product-market fit, bootstrapping, and scaling student ventures.',
    trendingScore: 87,
    tags: ['Founders', 'Fireside', 'Networking'],
  },
  {
    id: 'evt-dance-festival',
    title: 'Dance Festival — Kinetic Pulse',
    subtitle: 'Contemporary choreography, street crew battles, and solo showcases',
    category: 'Dance',
    date: '2026-12-27T18:00:00.000Z',
    time: '6:00 PM IST',
    venue: 'Performing Arts Pavilion',
    hall: 'Main Stage',
    startingPrice: 170,
    maxPrice: 410,
    totalSeats: 108,
    remainingSeats: 65,
    posterUrl: '/src/assets/images/event_dance_festival_1795154864649.jpg',
    description:
      'High-energy inter-collegiate choreography showcase blending modern contemporary movement, lighting sculpture, and crew face-offs.',
    trendingScore: 90,
    tags: ['Choreography', 'Crews', 'Live'],
  },
];

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const;
const SEATS_PER_ROW = 12;

/**
 * Deterministically generates a 108-seat auditorium layout for any event
 * with 3 pricing sections (Orchestra Front, Mezzanine Center, Balcony),
 * a center aisle between seats 6 and 7, and realistic mixed availability.
 */
export function generateAuditoriumSeats(event: EventItem): Seat[] {
  const seed = event.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const midPrice = Math.round((event.startingPrice + event.maxPrice) / 2 / 10) * 10;
  const seats: Seat[] = [];

  ROWS.forEach((row, rowIdx) => {
    const section: SeatSection =
      rowIdx < 3 ? 'Orchestra Front' : rowIdx < 6 ? 'Mezzanine Center' : 'Balcony';
    const price =
      section === 'Orchestra Front'
        ? event.maxPrice
        : section === 'Mezzanine Center'
          ? midPrice
          : event.startingPrice;

    for (let num = 1; num <= SEATS_PER_ROW; num++) {
      const hash = (seed * 31 + rowIdx * 17 + num * 13) % 100;
      let status: SeatStatus = 'available';

      // Keep a balanced realistic mix of booked, held, and blocked seats while leaving plenty available
      if (row === 'I' && (num === 1 || num === 12)) {
        status = 'blocked';
      } else if (row === 'E' && (num === 1 || num === 12) && seed % 2 === 0) {
        status = 'blocked';
      } else if (hash < 18) {
        status = 'booked';
      } else if (hash >= 18 && hash < 26) {
        status = 'held';
      }

      // Guarantee several prime front & mid seats are always available for demos
      if ((row === 'B' && num >= 3 && num <= 6) || (row === 'D' && num >= 3 && num <= 6) || (row === 'G' && num >= 2 && num <= 5)) {
        status = 'available';
      }

      const centerOffset = Math.abs(num - 6.5);
      const rowViewBase = 98 - rowIdx * 4.2;
      const viewScore = Math.max(55, Math.min(99, Math.round(rowViewBase - centerOffset * 2.6)));

      seats.push({
        id: `${row}${num}`,
        row,
        number: num,
        section,
        price,
        status,
        isAisle: num === 1 || num === 6 || num === 7 || num === 12,
        nearExit: num === 1 || num === 12 || rowIdx === ROWS.length - 1,
        stageDistance: rowIdx + 1,
        viewScore,
      });
    }
  });

  return seats;
}

export const INITIAL_DEMO_BOOKINGS: BookingRecord[] = [
  {
    id: 'SL-2026-5920',
    eventId: 'evt-music-fest',
    eventTitle: 'Music Festival — Echoes Live',
    eventCategory: 'Music',
    eventPosterUrl: '/src/assets/images/event_music_festival_1795154865596.jpg',
    eventDate: '2026-12-05T18:30:00.000Z',
    eventTime: '6:30 PM IST',
    venue: 'Central Open-Air Amphitheater',
    studentName: 'Campus Student',
    studentEmail: 'student@seatlock.edu',
    seats: [
      { id: 'D4', section: 'Mezzanine Center', price: 370 },
      { id: 'D5', section: 'Mezzanine Center', price: 370 },
    ],
    totalPrice: 740,
    status: 'confirmed',
    // Booked 18 minutes ago so the 2-hour free cancellation & refund option is immediately active
    bookedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    qrPayload: 'SEATLOCK|SL-2026-5920|evt-music-fest|D4,D5',
  },
  {
    id: 'SL-2026-4810',
    eventId: 'evt-standup-comedy',
    eventTitle: 'Stand-Up Comedy Night',
    eventCategory: 'Comedy',
    eventPosterUrl: '/src/assets/images/event_standup_comedy_1795154863855.jpg',
    eventDate: '2026-12-17T20:00:00.000Z',
    eventTime: '8:00 PM IST',
    venue: 'Blackbox Studio Theatre',
    studentName: 'Campus Student',
    studentEmail: 'student@seatlock.edu',
    seats: [
      { id: 'C5', section: 'Orchestra Front', price: 360 },
      { id: 'C6', section: 'Orchestra Front', price: 360 },
    ],
    totalPrice: 720,
    status: 'confirmed',
    // Booked 5 hours ago so users can also see the expired 2-hour window enforcement
    bookedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    qrPayload: 'SEATLOCK|SL-2026-4810|evt-standup-comedy|C5,C6',
  },
];
