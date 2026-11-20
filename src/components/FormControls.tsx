import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, Ref } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#6366F1] text-white hover:bg-[#4F46E5] active:scale-[0.99] shadow-sm shadow-[#6366F1]/25 disabled:opacity-55',
  secondary:
    'bg-[#8B5CF6] text-white hover:bg-[#7C3AED] active:scale-[0.99] shadow-sm shadow-[#8B5CF6]/20 disabled:opacity-55',
  outline:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#151D30] dark:text-[#F8FAFC] dark:hover:bg-[#1C2640] disabled:opacity-55',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-[#94A3B8] dark:hover:bg-slate-800/70 dark:hover:text-[#F8FAFC] disabled:opacity-55',
  danger:
    'bg-[#EF4444] text-white hover:bg-[#DC2626] active:scale-[0.99] disabled:opacity-55',
};

const SIZE_CLASSES = {
  sm: 'min-h-[38px] px-3.5 py-1.5 text-xs',
  md: 'min-h-[44px] px-5 py-2.5 text-sm',
  lg: 'min-h-[48px] px-6 py-3 text-sm',
};

/**
 * Reusable Button using React 19 `ref` as a standard prop (no forwardRef).
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22D3EE] disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

/**
 * React 19 `useFormStatus` submit button that automatically reflects parent form pending state.
 */
export function SubmitButton({
  pendingLabel,
  children,
  variant = 'primary',
  size = 'lg',
  disabled,
  className = '',
}: {
  pendingLabel: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      loading={pending}
      disabled={disabled || pending}
      className={className}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  endAdornment?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Accessible InputField using React 19 `ref` as a standard prop.
 */
export function InputField({
  label,
  id,
  error,
  hint,
  endAdornment,
  className = '',
  ref,
  ...rest
}: InputFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-800 dark:text-[#F8FAFC]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={`min-h-[46px] w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/25 dark:bg-[#090E1C] dark:text-[#F8FAFC] dark:placeholder:text-slate-500 ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-300 dark:border-slate-700/80'
          } ${endAdornment ? 'pr-12' : ''} ${className}`}
          {...rest}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-1.5 flex items-center">{endAdornment}</div>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="text-xs text-slate-500 dark:text-[#94A3B8]">
          {hint}
        </p>
      )}
    </div>
  );
}
