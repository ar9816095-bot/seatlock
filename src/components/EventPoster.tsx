import { useState } from 'react';
import { Calendar, Sparkles } from 'lucide-react';

interface EventPosterProps {
  src: string;
  alt: string;
  title: string;
  category?: string;
  className?: string;
  priority?: boolean;
}

export function EventPoster({
  src,
  alt,
  title,
  category,
  className = '',
  priority = false,
}: EventPosterProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#151D30] via-[#1E293B] to-[#312E81] p-6 text-center text-white ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
          {category === 'Technology' ? (
            <Sparkles className="h-6 w-6 text-[#22D3EE]" aria-hidden="true" />
          ) : (
            <Calendar className="h-6 w-6 text-[#818CF8]" aria-hidden="true" />
          )}
        </div>
        <p className="mt-3 line-clamp-2 text-sm font-semibold">{title}</p>
        {category && <p className="mt-1 text-xs text-slate-300">{category}</p>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
