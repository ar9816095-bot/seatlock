export function SeatLockLogo({
  size = 'md',
  showWordmark = true,
  inverted = false,
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  inverted?: boolean;
  className?: string;
}) {
  const iconDim = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11' : 'h-8 w-8';
  const textSize =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className={`${iconDim} shrink-0`}
      >
        <defs>
          <linearGradient id="seatlock-grad" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="55%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" className="fill-[#0F172A] dark:fill-[#151D30]" />
        <rect x="2" y="2" width="60" height="60" rx="14" stroke="url(#seatlock-grad)" strokeWidth="2.5" strokeOpacity="0.6" />
        <path
          d="M21 29V24C21 17.925 25.925 13 32 13C38.075 13 43 17.925 43 24V29H38.5V24C38.5 20.41 35.59 17.5 32 17.5C28.41 17.5 25.5 20.41 25.5 24V29H21Z"
          fill="url(#seatlock-grad)"
        />
        <rect x="16" y="28" width="32" height="21" rx="6" fill="url(#seatlock-grad)" />
        <rect x="19.5" y="31.5" width="25" height="14" rx="3.5" fill="#090E1C" />
        <path
          d="M26.5 38.5L30.2 42L37.8 34.5"
          stroke="#22D3EE"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <span
          className={`font-heading font-extrabold tracking-tight ${
            inverted ? 'text-white' : 'text-slate-900 dark:text-[#F8FAFC]'
          } ${textSize}`}
        >
          SEAT
          <span className={inverted ? 'text-[#818CF8]' : 'text-[#6366F1] dark:text-[#818CF8]'}>
            LOCK
          </span>
        </span>
      )}
    </span>
  );
}
