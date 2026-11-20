import type { LanguageCode } from '../types';

export interface TranslationDictionary {
  brandTagline: string;
  navHome: string;
  navEvents: string;
  navBookings: string;
  navAiAssist: string;
  navDesign: string;
  navProfile: string;
  signIn: string;
  signOut: string;
  welcomeBack: string;
  emailLabel: string;
  passwordLabel: string;
  signingIn: string;
  demoModeLabel: string;
  exploreEvents: string;
  findSeatsWithAi: string;
  searchEventsPlaceholder: string;
  upcomingEvents: string;
  trendingNow: string;
  recommendedForYou: string;
  favorites: string;
  recentlyViewed: string;
  bookNow: string;
  viewEvent: string;
  seatsLeft: string;
  stageLabel: string;
  availabilityView: string;
  priceHeatmap: string;
  aiRecommendedView: string;
  selectedSeats: string;
  clearSelection: string;
  holdSeats: string;
  holdingSeats: string;
  maxFourSeatsTitle: string;
  maxFourSeatsDesc: string;
  unavailableSeatDesc: string;
  checkoutTitle: string;
  reservationTimer: string;
  oneMinuteWarning: string;
  confirmBooking: string;
  confirmingBooking: string;
  cancelHold: string;
  backToMap: string;
  bookingSuccessful: string;
  downloadTicket: string;
  printTicket: string;
  addToCalendar: string;
  viewMyBookings: string;
  exploreMoreEvents: string;
  myBookingsTitle: string;
  upcomingTab: string;
  pastTab: string;
  viewTicket: string;
  cancelBooking: string;
  cancelConfirmTitle: string;
  cancelConfirmBody: string;
  keepBooking: string;
  confirmCancel: string;
  offlineBanner: string;
  offlineBookingDisabled: string;
  accessPlusTitle: string;
  languageLabel: string;
  themeLabel: string;
  highContrastLabel: string;
  textSizeLabel: string;
  reducedMotionLabel: string;
  stepDiscover: string;
  stepSelect: string;
  stepCheckout: string;
  stepTicket: string;
  aiAssistantTitle: string;
  aiDisclaimer: string;
  useTheseSeats: string;
  regenerate: string;
  refine: string;
  squadSyncTitle: string;
  seatShieldTitle: string;
  switchToAlternative: string;
}

const en: TranslationDictionary = {
  brandTagline: 'Your Seat. Your Choice. Zero Chaos.',
  navHome: 'Home',
  navEvents: 'Explore Events',
  navBookings: 'My Bookings',
  navAiAssist: 'AI Assistant',
  navDesign: 'Design System',
  navProfile: 'Profile',
  signIn: 'Sign In',
  signOut: 'Sign Out',
  welcomeBack: 'Welcome Back',
  emailLabel: 'University Email',
  passwordLabel: 'Password',
  signingIn: 'Signing In...',
  demoModeLabel: 'Local Demo Mode',
  exploreEvents: 'Explore Events',
  findSeatsWithAi: 'Find Seats with AI',
  searchEventsPlaceholder: 'Search concerts, summits, venues, or categories...',
  upcomingEvents: 'Upcoming Events',
  trendingNow: 'Trending on Campus',
  recommendedForYou: 'Recommended for You',
  favorites: 'Saved Favorites',
  recentlyViewed: 'Recently Viewed',
  bookNow: 'Book Now',
  viewEvent: 'View Event',
  seatsLeft: 'seats left',
  stageLabel: 'MAIN STAGE',
  availabilityView: 'Seat Availability View',
  priceHeatmap: 'Price Heatmap',
  aiRecommendedView: 'AI Recommended View',
  selectedSeats: 'Selected Seats',
  clearSelection: 'Clear Selection',
  holdSeats: 'Hold Seats',
  holdingSeats: 'Holding Seats...',
  maxFourSeatsTitle: 'Maximum 4 seats allowed',
  maxFourSeatsDesc: 'Each student can hold up to 4 seats per booking to ensure fair campus access.',
  unavailableSeatDesc: 'This seat is currently unavailable and cannot be selected.',
  checkoutTitle: 'Checkout & Seat Reservation',
  reservationTimer: 'Reservation expires in',
  oneMinuteWarning: 'Less than 1 minute remaining! Confirm now to keep your seats.',
  confirmBooking: 'Confirm Booking',
  confirmingBooking: 'Confirming Booking...',
  cancelHold: 'Cancel',
  backToMap: 'Back to Seat Map',
  bookingSuccessful: 'Booking Successful',
  downloadTicket: 'Download Ticket',
  printTicket: 'Print Ticket',
  addToCalendar: 'Add to Calendar',
  viewMyBookings: 'View My Bookings',
  exploreMoreEvents: 'Explore More Events',
  myBookingsTitle: 'My Bookings',
  upcomingTab: 'Upcoming Bookings',
  pastTab: 'Past Bookings',
  viewTicket: 'View Ticket',
  cancelBooking: 'Cancel Booking',
  cancelConfirmTitle: 'Cancel this booking?',
  cancelConfirmBody: 'Your reserved seats will be released back to other students immediately. This action cannot be undone.',
  keepBooking: 'Keep Booking',
  confirmCancel: 'Yes, Cancel Booking',
  offlineBanner: 'You are offline. Booking actions are paused — saved SeatPass tickets remain available.',
  offlineBookingDisabled: 'Reconnect to the internet to hold or confirm seats.',
  accessPlusTitle: 'AccessPlus Preferences',
  languageLabel: 'Language',
  themeLabel: 'Appearance',
  highContrastLabel: 'High-Contrast Mode',
  textSizeLabel: 'Text Size',
  reducedMotionLabel: 'Reduced Motion',
  stepDiscover: 'Discover Event',
  stepSelect: 'Select Seats',
  stepCheckout: 'Checkout',
  stepTicket: 'Ticket',
  aiAssistantTitle: 'SeatSense AI',
  aiDisclaimer: 'AI-generated recommendation · Review seats before applying',
  useTheseSeats: 'Use These Seats',
  regenerate: 'Regenerate',
  refine: 'Refine Recommendation',
  squadSyncTitle: 'SquadSync Group Finder',
  seatShieldTitle: 'SeatShield Conflict Recovery',
  switchToAlternative: 'Switch to Alternative',
};

const hi: TranslationDictionary = {
  brandTagline: 'आपकी सीट। आपकी पसंद। ज़ीरो केओस।',
  navHome: 'होम',
  navEvents: 'इवेंट्स देखें',
  navBookings: 'मेरी बुकिंग्स',
  navAiAssist: 'AI सहायक',
  navDesign: 'डिज़ाइन सिस्टम',
  navProfile: 'प्रोफ़ाइल',
  signIn: 'साइन इन करें',
  signOut: 'साइन आउट',
  welcomeBack: 'वापसी पर स्वागत है',
  emailLabel: 'यूनिवर्सिटी ईमेल',
  passwordLabel: 'पासवर्ड',
  signingIn: 'साइन इन हो रहा है...',
  demoModeLabel: 'लोकल डेमो मोड',
  exploreEvents: 'इवेंट्स देखें',
  findSeatsWithAi: 'AI से सीट खोजें',
  searchEventsPlaceholder: 'इवेंट, वेन्यू या श्रेणी खोजें...',
  upcomingEvents: 'आगामी इवेंट्स',
  trendingNow: 'कैंपस में ट्रेंडिंग',
  recommendedForYou: 'आपके लिए सुझाव',
  favorites: 'पसंदीदा इवेंट्स',
  recentlyViewed: 'हाल ही में देखे गए',
  bookNow: 'अभी बुक करें',
  viewEvent: 'इवेंट देखें',
  seatsLeft: 'सीटें बाकी',
  stageLabel: 'मुख्य मंच (STAGE)',
  availabilityView: 'सीट उपलब्धता दृश्य',
  priceHeatmap: 'कीमत हीटमैप',
  aiRecommendedView: 'AI अनुशंसित दृश्य',
  selectedSeats: 'चयनित सीटें',
  clearSelection: 'चयन साफ़ करें',
  holdSeats: 'सीटें होल्ड करें',
  holdingSeats: 'सीटें होल्ड हो रही हैं...',
  maxFourSeatsTitle: 'अधिकतम 4 सीटें अनुमत हैं',
  maxFourSeatsDesc: 'प्रत्येक छात्र एक बुकिंग में अधिकतम 4 सीटें ही होल्ड कर सकता है।',
  unavailableSeatDesc: 'यह सीट उपलब्ध नहीं है और इसे चुना नहीं जा सकता।',
  checkoutTitle: 'चेकआउट और सीट आरक्षण',
  reservationTimer: 'आरक्षण समाप्त होने में समय',
  oneMinuteWarning: '1 मिनट से कम समय बचा है! अपनी सीटें सुरक्षित रखने के लिए अभी पुष्टि करें।',
  confirmBooking: 'बुकिंग की पुष्टि करें',
  confirmingBooking: 'बुकिंग की पुष्टि हो रही है...',
  cancelHold: 'रद्द करें',
  backToMap: 'सीट मैप पर वापस जाएं',
  bookingSuccessful: 'बुकिंग सफल रही',
  downloadTicket: 'टिकट डाउनलोड करें',
  printTicket: 'टिकट प्रिंट करें',
  addToCalendar: 'कैलेंडर में जोड़ें',
  viewMyBookings: 'मेरी बुकिंग्स देखें',
  exploreMoreEvents: 'और इवेंट्स देखें',
  myBookingsTitle: 'मेरी बुकिंग्स',
  upcomingTab: 'आगामी बुकिंग्स',
  pastTab: 'पुरानी बुकिंग्स',
  viewTicket: 'टिकट देखें',
  cancelBooking: 'बुकिंग रद्द करें',
  cancelConfirmTitle: 'क्या आप यह बुकिंग रद्द करना चाहते हैं?',
  cancelConfirmBody: 'आपकी आरक्षित सीटें तुरंत अन्य छात्रों के लिए उपलब्ध हो जाएंगी। यह क्रिया पूर्ववत नहीं की जा सकती।',
  keepBooking: 'बुकिंग रखें',
  confirmCancel: 'हाँ, बुकिंग रद्द करें',
  offlineBanner: 'आप ऑफ़लाइन हैं। नई बुकिंग रुकी हुई है — सहेजे गए SeatPass टिकट उपलब्ध हैं।',
  offlineBookingDisabled: 'सीट होल्ड या बुक करने के लिए इंटरनेट से जुड़ें।',
  accessPlusTitle: 'AccessPlus प्राथमिकताएँ',
  languageLabel: 'भाषा',
  themeLabel: 'थीम',
  highContrastLabel: 'हाई-कॉन्ट्रास्ट मोड',
  textSizeLabel: 'टेक्स्ट का आकार',
  reducedMotionLabel: 'कम एनीमेशन मोड',
  stepDiscover: 'इवेंट चुनें',
  stepSelect: 'सीट चुनें',
  stepCheckout: 'चेकआउट',
  stepTicket: 'टिकट',
  aiAssistantTitle: 'SeatSense AI',
  aiDisclaimer: 'AI द्वारा सुझाया गया · चुनने से पहले सीटें जांचें',
  useTheseSeats: 'ये सीटें चुनें',
  regenerate: 'नया सुझाव',
  refine: 'सुझाव सुधारें',
  squadSyncTitle: 'SquadSync ग्रुप फ़ाइंडर',
  seatShieldTitle: 'SeatShield विकल्प सहायता',
  switchToAlternative: 'इस विकल्प पर स्विच करें',
};

export const translations: Record<LanguageCode, TranslationDictionary> = { en, hi };

export function getDictionary(lang: LanguageCode): TranslationDictionary {
  return translations[lang] ?? en;
}
