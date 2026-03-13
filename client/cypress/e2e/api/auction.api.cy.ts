/**
 * API-only Cypress tests for Auctions (Sales Pad) module:
 * - GET  /api/module-auctions/lots
 * - GET  /api/module-auctions/lots/{lotId}/session
 * - POST /api/module-auctions/lots/{lotId}/session/bids
 * - PATCH /api/module-auctions/lots/{lotId}/session/bids/{bidId}
 * - POST /api/module-auctions/lots/{lotId}/complete
 * - GET  /api/module-auctions/results
 * - GET  /api/module-auctions/results/lots/{lotId}
 * - GET  /api/module-auctions/results/bids/{bidNumber}
 *
 * Happy-path coverage aligned with Postman Auction collection.
 *
 * Env variables (kept in sync with Postman collection variables):
 * - baseUrl      → backend base URL (default http://localhost:8080)
 * - traderLogin  → trader username (email / phone)
 * - traderPassword → trader password
 * - lotId        → lot id to use (optional; falls back to first lot)
 * - bidNumber    → bid number to verify result (optional; falls back to created bid)
 * - page, size   → pagination for list endpoints (optional; defaults 0/20)
 */

const MODULE_AUCTIONS = '/api/module-auctions';
const LOTS = `${MODULE_AUCTIONS}/lots`;
const RESULTS = `${MODULE_AUCTIONS}/results`;

const SENSITIVE_KEYS = ['password', 'passwordHash', 'secretKey', 'refreshToken', 'token'];

function apiUrl(): string {
  const fromPostman = Cypress.env('baseUrl') as string | undefined;
  const fromApiUrl = Cypress.env('apiUrl') as string | undefined;
  const fromApiUrlUpper = Cypress.env('API_URL') as string | undefined;
  return fromPostman || fromApiUrl || fromApiUrlUpper || 'http://localhost:8080';
}

function envNumber(name: string): number | null {
  const raw = Cypress.env(name) as string | number | undefined;
  if (typeof raw === 'number') {
    return raw;
  }
  if (typeof raw === 'string') {
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function expectNoSensitiveData(body: unknown): void {
  if (body === null || typeof body !== 'object') return;
  const obj = body as Record<string, unknown>;
  for (const key of SENSITIVE_KEYS) {
    expect(obj, `Security: response must not expose "${key}"`).to.not.have.property(key);
  }
}

interface AuctionTestContext {
  traderToken: string | null;
  lotId: number | null;
  createdBidId: number | null;
  createdBidNumber: number | null;
}

describe('Auctions (Sales Pad) API – happy path', () => {
  const ctx: AuctionTestContext = {
    traderToken: null,
    lotId: null,
    createdBidId: null,
    createdBidNumber: null,
  };

  before(function () {
    // Keep variable names aligned with Postman collection (traderLogin/traderPassword)
    // while still supporting existing CYPRESS_TRADER_LOGIN / CYPRESS_TRADER_PASSWORD envs.
    const login =
      (Cypress.env('traderLogin') as string | undefined) ||
      (Cypress.env('TRADER_LOGIN') as string | undefined);
    const password =
      (Cypress.env('traderPassword') as string | undefined) ||
      (Cypress.env('TRADER_PASSWORD') as string | undefined);

    if (!login || !password) {
      cy.log('CYPRESS_traderLogin / CYPRESS_traderPassword (or TRADER_LOGIN / TRADER_PASSWORD) not set; skipping Auctions API tests');
      this.skip();
      return;
    }

    // 1) Trader login → JWT with AUCTIONS_* authorities.
    cy.request({
      method: 'POST',
      url: `${apiUrl()}/api/auth/login`,
      body: {
        username: login,
        password,
      },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status !== 200) {
        cy.log(`Trader login failed with status ${res.status}; skipping Auctions API tests`);
        this.skip();
        return;
      }
      const h = res.headers['authorization'] || res.headers['Authorization'];
      const headerVal = Array.isArray(h) ? h[0] : h;
      expect(headerVal, 'Authorization header with Bearer trader token should be present').to.be.a('string');
      const token = (headerVal as string).replace(/^Bearer\s+/i, '').trim();
      expect(token.length, 'TRADER JWT token length').to.be.greaterThan(10);
      ctx.traderToken = token;

      // 2) Allow overriding lotId via Cypress env (kept in sync with Postman collection variable "lotId").
      const envLotId = envNumber('lotId');
      if (envLotId !== null) {
        ctx.lotId = envLotId;
        return;
      }

      // 3) Discover one lot from /api/module-auctions/lots for functional flows when lotId is not provided.
      const page = envNumber('page') ?? 0;
      const size = envNumber('size') ?? 20;
      return cy
        .request({
          method: 'GET',
          url: `${apiUrl()}${LOTS}?page=${page}&size=${size}`,
          headers: authHeaders(token),
          failOnStatusCode: false,
        })
        .then((lotsRes) => {
          if (lotsRes.status !== 200 || !Array.isArray(lotsRes.body) || lotsRes.body.length === 0) {
            cy.log('Auctions API: no lots available for current trader; functional tests depending on lot will be skipped');
            return;
          }
          const first = lotsRes.body[0] as { lot_id?: number };
          if (typeof first.lot_id === 'number') {
            ctx.lotId = first.lot_id;
          }
        });
    });
  });

  describe('Sales Pad auction flow (happy path only)', function () {
    before(function () {
      if (!ctx.traderToken) {
        this.skip();
        return;
      }
      if (!ctx.lotId) {
        cy.log('Auctions API: lotId was not resolved; skipping auction flow tests');
        this.skip();
      }
    });

    it('GET /api/module-auctions/lots returns paginated LotSummaryDTO list with pagination headers', function () {
      if (!ctx.traderToken) {
        this.skip();
        return;
      }
      const page = envNumber('page') ?? 0;
      const size = envNumber('size') ?? 20;
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${LOTS}?page=${page}&size=${size}`,
        headers: authHeaders(ctx.traderToken),
      }).then((res) => {
        expect(res.status).to.eq(200);
        const headers = res.headers as Record<string, string>;
        expect(
          headers['x-total-count'] ?? headers['X-Total-Count'],
          'X-Total-Count header should be present on Auction lots list',
        ).to.exist;
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body) && res.body.length > 0) {
          const first = res.body[0] as any;
          expect(first).to.have.property('lot_id');
          expect(first).to.have.property('lot_name');
          expect(first).to.have.property('bag_count');
          expect(first).to.have.property('status');
          expectNoSensitiveData(first);
        }
      });
    });

    it('GET /api/module-auctions/lots/{lotId}/session returns AuctionSessionDTO for existing lot', function () {
      if (!ctx.traderToken || !ctx.lotId) {
        this.skip();
        return;
      }
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${LOTS}/${ctx.lotId}/session`,
        headers: authHeaders(ctx.traderToken),
      }).then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as any;
        expect(body).to.have.property('auction_id');
        expect(body).to.have.property('lot');
        expect(body).to.have.property('entries').that.is.an('array');
        expect(body).to.have.property('total_sold_bags');
        expect(body).to.have.property('remaining_bags');
        expect(body).to.have.property('highest_bid_rate');
        expect(body).to.have.property('status');
        expectNoSensitiveData(body);
      });
    });

    it('POST /api/module-auctions/lots/{lotId}/session/bids creates a bid and returns updated AuctionSessionDTO (or reuses existing bids when lot is full)', function () {
      if (!ctx.traderToken || !ctx.lotId) {
        this.skip();
        return;
      }

      const quantity = 1;
      const payload = {
        buyer_id: null,
        buyer_name: 'Cypress Buyer',
        buyer_mark: 'CB',
        is_scribble: false,
        is_self_sale: false,
        rate: 100,
        quantity,
        extra_rate: 0,
        preset_applied: 0,
        preset_type: 'PROFIT',
        token_advance: 0,
        allow_lot_increase: false,
      };

      cy.request({
        method: 'POST',
        url: `${apiUrl()}${LOTS}/${ctx.lotId}/session/bids`,
        headers: { ...authHeaders(ctx.traderToken), 'Content-Type': 'application/json' },
        body: payload,
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 409]).to.include(res.status);

        if (res.status === 409) {
          cy.log(
            'Auctions API: bid create returned 409 conflict (lot quantity exceeded); reusing existing bids for subsequent happy-path checks',
          );
          return;
        }

        const body = res.body as any;
        expect(body).to.have.property('entries').that.is.an('array');
        expect(body.entries.length).to.be.greaterThan(0);
        const lastEntry = body.entries[body.entries.length - 1] as any;
        expect(lastEntry).to.have.property('auction_entry_id');
        expect(lastEntry).to.have.property('bid_number');
        expect(lastEntry).to.have.property('buyer_name', 'Cypress Buyer');
        expect(lastEntry).to.have.property('buyer_mark', 'CB');
        expect(lastEntry).to.have.property('quantity', quantity);
        expectNoSensitiveData(lastEntry);

        ctx.createdBidId = lastEntry.auction_entry_id as number;
        ctx.createdBidNumber = lastEntry.bid_number as number;
      });
    });

    it('PATCH /api/module-auctions/lots/{lotId}/session/bids/{bidId} updates editable fields on bid', function () {
      if (!ctx.traderToken || !ctx.lotId || !ctx.createdBidId) {
        this.skip();
        return;
      }
      const updatePayload = {
        token_advance: 50,
        extra_rate: 5,
        preset_applied: 2,
        preset_type: 'PROFIT',
      };
      cy.request({
        method: 'PATCH',
        url: `${apiUrl()}${LOTS}/${ctx.lotId}/session/bids/${ctx.createdBidId}`,
        headers: { ...authHeaders(ctx.traderToken), 'Content-Type': 'application/json' },
        body: updatePayload,
      }).then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as any;
        expect(body).to.have.property('entries').that.is.an('array');
        const updated = (body.entries as any[]).find((e) => e.auction_entry_id === ctx.createdBidId);
        expect(updated, 'Updated bid should be present in entries').to.exist;
        if (updated) {
          expect(updated).to.have.property('token_advance');
          expect(updated).to.have.property('extra_rate');
          expect(updated).to.have.property('preset_margin');
          expect(updated).to.have.property('preset_type');
          expectNoSensitiveData(updated);
        }
      });
    });

    it('POST /api/module-auctions/lots/{lotId}/complete completes auction with bids and returns AuctionResultDTO', function () {
      if (!ctx.traderToken || !ctx.lotId) {
        this.skip();
        return;
      }

      cy.request({
        method: 'POST',
        url: `${apiUrl()}${LOTS}/${ctx.lotId}/complete`,
        headers: authHeaders(ctx.traderToken),
      }).then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as any;
        expect(body).to.have.property('auction_id');
        expect(body).to.have.property('lotId');
        expect(body).to.have.property('entries').that.is.an('array');
        if (Array.isArray(body.entries) && body.entries.length > 0) {
          const entry = body.entries[0] as any;
          expect(entry).to.have.property('bidNumber');
          // Prefer the result bid number if not already captured from session.
          if (!ctx.createdBidNumber) {
            ctx.createdBidNumber = entry.bidNumber as number;
          }
        }
        expectNoSensitiveData(body);
      });
    });

    it('GET /api/module-auctions/results returns AuctionResultDTO list with pagination headers', function () {
      if (!ctx.traderToken) {
        this.skip();
        return;
      }
      const page = envNumber('page') ?? 0;
      const size = envNumber('size') ?? 20;
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${RESULTS}?page=${page}&size=${size}`,
        headers: authHeaders(ctx.traderToken),
      }).then((res) => {
        expect(res.status).to.eq(200);
        const headers = res.headers as Record<string, string>;
        expect(
          headers['x-total-count'] ?? headers['X-Total-Count'],
          'X-Total-Count header should be present on Auction results list',
        ).to.exist;
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body) && res.body.length > 0) {
          const first = res.body[0] as any;
          expect(first).to.have.property('auction_id');
          expect(first).to.have.property('lotId');
          expect(first).to.have.property('entries').that.is.an('array');
          expectNoSensitiveData(first);
        }
      });
    });

    it('GET /api/module-auctions/results/lots/{lotId} returns AuctionResultDTO for completed lot', function () {
      if (!ctx.traderToken || !ctx.lotId) {
        this.skip();
        return;
      }
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${RESULTS}/lots/${ctx.lotId}`,
        headers: authHeaders(ctx.traderToken),
      }).then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as any;
        expect(body).to.have.property('auction_id');
        expect(body).to.have.property('lotId', ctx.lotId);
        expect(body).to.have.property('entries').that.is.an('array');
        expectNoSensitiveData(body);
      });
    });

    it('GET /api/module-auctions/results/bids/{bidNumber} returns AuctionResultDTO for created bid', function () {
      if (!ctx.traderToken) {
        this.skip();
        return;
      }
      const envBidNumber = envNumber('bidNumber');
      const bidNumber = envBidNumber ?? ctx.createdBidNumber;
      if (!bidNumber) {
        cy.log('Auctions API: bidNumber not available from env or flow; skipping result-by-bid test');
        this.skip();
        return;
      }
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${RESULTS}/bids/${bidNumber}`,
        headers: authHeaders(ctx.traderToken),
      }).then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as any;
        expect(body).to.have.property('auction_id');
        expect(body).to.have.property('entries').that.is.an('array');
        if (Array.isArray(body.entries) && body.entries.length > 0) {
          const entry = body.entries[0] as any;
          expect(entry).to.have.property('bidNumber');
        }
        expectNoSensitiveData(body);
      });
    });
  });
});

