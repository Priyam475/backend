/**
 * API-only Cypress tests for Settlement (Sales Patti) module:
 * - GET  /api/settlements/sellers
 * - GET  /api/settlements/pattis
 * - GET  /api/settlements/pattis/{id}
 * - GET  /api/settlements/sellers/{sellerId}/charges
 * - POST /api/settlements/pattis
 * - PUT  /api/settlements/pattis/{id}
 *
 * Aligned with:
 * - SettlementResource
 * - SettlementService / SettlementDTOs
 *
 * Frontend usage:
 * - SettlementPage.tsx uses settlementApi.* and printLogApi.create('SALES_PATTI').
 */

const SETTLEMENTS_BASE = '/api/settlements';
const SETTLEMENT_SELLERS = `${SETTLEMENTS_BASE}/sellers`;
const SETTLEMENT_PATTIS = `${SETTLEMENTS_BASE}/pattis`;

function apiUrl(): string {
  return Cypress.env('apiUrl') || 'http://localhost:8080';
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

interface SettlementTestContext {
  traderToken: string | null;
  sellerId: string | null;
  createdPattiId: number | null;
}

describe('Settlement (Sales Patti) API', () => {
  const ctx: SettlementTestContext = {
    traderToken: null,
    sellerId: null,
    createdPattiId: null,
  };

  before(function () {
    const login = Cypress.env('traderLogin') as string | undefined;
    const password = Cypress.env('traderPassword') as string | undefined;

    if (!login || !password) {
      cy.log('CYPRESS_traderLogin / CYPRESS_traderPassword not set; skipping Settlement API tests');
      this.skip();
      return;
    }

    cy.request({
      method: 'POST',
      url: `${apiUrl()}/api/auth/login`,
      body: { username: login, password },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status !== 200) {
        cy.log(`Trader login failed with status ${res.status}; skipping Settlement API tests`);
        this.skip();
        return;
      }
      const h = res.headers['authorization'] || res.headers['Authorization'];
      const headerVal = Array.isArray(h) ? h[0] : h;
      expect(headerVal, 'Authorization header with Bearer trader token should be present').to.be.a('string');
      const token = (headerVal as string).replace(/^Bearer\s+/i, '').trim();
      expect(token.length, 'TRADER JWT token length').to.be.greaterThan(10);
      ctx.traderToken = token;
    });
  });

  describe('Sellers list and pattis', function () {
    before(function () {
      if (!ctx.traderToken) this.skip();
    });

    it('GET /api/settlements/sellers returns paginated SellerSettlementDTO list', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${SETTLEMENT_SELLERS}?page=0&size=20`,
        headers: authHeaders(ctx.traderToken!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        const headers = res.headers as Record<string, string>;
        expect(headers['x-total-count'] ?? headers['X-Total-Count'], 'X-Total-Count header should be present').to.exist;
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body) && res.body.length > 0) {
          const first = res.body[0] as any;
          expect(first).to.have.property('sellerId');
          expect(first).to.have.property('sellerName');
          expect(first).to.have.property('lots').that.is.an('array');
          ctx.sellerId = first.sellerId as string;
        }
      });
    });

    it('GET /api/settlements/pattis returns paginated list of pattis', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${SETTLEMENT_PATTIS}?page=0&size=20`,
        headers: authHeaders(ctx.traderToken!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        const headers = res.headers as Record<string, string>;
        expect(headers['x-total-count'] ?? headers['X-Total-Count'], 'X-Total-Count header should be present').to.exist;
        expect(res.body).to.be.an('array');
      });
    });

    it('GET /api/settlements/sellers/{sellerId}/charges returns freight/advance summary when sellerId is available', function () {
      if (!ctx.sellerId) {
        this.skip();
        return;
      }
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${SETTLEMENT_SELLERS}/${encodeURIComponent(ctx.sellerId!)}/charges`,
        headers: authHeaders(ctx.traderToken!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as any;
        expect(body).to.have.property('freight');
        expect(body).to.have.property('advance');
      });
    });

    it('POST /api/settlements/pattis creates a Sales Patti', function () {
      if (!ctx.sellerId) {
        this.skip();
        return;
      }
      const payload = {
        sellerId: ctx.sellerId,
        sellerName: 'Settlement Cypress Seller',
        rateClusters: [
          {
            rate: 1000,
            totalQuantity: 10,
            totalWeight: 500,
            amount: 500000,
          },
        ],
        grossAmount: 500000,
        deductions: [
          {
            key: 'freight',
            label: 'Freight',
            amount: 1000,
            editable: true,
            autoPulled: false,
          },
        ],
        totalDeductions: 1000,
        netPayable: 499000,
        useAverageWeight: false,
      };
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${SETTLEMENT_PATTIS}`,
        headers: { ...authHeaders(ctx.traderToken!), 'Content-Type': 'application/json' },
        body: payload,
      }).then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as any;
        expect(body).to.have.property('id');
        expect(body).to.have.property('pattiId');
        expect(body).to.have.property('sellerName', payload.sellerName);
        ctx.createdPattiId = body.id as number;
      });
    });

    it('GET /api/settlements/pattis/{id} returns created patti', function () {
      if (!ctx.createdPattiId) {
        this.skip();
        return;
      }
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${SETTLEMENT_PATTIS}/${ctx.createdPattiId}`,
        headers: authHeaders(ctx.traderToken!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as any;
        expect(body).to.have.property('id', ctx.createdPattiId);
        expect(body).to.have.property('pattiId');
        expect(body).to.have.property('rateClusters').that.is.an('array');
      });
    });

    it('PUT /api/settlements/pattis/{id} updates deductions on patti', function () {
      if (!ctx.createdPattiId) {
        this.skip();
        return;
      }
      const payload = {
        sellerId: ctx.sellerId,
        sellerName: 'Settlement Cypress Seller Updated',
        rateClusters: [
          {
            rate: 1000,
            totalQuantity: 10,
            totalWeight: 500,
            amount: 500000,
          },
        ],
        grossAmount: 500000,
        deductions: [
          {
            key: 'freight',
            label: 'Freight',
            amount: 2000,
            editable: true,
            autoPulled: false,
          },
        ],
        totalDeductions: 2000,
        netPayable: 498000,
        useAverageWeight: false,
      };
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${SETTLEMENT_PATTIS}/${ctx.createdPattiId}`,
        headers: { ...authHeaders(ctx.traderToken!), 'Content-Type': 'application/json' },
        body: payload,
      }).then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as any;
        expect(body).to.have.property('sellerName', payload.sellerName);
        expect(body).to.have.property('totalDeductions');
      });
    });
  });
});

