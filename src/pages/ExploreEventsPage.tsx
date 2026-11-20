import {
  Suspense,
  use,
  useMemo,
  useState,
  useTransition,
  ViewTransition,
} from 'react';
import {
  ArrowUpDown,
  Calendar,
  Clock,
  Heart,
  MapPin,
  Search,
  Share2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { seatlockApi } from '../services/api';
import { getEventsResource, invalidateEventsResource } from '../services/resources';
import type { EventCategory, EventItem } from '../types';
import { BookingStepper } from '../components/BookingStepper';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { EventPoster } from '../components/EventPoster';
import { Button } from '../components/FormControls';
import { EventsGridSkeleton } from '../components/Skeletons';

const CATEGORIES: (EventCategory | 'All')[] = [
  'All',
  'Music',
  'Technology',
  'Cultural',
  'Comedy',
  'Esports',
  'Business',
  'Dance',
];

type DateFilter = 'all' | 'this-week' | 'this-month';
type PriceFilter = 'all' | 'under-200' | '200-plus';
type SortOption = 'date-asc' | 'price-asc' | 'trending' | 'seats-desc';
type DiscoveryTab = 'all' | 'trending' | 'recommended' | 'favorites' | 'recent';

export function EventCard({
  event,
  isFavorite,
  onToggleFavorite,
  onShare,
  onSelect,
}: {
  event: EventItem;
  isFavorite: boolean;
  onToggleFavorite: (e: EventItem) => void;
  onShare: (e: EventItem) => void;
  onSelect: (e: EventItem) => void;
}) {
  const { t } = usePreferences();
  const formattedDate = new Date(event.date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <ViewTransition>
      <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6366F1]/50 hover:shadow-lg hover:shadow-[#6366F1]/10 dark:border-slate-800 dark:bg-[#151D30]">
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <EventPoster
            src={event.posterUrl}
            alt={`${event.title} event poster`}
            title={event.title}
            category={event.category}
            className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleFavorite(event)}
              aria-label={
                isFavorite
                  ? `Remove ${event.title} from favorites`
                  : `Add ${event.title} to favorites`
              }
              aria-pressed={isFavorite}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/65 text-white backdrop-blur-md transition hover:bg-slate-950/85"
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={() => onShare(event)}
              aria-label={`Share ${event.title}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/65 text-white backdrop-blur-md transition hover:bg-slate-950/85"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs font-medium text-white">
            <span>{event.category}</span>
            <span className="font-mono-num">
              {event.remainingSeats} {t.seatsLeft}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
            <span>{formattedDate}</span>
            <span aria-hidden="true">·</span>
            <span>{event.time}</span>
          </p>

          <h3 className="mt-1.5 line-clamp-1 font-heading text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
            {event.title}
          </h3>

          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#94A3B8]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6366F1]" aria-hidden="true" />
            <span className="truncate">{event.venue}</span>
          </p>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3.5 dark:border-slate-800/80">
            <div>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">From</p>
              <p className="font-mono-num text-base font-extrabold text-slate-900 dark:text-[#22D3EE]">
                ₹{event.startingPrice}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => onSelect(event)}
              aria-label={`Book Now for ${event.title}`}
            >
              {t.bookNow}
            </Button>
          </div>
        </div>
      </article>
    </ViewTransition>
  );
}

function ExploreEventsContent({ eventsPromise }: { eventsPromise: Promise<EventItem[]> }) {
  // React 19 `use()` reads the Suspense-managed event list resource
  const events = use(eventsPromise);

  const { session } = useAuth();
  const { preferences, t, toggleFavorite } = usePreferences();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<EventCategory | 'All'>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('all');

  const featuredEvent = useMemo(
    () => events.find((e) => e.featured) ?? events[0],
    [events]
  );

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    // React 19 useTransition keeps typing responsive while filtering large lists
    startTransition(() => {
      setSearchQuery(value);
    });
  };

  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    startTransition(() => {
      setter(value);
    });
  };

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();
    const twoWeeksMs = 21 * 24 * 60 * 60 * 1000;

    let list = events.filter((ev) => {
      if (activeTab === 'favorites' && !preferences.favoriteEventIds.includes(ev.id)) {
        return false;
      }
      if (activeTab === 'recent' && !preferences.recentlyViewedIds.includes(ev.id)) {
        return false;
      }
      if (activeTab === 'trending' && ev.trendingScore < 92) {
        return false;
      }
      if (
        activeTab === 'recommended' &&
        preferences.preferredCategories.length > 0 &&
        !preferences.preferredCategories.includes(ev.category)
      ) {
        return false;
      }
      if (category !== 'All' && ev.category !== category) return false;
      if (priceFilter === 'under-200' && ev.startingPrice >= 200) return false;
      if (priceFilter === '200-plus' && ev.startingPrice < 200) return false;
      if (dateFilter === 'this-week') {
        const diff = new Date(ev.date).getTime() - now;
        if (diff < 0 || diff > twoWeeksMs) return false;
      }
      if (q) {
        const haystack = `${ev.title} ${ev.category} ${ev.venue} ${ev.subtitle} ${ev.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return a.startingPrice - b.startingPrice;
      if (sortBy === 'trending') return b.trendingScore - a.trendingScore;
      if (sortBy === 'seats-desc') return b.remainingSeats - a.remainingSeats;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return list;
  }, [
    events,
    activeTab,
    category,
    dateFilter,
    priceFilter,
    searchQuery,
    sortBy,
    preferences.favoriteEventIds,
    preferences.recentlyViewedIds,
    preferences.preferredCategories,
  ]);

  const handleShare = async (event: EventItem) => {
    const shareUrl = `${window.location.origin}/events/${event.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `SEATLOCK — ${event.title}`,
          text: `${event.title} at ${event.venue} (${event.time})`,
          url: shareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        addToast({
          title: 'Event link copied',
          description: `Share link for ${event.title} copied to clipboard.`,
          variant: 'info',
        });
      }
    } catch {
      addToast({
        title: 'Link ready to share',
        description: shareUrl,
        variant: 'info',
      });
    }
  };

  const openEvent = (event: EventItem, openAi = false) => {
    navigate(openAi ? `/events/${event.id}?ai=1` : `/events/${event.id}`);
  };

  const firstName = session?.user.name.split(' ')[0] ?? 'Student';

  const tabs: { id: DiscoveryTab; label: string; count?: number }[] = [
    { id: 'all', label: t.upcomingEvents, count: events.length },
    { id: 'trending', label: t.trendingNow },
    { id: 'recommended', label: t.recommendedForYou },
    { id: 'favorites', label: t.favorites, count: preferences.favoriteEventIds.length },
    { id: 'recent', label: t.recentlyViewed, count: preferences.recentlyViewedIds.length },
  ];

  return (
    <div className="space-y-8">
      <BookingStepper currentStep={0} />

      {/* Personalized Greeting Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#4F46E5] dark:text-[#22D3EE]">
            {seatlockApi.isDemoMode
              ? `${t.demoModeLabel} · Sample University Season`
              : 'Live University Event Schedule'}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC] sm:text-3xl">
            Good evening, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-[#94A3B8]">
            Pick an event to inspect live auditorium sightlines and reserve up to 4 seats.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-[#94A3B8]">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <TrendingUp className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
            <span className="font-mono-num">{events.length} active campus events</span>
          </span>
        </div>
      </div>

      {/* Cinematic Featured Event Banner */}
      {featuredEvent && (
        <section
          aria-label="Featured campus event"
          className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[#090E1C] text-white shadow-xl dark:border-slate-800"
        >
          <div className="absolute inset-0">
            <EventPoster
              src={featuredEvent.posterUrl}
              alt={`${featuredEvent.title} featured banner`}
              title={featuredEvent.title}
              priority
              className="h-full w-full"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#090E1C]/95 via-[#090E1C]/75 to-[#090E1C]/25" />
          </div>

          <div className="relative flex flex-col justify-between gap-6 p-6 sm:p-10 lg:max-w-2xl">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-[#22D3EE]">
                FEATURED EVENT · {featuredEvent.category.toUpperCase()}
              </p>
              <h2 className="font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {featuredEvent.title}
              </h2>
              <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
                {featuredEvent.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs font-medium text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#818CF8]" aria-hidden="true" />
                  <span>
                    {new Date(featuredEvent.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#818CF8]" aria-hidden="true" />
                  <span>{featuredEvent.time}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#818CF8]" aria-hidden="true" />
                  <span>{featuredEvent.venue}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="lg"
                onClick={() => openEvent(featuredEvent, false)}
              >
                {t.exploreEvents}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={() => openEvent(featuredEvent, true)}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>{t.findSeatsWithAi}</span>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Search, Discovery Tabs & Filters */}
      <section id="catalog" aria-label="Event catalog filters" className="space-y-4">
        {/* Discovery Collection Tabs */}
        <div
          role="tablist"
          aria-label="Event collections"
          className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-[#151D30]"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleFilterChange(setActiveTab, tab.id)}
              className={`min-h-[40px] whitespace-nowrap rounded-xl px-3.5 text-xs font-semibold transition sm:text-sm ${
                activeTab === tab.id
                  ? 'bg-[#6366F1] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="font-mono-num ml-1.5 opacity-80">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Search + Date/Price/Sort Bar */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="event-search" className="sr-only">
              Search campus events
            </label>
            <input
              id="event-search"
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t.searchEventsPlaceholder}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 dark:border-slate-800 dark:bg-[#151D30] dark:text-[#F8FAFC]"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="date-filter" className="sr-only">
              Filter by date
            </label>
            <select
              id="date-filter"
              value={dateFilter}
              onChange={(e) => handleFilterChange(setDateFilter, e.target.value as DateFilter)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-[#6366F1] focus:outline-none dark:border-slate-800 dark:bg-[#151D30] dark:text-[#F8FAFC]"
            >
              <option value="all">All Dates</option>
              <option value="this-week">Next 3 Weeks</option>
              <option value="this-month">This Season</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="price-filter" className="sr-only">
              Filter by price
            </label>
            <select
              id="price-filter"
              value={priceFilter}
              onChange={(e) => handleFilterChange(setPriceFilter, e.target.value as PriceFilter)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-[#6366F1] focus:outline-none dark:border-slate-800 dark:bg-[#151D30] dark:text-[#F8FAFC]"
            >
              <option value="all">Any Price</option>
              <option value="under-200">Under ₹200</option>
              <option value="200-plus">₹200 &amp; above</option>
            </select>
          </div>

          <div className="relative md:col-span-3">
            <ArrowUpDown
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="sort-select" className="sr-only">
              Sort events
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => handleFilterChange(setSortBy, e.target.value as SortOption)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 focus:border-[#6366F1] focus:outline-none dark:border-slate-800 dark:bg-[#151D30] dark:text-[#F8FAFC]"
            >
              <option value="date-asc">Soonest Date</option>
              <option value="trending">Most Trending</option>
              <option value="price-asc">Lowest Price</option>
              <option value="seats-desc">Most Seats Available</option>
            </select>
          </div>
        </div>

        {/* Interactive Category Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Event categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={category === cat}
              onClick={() => handleFilterChange(setCategory, cat)}
              className={`min-h-[38px] whitespace-nowrap rounded-xl border px-3.5 text-xs font-semibold transition ${
                category === cat
                  ? 'border-[#6366F1] bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#22D3EE]'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-[#151D30] dark:text-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Event Grid */}
      <section aria-label="Event results" className={isPending ? 'opacity-75 transition-opacity' : ''}>
        {filteredEvents.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#151D30]">
            <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">
              No matching events found
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-[#94A3B8]">
              Try clearing your search query or switching back to all campus categories.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
                setCategory('All');
                setDateFilter('all');
                setPriceFilter('all');
                setActiveTab('all');
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isFavorite={preferences.favoriteEventIds.includes(event.id)}
                onToggleFavorite={(ev) => {
                  toggleFavorite(ev.id, ev.category);
                  addToast({
                    title: preferences.favoriteEventIds.includes(ev.id)
                      ? 'Removed from Favorites'
                      : 'Saved to Favorites',
                    description: ev.title,
                    variant: 'info',
                  });
                }}
                onShare={(ev) => void handleShare(ev)}
                onSelect={(ev) => openEvent(ev, false)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function ExploreEventsPage() {
  const [resourceKey, setResourceKey] = useState(0);
  const eventsPromise = useMemo(() => {
    void resourceKey;
    return getEventsResource();
  }, [resourceKey]);

  return (
    <>
      <title>Explore Events — SEATLOCK UI</title>
      <meta
        name="description"
        content="Discover upcoming university concerts, tech fests, summits, and cultural nights on SEATLOCK."
      />
      <ErrorBoundary
        sectionName="Explore Events"
        onRetry={() => {
          invalidateEventsResource();
          setResourceKey((k) => k + 1);
        }}
      >
        <Suspense fallback={<EventsGridSkeleton />}>
          <ExploreEventsContent eventsPromise={eventsPromise} />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
