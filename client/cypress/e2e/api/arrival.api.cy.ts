/**
 * API-only Cypress tests for Trader Arrival aggregate (inward logistics):
 * - POST /api/arrivals
 * - GET  /api/arrivals
 * - GET  /api/arrivals/detail
 *
 * Aligned with:
 * - ArrivalResource
 * - ArrivalService
 * - ArrivalDTOs (ArrivalRequestDTO, ArrivalSummaryDTO, ArrivalDetailDTO)
 *
 * Security: Follows MERCO QA Cypress API Security Policy (4.1–4.3).
 */

const ARRIVALS = '/api/arrivals';
const ARRIVALS_DETAIL = '/api/arrivals/detail';

const SENSITIVE_KEYS = ['password', 'passwordHash', 'secretKey', 'refreshToken', 'token'];

function apiUrl(): string {
  return Cypress.env('apiUrl') || 'http://localhost:8080';
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Assert response body does not expose sensitive fields (Rule 3). */
function expectNoSensitiveData(body: unknown): void {
  if (body === null || typeof body !== 'object') return;
  const obj = body as Record<string, unknown>;
  for (const key of SENSITIVE_KEYS) {
    expect(obj, `Security: response must not expose "${key}"`).to.not.have.property(key);
  }
}

/** Assert error response does not expose stack traces, SQL, or server paths (Rule 10). */
function expectErrorSanitized(body: unknown): void {
  if (body === null || typeof body !== 'object') return;
  const obj = body as Record<string, unknown>;
  expect(obj, 'Security: error response must not expose stack trace').to.not.have.property('stack');
  const str = JSON.stringify(obj);
  expect(str, 'Security: error must not expose SQL').to.not.match(/select\s+.+\s+from|insert\s+into|update\s+.+\s+set/i);
  expect(str, 'Security: error must not expose server path').to.not.match(/\/[a-z]+\/[a-z]+\/.*\.(java|class)/i);
}

interface ArrivalTestContext {
  traderToken: string | null;
  contactId: number | null;
  commodityName: string | null;
  createdVehicleId: number | null;
}

describe('Arrival API (Trader Arrivals Aggregate)', () => {
  const ctx: ArrivalTestContext = {
    traderToken: null,
    contactId: null,
    commodityName: null,
    createdVehicleId: null,
  };

  before(function () {
    const login = Cypress.env('traderLogin') as string | undefined;
    const password = Cypress.env('traderPassword') as string | undefined;

    if (!login || !password) {
      cy.log('CYPRESS_TRADER_LOGIN / CYPRESS_TRADER_PASSWORD not set; skipping Arrival API tests');
      this.skip();
      return;
    }

    // Optional overrides from environment to match Postman collection variables.
    const arrivalContactIdEnv = Cypress.env('arrivalContactId');
    const arrivalCommodityNameEnv = Cypress.env('arrivalCommodityName') as string | undefined;

    if (arrivalContactIdEnv != null) {
      const n = Number(arrivalContactIdEnv);
      if (!Number.isNaN(n)) {
        ctx.contactId = n;
      }
    }
    if (arrivalCommodityNameEnv && arrivalCommodityNameEnv.trim().length > 0) {
      ctx.commodityName = arrivalCommodityNameEnv.trim();
    }

    // 1) Trader login → JWT for ARRIVALS_* authorities.
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
        cy.log(`Trader login failed with status ${res.status}; skipping Arrival API tests`);
        this.skip();
        return;
      }
      const h = res.headers['authorization'] || res.headers['Authorization'];
      const headerVal = Array.isArray(h) ? h[0] : h;
      expect(headerVal, 'Authorization header with Bearer trader token should be present').to.be.a('string');
      const token = (headerVal as string).replace(/^Bearer\s+/i, '').trim();
      expect(token.length, 'TRADER JWT token length').to.be.greaterThan(10);
      ctx.traderToken = token;

      // 2) If contact/commodity not provided via env, best-effort discovery using minimal existing data.
      const discoverContact = ctx.contactId == null
        ? cy
            .request({
              method: 'GET',
              url: `${apiUrl()}/api/contacts?scope=participants`,
              headers: authHeaders(token),
              failOnStatusCode: false,
            })
            .then((contactRes) => {
              if (contactRes.status === 200 && Array.isArray(contactRes.body) && contactRes.body.length > 0) {
                const first = contactRes.body[0] as { contact_id?: number; id?: number };
                const cid = (first.contact_id ?? first.id) as number | undefined;
                if (cid != null) {
                  ctx.contactId = cid;
                }
              }
            })
        : cy.wrap(null);

      const discoverCommodity = ctx.commodityName == null
        ? cy
            .request({
              method: 'GET',
              url: `${apiUrl()}/api/commodities`,
              headers: authHeaders(token),
              failOnStatusCode: false,
            })
            .then((commodityRes) => {
              if (commodityRes.status === 200 && Array.isArray(commodityRes.body) && commodityRes.body.length > 0) {
                const first = commodityRes.body[0] as { commodity_name?: string };
                if (first.commodity_name) {
                  ctx.commodityName = first.commodity_name;
                }
              }
            })
        : cy.wrap(null);

      return cy.wrap(null).then(() => discoverContact).then(() => discoverCommodity);
    });
  });

  // --- Authentication enforcement (Rule 1) ---

  describe('Authentication (Rule 1)', () => {
    it('GET /api/arrivals without token returns 401/403', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${ARRIVALS}?page=0&size=5`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(
          res.status,
          res.status === 200 ? 'Security bug: /api/arrivals must not succeed without token' : undefined,
        ).to.be.oneOf([401, 403]);
        expectErrorSanitized(res.body);
      });
    });

    it('GET /api/arrivals/detail without token returns 401/403', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${ARRIVALS_DETAIL}?page=0&size=5`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(
          res.status,
          res.status === 200 ? 'Security bug: /api/arrivals/detail must not succeed without token' : undefined,
        ).to.be.oneOf([401, 403]);
        expectErrorSanitized(res.body);
      });
    });

    it('POST /api/arrivals without token returns 401/403', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${ARRIVALS}`,
        body: {},
        failOnStatusCode: false,
      }).then((res) => {
        expect(
          res.status,
          res.status === 201 ? 'Security bug: POST /api/arrivals must not succeed without token' : undefined,
        ).to.be.oneOf([400, 401, 403]);
        expectErrorSanitized(res.body);
      });
    });
  });

  // --- Functional behaviour: create and list arrivals ---

  describe('Create and list arrivals (functional + Rule 3, 4, 6, 8)', function () {
    before(function () {
      if (!ctx.traderToken) {
        this.skip();
        return;
      }
      if (ctx.contactId == null || !ctx.commodityName) {
        cy.log(
          'Arrival API: contactId and commodityName could not be resolved from env or API; skipping functional tests',
        );
        this.skip();
      }
    });

    it('POST /api/arrivals creates a single-seller arrival and returns 201 with ArrivalSummaryDTO', function () {
      const payload = {
        vehicleNumber: 'CYPRESS-ARR-001',
        multiSeller: false,
        loadedWeight: 15000.0,
        emptyWeight: 8000.0,
        deductedWeight: 200.0,
        freightMethod: 'BY_WEIGHT',
        freightRate: 1.5,
        noRental: false,
        advancePaid: 500.0,
        brokerName: 'Cypress Broker',
        narration: 'Sample arrival from Cypress',
        sellers: [
          {
            contactId: ctx.contactId,
            sellerName: 'Cypress Seller',
            sellerPhone: '9999999999',
            sellerMark: 'CS',
            lots: [
              {
                lotName: 'LOT-1',
                bagCount: 10,
                commodityName: ctx.commodityName,
                brokerTag: 'BR-01',
              },
            ],
          },
        ],
      };

      cy.request({
        method: 'POST',
        url: `${apiUrl()}${ARRIVALS}`,
        headers: authHeaders(ctx.traderToken!),
        body: payload,
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.headers['location'] || res.headers['Location']).to.match(/\/api\/arrivals\/\d+$/);

        const body = res.body as Record<string, unknown>;
        expect(body).to.have.property('vehicleId');
        expect(body).to.have.property('vehicleNumber', 'CYPRESS-ARR-001');
        expect(body).to.have.property('sellerCount').and.to.be.a('number');
        expect(body).to.have.property('lotCount').and.to.be.a('number');
        expect(body).to.have.property('netWeight').and.to.be.a('number');
        expect(body).to.have.property('finalBillableWeight').and.to.be.a('number');
        expect(body).to.have.property('freightTotal').and.to.be.a('number');
        expect(body).to.have.property('freightMethod').and.to.be.a('string');
        expect(body).to.have.property('arrivalDatetime');
        expectNoSensitiveData(body);

        ctx.createdVehicleId = body.vehicleId as number;
      });
    });

    it('GET /api/arrivals returns paginated ArrivalSummaryDTO list with pagination headers', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${ARRIVALS}?page=0&size=20&sort=arrivalDatetime,desc`,
        headers: authHeaders(ctx.traderToken!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        const headers = res.headers as Record<string, string>;
        expect(headers['x-total-count'] || headers['X-Total-Count'], 'X-Total-Count header should be present').to.exist;
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body) && res.body.length > 0) {
          const first = res.body[0] as Record<string, unknown>;
          expect(first).to.have.property('vehicleId');
          expect(first).to.have.property('vehicleNumber');
          expect(first).to.have.property('sellerCount');
          expect(first).to.have.property('lotCount');
          expect(first).to.have.property('netWeight');
          expect(first).to.have.property('finalBillableWeight');
          expect(first).to.have.property('freightTotal');
          expect(first).to.have.property('arrivalDatetime');
          expectNoSensitiveData(first);
        }
      });
    });

    it('GET /api/arrivals/detail returns ArrivalDetailDTO list with sellers and lots', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${ARRIVALS_DETAIL}?page=0&size=20&sort=arrivalDatetime,desc`,
        headers: authHeaders(ctx.traderToken!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body) && res.body.length > 0) {
          const first = res.body[0] as any;
          expect(first).to.have.property('vehicleId');
          expect(first).to.have.property('vehicleNumber');
          expect(first).to.have.property('arrivalDatetime');
          expect(first).to.have.property('sellers').that.is.an('array');
          if (Array.isArray(first.sellers) && first.sellers.length > 0) {
            const seller = first.sellers[0] as any;
            expect(seller).to.have.property('sellerName');
            expect(seller).to.have.property('lots').that.is.an('array');
            if (Array.isArray(seller.lots) && seller.lots.length > 0) {
              const lot = seller.lots[0] as any;
              expect(lot).to.have.property('id');
              expect(lot).to.have.property('lotName');
            }
          }
        }
      });
    });

    it('method access (Rule 8): POST on GET-only /api/arrivals/detail returns non-200', function () {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${ARRIVALS_DETAIL}`,
        headers: authHeaders(ctx.traderToken!),
        body: {},
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'POST on GET-only /api/arrivals/detail must not succeed').to.not.eq(200);
      });
    });

    it('method access (Rule 8): PUT on list path /api/arrivals returns non-200', function () {
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${ARRIVALS}`,
        headers: authHeaders(ctx.traderToken!),
        body: {},
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'PUT on list path /api/arrivals must not succeed').to.not.eq(200);
      });
    });

    it('HTTP security headers (Rule 6): GET /api/arrivals includes X-Content-Type-Options and X-Frame-Options', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${ARRIVALS}?page=0&size=5`,
        headers: authHeaders(ctx.traderToken!),
      }).then((res) => {
        const headers = res.headers as Record<string, string>;
        expect(
          headers['x-content-type-options'] ?? headers['X-Content-Type-Options'],
          'Security: X-Content-Type-Options header should be present',
        )
          .to.be.a('string')
          .and.not.empty;
        expect(headers['x-frame-options'] ?? headers['X-Frame-Options'], 'Security: X-Frame-Options header should be present')
          .to.be.a('string')
          .and.not.empty;
      });
    });
  });

  // --- Input validation & domain validation (Rule 4) ---

  describe('Input validation (Rule 4)', function () {
    before(function () {
      if (!ctx.traderToken) {
        this.skip();
        return;
      }
      if (ctx.contactId == null || !ctx.commodityName) {
        this.skip();
      }
    });

    it('rejects multiSeller=true without vehicleNumber with 400', function () {
      const payload = {
        vehicleNumber: null,
        multiSeller: true,
        loadedWeight: 1000.0,
        emptyWeight: 100.0,
        deductedWeight: 50.0,
        freightMethod: 'BY_WEIGHT',
        freightRate: 2.5,
        noRental: false,
        advancePaid: 0.0,
        sellers: [
          {
            contactId: ctx.contactId,
            sellerName: 'NoVehicle Seller',
            sellerPhone: '9999999999',
            lots: [
              {
                lotName: 'LOT-VAL-1',
                bagCount: 10,
                commodityName: ctx.commodityName,
              },
            ],
          },
        ],
      };

      cy.request({
        method: 'POST',
        url: `${apiUrl()}${ARRIVALS}`,
        headers: authHeaders(ctx.traderToken!),
        body: payload,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        const msg = (res.body?.detail ?? res.body?.message ?? '').toString().toLowerCase();
        expect(
          msg,
          'Error message should mention vehicle number requirement for multi-seller arrivals',
        ).to.include('vehicle number is required for multi-seller arrivals');
        expectErrorSanitized(res.body);
      });
    });

    it('rejects seller without lots with 400', function () {
      const payload = {
        vehicleNumber: 'CYPRESS-NO-LOTS',
        multiSeller: false,
        loadedWeight: 1000.0,
        emptyWeight: 100.0,
        deductedWeight: 50.0,
        freightMethod: 'BY_WEIGHT',
        freightRate: 2.5,
        noRental: false,
        advancePaid: 0.0,
        sellers: [
          {
            contactId: ctx.contactId,
            sellerName: 'Empty Lots Seller',
            sellerPhone: '9999999999',
            lots: [],
          },
        ],
      };

      cy.request({
        method: 'POST',
        url: `${apiUrl()}${ARRIVALS}`,
        headers: authHeaders(ctx.traderToken!),
        body: payload,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        const msg = (res.body?.detail ?? res.body?.message ?? '').toString().toLowerCase();
        expect(msg).to.include('each seller must have at least one lot');
        expectErrorSanitized(res.body);
      });
    });

    it('rejects lot with bagCount <= 0 with 400', function () {
      const payload = {
        vehicleNumber: 'CYPRESS-BAD-BAGS',
        multiSeller: false,
        loadedWeight: 1000.0,
        emptyWeight: 100.0,
        deductedWeight: 50.0,
        freightMethod: 'BY_WEIGHT',
        freightRate: 2.5,
        noRental: false,
        advancePaid: 0.0,
        sellers: [
          {
            contactId: ctx.contactId,
            sellerName: 'Bad Bags Seller',
            sellerPhone: '9999999999',
            lots: [
              {
                lotName: 'LOT-VAL-2',
                bagCount: 0,
                commodityName: ctx.commodityName,
              },
            ],
          },
        ],
      };

      cy.request({
        method: 'POST',
        url: `${apiUrl()}${ARRIVALS}`,
        headers: authHeaders(ctx.traderToken!),
        body: payload,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        const msg = (res.body?.detail ?? res.body?.message ?? '').toString().toLowerCase();
        expect(msg).to.include('lot bag count must be greater than 0');
        expectErrorSanitized(res.body);
      });
    });

    it('rejects unknown commodityName with 400', function () {
      const payload = {
        vehicleNumber: 'CYPRESS-BAD-COMM',
        multiSeller: false,
        loadedWeight: 1000.0,
        emptyWeight: 100.0,
        deductedWeight: 50.0,
        freightMethod: 'BY_WEIGHT',
        freightRate: 2.5,
        noRental: false,
        advancePaid: 0.0,
        sellers: [
          {
            contactId: ctx.contactId,
            sellerName: 'Bad Commodity Seller',
            sellerPhone: '9999999999',
            lots: [
              {
                lotName: 'LOT-VAL-3',
                bagCount: 10,
                commodityName: 'THIS-COMMODITY-DOES-NOT-EXIST',
              },
            ],
          },
        ],
      };

      cy.request({
        method: 'POST',
        url: `${apiUrl()}${ARRIVALS}`,
        headers: authHeaders(ctx.traderToken!),
        body: payload,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        const msg = (res.body?.detail ?? res.body?.message ?? '').toString().toLowerCase();
        expect(
          msg,
          'Error should reference missing commodity name or "Commodity not found"',
        ).to.satisfy((s: string) => !s || s.includes('commodity') || s.includes('not found'));
        expectErrorSanitized(res.body);
      });
    });
  });
});

