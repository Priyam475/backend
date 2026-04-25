import type { ArrivalSellerFullDetail } from '@/services/api/arrivals';
import type { LotSummaryDTO } from '@/services/api/auction';
import { formatAuctionLotIdentifier } from '@/utils/auctionLotIdentifier';

export function sellerKeyFromArrivalSeller(s: ArrivalSellerFullDetail): string {
  const name = (s.sellerName ?? '').trim().toLowerCase();
  const mark = (s.sellerMark ?? '').trim().toLowerCase();
  const cid = s.contactId != null ? String(s.contactId) : '';
  return `${cid}|${name}|${mark}`;
}

/** Match arrival seller to auction lot row (same vehicle list is pre-filtered). */
export function lotSummaryBelongsToSeller(lot: LotSummaryDTO, seller: ArrivalSellerFullDetail): boolean {
  const ln = (lot.seller_name ?? '').trim().toLowerCase();
  const lm = (lot.seller_mark ?? '').trim().toLowerCase();
  const sn = (seller.sellerName ?? '').trim().toLowerCase();
  const sm = (seller.sellerMark ?? '').trim().toLowerCase();
  return ln === sn && lm === sm;
}

function pickVehicleMark(dto: LotSummaryDTO): string | undefined {
  const v = dto.vehicle_mark?.trim();
  if (v) return v;
  return undefined;
}

export function formatLotLabelFromSummary(lot: LotSummaryDTO): string {
  const vTotal = lot.vehicle_total_qty ?? lot.bag_count;
  const sTotal = lot.seller_total_qty ?? lot.bag_count;
  const lotName = lot.lot_name ?? String(lot.bag_count);
  return formatAuctionLotIdentifier({
    vehicleMark: pickVehicleMark(lot),
    vehicleTotalQty: vTotal,
    sellerMark: lot.seller_mark,
    sellerTotalQty: sTotal,
    lotName,
    lotQty: lot.bag_count,
  });
}

/**
 * Sidebar "Sold / Pending" uses bag totals across this seller's lots (LotSummaryDTO.sold_bags vs remainder).
 * Lot-level completion is a separate concept; bags match Sales Pad / summary cards.
 */
export function sellerBagSoldPending(lots: LotSummaryDTO[]): { sold: number; pending: number } {
  let sold = 0;
  let pending = 0;
  for (const l of lots) {
    const sb = l.sold_bags ?? 0;
    const bc = l.bag_count ?? 0;
    sold += sb;
    pending += Math.max(0, bc - sb);
  }
  return { sold, pending };
}
