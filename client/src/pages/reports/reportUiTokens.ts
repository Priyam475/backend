import { cn } from '@/lib/utils';

/**
 * Reports module accent — tabs (active) + primary actions (Generate).
 * Spec: linear-gradient(90deg, #4B7CF3, #5B8CFF 45%, #7B61FF); text #FFF; border rgba(255,255,255,0.25);
 * shadow default/hover rgba(91,140,255,0.85) / rgba(123,97,255,0.9).
 */
const accentBase = cn(
  'text-[#FFFFFF] font-semibold border border-[rgba(255,255,255,0.25)]',
  'bg-[linear-gradient(90deg,#4B7CF3_0%,#5B8CFF_45%,#7B61FF_100%)]',
  'shadow-[0_4px_14px_rgba(91,140,255,0.85)]',
  'hover:shadow-[0_6px_18px_rgba(123,97,255,0.9)]',
  'transition-[box-shadow,opacity] duration-200',
);

export const reportsAccentTabActiveClassName = cn(
  accentBase,
  'rounded-md px-2.5 py-2 text-sm text-center no-underline',
);

export const reportsAccentTabInactiveClassName = cn(
  'rounded-md px-2.5 py-2 text-sm font-semibold text-center transition-colors no-underline',
  'text-muted-foreground hover:text-foreground hover:bg-muted/45 border border-transparent',
);

export function reportsAccentPrimaryButtonClassName(disabled: boolean) {
  return cn(
    accentBase,
    'rounded-md px-3 min-h-10 h-10 lg:min-h-9 lg:h-9 text-sm inline-flex items-center justify-center whitespace-nowrap touch-manipulation',
    'w-full shrink-0 lg:w-auto lg:min-w-[140px]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(255,255,255,0.45)] focus-visible:ring-offset-transparent',
    disabled && 'opacity-50 pointer-events-none shadow-none hover:shadow-none',
  );
}

/** Same gradient as primary; **equal width/height** for paired actions (e.g. Clear + Apply). */
export function reportsAccentPairedActionButtonClassName(disabled: boolean) {
  return cn(
    accentBase,
    'rounded-md px-2 sm:px-3 h-10 min-h-[2.5rem] text-sm font-semibold inline-flex items-center justify-center touch-manipulation',
    'flex-1 basis-0 min-w-0 w-0',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(255,255,255,0.45)] focus-visible:ring-offset-transparent',
    disabled && 'opacity-50 pointer-events-none shadow-none hover:shadow-none',
  );
}
