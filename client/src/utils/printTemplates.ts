// ── Print Templates for Print Hub ──────────────────────────
// REQ-LOG-002: All print formats per SRS (same format as client_origin)

export interface BidInfo {
  bidNumber: number;
  buyerMark: string;
  buyerName: string;
  quantity: number;
  /** Total bags for this vehicle across all sellers (vehicle total qty) */
  vehicleTotalQty?: number;
  /** Total bags for this seller on the same vehicle (seller qty) */
  sellerVehicleQty?: number;
  rate: number;
  lotId: string;
  lotName: string;
  sellerName: string;
  sellerSerial: number;
  lotNumber: number;
  vehicleNumber: string;
  commodityName: string;
  origin?: string;
  godown?: string;
  weight?: number;
}

// ── Helpers ───────────────────────────────────────────────
function lotDisplay(bid: BidInfo): string {
  if (bid.vehicleTotalQty != null && bid.sellerVehicleQty != null) {
    return `${bid.vehicleTotalQty}/${bid.sellerVehicleQty}`;
  }
  if (bid.lotName && bid.lotName !== String(bid.lotNumber)) {
    return `${bid.lotNumber} / ${bid.lotName}`;
  }
  return String(bid.lotNumber);
}

function todayStr(): string {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function firmHeader(): string {
  return `<div class="firm-header">
    <div class="firm-name">MERCOTRACE</div>
    <div class="firm-line">Agricultural Produce Market Committee</div>
    <div class="firm-line">APMC Market Yard</div>
    <div class="firm-info-row">
      <span class="firm-lbl">APMC Code</span>
      <span class="firm-val">MT-001</span>
    </div>
    <div class="firm-info-row">
      <span class="firm-lbl">Date</span>
      <span class="firm-val">${todayStr()}</span>
    </div>
  </div>`;
}

// ── Direct Print Engine ──────────────────────────────────
export function directPrint(html: string): boolean {
  const printFrame = document.createElement('iframe');
  printFrame.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:0;height:0';
  document.body.appendChild(printFrame);
  const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
  if (!frameDoc) {
    document.body.removeChild(printFrame);
    return false;
  }
  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();
  setTimeout(() => {
    try {
      printFrame.contentWindow?.print();
    } catch {
      // ignore
    }
    setTimeout(() => document.body.removeChild(printFrame), 1000);
  }, 300);
  return true;
}

// ── 1. Sales Sticker (Thermal Adhesive, Landscape) ──────
// Layout: top = firm name, then seller name; then origin full width; then lot id; then buyer mark; then grid (label + value start from left)
export function generateSalesSticker(bid: BidInfo): string {
  const commodity = (bid.commodityName && bid.commodityName.trim()) ? bid.commodityName.trim() : '—';
  return `<!DOCTYPE html><html><head><style>
    @page { size: landscape; margin: 2mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 4mm; }
    .sticker { border: 2px dashed #333; border-radius: 8px; padding: 10px; max-width: 400px; }
    .firm-name { text-align: center; font-size: 13px; font-weight: 900; letter-spacing: 1px; margin-bottom: 2px; }
    .cell { display: flex; align-items: baseline; gap: 6px; padding: 2px 0; font-size: 11px; }
    .cell .lbl { color: #666; font-size: 9px; text-transform: uppercase; font-weight: 600; flex-shrink: 0; }
    .cell .val { font-weight: 800; font-size: 13px; }
    .center-top { text-align: center; font-size: 14px; font-weight: 800; margin-bottom: 4px; }
    .origin-full { text-align: center; font-size: 11px; font-weight: 700; width: 100%; margin-bottom: 6px; word-break: break-word; }
    .lot-big { text-align: center; font-size: 36px; font-weight: 900; padding: 8px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; margin: 6px 0; }
    .mark-big { text-align: center; font-size: 28px; font-weight: 900; letter-spacing: 3px; background: #f0f0f0; border-radius: 6px; padding: 6px; margin: 4px 0; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 2px; }
    @media print { body { margin: 0; padding: 2mm; } }
  </style></head><body>
    <div class="sticker">
      <div class="firm-name">MERCOTRACE</div>
      <div class="center-top">${escapeStickerHtml(bid.sellerName)}</div>
      <div class="origin-full">${escapeStickerHtml(bid.origin || '—')}</div>
      <div class="lot-big">${lotDisplay(bid)}</div>
      <div class="mark-big">[${escapeStickerHtml(bid.buyerMark)}]</div>
      <div class="grid2">
        <div class="cell"><span class="lbl">Sl No</span><span class="val">${bid.sellerSerial}</span></div>
        <div class="cell"><span class="lbl">Qty</span><span class="val">${bid.quantity} bags</span></div>
        <div class="cell"><span class="lbl">Godown</span><span class="val">${escapeStickerHtml(bid.godown || '—')}</span></div>
        <div class="cell"><span class="lbl">V No</span><span class="val">${escapeStickerHtml(bid.vehicleNumber)}</span></div>
        <div class="cell"><span class="lbl">Commodity</span><span class="val">${escapeStickerHtml(commodity)}</span></div>
        <div class="cell"><span class="lbl">Date</span><span class="val">${todayStr()}</span></div>
      </div>
    </div>
  </body></html>`;
}

function escapeStickerHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── 2. Buyer Chiti (80mm thermal) ────────────────────────
export function generateBuyerChiti(buyerName: string, buyerMark: string, bids: BidInfo[], stage: 'post-auction' | 'post-weighing' = 'post-auction'): string {
  const totalQty = bids.reduce((s, b) => s + b.quantity, 0);
  const totalAmt = bids.reduce((s, b) => s + b.quantity * b.rate, 0);
  const rows = bids.map(b => `
    <tr>
      <td>${lotDisplay(b)}</td>
      <td>${b.godown || '—'}</td>
      <td>${b.quantity}</td>
      <td>[${b.buyerMark}]</td>
      <td>₹${b.rate}</td>
      ${stage === 'post-weighing' ? `<td>${b.weight ?? '—'} kg</td>` : ''}
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><style>
    @page { size: 80mm auto; margin: 2mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 4px; width: 76mm; font-size: 11px; }
    .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 4px; margin-bottom: 4px; }
    .header h3 { margin: 2px 0; font-size: 14px; }
    .header small { color: #666; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; }
    .buyer-info { background: #f5f5f5; border-radius: 4px; padding: 6px; margin-bottom: 6px; text-align: center; }
    .buyer-info .mark { font-size: 22px; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #eee; padding: 3px 2px; text-align: left; font-size: 9px; text-transform: uppercase; }
    td { padding: 3px 2px; border-bottom: 1px dotted #ddd; }
    .totals { border-top: 2px solid #333; margin-top: 6px; padding-top: 6px; font-weight: 800; }
    .totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
    .stage { display: none; }
    .powered { text-align: center; font-size: 8px; color: #666; margin-top: 4px; }
    .cut-line { border-top: 1px dashed #999; margin-top: 6px; padding-top: 2px; }
    @media print { body { margin: 0; } }
  </style></head><body>
    <div class="header"><h3>Mercotrace</h3></div>
    <div class="buyer-info">
      <div style="font-size:11px;color:#666">${buyerName}</div>
      <div class="mark">[${buyerMark}]</div>
    </div>
    <table>
      <thead><tr><th>Lot</th><th>Gdwn</th><th>Qty</th><th>Mark</th><th>Rate</th>${stage === 'post-weighing' ? '<th>Wt</th>' : ''}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Total Qty</span><span>${totalQty} bags</span></div>
      <div class="row"><span>Total Amount</span><span>₹${totalAmt.toLocaleString('en-IN')}</span></div>
    </div>
    <div class="powered">Powered by Mercotrace</div>
    <div class="cut-line"></div>
  </body></html>`;
}

// ── 3. Seller Chiti (80mm thermal) ───────────────────────
export function generateSellerChiti(sellerName: string, sellerSerial: number, bids: BidInfo[], stage: 'post-auction' | 'post-weighing' = 'post-auction'): string {
  const totalQty = bids.reduce((s, b) => s + b.quantity, 0);
  const totalAmt = bids.reduce((s, b) => s + b.quantity * b.rate, 0);
  const primaryMark = bids[0]?.buyerMark ?? '';
  const rows = bids.map(b => `
    <tr>
      <td>${lotDisplay(b)}</td>
      <td>[${b.buyerMark}]</td>
      <td>${b.quantity}</td>
      <td>₹${b.rate}</td>
      ${stage === 'post-weighing' ? `<td>${b.weight ?? '—'} kg</td>` : ''}
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><style>
    @page { size: 80mm auto; margin: 2mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 4px; width: 76mm; font-size: 11px; }
    .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 4px; margin-bottom: 4px; }
    .header h3 { margin: 2px 0; font-size: 14px; }
    .header small { color: #666; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; }
    .seller-info { background: #f5f5f5; border-radius: 4px; padding: 6px; margin-bottom: 6px; text-align: center; }
    .seller-info .name { font-size: 13px; font-weight: 800; }
    .seller-info .mark { font-size: 18px; font-weight: 900; letter-spacing: 2px; margin-top: 2px; }
    .seller-info .serial { font-size: 10px; color: #666; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #eee; padding: 3px 2px; text-align: left; font-size: 9px; text-transform: uppercase; }
    td { padding: 3px 2px; border-bottom: 1px dotted #ddd; }
    .totals { border-top: 2px solid #333; margin-top: 6px; padding-top: 6px; font-weight: 800; }
    .totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
    .stage { display: none; }
    .powered { text-align: center; font-size: 8px; color: #666; margin-top: 4px; }
    .cut-line { border-top: 1px dashed #999; margin-top: 6px; padding-top: 2px; }
    @media print { body { margin: 0; } }
  </style></head><body>
    <div class="header"><h3>Mercotrace</h3></div>
    <div class="seller-info">
      <div class="name">${sellerName}</div>
      ${primaryMark ? `<div class="mark">[${primaryMark}]</div>` : ''}
      <div class="serial">S.No: ${sellerSerial}</div>
    </div>
    <table>
      <thead><tr><th>Lot</th><th>Mark</th><th>Qty</th><th>Rate</th>${stage === 'post-weighing' ? '<th>Wt</th>' : ''}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Total Qty</span><span>${totalQty} bags</span></div>
      <div class="row"><span>Total Amount</span><span>₹${totalAmt.toLocaleString('en-IN')}</span></div>
    </div>
    <div class="powered">Powered by Mercotrace</div>
    <div class="cut-line"></div>
  </body></html>`;
}

// ── 4. Sale Pad Print (A5 Portrait) ─────────────────────
export function generateSalePadPrint(bids: BidInfo[]): string {
  const rows = bids.map(b => `
    <tr>
      <td>${b.sellerSerial}</td>
      <td>${b.sellerName}</td>
      <td>${lotDisplay(b)}</td>
      <td>[${b.buyerMark}]</td>
      <td>${b.quantity}</td>
      <td>₹${b.rate}</td>
      <td>₹${b.quantity * b.rate}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><style>
    @page { size: A5 portrait; margin: 8mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 8mm; font-size: 11px; }
    ${firmHeaderCSS()}
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #333; color: #fff; padding: 4px 6px; font-size: 9px; text-transform: uppercase; text-align: left; }
    td { padding: 4px 6px; border-bottom: 1px solid #ddd; font-size: 10px; }
    tr:nth-child(even) { background: #f9f9f9; }
    @media print { body { margin: 0; padding: 8mm; } }
  </style></head><body>
    ${firmHeader()}
    <table>
      <thead><tr><th>Sl</th><th>Seller</th><th>Lot</th><th>Mark</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`;
}

// ── 5. Tender Slip for Buyers (A4 Landscape, Triplicate) ─
export function generateTenderSlip(bids: BidInfo[]): string {
  const rows = bids.map(b => `<tr><td>${lotDisplay(b)}</td><td>${b.quantity}</td><td>₹${b.rate}</td></tr>`).join('');
  const singleSlip = `<div class="slip">
    <div class="firm-header">
      <div class="firm-name">MERCOTRACE</div>
      <div class="firm-line">Agricultural Produce Market Committee</div>
      <div class="firm-line">APMC Market Yard</div>
      <div class="info-row">
        <span class="lbl">APMC Code</span>
        <span class="val">MT-001</span>
      </div>
      <div class="info-row">
        <span class="lbl">Date</span>
        <span class="val">${todayStr()}</span>
      </div>
    </div>
    <table><thead><tr><th>LOT</th><th>BAGS</th><th>RATE</th></tr></thead><tbody>${rows}</tbody></table>
  </div>`;

  return `<!DOCTYPE html><html><head><style>
    @page { size: A4 landscape; margin: 6mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 6mm; }
    .triplicate { display: flex; flex-direction: row; gap: 8px; }
    .slip { border: 1px solid #ccc; border-radius: 4px; padding: 8px; page-break-inside: avoid; flex: 1 1 0; }
    .firm-header { text-align: center; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
    .firm-name { font-size: 16px; font-weight: 900; text-transform: uppercase; }
    .firm-line { font-size: 10px; color: #555; }
    .info-row { display: flex; align-items: baseline; gap: 6px; font-size: 10px; margin-top: 2px; }
    .info-row .lbl { color: #666; font-size: 9px; text-transform: uppercase; font-weight: 400; flex-shrink: 0; }
    .info-row .val { font-weight: 700; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #eee; padding: 3px 6px; font-size: 10px; text-transform: uppercase; text-align: left; border: 1px solid #ccc; }
    td { padding: 3px 6px; font-size: 11px; border: 1px solid #ddd; }
    @media print { body { margin: 0; padding: 6mm; } }
  </style></head><body>
    <div class="triplicate">
      ${singleSlip}
      ${singleSlip}
      ${singleSlip}
    </div>
  </body></html>`;
}

// ── 6. Dispatch Control for Coolie (A5 Portrait) ────────
export function generateDispatchControl(bids: BidInfo[]): string {
  const sellerGroups: Record<string, BidInfo[]> = {};
  bids.forEach(b => {
    const key = b.sellerName;
    if (!sellerGroups[key]) sellerGroups[key] = [];
    sellerGroups[key].push(b);
  });

  let sections = '';
  Object.entries(sellerGroups).forEach(([seller, sBids]) => {
    const sellerQty = sBids.reduce((s, b) => s + b.quantity, 0);
    sections += `<div class="seller-block">
      <div class="seller-head">
        <span class="sname">${seller}</span>
        <span class="sqty">Total: ${sellerQty} bags</span>
      </div>`;
    sBids.forEach((b, idx) => {
      sections += `<div class="lot-row">
        <span>Sr ${idx + 1}</span>
        <span>Lot ${lotDisplay(b)}</span>
        <span>Gdwn: ${b.godown || '—'}</span>
        <span>[${b.buyerMark}]</span>
        <span>${b.quantity} bags</span>
      </div>`;
    });
    sections += `</div>`;
  });

  return `<!DOCTYPE html><html><head><style>
    @page { size: A5 portrait; margin: 6mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 6mm; font-size: 11px; }
    .title { text-align: center; font-size: 14px; font-weight: 900; margin-bottom: 8px; border-bottom: 2px solid #333; padding-bottom: 4px; }
    .seller-block { margin-bottom: 8px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
    .seller-head { background: #333; color: #fff; padding: 4px 8px; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; }
    .lot-row { display: flex; justify-content: space-between; padding: 3px 8px; font-size: 10px; border-bottom: 1px dotted #eee; }
    .lot-row:last-child { border-bottom: none; }
    @media print { body { margin: 0; padding: 6mm; } }
  </style></head><body>
    <div class="title">Dispatch Control - Coolie</div>
    ${sections}
  </body></html>`;
}

function firmHeaderCSS(): string {
  return `.firm-header { text-align: center; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
    .firm-name { font-size: 16px; font-weight: 900; text-transform: uppercase; }
    .firm-line { font-size: 10px; color: #555; }
    .firm-info-row { display: flex; align-items: baseline; gap: 6px; font-size: 10px; margin-top: 2px; justify-content: center; }
    .firm-lbl { color: #666; font-size: 9px; text-transform: uppercase; font-weight: 400; flex-shrink: 0; }
    .firm-val { font-weight: 700; font-size: 10px; }`;
}
