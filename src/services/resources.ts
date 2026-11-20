import type { EventItem, EventSeatsResponse } from '../types';
import { seatlockApi } from './api';

let eventsPromise: Promise<EventItem[]> | null = null;
const eventBundleCache = new Map<
  string,
  Promise<{ event: EventItem; seatsResponse: EventSeatsResponse }>
>();

/**
 * Returns a cached Promise for React 19 `use()` + `<Suspense>` on Explore Events.
 */
export function getEventsResource(): Promise<EventItem[]> {
  if (!eventsPromise) {
    eventsPromise = seatlockApi.getEvents();
  }
  return eventsPromise;
}

export function invalidateEventsResource(): void {
  eventsPromise = null;
}

/**
 * Returns a cached Promise for React 19 `use()` + `<Suspense>` on the Event Seat Map page.
 */
export function getEventSeatMapResource(
  eventId: string
): Promise<{ event: EventItem; seatsResponse: EventSeatsResponse }> {
  const existing = eventBundleCache.get(eventId);
  if (existing) return existing;

  const created = Promise.all([
    seatlockApi.getEventById(eventId),
    seatlockApi.getEventSeats(eventId),
  ]).then(([event, seatsResponse]) => ({ event, seatsResponse }));

  eventBundleCache.set(eventId, created);
  return created;
}

export function invalidateEventSeatMapResource(eventId?: string): void {
  if (eventId) {
    eventBundleCache.delete(eventId);
  } else {
    eventBundleCache.clear();
  }
}
