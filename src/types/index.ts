export type SeatStatus = 'available' | 'held' | 'booked' | 'blocked';

export type SeatSection = 'Orchestra Front' | 'Mezzanine Center' | 'Balcony';

export type HeatTier = 'budget' | 'mid' | 'premium';

export type SeatViewMode = 'availability' | 'heatmap' | 'ai';

export type EventCategory =
  | 'Music'
  | 'Technology'
  | 'Cultural'
  | 'Comedy'
  | 'Esports'
  | 'Business'
  | 'Dance';

export type ThemeMode = 'dark' | 'light' | 'system';

export type ThemePresetId =
  | 'midnight-indigo'
  | 'daylight-pearl'
  | 'emerald-forest'
  | 'royal-velvet'
  | 'sunset-ember'
  | 'nordic-sand';

export type LanguageCode = 'en' | 'hi';

export type TextSize = 'sm' | 'md' | 'lg';

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  studentId: string;
  department: string;
  avatarInitials: string;
  provider?: 'gmail' | 'email' | 'demo';
}

export interface SavedLoginInfo {
  email: string;
  name: string;
  avatarInitials: string;
  provider: 'gmail' | 'email' | 'demo';
  savedAt: string;
}

export interface AuthSession {
  token: string;
  user: StudentUser;
  mode: 'api' | 'demo';
}

export interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  category: EventCategory;
  date: string; // ISO date string
  time: string;
  venue: string;
  hall: string;
  startingPrice: number;
  maxPrice: number;
  totalSeats: number;
  remainingSeats: number;
  posterUrl: string;
  description: string;
  trendingScore: number;
  tags: string[];
  featured?: boolean;
}

export interface Seat {
  id: string; // e.g., "A1"
  row: string; // e.g., "A"
  number: number; // 1..12
  section: SeatSection;
  price: number;
  status: SeatStatus;
  isAisle: boolean;
  nearExit: boolean;
  stageDistance: number; // 1 (closest) to 10 (farthest)
  viewScore: number; // 1..100
  heldByMe?: boolean;
}

export interface EventSeatsResponse {
  eventId: string;
  updatedAt: string;
  seats: Seat[];
}

export interface HoldRecord {
  holdId: string;
  eventId: string;
  eventTitle: string;
  eventPosterUrl: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  seatIds: string[];
  seats: Seat[];
  totalPrice: number;
  createdAt: string;
  expiresAt: string;
}

export interface BookingRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  eventCategory: EventCategory;
  eventPosterUrl: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  studentName: string;
  studentEmail: string;
  seats: { id: string; section: SeatSection; price: number }[];
  totalPrice: number;
  status: 'confirmed' | 'cancelled';
  bookedAt: string;
  qrPayload: string;
  cancelledAt?: string;
  cancellationReasonCategory?: string;
  cancellationReason?: string;
  refundAmount?: number;
  refundStatus?: 'processed' | 'not_applicable';
  refundReference?: string;
}

export interface AiRecommendation {
  id: string;
  seatIds: string[];
  seats: Seat[];
  totalPrice: number;
  reason: string;
  label: string;
  isAdjacent: boolean;
  warningNote?: string;
}

export interface AiAssistResponse {
  message: string;
  recommendations: AiRecommendation[];
  source: 'api' | 'demo';
}

export interface SquadSyncCriteria {
  peopleCount: number; // 1..4
  maxBudgetPerPerson: number;
  preferredSection: SeatSection | 'Any';
  nearStage: boolean;
  bestView: boolean;
  cheapest: boolean;
  aislePreferred: boolean;
  adjacentPreferred: boolean;
}

export interface SeatConflict {
  id: string;
  originalSeat: Seat;
  alternativeSeat: Seat | null;
  detectedAt: string;
  message: string;
}

export interface AppPreferences {
  theme: ThemeMode;
  themePreset: ThemePresetId;
  customBgColor: string | null;
  borderRadiusPx: number;
  language: LanguageCode;
  highContrast: boolean;
  textSize: TextSize;
  reducedMotion: boolean;
  favoriteEventIds: string[];
  recentlyViewedIds: string[];
  preferredCategories: EventCategory[];
}

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}
