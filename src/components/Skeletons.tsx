export function EventsGridSkeleton() {
  return (
    <div aria-label="Loading events" className="space-y-8">
      <div className="h-72 w-full animate-pulse rounded-3xl bg-slate-200 dark:bg-[#151D30]" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151D30]"
          >
            <div className="aspect-[16/10] w-full animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-3 p-4">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center justify-between pt-2">
                <div className="h-5 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeatMapSkeleton() {
  return (
    <div aria-label="Loading auditorium seat map" className="space-y-6">
      <div className="h-44 w-full animate-pulse rounded-3xl bg-slate-200 dark:bg-[#151D30]" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-[520px] animate-pulse rounded-2xl bg-slate-200 dark:bg-[#151D30] lg:col-span-8" />
        <div className="h-[520px] animate-pulse rounded-2xl bg-slate-200 dark:bg-[#151D30] lg:col-span-4" />
      </div>
    </div>
  );
}

export function BookingsSkeleton() {
  return (
    <div aria-label="Loading your bookings" className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-200/70 dark:border-slate-800 dark:bg-[#151D30]"
        />
      ))}
    </div>
  );
}
