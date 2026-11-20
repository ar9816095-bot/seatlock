import {
  Ban,
  Check,
  Clock,
  RotateCcw,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  useMemo,
  useRef,
  useState,
  ViewTransition,
  type KeyboardEvent,
  type TouchEvent,
} from 'react';
import { usePreferences } from '../../context/PreferencesContext';
import type { Seat, SeatViewMode } from '../../types';
import {
  computePriceTierThresholds,
  getSeatHeatTier,
} from '../../utils/seatLogic';

interface AuditoriumSeatMapProps {
  seats: Seat[];
  selectedSeatIds: string[];
  aiRecommendedIds: string[];
  conflictedSeatIds: string[];
  viewMode: SeatViewMode;
  onToggleSeat: (seat: Seat) => void;
}

const ROWS_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export function AuditoriumSeatMap({
  seats,
  selectedSeatIds,
  aiRecommendedIds,
  conflictedSeatIds,
  viewMode,
  onToggleSeat,
}: AuditoriumSeatMapProps) {
  const { t } = usePreferences();
  const [zoom, setZoom] = useState(1);
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const seatRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const thresholds = useMemo(() => computePriceTierThresholds(seats), [seats]);
  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);
  const aiSet = useMemo(() => new Set(aiRecommendedIds), [aiRecommendedIds]);
  const conflictSet = useMemo(() => new Set(conflictedSeatIds), [conflictedSeatIds]);

  const rowsGrouped = useMemo(() => {
    const map = new Map<string, Seat[]>();
    for (const seat of seats) {
      const arr = map.get(seat.row) ?? [];
      arr.push(seat);
      map.set(seat.row, arr);
    }
    return ROWS_ORDER.filter((r) => map.has(r)).map((row) => ({
      row,
      section: map.get(row)![0].section,
      seats: [...map.get(row)!].sort((a, b) => a.number - b.number),
    }));
  }, [seats]);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const nextZoom = Math.min(
        1.5,
        Math.max(0.75, pinchStartZoomRef.current * (dist / pinchStartDistRef.current))
      );
      setZoom(Number(nextZoom.toFixed(2)));
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  const handleSeatKeyDown = (e: KeyboardEvent<HTMLButtonElement>, seat: Seat) => {
    const rowIdx = ROWS_ORDER.indexOf(seat.row);
    let nextRow = rowIdx;
    let nextNum = seat.number;

    if (e.key === 'ArrowRight') nextNum = Math.min(12, seat.number + 1);
    else if (e.key === 'ArrowLeft') nextNum = Math.max(1, seat.number - 1);
    else if (e.key === 'ArrowDown') nextRow = Math.min(rowsGrouped.length - 1, rowIdx + 1);
    else if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIdx - 1);
    else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggleSeat(seat);
      return;
    } else {
      return;
    }

    e.preventDefault();
    const targetId = `${ROWS_ORDER[nextRow]}${nextNum}`;
    const btn = seatRefs.current.get(targetId);
    if (btn) {
      btn.focus();
      const found = seats.find((s) => s.id === targetId);
      if (found) setHoveredSeat(found);
    }
  };

  const getSeatVisuals = (seat: Seat) => {
    const isSelected = selectedSet.has(seat.id);
    const isAi = aiSet.has(seat.id);
    const isConflict = conflictSet.has(seat.id);
    const tier = getSeatHeatTier(seat.price, thresholds);

    if (isConflict) {
      return {
        classes:
          'border-2 border-red-500 bg-red-500/25 text-red-700 dark:text-red-200 ring-2 ring-red-500/40',
        statusText: 'Conflict — Taken',
        icon: <X className="h-3 w-3" aria-hidden="true" />,
      };
    }

    if (isSelected) {
      return {
        classes:
          'border-2 border-[#6366F1] bg-[#6366F1] text-white shadow-sm shadow-[#6366F1]/40',
        statusText: 'Selected',
        icon: <Check className="h-3.5 w-3.5" aria-hidden="true" />,
      };
    }

    if (seat.status === 'booked') {
      return {
        classes:
          'border border-[#EF4444]/60 bg-[#EF4444]/15 text-[#DC2626] dark:text-red-300 cursor-not-allowed opacity-80',
        statusText: 'Booked',
        icon: <X className="h-3 w-3" aria-hidden="true" />,
      };
    }

    if (seat.status === 'held') {
      return {
        classes:
          'border border-[#F59E0B]/70 bg-[#F59E0B]/15 text-[#B45309] dark:text-amber-300 cursor-not-allowed opacity-90',
        statusText: 'Held by another student',
        icon: <Clock className="h-3 w-3" aria-hidden="true" />,
      };
    }

    if (seat.status === 'blocked') {
      return {
        classes:
          'border border-slate-400/50 bg-slate-300/40 text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-500 cursor-not-allowed opacity-70',
        statusText: 'Blocked',
        icon: <Ban className="h-3 w-3" aria-hidden="true" />,
      };
    }

    // Available seat styles per SeatHeat mode
    const aiOutline = isAi ? 'ring-2 ring-[#8B5CF6] ring-offset-2 ring-offset-white dark:ring-offset-[#151D30]' : '';
    const aiDim = viewMode === 'ai' && aiSet.size > 0 && !isAi ? 'opacity-40' : '';

    if (viewMode === 'heatmap') {
      if (tier === 'budget') {
        return {
          classes: `border border-cyan-500/80 bg-cyan-500/15 text-cyan-900 hover:bg-cyan-500/25 dark:text-cyan-200 ${aiOutline}`,
          statusText: 'Available · Budget Tier',
          icon: null,
        };
      }
      if (tier === 'mid') {
        return {
          classes: `border border-indigo-500/80 bg-indigo-500/15 text-indigo-900 hover:bg-indigo-500/25 dark:text-indigo-200 ${aiOutline}`,
          statusText: 'Available · Mid-range Tier',
          icon: null,
        };
      }
      return {
        classes: `border border-violet-500/80 bg-violet-500/20 text-violet-900 hover:bg-violet-500/30 dark:text-violet-200 ${aiOutline}`,
        statusText: 'Available · Premium Tier',
        icon: null,
      };
    }

    return {
      classes: `border border-[#10B981]/80 bg-[#10B981]/15 text-emerald-900 hover:bg-[#10B981]/25 dark:text-emerald-200 ${aiOutline} ${aiDim}`,
      statusText: isAi ? 'Available · AI Recommended' : 'Available',
      icon: isAi ? <Sparkles className="h-3 w-3 text-[#8B5CF6] dark:text-[#C4B5FD]" aria-hidden="true" /> : null,
    };
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: Zoom Controls & Active Seat Tooltip Readout */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          aria-live="polite"
          className="min-h-[38px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-[#090E1C] dark:text-slate-300"
        >
          {hoveredSeat ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono-num font-bold text-slate-900 dark:text-white">
                Seat {hoveredSeat.id}
              </span>
              <span>{hoveredSeat.section}</span>
              <span className="font-mono-num font-semibold text-[#4F46E5] dark:text-[#22D3EE]">
                ₹{hoveredSeat.price}
              </span>
              <span>
                ·{' '}
                {selectedSet.has(hoveredSeat.id)
                  ? 'Selected'
                  : hoveredSeat.status.charAt(0).toUpperCase() + hoveredSeat.status.slice(1)}
              </span>
              {hoveredSeat.isAisle && <span>· Aisle</span>}
              <span>· View {hoveredSeat.viewScore}%</span>
            </div>
          ) : (
            <span>
              Hover or focus any seat with Arrow Keys to inspect price, section, and status.
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.15).toFixed(2))))}
            aria-label="Zoom out seat map"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#151D30] dark:text-slate-200"
          >
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="font-mono-num min-w-[46px] text-center text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.45, Number((z + 0.15).toFixed(2))))}
            aria-label="Zoom in seat map"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#151D30] dark:text-slate-200"
          >
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Reset seat map zoom"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#151D30] dark:text-slate-200"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Scrollable/Pannable Auditorium Canvas (only place horizontal scroll is permitted) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-[#090E1C]/80 sm:p-6"
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
          }}
          className="mx-auto min-w-[660px] max-w-[740px] transition-transform duration-150"
        >
          {/* Curved Auditorium Stage */}
          <div className="mb-8 flex flex-col items-center">
            <div className="h-3 w-4/5 rounded-t-full bg-gradient-to-r from-[#6366F1]/30 via-[#22D3EE]/70 to-[#8B5CF6]/30" />
            <div className="mt-1.5 flex w-3/4 items-center justify-center rounded-b-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-500/15 to-transparent py-2 text-xs font-bold tracking-[0.22em] text-indigo-900 dark:text-[#22D3EE]">
              {t.stageLabel}
            </div>
          </div>

          {/* Auditorium Rows with Section Headers and Center Aisle */}
          <div role="grid" aria-label="Auditorium seat map" className="space-y-2.5">
            {rowsGrouped.map((group, idx) => {
              const showSectionHeader =
                idx === 0 || rowsGrouped[idx - 1].section !== group.section;
              const leftHalf = group.seats.slice(0, 6);
              const rightHalf = group.seats.slice(6, 12);

              return (
                <div key={group.row}>
                  {showSectionHeader && (
                    <div className="mb-2 mt-4 flex items-center justify-between border-b border-slate-200/80 pb-1 text-xs font-semibold text-slate-600 first:mt-0 dark:border-slate-800 dark:text-[#94A3B8]">
                      <span>{group.section}</span>
                      <span className="font-mono-num">
                        ₹{group.seats[0].price} / seat
                      </span>
                    </div>
                  )}

                  <div role="row" className="flex items-center justify-center gap-2">
                    <span
                      aria-hidden="true"
                      className="font-mono-num w-6 text-center text-xs font-bold text-slate-500 dark:text-[#94A3B8]"
                    >
                      {group.row}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {leftHalf.map((seat) => {
                        const { classes, statusText, icon } = getSeatVisuals(seat);
                        const isSelected = selectedSet.has(seat.id);
                        const isDisabled = seat.status !== 'available' && !isSelected;

                        return (
                          <button
                            key={seat.id}
                            ref={(el) => {
                              if (el) seatRefs.current.set(seat.id, el);
                              else seatRefs.current.delete(seat.id);
                            }}
                            type="button"
                            role="gridcell"
                            aria-pressed={isSelected}
                            aria-disabled={isDisabled}
                            aria-label={`Seat ${seat.id}, ${seat.section}, ₹${seat.price}, ${statusText}`}
                            title={`Seat ${seat.id} · ${seat.section} · ₹${seat.price} · ${statusText}`}
                            onMouseEnter={() => setHoveredSeat(seat)}
                            onFocus={() => setHoveredSeat(seat)}
                            onClick={() => onToggleSeat(seat)}
                            onKeyDown={(e) => handleSeatKeyDown(e, seat)}
                            className={`flex h-11 w-11 flex-col items-center justify-center rounded-xl font-mono-num text-[11px] font-bold transition-all duration-150 focus-visible:z-10 ${classes}`}
                          >
                            <span>{seat.id}</span>
                            {icon && (
                              <ViewTransition>
                                <span className="mt-0.5">{icon}</span>
                              </ViewTransition>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Center Auditorium Aisle */}
                    <div
                      aria-hidden="true"
                      className="flex w-7 items-center justify-center text-[10px] font-medium text-slate-400 dark:text-slate-600"
                    >
                      {idx === 4 ? 'AISLE' : '·'}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {rightHalf.map((seat) => {
                        const { classes, statusText, icon } = getSeatVisuals(seat);
                        const isSelected = selectedSet.has(seat.id);
                        const isDisabled = seat.status !== 'available' && !isSelected;

                        return (
                          <button
                            key={seat.id}
                            ref={(el) => {
                              if (el) seatRefs.current.set(seat.id, el);
                              else seatRefs.current.delete(seat.id);
                            }}
                            type="button"
                            role="gridcell"
                            aria-pressed={isSelected}
                            aria-disabled={isDisabled}
                            aria-label={`Seat ${seat.id}, ${seat.section}, ₹${seat.price}, ${statusText}`}
                            title={`Seat ${seat.id} · ${seat.section} · ₹${seat.price} · ${statusText}`}
                            onMouseEnter={() => setHoveredSeat(seat)}
                            onFocus={() => setHoveredSeat(seat)}
                            onClick={() => onToggleSeat(seat)}
                            onKeyDown={(e) => handleSeatKeyDown(e, seat)}
                            className={`flex h-11 w-11 flex-col items-center justify-center rounded-xl font-mono-num text-[11px] font-bold transition-all duration-150 focus-visible:z-10 ${classes}`}
                          >
                            <span>{seat.id}</span>
                            {icon && (
                              <ViewTransition>
                                <span className="mt-0.5">{icon}</span>
                              </ViewTransition>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <span
                      aria-hidden="true"
                      className="font-mono-num w-6 text-center text-xs font-bold text-slate-500 dark:text-[#94A3B8]"
                    >
                      {group.row}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
