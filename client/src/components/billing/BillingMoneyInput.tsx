import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { roundMoney2 } from '@/utils/billingMoney';

type BillingMoneyInputProps = {
  value: number;
  onCommit: (n: number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  title?: string;
  /** Minimum value after commit (inclusive). Omit for no floor. */
  min?: number;
  /** If invalid/empty on blur, commit 0 instead of reverting to previous value. */
  allowEmptyZero?: boolean;
};

/**
 * Money field: shows 00.00 when not focused; while focused allows free typing;
 * on blur parses, rounds to 2 decimals, and commits.
 */
export function BillingMoneyInput({
  value,
  onCommit,
  disabled,
  className,
  placeholder,
  title,
  min,
  allowEmptyZero,
}: BillingMoneyInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const display = draft !== null ? draft : roundMoney2(value).toFixed(2);

  return (
    <Input
      data-billing-money
      type="text"
      inputMode="decimal"
      disabled={disabled}
      placeholder={placeholder}
      title={title}
      value={display}
      onFocus={() => setDraft(roundMoney2(value).toFixed(2))}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        const raw = draft ?? '';
        setDraft(null);
        let n = parseFloat(raw.replace(/,/g, ''));
        if (!Number.isFinite(n)) {
          onCommit(allowEmptyZero ? 0 : roundMoney2(value));
          return;
        }
        if (min !== undefined && n < min) n = min;
        onCommit(roundMoney2(n));
      }}
      className={cn(className)}
    />
  );
}
