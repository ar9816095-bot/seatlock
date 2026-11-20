import { useEffect, useRef, type ReactNode, type Ref } from 'react';
import { X } from 'lucide-react';

interface AccessibleModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidthClass?: string;
  ref?: Ref<HTMLDivElement>;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AccessibleModal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidthClass = 'max-w-lg',
  ref,
}: AccessibleModalProps) {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const container = internalRef.current;

    // Move initial focus inside dialog
    const focusables = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusables && focusables.length > 0) {
      focusables[0].focus();
    } else {
      container?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && container) {
        const list = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={(node) => {
          internalRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref && 'current' in ref) {
            (ref as { current: HTMLDivElement | null }).current = node;
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-heading"
        aria-describedby={description ? 'modal-desc' : undefined}
        tabIndex={-1}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-700/60 dark:bg-[#151D30] dark:text-[#F8FAFC] sm:rounded-2xl ${maxWidthClass}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-heading" className="text-lg font-bold tracking-tight">
              {title}
            </h2>
            {description && (
              <p id="modal-desc" className="mt-1 text-sm text-slate-600 dark:text-[#94A3B8]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
