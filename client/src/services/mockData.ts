// ============================================================
// Mercotrace — Seed / Mock Data for localStorage persistence
// ============================================================

import type {
  Trader, User, BusinessCategory, Commodity, CommodityConfiguration,
  Contact, Vehicle, DailySummary
} from '@/types/models';

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export const SEED_CATEGORIES: BusinessCategory[] = [
  { category_id: id(), category_name: 'Vegetables', is_active: true, created_at: now(), updated_at: now() },
  { category_id: id(), category_name: 'Fruits', is_active: true, created_at: now(), updated_at: now() },
  { category_id: id(), category_name: 'Grains', is_active: true, created_at: now(), updated_at: now() },
  { category_id: id(), category_name: 'Spices', is_active: true, created_at: now(), updated_at: now() },
  { category_id: id(), category_name: 'Pulses', is_active: true, created_at: now(), updated_at: now() },
  { category_id: id(), category_name: 'Dry Fruits', is_active: true, created_at: now(), updated_at: now() },
  { category_id: id(), category_name: 'Oil Seeds', is_active: true, created_at: now(), updated_at: now() },
];

export const SEED_COMMODITIES: Commodity[] = [
  { commodity_id: id(), trader_id: '', commodity_name: 'Onion', created_at: now() },
  { commodity_id: id(), trader_id: '', commodity_name: 'Potato', created_at: now() },
  { commodity_id: id(), trader_id: '', commodity_name: 'Dry Chili', created_at: now() },
  { commodity_id: id(), trader_id: '', commodity_name: 'Tomato', created_at: now() },
];

export const SEED_COMMODITY_CONFIGS: CommodityConfiguration[] = [
  { config_id: id(), commodity_id: '', rate_per_unit: 90, min_weight: 50, max_weight: 500, govt_deduction_enabled: false, roundoff_enabled: false, commission_percent: 0, user_fee_percent: 0, hsn_code: '', created_at: now() },
  { config_id: id(), commodity_id: '', rate_per_unit: 50, min_weight: 40, max_weight: 400, govt_deduction_enabled: false, roundoff_enabled: false, commission_percent: 0, user_fee_percent: 0, hsn_code: '', created_at: now() },
  { config_id: id(), commodity_id: '', rate_per_unit: 100, min_weight: 10, max_weight: 200, govt_deduction_enabled: true, roundoff_enabled: false, commission_percent: 0, user_fee_percent: 0, hsn_code: '', created_at: now() },
  { config_id: id(), commodity_id: '', rate_per_unit: 60, min_weight: 20, max_weight: 300, govt_deduction_enabled: false, roundoff_enabled: true, commission_percent: 0, user_fee_percent: 0, hsn_code: '', created_at: now() },
];

export const SEED_CONTACTS: Contact[] = [
  { contact_id: id(), trader_id: '', name: 'Ramesh Kumar', phone: '9876543210', mark: '', address: 'Village Pune', type: 'SELLER', opening_balance: 0, current_balance: 15000, created_at: now() },
  { contact_id: id(), trader_id: '', name: 'Suresh Patil', phone: '9876543211', mark: '', address: 'Village Nashik', type: 'SELLER', opening_balance: 0, current_balance: 8500, created_at: now() },
  { contact_id: id(), trader_id: '', name: 'Vijay Traders', phone: '9876543220', mark: 'VT', address: 'Market Yard', type: 'BUYER', opening_balance: 0, current_balance: -25000, created_at: now() },
  { contact_id: id(), trader_id: '', name: 'Mahalaxmi Store', phone: '9876543221', mark: 'ML', address: 'Main Road', type: 'BUYER', opening_balance: 0, current_balance: -12000, created_at: now() },
  { contact_id: id(), trader_id: '', name: 'Anil Broker', phone: '9876543230', mark: 'AB', address: 'Broker Lane', type: 'BROKER', opening_balance: 0, current_balance: 5000, created_at: now() },
];

export const SEED_DAILY_SUMMARY: DailySummary = {
  date: new Date().toISOString().split('T')[0],
  totalArrivals: 8,
  totalLots: 24,
  totalAuctions: 18,
  totalBills: 12,
  totalRevenue: 245000,
  totalCollected: 180000,
  totalPending: 65000,
};

const SEED_TRADER: Trader = {
  trader_id: 'trader-001',
  business_name: 'Krishna Trading Co.',
  owner_name: 'Rajesh Sharma',
  mobile: '9876543200',
  email: 'demo@mercotrace.com',
  address: 'Market Yard, Pune',
  city: 'Pune',
  state: 'Maharashtra',
  pin_code: '411001',
  category: 'Vegetables',
  approval_status: 'APPROVED',
  bill_prefix: 'KT',
  shop_photos: [],
  created_at: now(),
  updated_at: now(),
};

const SEED_USER = {
  user_id: 'user-001',
  trader_id: 'trader-001',
  username: 'demo@mercotrace.com',
  password: 'demo123',
  name: 'Rajesh Sharma',
  is_active: true,
  role: 'TRADER' as const,
  created_at: now(),
};

// ── Seed Arrival + Auction Data for end-to-end testing ────

const SEED_ARRIVAL_RECORDS = () => {
  const sellerId1 = crypto.randomUUID();
  const sellerId2 = crypto.randomUUID();
  const lotId1 = crypto.randomUUID();
  const lotId2 = crypto.randomUUID();
  const lotId3 = crypto.randomUUID();

  const arrivals = [{
    id: crypto.randomUUID(),
    vehicle: { vehicle_id: crypto.randomUUID(), vehicle_number: 'KA01AB1234', loaded_weight: 5000, empty_weight: 2000, deducted_weight: 100, net_weight: 2900 },
    sellers: [
      {
        seller_vehicle_id: sellerId1,
        contact_id: 'c1',
        seller_name: 'Ramesh Kumar',
        seller_mark: 'RK',
        lots: [
          { lot_id: lotId1, lot_name: 'Lot-1', quantity: 30, commodity_name: 'Onion', broker_tag: '' },
          { lot_id: lotId2, lot_name: 'Lot-2', quantity: 20, commodity_name: 'Tomato', broker_tag: '' },
        ],
      },
      {
        seller_vehicle_id: sellerId2,
        contact_id: 'c2',
        seller_name: 'Suresh Patil',
        seller_mark: 'SP',
        lots: [
          { lot_id: lotId3, lot_name: 'Lot-3', quantity: 25, commodity_name: 'Onion', broker_tag: '' },
        ],
      },
    ],
    freight: { method: 'BY_WEIGHT', rate: 10, total: 29000, advance: 5000 },
    created_at: now(),
  }];

  const auctionResults = [
    {
      lotId: lotId1, lotName: 'Lot-1', commodityName: 'Onion', sellerName: 'Ramesh Kumar', vehicleNumber: 'KA01AB1234',
      entries: [
        { bidNumber: 1, buyerMark: 'VT', buyerName: 'Vijay Traders', buyerContactId: 'c3', rate: 800, quantity: 15, isSelfSale: false, presetApplied: 10 },
        { bidNumber: 2, buyerMark: 'ML', buyerName: 'Mahalaxmi Store', buyerContactId: 'c4', rate: 850, quantity: 15, isSelfSale: false, presetApplied: 20 },
      ],
    },
    {
      lotId: lotId2, lotName: 'Lot-2', commodityName: 'Tomato', sellerName: 'Ramesh Kumar', vehicleNumber: 'KA01AB1234',
      entries: [
        { bidNumber: 3, buyerMark: 'VT', buyerName: 'Vijay Traders', buyerContactId: 'c3', rate: 600, quantity: 20, isSelfSale: false, presetApplied: 10 },
      ],
    },
    {
      lotId: lotId3, lotName: 'Lot-3', commodityName: 'Onion', sellerName: 'Suresh Patil', vehicleNumber: 'KA01AB1234',
      entries: [
        { bidNumber: 4, buyerMark: 'ML', buyerName: 'Mahalaxmi Store', buyerContactId: 'c4', rate: 820, quantity: 10, isSelfSale: false, presetApplied: 15 },
        { bidNumber: 5, buyerMark: 'VT', buyerName: 'Vijay Traders', buyerContactId: 'c3', rate: 790, quantity: 15, isSelfSale: false, presetApplied: 10 },
      ],
    },
  ];

  const weighingSessions = [
    { bid_number: 1, net_weight: 750, bags: 15 },
    { bid_number: 2, net_weight: 780, bags: 15 },
    { bid_number: 3, net_weight: 1000, bags: 20 },
    { bid_number: 4, net_weight: 500, bags: 10 },
    { bid_number: 5, net_weight: 720, bags: 15 },
  ];

  const vouchers = [
    { voucher_id: crypto.randomUUID(), reference_type: 'FREIGHT', reference_id: arrivals[0].id, amount: 29000, status: 'OPEN', created_at: now() },
    { voucher_id: crypto.randomUUID(), reference_type: 'ADVANCE', reference_id: arrivals[0].id, amount: 5000, status: 'OPEN', created_at: now() },
  ];

  return { arrivals, auctionResults, weighingSessions, vouchers };
};

export function initializeMockData() {
  if (!localStorage.getItem('mkt_initialized')) {
    localStorage.setItem('mkt_categories', JSON.stringify(SEED_CATEGORIES));
    localStorage.setItem('mkt_commodities', JSON.stringify(SEED_COMMODITIES));
    localStorage.setItem('mkt_commodity_configs', JSON.stringify(SEED_COMMODITY_CONFIGS));
    localStorage.setItem('mkt_contacts', JSON.stringify(SEED_CONTACTS));
    localStorage.setItem('mkt_vehicles', JSON.stringify([]));
    localStorage.setItem('mkt_lots', JSON.stringify([]));
    // mkt_auctions: not used; auction data is API-only. Not seeding to avoid leftover keys.
    localStorage.setItem('mkt_vouchers', JSON.stringify([]));
    localStorage.setItem('mkt_ledger', JSON.stringify([]));
    localStorage.setItem('mkt_users', JSON.stringify([SEED_USER]));
    localStorage.setItem('mkt_traders', JSON.stringify([SEED_TRADER]));
    localStorage.setItem('mkt_initialized', 'true');
  }
  if (!localStorage.getItem('mkt_users')) {
    localStorage.setItem('mkt_users', JSON.stringify([SEED_USER]));
    localStorage.setItem('mkt_traders', JSON.stringify([SEED_TRADER]));
  }

  // Seed arrival/auction data if not already present
  if (!localStorage.getItem('mkt_seed_v2')) {
    const seed = SEED_ARRIVAL_RECORDS();
    localStorage.setItem('mkt_arrival_records', JSON.stringify(seed.arrivals));
    // Auction results are API-only. Do not seed mkt_auction_results so new users never fall back to stale local data.
    localStorage.setItem('mkt_weighing_sessions', JSON.stringify(seed.weighingSessions));
    localStorage.setItem('mkt_vouchers', JSON.stringify(seed.vouchers));
    localStorage.setItem('mkt_seed_v2', 'true');
  }
}
