/**
 * API-only Cypress tests for Contact Portal authentication:
 * - POST /api/auth/register-contact
 * - POST /api/portal/auth/login
 * - POST /api/portal/auth/otp/request
 * - POST /api/portal/auth/otp/verify
 * - GET  /api/portal/me
 *
 * Aligned with:
 * - ContactAuthResource
 * - ContactOtpService
 * - ContactDTO
 *
 * Security: Follows MERCO QA Cypress API Security Policy (4.1, 4.2, 4.3).
 */

const REGISTER_CONTACT = '/api/auth/register-contact';
const PORTAL_LOGIN = '/api/portal/auth/login';
const PORTAL_OTP_REQUEST = '/api/portal/auth/otp/request';
const PORTAL_OTP_VERIFY = '/api/portal/auth/otp/verify';
const PORTAL_ME = '/api/portal/me';
const PORTAL_SESSION = '/api/portal/session';

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

interface ContactTestContext {
  phone: string;
  password: string;
  email: string;
  name: string;
  token: string | null;
}

describe('Contact Portal Auth API', () => {
  const ctx: ContactTestContext = {
    phone: '',
    password: 'portalpw123',
    email: '',
    name: 'Cypress Contact',
    token: null,
  };

  before(() => {
    ctx.phone = randomPhone();
    ctx.email = `cypress-contact-${Date.now()}@example.com`;
  });

  // --- 1. POST /api/auth/register-contact ---

  describe('POST /api/auth/register-contact', () => {
    it('functional: registers a new contact and returns 201 with ContactDTO and CONTACT JWT (Authorization + cookie)', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${REGISTER_CONTACT}`,
        body: {
          phone: ctx.phone,
          password: ctx.password,
          email: ctx.email,
          name: ctx.name,
        },
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body).to.have.property('id').and.to.be.a('number');
        expect(res.body).to.have.property('phone', ctx.phone);
        expect(res.body).to.have.property('name');
        expect(res.body).to.have.property('canLogin', true);
        expectNoSensitiveData(res.body);

        const authHeader = (res.headers['authorization'] || res.headers['Authorization']) as string | string[] | undefined;
        const headerVal = Array.isArray(authHeader) ? authHeader[0] : authHeader;
        expect(headerVal, 'Authorization header with Bearer token should be present').to.be.a('string');
        const token = (headerVal as string).replace(/^Bearer\s+/i, '').trim();
        expect(token.length, 'JWT token length').to.be.greaterThan(10);
        ctx.token = token;

        const setCookie = res.headers['set-cookie'] as string[] | undefined;
        if (setCookie && setCookie.length > 0) {
          const accessCookie = setCookie.find((c) => c.startsWith('ACCESS_TOKEN='));
          expect(accessCookie, 'ACCESS_TOKEN cookie should be set').to.exist;
        }
      });
    });

    it('input validation (Rule 4): rejects short password (<6 chars) with 400', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${REGISTER_CONTACT}`,
        body: {
          phone: randomPhone(),
          password: '12345',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        const msg = (res.body?.detail ?? res.body?.message ?? '').toString().toLowerCase();
        expect(msg).to.satisfy((s: string) => !s || s.includes('password') || s.includes('6'));
        expectErrorSanitized(res.body);
      });
    });

    it('input validation (Rule 4): rejects invalid phone format with 400', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${REGISTER_CONTACT}`,
        body: {
          phone: '1234',
          password: 'password123',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        const msg = (res.body?.detail ?? res.body?.message ?? '').toString().toLowerCase();
        expect(msg).to.include('valid 10-digit mobile');
        expectErrorSanitized(res.body);
      });
    });

    it('input validation (Rule 4): rejects duplicate registration with same phone or email (conflict)', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${REGISTER_CONTACT}`,
        body: {
          phone: ctx.phone,
          password: ctx.password,
          email: ctx.email,
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'Duplicate registration should be rejected (400/409)').to.be.oneOf([400, 409]);
        expectErrorSanitized(res.body);
      });
    });

    it('method access (Rule 8): GET on POST-only /auth/register-contact returns 405 or 404', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${REGISTER_CONTACT}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'GET on POST-only endpoint must not succeed').to.not.eq(200);
      });
    });
  });

  // --- 2. POST /api/portal/auth/login ---

  describe('POST /api/portal/auth/login', () => {
    it('functional: logs in existing contact (phone + password) and returns 200 with ContactDTO and CONTACT JWT', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_LOGIN}`,
        body: {
          phone: ctx.phone,
          password: ctx.password,
        },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('phone', ctx.phone);
        expect(res.body).to.have.property('id').and.to.be.a('number');
        expectNoSensitiveData(res.body);

        const authHeader = (res.headers['authorization'] || res.headers['Authorization']) as string | string[] | undefined;
        const headerVal = Array.isArray(authHeader) ? authHeader[0] : authHeader;
        expect(headerVal, 'Authorization header with Bearer token should be present').to.be.a('string');
        const token = (headerVal as string).replace(/^Bearer\s+/i, '').trim();
        expect(token.length).to.be.greaterThan(10);
        ctx.token = token;
      });
    });

    it('negative: invalid credentials return 401 Unauthorized', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_LOGIN}`,
        body: {
          phone: ctx.phone,
          password: 'wrong-password',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
        const msg = (res.body?.detail ?? res.body?.message ?? '').toString().toLowerCase();
        expect(msg).to.satisfy((s: string) => !s || s.includes('incorrect'));
        expectErrorSanitized(res.body);
      });
    });

    it('input validation (Rule 4): rejects missing identifier with 400', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_LOGIN}`,
        body: {
          phone: '',
          password: ctx.password,
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        expectErrorSanitized(res.body);
      });
    });

    it('input validation (Rule 4): rejects short password with 400', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_LOGIN}`,
        body: {
          phone: ctx.phone,
          password: '12345',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        expectErrorSanitized(res.body);
      });
    });

    it('method access (Rule 8): GET on POST-only /portal/auth/login returns non-200', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_LOGIN}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'GET on POST-only endpoint must not succeed').to.not.eq(200);
      });
    });
  });

  // --- 3. POST /api/portal/auth/otp/request ---

  describe('POST /api/portal/auth/otp/request', () => {
    it('functional: returns 200 with status=OK when OTP provider is configured, else 503 when disabled', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_OTP_REQUEST}`,
        body: {
          identifier: ctx.phone,
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 400, 503, 429]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('status', 'OK');
          expectNoSensitiveData(res.body);
        } else {
          expectErrorSanitized(res.body);
        }
      });
    });

    it('input validation (Rule 4): rejects blank identifier with 400', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_OTP_REQUEST}`,
        body: {
          identifier: '',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        expectErrorSanitized(res.body);
      });
    });

    it('rate limiting (Rule 7): repeated OTP requests eventually return 429 when provider is configured', function () {
      const attempts = 6;
      const statuses: number[] = [];

      function requestOtp(remaining: number): Cypress.Chainable {
        if (remaining === 0) {
          return cy.wrap(null);
        }
        return cy
          .request({
            method: 'POST',
            url: `${apiUrl()}${PORTAL_OTP_REQUEST}`,
            body: {
              identifier: ctx.phone,
            },
            failOnStatusCode: false,
          })
          .then((res) => {
            statuses.push(res.status);
            return requestOtp(remaining - 1);
          });
      }

      requestOtp(attempts).then(() => {
        const any200 = statuses.includes(200);
        const any429 = statuses.includes(429);
        if (!any200) {
          // Likely provider not configured (503) or phone not registered (400); skip strict rate-limit assertion.
          this.skip();
          return;
        }
        expect(
          any429,
          'Security: OTP endpoint should enforce rate limiting and eventually return 429'
        ).to.eq(true);
      });
    });

    it('method access (Rule 8): GET on POST-only /portal/auth/otp/request returns non-200', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_OTP_REQUEST}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.not.eq(200);
      });
    });
  });

  // --- 4. POST /api/portal/auth/otp/verify ---

  describe('POST /api/portal/auth/otp/verify', () => {
    it('negative: invalid or expired OTP returns 400 with sanitized error', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_OTP_VERIFY}`,
        body: {
          identifier: ctx.phone,
          otp: '9999',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect([400, 404, 503]).to.include(res.status);
        expectErrorSanitized(res.body);
      });
    });

    it('input validation (Rule 4): rejects non-numeric or wrong-length OTP with 400', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${PORTAL_OTP_VERIFY}`,
        body: {
          identifier: ctx.phone,
          otp: 'abcd',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        expectErrorSanitized(res.body);
      });
    });

    it('method access (Rule 8): GET on POST-only /portal/auth/otp/verify returns non-200', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_OTP_VERIFY}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.not.eq(200);
      });
    });
  });

  // --- 5. GET /api/portal/me ---

  describe('GET /api/portal/me', () => {
    it('authentication enforcement (Rule 1): without token returns 401', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_ME}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(
          res.status,
          res.status === 200 ? 'Security bug: /api/portal/me must not succeed without token' : undefined
        ).to.eq(401);
        expectErrorSanitized(res.body);
      });
    });

    it('authentication enforcement (Rule 1): with malformed/invalid token returns 401', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_ME}`,
        headers: { Authorization: 'Bearer this.is.not.a.valid.jwt' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(
          res.status,
          res.status === 200 ? 'Security bug: /api/portal/me must not accept invalid JWT' : undefined
        ).to.eq(401);
        expectErrorSanitized(res.body);
      });
    });

    it('functional: with valid CONTACT JWT returns 200 and ContactDTO', function () {
      if (!ctx.token) {
        this.skip();
        return;
      }
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_ME}`,
        headers: authHeaders(ctx.token),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('id').and.to.be.a('number');
        expect(res.body).to.have.property('phone').and.to.be.a('string');
        expectNoSensitiveData(res.body);
      });
    });

    it('RBAC (Rule 2): TRADER JWT cannot access /api/portal/me (must return 401/403)', function () {
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

        cy.request({
          method: 'GET',
          url: `${apiUrl()}${PORTAL_ME}`,
          headers: authHeaders(traderToken),
          failOnStatusCode: false,
        }).then((res) => {
          expect(
            res.status,
            res.status === 200
              ? 'Critical RBAC bug: trader token must not access /api/portal/**'
              : undefined
          ).to.be.oneOf([401, 403]);
          expectErrorSanitized(res.body);
        });
      });
    });

    it('security headers (Rule 6): response includes X-Content-Type-Options and X-Frame-Options', function () {
      if (!ctx.token) {
        this.skip();
        return;
      }
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_ME}`,
        headers: authHeaders(ctx.token),
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

  // --- 6. GET /api/portal/session ---

  describe('GET /api/portal/session', () => {
    it('authentication enforcement (Rule 1): without token returns 401', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_SESSION}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(
          res.status,
          res.status === 200 ? 'Security bug: /api/portal/session must not succeed without token' : undefined
        ).to.eq(401);
        expectErrorSanitized(res.body);
      });
    });

    it('authentication enforcement (Rule 1): with malformed/invalid token returns 401', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_SESSION}`,
        headers: { Authorization: 'Bearer not.a.real.jwt' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(
          res.status,
          res.status === 200 ? 'Security bug: /api/portal/session must not accept invalid JWT' : undefined
        ).to.eq(401);
        expectErrorSanitized(res.body);
      });
    });

    it('functional: CONTACT token returns non-guest session with embedded ContactDTO', function () {
      if (!ctx.token) {
        this.skip();
        return;
      }

      cy.request({
        method: 'GET',
        url: `${apiUrl()}${PORTAL_SESSION}`,
        headers: authHeaders(ctx.token),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('guest', false);
        expect(res.body).to.have.property('phone').and.to.be.a('string');
        expect(res.body).to.have.property('contact');
        const contact = res.body.contact as Record<string, unknown>;
        expect(contact).to.have.property('id').and.to.be.a('number');
        expect(contact).to.have.property('phone').and.to.be.a('string');
        expectNoSensitiveData(res.body);
        expectNoSensitiveData(contact);
      });
    });

    it('RBAC (Rule 2): TRADER JWT cannot access /api/portal/session (must return 401/403)', function () {
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

        cy.request({
          method: 'GET',
          url: `${apiUrl()}${PORTAL_SESSION}`,
          headers: authHeaders(traderToken),
          failOnStatusCode: false,
        }).then((res) => {
          expect(
            res.status,
            res.status === 200
              ? 'Critical RBAC bug: trader token must not access /api/portal/session'
              : undefined
          ).to.be.oneOf([401, 403]);
          expectErrorSanitized(res.body);
        });
      });
    });
  });
});

