/** Round to exactly 2 decimal places (half away from zero). */
export function roundMoney2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** INR display: always two fractional digits (e.g. 12 → 12.00). */
export function formatBillingInr(n: number): string {
  return roundMoney2(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function gstOnSubtotal(subtotal: number, gstRatePercent: number): number {
  return roundMoney2(subtotal * (gstRatePercent || 0) / 100);
}

export function percentOfAmount(amount: number, percent: number): number {
  return roundMoney2(amount * (percent || 0) / 100);
}

/** Subtotal + commission + user fee + coolie + weighman + GST (for discount base). */
export function billGroupSubtotalWithTaxAndCharges(g: {
  subtotal: number;
  commissionAmount?: number;
  userFeeAmount?: number;
  coolieAmount?: number;
  weighmanChargeAmount?: number;
  gstRate?: number;
}): number {
  return roundMoney2(
    roundMoney2(g.subtotal || 0)
      + roundMoney2(g.commissionAmount || 0)
      + roundMoney2(g.userFeeAmount || 0)
      + roundMoney2(g.coolieAmount || 0)
      + roundMoney2(g.weighmanChargeAmount || 0)
      + gstOnSubtotal(g.subtotal || 0, g.gstRate ?? 0),
  );
}
