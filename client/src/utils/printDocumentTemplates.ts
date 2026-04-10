// ── Print document HTML for Billing, Settlement, Weighing ───
// Same format as client_origin; used with directPrint() + printLogApi.

import { effectiveGstPercent, formatBillingInr, gstOnSubtotal, percentOfAmount, roundMoney2 } from '@/utils/billingMoney';

const PRINT_STYLES = `
  body { font-family: system-ui, sans-serif; margin: 0; padding: 12px; font-size: 12px; color: #111; }
  .wrap { max-width: 400px; margin: 0 auto; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .bolder { font-weight: 800; }
  .muted { color: #666; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .section { border-bottom: 1px dashed #ccc; padding-bottom: 8px; margin-bottom: 8px; }
  .section-t { border-top: 1px dashed #ccc; padding-top: 8px; margin-top: 8px; }
  .foot { font-size: 9px; color: #888; }
  .total { font-size: 14px; }
  .grand { font-size: 18px; font-weight: 800; color: #059669; }
  .destructive { color: #dc2626; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px 4px; }
  .text-right { text-align: right; }
  @media print { body { padding: 4px; } }
`;

export interface DocumentPrintOptions {
  pageSize?: 'A4' | 'A5';
  includeHeader?: boolean;
}

function normalizeOptions(options?: DocumentPrintOptions): Required<DocumentPrintOptions> {
  return {
    pageSize: options?.pageSize === 'A5' ? 'A5' : 'A4',
    includeHeader: options?.includeHeader !== false,
  };
}

// ── Sales Bill (BillingPage) ───────────────────────────────
export interface BillPrintData {
  billId: string;
  billNumber: string;
  buyerName: string;
  buyerMark: string;
  billingName: string;
  billDate: string;
  outboundVehicle?: string;
  commodityGroups: {
    commodityName: string;
    hsnCode?: string;
    gstRate?: number;
    sgstRate?: number;
    cgstRate?: number;
    igstRate?: number;
    commissionPercent: number;
    commissionAmount: number;
    userFeePercent: number;
    userFeeAmount: number;
    coolieAmount?: number;
    weighmanChargeAmount?: number;
    discount?: number;
    discountType?: 'PERCENT' | 'AMOUNT';
    manualRoundOff?: number;
    items: { quantity: number; weight: number; newRate: number; amount: number; tokenAdvance?: number }[];
    subtotal: number;
    totalCharges?: number;
  }[];
  outboundFreight: number;
  grandTotal: number;
}

export function generateSalesBillPrintHTML(bill: BillPrintData, options?: DocumentPrintOptions): string {
  const printOptions = normalizeOptions(options);
  const dateStr = new Date(bill.billDate).toLocaleDateString();

  const headerHtml = printOptions.includeHeader ? `
      <div class="center section">
        <p class="bold">MERCOTRACE</p>
        <p class="muted">Sales Bill (Buyer Invoice)</p>
        <p class="muted">${dateStr}</p>
      </div>
      <div class="section">
        <div class="row"><span class="muted">Bill No.</span><span class="bold">${bill.billNumber || 'DRAFT'}</span></div>
        <div class="row"><span class="muted">Buyer</span><span class="bold">${escapeHtml(bill.billingName)} (${escapeHtml(bill.buyerMark)})</span></div>
        ${bill.outboundVehicle ? `<div class="row"><span class="muted">Out Vehicle</span><span class="bold">${escapeHtml(bill.outboundVehicle)}</span></div>` : ''}
      </div>
  ` : '';

  const renderGroupHtml = (group: BillPrintData["commodityGroups"][number]) => `
    <div class="section">
      <p class="bold">${escapeHtml(group.commodityName)}${group.hsnCode ? ` (HSN: ${escapeHtml(group.hsnCode)})` : ''}${(group.gstRate ?? 0) > 0 ? ` · GST: ${formatBillingInr(group.gstRate ?? 0)}%` : ''}${(group.sgstRate ?? 0) > 0 ? ` · SGST: ${formatBillingInr(group.sgstRate ?? 0)}%` : ''}${(group.cgstRate ?? 0) > 0 ? ` · CGST: ${formatBillingInr(group.cgstRate ?? 0)}%` : ''}${(group.igstRate ?? 0) > 0 ? ` · IGST: ${formatBillingInr(group.igstRate ?? 0)}%` : ''}</p>
      ${group.items.map((item) => `
        <div class="row" style="font-size:10px">
          <span>${formatBillingInr(item.quantity)}×${formatBillingInr(item.weight)}kg @₹${formatBillingInr(item.newRate)}${(item.tokenAdvance ?? 0) > 0 ? ` · Tok ₹${formatBillingInr(item.tokenAdvance ?? 0)}` : ''}</span>
          <span class="bold">₹${formatBillingInr(item.amount)}</span>
        </div>
      `).join('')}
      <div class="section-t" style="border-top-style:dotted">
        <div class="row"><span class="muted">Subtotal</span><span>₹${formatBillingInr(group.subtotal)}</span></div>
        ${group.commissionPercent > 0 ? `<div class="row"><span class="muted">Commission (${formatBillingInr(group.commissionPercent)}%)</span><span>₹${formatBillingInr(group.commissionAmount)}</span></div>` : ''}
        ${group.userFeePercent > 0 ? `<div class="row"><span class="muted">User Fee (${formatBillingInr(group.userFeePercent)}%)</span><span>₹${formatBillingInr(group.userFeeAmount)}</span></div>` : ''}
        ${effectiveGstPercent(group) > 0 ? `<div class="row"><span class="muted">${(group.gstRate ?? 0) > 0 ? 'GST' : 'Tax'} (${formatBillingInr(effectiveGstPercent(group))}%)</span><span>₹${formatBillingInr(gstOnSubtotal(group.subtotal, effectiveGstPercent(group)))}</span></div>` : ''}
      </div>
    </div>
  `;

  const renderGroupLineCount = (group: BillPrintData["commodityGroups"][number]) => {
    // Rough line estimator: title + each item row + subtotal row + optional commission/user fee/GST rows.
    let lines = 1 + group.items.length + 1;
    if (group.commissionPercent > 0) lines += 1;
    if (group.userFeePercent > 0) lines += 1;
    if (effectiveGstPercent(group) > 0) lines += 1;
    return lines;
  };

  const MAX_LINES_PER_PAGE = 26;
  const groupSections = bill.commodityGroups.map(renderGroupHtml);

  const additionsHtml = ((bill as any).buyerCoolie > 0 || bill.outboundFreight > 0)
    ? `
      <div class="section">
        <p class="bold">ADDITIONS</p>
        ${(bill as any).buyerCoolie > 0 ? `<div class="row"><span class="muted">Buyer Coolie</span><span>₹${formatBillingInr((bill as any).buyerCoolie)}</span></div>` : ''}
        ${bill.outboundFreight > 0 ? `<div class="row"><span class="muted">Outbound Freight</span><span>₹${formatBillingInr(bill.outboundFreight)}</span></div>` : ''}
      </div>
    `
    : '';

  const taxGroups = bill.commodityGroups.filter((g) => g.commissionPercent > 0 || g.userFeePercent > 0 || effectiveGstPercent(g) > 0);
  const totalCommission = taxGroups.reduce((s, g) => s + g.commissionAmount, 0);
  const totalUserFee = taxGroups.reduce((s, g) => s + g.userFeeAmount, 0);
  const totalGst = taxGroups.reduce(
    (s, g) => s + (effectiveGstPercent(g) > 0 ? gstOnSubtotal(g.subtotal, effectiveGstPercent(g)) : 0),
    0,
  );

  const subtotalSum = bill.commodityGroups.reduce((s, g) => s + g.subtotal + (g.totalCharges ?? 0), 0);
  const discountAmount = bill.discountType === 'PERCENT'
    ? percentOfAmount(subtotalSum, bill.discount ?? 0)
    : roundMoney2(bill.discount ?? 0);

  const taxSummaryHtml = `
    <div class="section">
      <p class="bold">TAX SUMMARY</p>
      ${taxGroups.map((g) => `
        <div style="font-size:10px">
          <span class="muted">${escapeHtml(g.commodityName)}:</span>
          ${g.commissionPercent > 0 ? `<div class="row" style="padding-left:8px"><span>Commission</span><span>₹${formatBillingInr(g.commissionAmount)}</span></div>` : ''}
          ${g.userFeePercent > 0 ? `<div class="row" style="padding-left:8px"><span>User Fee</span><span>₹${formatBillingInr(g.userFeeAmount)}</span></div>` : ''}
          ${effectiveGstPercent(g) > 0 ? `<div class="row" style="padding-left:8px"><span>${(g.gstRate ?? 0) > 0 ? 'GST' : 'Tax'} (${formatBillingInr(effectiveGstPercent(g))}%)</span><span>₹${formatBillingInr(gstOnSubtotal(g.subtotal, effectiveGstPercent(g)))}</span></div>` : ''}
          ${(g.gstRate ?? 0) > 0 && (g.sgstRate ?? 0) > 0 ? `<div class="row" style="padding-left:8px"><span>SGST (${formatBillingInr(g.sgstRate ?? 0)}%)</span><span>₹${formatBillingInr(gstOnSubtotal(g.subtotal, g.sgstRate ?? 0))}</span></div>` : ''}
          ${(g.gstRate ?? 0) > 0 && (g.cgstRate ?? 0) > 0 ? `<div class="row" style="padding-left:8px"><span>CGST (${formatBillingInr(g.cgstRate ?? 0)}%)</span><span>₹${formatBillingInr(gstOnSubtotal(g.subtotal, g.cgstRate ?? 0))}</span></div>` : ''}
          ${(g.gstRate ?? 0) > 0 && (g.igstRate ?? 0) > 0 ? `<div class="row" style="padding-left:8px"><span>IGST (${formatBillingInr(g.igstRate ?? 0)}%)</span><span>₹${formatBillingInr(gstOnSubtotal(g.subtotal, g.igstRate ?? 0))}</span></div>` : ''}
        </div>
      `).join('')}
      {/* Overall cumulative row (REQ-BIL-010) */}
      <div style="margin-top:4px;padding-top:4px;border-top:1px dashed #ccc;font-size:10px">
        <div class="row" style="padding-left:8px">
          <span class="muted" style="font-weight:700">TOTAL</span>
          <span style="font-weight:800">₹${formatBillingInr(roundMoney2(totalCommission + totalUserFee + totalGst))}</span>
        </div>
        ${totalCommission > 0 ? `<div class="row" style="padding-left:8px"><span>Commission Total</span><span>₹${formatBillingInr(totalCommission)}</span></div>` : ''}
        ${totalUserFee > 0 ? `<div class="row" style="padding-left:8px"><span>User Fee Total</span><span>₹${formatBillingInr(totalUserFee)}</span></div>` : ''}
        ${totalGst > 0 ? `<div class="row" style="padding-left:8px"><span>GST Total</span><span>₹${formatBillingInr(totalGst)}</span></div>` : ''}
      </div>
    </div>
  `;

  const pages: string[] = [];
  let currentLines = 0;
  let currentGroupsHtml = '';

  for (let gi = 0; gi < bill.commodityGroups.length; gi++) {
    const group = bill.commodityGroups[gi];
    const groupHtml = groupSections[gi];
    const groupLines = renderGroupLineCount(group);

    if (pages.length > 0 && currentLines + groupLines > MAX_LINES_PER_PAGE) {
      pages.push(`<div class="wrap" style="page-break-after: always">${headerHtml}${currentGroupsHtml}</div>`);
      currentLines = 0;
      currentGroupsHtml = '';
    }

    currentLines += groupLines;
    currentGroupsHtml += groupHtml;
  }

  const lastPageHtml = `
    <div class="wrap">
      ${headerHtml}
      ${currentGroupsHtml}
      ${additionsHtml}
      ${taxSummaryHtml}
      ${bill.discount > 0 ? `<div class="row"><span class="muted">Discount</span><span class="destructive">−₹${formatBillingInr(discountAmount)}</span></div>` : ''}
      ${bill.manualRoundOff !== 0 ? `<div class="row"><span class="muted">Round Off</span><span>${bill.manualRoundOff > 0 ? '+' : ''}₹${formatBillingInr(bill.manualRoundOff ?? 0)}</span></div>` : ''}
      <div class="row total section-t">
        <span class="bold">GRAND TOTAL</span>
        <span class="grand">₹${formatBillingInr(bill.grandTotal)}</span>
      </div>
      <div class="center foot section-t">
        <p>NR = B + P + BRK + Other</p>
        <p>GT = Σ(Commodity Totals) + Additions − Discount + Round Off</p>
      </div>
      <div class="center section-t"><p class="muted">--- END OF BILL ---</p></div>
    </div>
  `;

  pages.push(lastPageHtml);
  const body = pages.join('');
  return wrapPrintDocument(body, printOptions.pageSize);
}

// ── Sales Patti (SettlementPage) ─────────────────────────
export interface PattiPrintData {
  pattiId: string;
  sellerName: string;
  sellerMobile?: string;
  sellerAddress?: string;
  vehicleNumber?: string;
  commodityName?: string;
  totalBags?: number;
  detailRows?: { mark: string; bags: number; weight: number; rate: number; amount: number }[];
  rateClusters: { rate: number; totalQuantity: number; totalWeight: number; amount: number }[];
  grossAmount: number;
  deductions: { key: string; label: string; amount: number; autoPulled?: boolean }[];
  totalDeductions: number;
  netPayable: number;
  createdAt: string;
  useAverageWeight?: boolean;
}

function buildSalesPattiStyle(): string {
  return `
  <style>
    .patti-a4 { font-family: Arial, sans-serif; color: #000; font-size: 14px; }
    .patti-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; }
    .patti-head-left p, .patti-head-right p { margin: 0; line-height: 1.2; }
    .patti-head-right { text-align:right; min-width: 200px; }
    .patti-table { width:100%; border-collapse: collapse; table-layout: fixed; }
    .patti-table th, .patti-table td { border: 1px solid #000; padding: 3px 6px; }
    .patti-table th { font-weight: 700; text-align: left; }
    .right { text-align:right; }
    .centered { text-align:center; }
    .footer-net { margin-top: 8px; display:flex; justify-content:flex-end; font-size: 20px; font-weight: 700; gap: 16px; }
  </style>
`;
}

export function generateSalesPattiPrintHTML(patti: PattiPrintData, options?: DocumentPrintOptions): string {
  const printOptions = normalizeOptions(options);
  const dateStr = new Date(patti.createdAt).toLocaleDateString('en-GB');
  const rows = (patti.detailRows && patti.detailRows.length > 0)
    ? patti.detailRows
    : patti.rateClusters.map((c) => ({
      mark: '-',
      bags: Number(c.totalQuantity) || 0,
      weight: Number(c.totalWeight) || 0,
      rate: Number(c.rate) || 0,
      amount: Number(c.amount) || 0,
    }));
  const totalBags = Number(patti.totalBags ?? rows.reduce((s, r) => s + (Number(r.bags) || 0), 0)) || 0;
  const totalWeight = rows.reduce((s, r) => s + (Number(r.weight) || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const deductionByKey = new Map<string, number>();
  for (const d of patti.deductions || []) {
    deductionByKey.set(String(d.key || '').toLowerCase(), Number(d.amount) || 0);
  }
  const freight = deductionByKey.get('freight') ?? 0;
  const unloading = deductionByKey.get('coolie') ?? deductionByKey.get('unloading') ?? 0;
  const weighingPresent = deductionByKey.has('weighing') || deductionByKey.has('weighman');
  const weighing = deductionByKey.get('weighing') ?? deductionByKey.get('weighman') ?? 0;
  const cashAdvance = deductionByKey.get('advance') ?? deductionByKey.get('cashadvance') ?? 0;
  const gunnies = deductionByKey.get('gunnies') ?? 0;
  const others = deductionByKey.get('others') ?? 0;

  const particularsRows: Array<{ label: string; amount: number }> = [
    { label: 'Freight', amount: freight },
    { label: 'Unloading', amount: unloading },
    ...(weighingPresent ? [{ label: 'Weighing', amount: weighing }] : []),
    { label: 'Cash Advance', amount: cashAdvance },
    { label: 'Gunnies', amount: gunnies },
    { label: 'Others', amount: others },
  ];

  const commodityLabel = (patti.commodityName || '').trim() || 'Commodity';
  const soldLine = `Sold ${formatBillingInr(totalBags)} Bags of ${escapeHtml(commodityLabel)} on account and risk of`;
  const identityLine = `${escapeHtml(patti.sellerName || '-')}${patti.sellerMobile ? `, ${escapeHtml(patti.sellerMobile)}` : ''}`;
  const addressLine = escapeHtml((patti.sellerAddress || '').trim() || '-');
  const vehicleLine = escapeHtml((patti.vehicleNumber || '').trim() || '-');

  const body = `
    <div class="patti-a4">
      ${printOptions.includeHeader ? `<div class="patti-head">
        <div class="patti-head-left">
          <p style="font-weight:700;">${soldLine}</p>
          <p style="font-weight:700;">${identityLine}</p>
          <p style="font-weight:700;">${addressLine}</p>
          <p style="font-weight:700;">Vehicle No : ${vehicleLine}</p>
        </div>
        <div class="patti-head-right">
          <p style="font-weight:700;">Patti No : ${escapeHtml(patti.pattiId || '-')}</p>
          <p style="font-weight:700;">Date : ${dateStr}</p>
        </div>
      </div>` : ''}

      <table class="patti-table">
        <thead>
          <tr>
            <th style="width:9%;">Marks</th>
            <th style="width:9%;" class="centered">Bags</th>
            <th style="width:13%;" class="right">Weight, kg</th>
            <th style="width:12%;" class="right">Rate, ₹</th>
            <th style="width:16%;" class="right">Amount, ₹</th>
            <th style="width:23%;">Particulars</th>
            <th style="width:18%;" class="right">Amount, ₹</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, idx) => `
            <tr>
              <td>${escapeHtml(r.mark || '-')}</td>
              <td class="centered">${formatBillingInr(r.bags)}</td>
              <td class="right">${formatBillingInr(r.weight)}</td>
              <td class="right">${formatBillingInr(r.rate)}</td>
              <td class="right">${formatBillingInr(r.amount)}</td>
              <td>${idx < particularsRows.length ? particularsRows[idx].label : '-'}</td>
              <td class="right">${idx < particularsRows.length ? formatBillingInr(particularsRows[idx].amount) : '-'}</td>
            </tr>
          `).join('')}
          ${Array.from({ length: Math.max(0, particularsRows.length - rows.length) }).map((_, i) => {
            const pRow = particularsRows[rows.length + i];
            return `
              <tr>
                <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
                <td>${pRow.label}</td>
                <td class="right">${formatBillingInr(pRow.amount)}</td>
              </tr>
            `;
          }).join('')}
          <tr>
            <td>-</td>
            <td class="centered" style="font-weight:700;">${formatBillingInr(totalBags)}</td>
            <td class="right" style="font-weight:700;">${formatBillingInr(totalWeight)}</td>
            <td>-</td>
            <td class="right" style="font-weight:700;">${formatBillingInr(totalAmount)}</td>
            <td>-</td>
            <td class="right" style="font-weight:700;">${formatBillingInr(particularsRows.reduce((s, p) => s + p.amount, 0))}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer-net">
        <span>Net Payable</span>
        <span>${formatBillingInr(patti.netPayable)}</span>
      </div>
    </div>
  `;
  return wrapPrintDocument(`${buildSalesPattiStyle()}${body}`, printOptions.pageSize);
}

export function generateSalesPattiBatchPrintHTML(pattis: PattiPrintData[], options?: DocumentPrintOptions): string {
  const pages = (pattis || []).map((p, idx, arr) => `
    <div${idx < arr.length - 1 ? ' style="page-break-after: always;"' : ''}>
      ${generateSalesPattiPrintHTMLBody(p, options)}
    </div>
  `).join('');
  const printOptions = normalizeOptions(options);
  return wrapPrintDocument(`${buildSalesPattiStyle()}${pages}`, printOptions.pageSize);
}

function generateSalesPattiPrintHTMLBody(patti: PattiPrintData, options?: DocumentPrintOptions): string {
  const full = generateSalesPattiPrintHTML(patti, options);
  const bodyMatch = full.match(/<body>([\s\S]*)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : '';
}

// ── Weighing Slip (WeighingPage) ──────────────────────────
export interface WeighingSlipPrintData {
  sessionId: string;
  bidNumber: number;
  bagWeights: { bagNumber: number; weight: number }[];
  originalWeight: number;
  deductions: number;
  netWeight: number;
  manualEntry: boolean;
  govtDeductionApplied: boolean;
  roundOffApplied: boolean;
}

// ── Auction Completion Slip (AuctionsPage) ─────────────────
export interface AuctionCompletionPrintData {
  auctionId: number | string;
  lotId: number | string;
  lotName: string;
  sellerName: string;
  vehicleNumber: string;
  commodityName: string;
  completedAt?: string;
  entries: {
    bidNumber: number;
    buyerMark: string;
    buyerName: string;
    rate: number;
    quantity: number;
    amount: number;
    presetApplied?: number;
    presetType?: 'PROFIT' | 'LOSS';
  }[];
}

export function generateAuctionCompletionPrintHTML(auction: AuctionCompletionPrintData): string {
  const completedAt = auction.completedAt ? new Date(auction.completedAt) : new Date();
  const dateStr = completedAt.toLocaleDateString();
  const timeStr = completedAt.toLocaleTimeString();
  const totalQty = auction.entries.reduce((s, e) => s + (Number(e.quantity) || 0), 0);
  const totalAmount = auction.entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const highestRate = auction.entries.reduce((max, e) => Math.max(max, Number(e.rate) || 0), 0);
  const rows = auction.entries.map((entry) => {
    const preset = Number(entry.presetApplied ?? 0);
    const presetTxt = preset === 0 ? '—' : `${preset > 0 ? '+' : ''}${preset} (${entry.presetType ?? (preset < 0 ? 'LOSS' : 'PROFIT')})`;
    return `
      <div class="section" style="margin-bottom:6px;padding-bottom:6px">
        <div class="row"><span class="muted">Bid #</span><span class="bold">${entry.bidNumber}</span></div>
        <div class="row"><span class="muted">Buyer</span><span class="bold">${escapeHtml(entry.buyerName)} (${escapeHtml(entry.buyerMark)})</span></div>
        <div class="row"><span class="muted">Rate</span><span class="bold">₹${entry.rate}</span></div>
        <div class="row"><span class="muted">Preset</span><span>${presetTxt}</span></div>
        <div class="row"><span class="muted">Qty</span><span class="bold">${entry.quantity} bags</span></div>
        <div class="row"><span class="muted">Amount</span><span class="bold">₹${entry.amount.toLocaleString()}</span></div>
      </div>
    `;
  }).join('');

  const body = `
    <div class="wrap">
      <div class="center section">
        <p class="bold">MERCOTRACE</p>
        <p class="muted">Auction Completion</p>
        <p class="muted">${dateStr} ${timeStr}</p>
      </div>
      <div class="section">
        <div class="row"><span class="muted">Auction ID</span><span class="bold">${auction.auctionId}</span></div>
        <div class="row"><span class="muted">Lot</span><span class="bold">${escapeHtml(auction.lotName || String(auction.lotId))}</span></div>
        <div class="row"><span class="muted">Seller</span><span class="bold">${escapeHtml(auction.sellerName)}</span></div>
        <div class="row"><span class="muted">Vehicle</span><span class="bold">${escapeHtml(auction.vehicleNumber || '—')}</span></div>
        <div class="row"><span class="muted">Commodity</span><span class="bold">${escapeHtml(auction.commodityName || '—')}</span></div>
      </div>
      <div class="section">
        <p class="bold">BIDS (${auction.entries.length})</p>
        ${rows || '<p class="muted">No bids found.</p>'}
      </div>
      <div class="row"><span class="muted">Total Qty</span><span class="bold">${totalQty} bags</span></div>
      <div class="row"><span class="muted">Highest Rate</span><span class="bold">₹${highestRate.toLocaleString()}</span></div>
      <div class="row total section-t">
        <span class="bold">TOTAL SALE</span>
        <span class="grand">₹${totalAmount.toLocaleString()}</span>
      </div>
      <div class="center section-t"><p class="muted">--- END OF AUCTION ---</p></div>
    </div>
  `;

  return wrapPrintDocument(body);
}

export function generateWeighingSlipPrintHTML(slip: WeighingSlipPrintData, totalWeight: number): string {
  const avgWeight = slip.bagWeights.length > 0
    ? (slip.bagWeights.reduce((s, b) => s + b.weight, 0) / slip.bagWeights.length).toFixed(2)
    : '0.00';
  const body = `
    <div class="wrap">
      <div class="center section">
        <p class="bold">MERCOTRACE</p>
        <p class="muted">Weighing Slip</p>
        <p class="muted">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
      </div>
      <div class="section">
        <div class="row"><span class="muted">Bid #</span><span class="bold">${slip.bidNumber}</span></div>
        <div class="row"><span class="muted">Mode</span><span class="bold">${slip.manualEntry ? 'MANUAL' : 'DIGITAL SCALE'}</span></div>
        ${slip.govtDeductionApplied ? '<div class="row"><span class="muted">Govt Ded.</span><span class="bold">APPLIED</span></div>' : ''}
        ${slip.roundOffApplied ? '<div class="row"><span class="muted">Round Off</span><span class="bold">APPLIED</span></div>' : ''}
      </div>
      <div class="section">
        <p class="bold">BAG WEIGHTS (${slip.bagWeights.length})</p>
        <div class="grid4">
          ${slip.bagWeights.map((b) => `
            <div class="text-right"> <span class="muted" style="margin-right:4px">${b.bagNumber}.</span>${b.weight.toFixed(1)} </div>
          `).join('')}
        </div>
      </div>
      <div class="section">
        <div class="row"><span class="muted">Total Weight</span><span class="bold">${totalWeight.toFixed(2)} kg</span></div>
        <div class="row"><span class="muted">Original Wt (Legal)</span><span class="bold">${slip.originalWeight.toFixed(2)} kg</span></div>
        <div class="row"><span class="muted">Deductions</span><span class="bold destructive">−${slip.deductions.toFixed(2)} kg</span></div>
        <div class="row total section-t">
          <span class="bold">NET WEIGHT</span>
          <span class="grand">${slip.netWeight.toFixed(2)} kg</span>
        </div>
      </div>
      <div class="center foot section-t">
        <p>NW = OW − D</p>
        ${slip.bagWeights.length > 0 ? `<p>AW = Σ Wi ÷ n = ${avgWeight} kg</p>` : ''}
        ${slip.manualEntry ? '<p>⚠ Manual Entry: OW = 0 (no scale used)</p>' : ''}
      </div>
      <div class="center section-t"><p class="muted">--- END OF SLIP ---</p></div>
    </div>
  `;
  return wrapPrintDocument(body);
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapPrintDocument(body: string, pageSize: 'A4' | 'A5' = 'A4'): string {
  const maxWidth = pageSize === 'A5' ? '130mm' : '180mm';
  const pageCss = `@page { size: ${pageSize} portrait; margin: 8mm; } .wrap { max-width: ${maxWidth}; }`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${pageCss}${PRINT_STYLES}</style></head><body>${body}</body></html>`;
}
