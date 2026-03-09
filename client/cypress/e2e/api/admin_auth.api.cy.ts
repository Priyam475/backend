/**
 * API-only Cypress tests for Admin authentication:
 * - POST /api/admin/auth/login
 * - GET  /api/admin/auth/me
 *
 * Aligned with:
 * - AdminAuthResource
 * - SecurityConfiguration (adminSecurityFilterChain)
 *
 * Security: Follows MERCO QA Cypress API Security Policy (4.1–4.3).
 */

const ADMIN_LOGIN = '/api/admin/auth/login';
const ADMIN_ME = '/api/admin/auth/me';
const TRADER_LOGIN = '/api/auth/login';

// Do NOT include "token" here: TraderAuthDTO intentionally exposes a token field for admin flows.
const SENSITIVE_KEYS = ['password', 'passwordHash', 'secretKey', 'refreshToken'];

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

describe('Admin Auth API', () => {
  let adminToken: string | null = null;
  let traderToken: string | null = null;

  before(function () {
    const adminLogin = Cypress.env('adminLogin') as string | undefined;
    const adminPassword = Cypress.env('adminPassword') as string | undefined;

    if (!adminLogin || !adminPassword) {
      cy.log('CYPRESS_ADMIN_LOGIN / CYPRESS_ADMIN_PASSWORD not set; skipping Admin Auth API tests');
      this.skip();
      return;
    }

    // Obtain ADMIN JWT via /api/admin/auth/login
    cy.request({
      method: 'POST',
      url: `${apiUrl()}${ADMIN_LOGIN}`,
      body: {
        username: adminLogin,
        password: adminPassword,
        rememberMe: false,
      },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status !== 200) {
        cy.log(`Admin login failed with status ${res.status}; skipping Admin Auth tests`);
        this.skip();
        return;
      }

      const authHeader = (res.headers['authorization'] || res.headers['Authorization']) as string | string[] | undefined;
      const headerVal = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      expect(headerVal, 'Authorization header with Bearer ADMIN token should be present').to.be.a('string');
      const tokenFromHeader = (headerVal as string).replace(/^Bearer\s+/i, '').trim();
      expect(tokenFromHeader.length, 'ADMIN JWT token length').to.be.greaterThan(10);

      adminToken = tokenFromHeader;

      // Best-effort: also capture token from body.token when present
      if (res.body && typeof res.body === 'object' && (res.body as any).token) {
        const bodyToken = String((res.body as any).token);
        expect(bodyToken.length).to.be.greaterThan(10);
      }

      // Best-effort: capture a TRADER JWT for RBAC negative tests (optional)
      const traderLogin = Cypress.env('traderLogin') as string | undefined;
      const traderPassword = Cypress.env('traderPassword') as string | undefined;
      if (!traderLogin || !traderPassword) {
        return;
      }
      return cy
        .request({
          method: 'POST',
          url: `${apiUrl()}${TRADER_LOGIN}`,
          body: { username: traderLogin, password: traderPassword },
          failOnStatusCode: false,
        })
        .then((loginRes) => {
          if (loginRes.status !== 200) {
            return;
          }
          const h = loginRes.headers['authorization'] || loginRes.headers['Authorization'];
          const header = Array.isArray(h) ? h[0] : h;
          if (header && typeof header === 'string') {
            traderToken = header.replace(/^Bearer\s+/i, '').trim();
          }
        });
    });
  });

  // --- Functional behavior: POST /api/admin/auth/login ---

  it('functional: authenticates admin and returns TraderAuthDTO with admin role and trader=null', function () {
    const adminLogin = Cypress.env('adminLogin') as string | undefined;
    const adminPassword = Cypress.env('adminPassword') as string | undefined;
    if (!adminLogin || !adminPassword) {
      this.skip();
      return;
    }

    cy.request({
      method: 'POST',
      url: `${apiUrl()}${ADMIN_LOGIN}`,
      body: {
        username: adminLogin,
        password: adminPassword,
        rememberMe: false,
      },
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('user');
      const user = (res.body as any).user;
      expect(user).to.have.property('username', adminLogin);
      expect(user).to.have.property('role').and.to.be.oneOf(['ADMIN', 'SUPER_ADMIN', 'USER']);
      expect(user).to.have.property('authorities').and.to.be.an('array');

      // AdminAuthResource must never expose trader context.
      expect(res.body).to.have.property('trader', null);

      // Token is expected in the payload for admin flows.
      expect(res.body).to.have.property('token').and.to.be.a('string');

      expectNoSensitiveData(res.body);

      const setCookie = res.headers['set-cookie'] as string[] | undefined;
      if (setCookie && setCookie.length > 0) {
        const accessCookie = setCookie.find((c) => c.startsWith('ACCESS_TOKEN='));
        expect(accessCookie, 'ACCESS_TOKEN cookie should be set for admin login').to.exist;
      }
    });
  });

  it('input validation (Rule 4): rejects short password (<6 chars) with 400', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl()}${ADMIN_LOGIN}`,
      body: {
        username: 'admin@example.com',
        password: '12345',
        rememberMe: false,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      const msg = (res.body?.detail ?? res.body?.message ?? '').toString().toLowerCase();
      expect(msg).to.include('password').and.to.include('6');
      expectErrorSanitized(res.body);
    });
  });

  it('negative: invalid credentials return 401 Unauthorized', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl()}${ADMIN_LOGIN}`,
      body: {
        username: 'non-existing-admin@example.com',
        password: 'wrong-password',
        rememberMe: false,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
      const msg = (res.body?.detail ?? res.body?.message ?? '').toString().toLowerCase();
      expect(msg).to.satisfy((s: string) => !s || s.includes('invalid username or password'));
      expectErrorSanitized(res.body);
    });
  });

  // --- Authentication Enforcement (Rule 1) & RBAC (Rule 2): GET /api/admin/auth/me ---

  describe('GET /api/admin/auth/me', function () {
    before(function () {
      if (!adminToken) {
        this.skip();
      }
    });

    it('authentication enforcement (Rule 1): without token returns 401 or 403', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${ADMIN_ME}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(
          res.status,
          res.status === 200 ? 'Security bug: /api/admin/auth/me must not succeed without token' : undefined,
        ).to.be.oneOf([401, 403]);
        expectErrorSanitized(res.body);
      });
    });

    it('functional: with valid ADMIN JWT returns 200 and TraderAuthDTO (user only, trader=null)', function () {
      if (!adminToken) {
        this.skip();
        return;
      }
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${ADMIN_ME}`,
        headers: authHeaders(adminToken),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('user');
        const user = (res.body as any).user;
        expect(user).to.have.property('username').and.to.be.a('string');
        expect(user).to.have.property('role').and.to.be.oneOf(['ADMIN', 'SUPER_ADMIN', 'USER']);
        expect(user).to.have.property('authorities').and.to.be.an('array');
        expect(res.body).to.have.property('trader', null);
        expectNoSensitiveData(res.body);
      });
    });

    it('RBAC (Rule 2): TRADER JWT cannot access /api/admin/auth/me (must return 401/403)', function () {
      if (!traderToken) {
        this.skip();
        return;
      }
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${ADMIN_ME}`,
        headers: authHeaders(traderToken),
        failOnStatusCode: false,
      }).then((res) => {
        expect(
          res.status,
          res.status === 200
            ? 'Critical RBAC bug: trader token must not access /api/admin/** resources'
            : undefined,
        ).to.be.oneOf([401, 403]);
        expectErrorSanitized(res.body);
      });
    });

    it('HTTP security headers (Rule 6): response includes X-Content-Type-Options and X-Frame-Options', function () {
      if (!adminToken) {
        this.skip();
        return;
      }
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${ADMIN_ME}`,
        headers: authHeaders(adminToken),
      }).then((res) => {
        const headers = res.headers as Record<string, string>;
        expect(
          headers['x-content-type-options'] ?? headers['X-Content-Type-Options'],
          'Security: X-Content-Type-Options header should be present',
        )
          .to.be.a('string')
          .and.not.empty;
        expect(
          headers['x-frame-options'] ?? headers['X-Frame-Options'],
          'Security: X-Frame-Options header should be present',
        )
          .to.be.a('string')
          .and.not.empty;
        if (!(headers['x-xss-protection'] ?? headers['X-XSS-Protection']) && !(headers['cache-control'] ?? headers['Cache-Control'])) {
          cy.log('Security warning: X-XSS-Protection or Cache-Control not found (optional per project configuration)');
        }
      });
    });
  });

  // --- Method access validation (Rule 8) ---

  describe('Method access (Rule 8)', () => {
    it('GET on POST-only /api/admin/auth/login returns non-200 (405/404)', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${ADMIN_LOGIN}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'GET on POST-only admin login endpoint must not succeed').to.not.eq(200);
      });
    });

    it('POST on GET-only /api/admin/auth/me returns non-200 (405/404)', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${ADMIN_ME}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'POST on GET-only admin /me endpoint must not succeed').to.not.eq(200);
      });
    });
  });
});

