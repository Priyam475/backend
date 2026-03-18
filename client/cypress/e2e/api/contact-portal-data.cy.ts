/**
 * API-only Cypress tests for Contact Portal data endpoints:
 * - PUT /api/portal/profile
 * - GET /api/portal/statements
 * - GET /api/portal/purchases
 * - GET /api/portal/arrivals
 * - GET /api/portal/settlements
 *
 * Aligned with:
 * - ContactPortalResource
 * - ContactPortalService
 * - ContactPortal*DTOs
 *
 * Security: Follows MERCO QA Cypress API Security Policy (4.1, 4.2, 4.3).
 */

const PORTAL_PROFILE = '/api/portal/profile';
const PORTAL_STATEMENTS = '/api/portal/statements';
const PORTAL_PURCHASES = '/api/portal/purchases';
const PORTAL_ARRIVALS = '/api/portal/arrivals';
const PORTAL_SETTLEMENTS = '/api/portal/settlements';

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'refreshToken', 'secretKey'];

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

function randomPhone(): string {
  // Generate a valid 10-digit mobile number matching ^[6-9]\d{9}$
  const first = 6 + Math.floor(Math.random() * 4); // 6-9
  const rest = Math.floor(100000000 + Math.random() * 900000000) // 9 digits
    .toString()
    .padStart(9, '0');
  return `${first}${rest}`;
}

interface ContactDataContext {
  phone: string;
  password: string;
  email: string;
  name: string;
  token: string | null;
}

describe('Contact Portal Data API', () => {
  const ctx: ContactDataContext = {
    phone: '',
    password: 'portal-data-123',
    email: '',
    name: 'Cypress Data Contact',
    token: null,
  };

  before(() => {
    ctx.phone = randomPhone();
    ctx.email = `cypress-data-contact-${Date.now()}@example.com`;

    // Bootstrap: register a new contact and login to obtain CONTACT token.
    cy.request({
      method: 'POST',
      url: `${apiUrl()}/api/auth/register-contact`,
      body: {
        phone: ctx.phone,
        password: ctx.password,
        email: ctx.email,
        name: ctx.name,
        mark: `CY-DATA-${Date.now()}`,
      },
    }).then(() => {
      return cy
        .request({
          method: 'POST',
          url: `${apiUrl()}/api/portal/auth/login`,
          body: {
            phone: ctx.phone,
            password: ctx.password,
          },
          failOnStatusCode: false,
        })
        .then((res) => {
          if (res.status !== 200) {
            return;
          }
          const h = res.headers['authorization'] || res.headers['Authorization'];
          const headerVal = Array.isArray(h) ? h[0] : h;
          if (headerVal && typeof headerVal === 'string') {
            ctx.token = headerVal.replace(/^Bearer\s+/i, '').trim();
          }
        });
    });
  });

  // --- Authentication enforcement for all /api/portal/** data endpoints (Rule 1) ---

  describe('Authentication enforcement (Rule 1)', () => {
    const endpoints = [
      { method: 'GET', path: PORTAL_STATEMENTS },
      { method: 'GET', path: PORTAL_PURCHASES },
      { method: 'GET', path: PORTAL_ARRIVALS },
      { method: 'GET', path: PORTAL_SETTLEMENTS },
      { method: 'PUT', path: PORTAL_PROFILE },
    ] as const;

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} without token returns 401`, () => {
        cy.request({
          method,
          url: `${apiUrl()}${path}`,
          failOnStatusCode: false,
        }).then((res) => {
          expect(
            res.status,
            res.status === 200
              ? `Security bug: ${method} ${path} must not succeed without token`
              : undefined
          ).to.eq(401);
          expectErrorSanitized(res.body);
        });
      });
    });
  });

  // --- RBAC: trader JWT must not access contact portal data (Rule 2) ---

  describe('RBAC (Rule 2) - trader vs contact portal data', function () {
    const sampleEndpoint = PORTAL_STATEMENTS;

    it('TRADER JWT cannot access contact-only data endpoints (returns 401/403)', function () {
      const traderLogin = Cypress.env('traderLogin');
      const traderPassword = Cypress.env('traderPassword');
      if (!traderLogin || !traderPassword) {
        this.skip();
        return;
      }

      cy.request({
        method: 'POST',
        url: `${apiUrl()}/api/auth/login`,
        body: { username: traderLogin, password: traderPassword },
        failOnStatusCode: false,
      }).then((loginRes) => {
        if (loginRes.status !== 200) {
          this.skip();
          return;
        }
        const h = loginRes.headers['authorization'] || loginRes.headers['Authorization'];
        const headerVal = Array.isArray(h) ? h[0] : h;
        if (!headerVal || typeof headerVal !== 'string') {
          this.skip();
          return;
        }
        const traderToken = headerVal.replace(/^Bearer\s+/i, '').trim();

        const endpoints = [
          { method: 'GET', path: PORTAL_STATEMENTS },
          { method: 'GET', path: PORTAL_PURCHASES },
          { method: 'GET', path: PORTAL_ARRIVALS },
          { method: 'GET', path: PORTAL_SETTLEMENTS },
          { method: 'PUT', path: PORTAL_PROFILE },
        ] as const;

        endpoints.forEach(({ method, path }) => {
          cy.request({
            method,
            url: `${apiUrl()}${path}`,
            headers: authHeaders(traderToken),
            failOnStatusCode: false,
          }).then((res) => {
            expect(
              res.status,
              res.status === 200
                ? `Critical RBAC bug: trader token must not access ${method} ${path}`
                : undefined
            ).to.be.oneOf([401, 403]);
            expectErrorSanitized(res.body);
          });
        });
      });
    });
  });

  // --- PUT /api/portal/profile ---

  describe('PUT /api/portal/profile', function () {
    before(function () {
      if (!ctx.token) this.skip();
    });

    it('functional: updates basic profile fields (name, email, address) without password change', function () {
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${PORTAL_PROFILE}`,
        headers: { ...authHeaders(ctx.token!), 'Content-Type': 'application/json' },
        body: {
          name: 'Updated Cypress Contact',
          email: `updated-${ctx.email}`,
          address: 'Cypress Lane, Test City',
        },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('id').and.to.be.a('number');
        expect(res.body).to.have.property('name', 'Updated Cypress Contact');
        expect(res.body).to.have.property('email').and.to.be.a('string');
        expect(res.body).to.have.property('address').and.to.be.a('string');
        expectNoSensitiveData(res.body);
      });
    });

    it('input validation (Rule 4): rejects password change without currentPassword with 400', function () {
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${PORTAL_PROFILE}`,
        headers: { ...authHeaders(ctx.token!), 'Content-Type': 'application/json' },
        body: {
          newPassword: 'newsecret123',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        const msg = (res.body?.detail ?? res.body?.message ?? '').toString().toLowerCase();
        expect(msg).to.include('current password');
        expectErrorSanitized(res.body);
      });
    });

    it('input validation (Rule 4): rejects password change when currentPassword is incorrect', function () {
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${PORTAL_PROFILE}`,
        headers: { ...authHeaders(ctx.token!), 'Content-Type': 'application/json' },
        body: {
          currentPassword: 'wrong-current',
          newPassword: 'newsecret123',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        const msg = (res.body?.detail ?? res.body?.message ?? '').toString().toLowerCase();
        expect(msg).to.include('current password is incorrect');
        expectErrorSanitized(res.body);
      });
    });

    it('input validation (Rule 4): enforces newPassword length >= 6 (DTO constraint)', function () {
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${PORTAL_PROFILE}`,
        headers: { ...authHeaders(ctx.token!), 'Content-Type': 'application/json' },
        body: {
          currentPassword: ctx.password,
          newPassword: '12345',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        expectErrorSanitized(res.body);
      });
    });

    it('sensitive data (Rule 3): response must not include password or passwordHash', function () {
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${PORTAL_PROFILE}`,
        headers: { ...authHeaders(ctx.token!), 'Content-Type': 'application/json' },
        body: {
          name: 'Sensitive Check Contact',
        },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expectNoSensitiveData(res.body);
      });
    });

    it('method access (Rule 8): POST on PUT-only /api/portal/profile returns non-200', function () {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_PROFILE}`,
        headers: authHeaders(ctx.token!),
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'POST on PUT-only endpoint must not succeed').to.not.eq(200);
      });
    });
  });

  // --- GET /api/portal/statements ---

  describe('GET /api/portal/statements', function () {
    before(function () {
      if (!ctx.token) this.skip();
    });

    it('functional: returns 200 and an array (possibly empty) of statement DTOs', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_STATEMENTS}`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body)) {
          res.body.forEach((item: unknown) => {
            expectNoSensitiveData(item);
          });
        }
      });
    });

    it('input validation / limit clamping: negative or 0 limit is clamped to >=1 and returns 200', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_STATEMENTS}?limit=0`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
      });
    });

    it('input validation / limit clamping: very large limit is clamped to <=500', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_STATEMENTS}?limit=10000`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body)) {
          expect(res.body.length, 'length should not exceed 500 due to clamp').to.be.at.most(500);
        }
      });
    });

    it('method access (Rule 8): POST on GET-only /api/portal/statements returns non-200', function () {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_STATEMENTS}`,
        headers: authHeaders(ctx.token!),
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.not.eq(200);
      });
    });
  });

  // --- GET /api/portal/purchases ---

  describe('GET /api/portal/purchases', function () {
    before(function () {
      if (!ctx.token) this.skip();
    });

    it('functional: returns 200 and an array (possibly empty) of purchase DTOs', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_PURCHASES}`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body)) {
          res.body.forEach((item: unknown) => {
            expectNoSensitiveData(item);
          });
        }
      });
    });

    it('input validation / limit clamping: negative or 0 limit is clamped to >=1 and returns 200', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_PURCHASES}?limit=0`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
      });
    });

    it('input validation / limit clamping: very large limit is clamped to <=200', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_PURCHASES}?limit=9999`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body)) {
          expect(res.body.length, 'length should not exceed 200 due to clamp').to.be.at.most(200);
        }
      });
    });

    it('method access (Rule 8): POST on GET-only /api/portal/purchases returns non-200', function () {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_PURCHASES}`,
        headers: authHeaders(ctx.token!),
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.not.eq(200);
      });
    });
  });

  // --- GET /api/portal/arrivals ---

  describe('GET /api/portal/arrivals', function () {
    before(function () {
      if (!ctx.token) this.skip();
    });

    it('functional: returns 200 and an array (possibly empty) of arrival DTOs', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_ARRIVALS}`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body)) {
          res.body.forEach((item: unknown) => {
            expectNoSensitiveData(item);
          });
        }
      });
    });

    it('input validation / limit: negative or 0 limit is clamped to >=1 and returns 200', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_ARRIVALS}?limit=0`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
      });
    });

    it('input validation / limit: very large limit is clamped to <=200', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_ARRIVALS}?limit=10000`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body)) {
          expect(res.body.length, 'length should not exceed 200 due to clamp').to.be.at.most(200);
        }
      });
    });

    it('method access (Rule 8): POST on GET-only /api/portal/arrivals returns non-200', function () {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_ARRIVALS}`,
        headers: authHeaders(ctx.token!),
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.not.eq(200);
      });
    });
  });

  // --- GET /api/portal/settlements ---

  describe('GET /api/portal/settlements', function () {
    before(function () {
      if (!ctx.token) this.skip();
    });

    it('functional: returns 200 and an array (possibly empty) of settlement DTOs', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_SETTLEMENTS}`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body)) {
          res.body.forEach((item: unknown) => {
            expectNoSensitiveData(item);
          });
        }
      });
    });

    it('input validation / limit: negative or 0 limit is clamped to >=1 and returns 200', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_SETTLEMENTS}?limit=0`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
      });
    });

    it('input validation / limit: very large limit is clamped to <=500', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_SETTLEMENTS}?limit=9999`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
        if (Array.isArray(res.body)) {
          expect(res.body.length, 'length should not exceed 500 due to clamp').to.be.at.most(500);
        }
      });
    });

    it('method access (Rule 8): POST on GET-only /api/portal/settlements returns non-200', function () {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_SETTLEMENTS}`,
        headers: authHeaders(ctx.token!),
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.not.eq(200);
      });
    });
  });

  // --- Security headers (Rule 6) for a representative data endpoint ---

  describe('Security headers (Rule 6)', function () {
    before(function () {
      if (!ctx.token) this.skip();
    });

    it('GET /api/portal/statements includes X-Content-Type-Options and X-Frame-Options', function () {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_STATEMENTS}`,
        headers: authHeaders(ctx.token!),
      }).then((res) => {
        const headers = res.headers as Record<string, string>;
        expect(
          headers['x-content-type-options'] ?? headers['X-Content-Type-Options'],
          'Security: X-Content-Type-Options header should be present'
        )
          .to.be.a('string')
          .and.not.empty;
        expect(
          headers['x-frame-options'] ?? headers['X-Frame-Options'],
          'Security: X-Frame-Options header should be present'
        )
          .to.be.a('string')
          .and.not.empty;
      });
    });
  });
});

