/**
 * API-only Cypress tests for Trader RBAC backend: /api/trader/rbac
 * Aligned with TraderRbacResource (roles + users), DTOs and validation.
 * Auth: trader JWT via POST /api/auth/login.
 * Credentials: CYPRESS_TRADER_LOGIN / CYPRESS_TRADER_PASSWORD (e.g. jayminrabari2000@gmail.com / trader-setup).
 * Skip auth: CYPRESS_SKIP_AUTH=true.
 *
 * Security: Follows MERCO QA Cypress API Security Policy (4.1, 4.2, 4.3).
 */

const RBAC_ROLES = '/api/trader/rbac/roles';
const RBAC_USERS = '/api/trader/rbac/users';

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

describe('Trader RBAC API', () => {
  let traderToken: string | null = null;

  before(function () {
    const skip = Cypress.env('skipAuth');
    const login = Cypress.env('traderLogin');
    const password = Cypress.env('traderPassword');
    if (skip || !login || !password) {
      this.skip();
      return;
    }
    return cy
      .request({
        method: 'POST',
        url: `${apiUrl()}/api/auth/login`,
        body: { username: login, password },
        failOnStatusCode: false,
      })
      .then((res) => {
        if (res.status === 200) {
          const h = res.headers['authorization'] || res.headers['Authorization'];
          const headerVal = Array.isArray(h) ? h[0] : h;
          if (headerVal && typeof headerVal === 'string') {
            traderToken = headerVal.replace(/^Bearer\s+/i, '').trim();
          }
        }
      });
  });

  // --- Rule 1: Authentication — protected APIs must return 401/403 without token ---
  describe('Authentication (Rule 1)', () => {
    it('enforces authentication (401 without token): GET /api/trader/rbac/roles without token returns 401 or 403', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${RBAC_ROLES}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(
          res.status,
          res.status === 200 ? 'Security bug: Authentication not enforced – 200 without token' : undefined
        ).to.be.oneOf([401, 403]);
      });
    });

    it('enforces authentication (401 without token): GET /api/trader/rbac/users without token returns 401 or 403', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${RBAC_USERS}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(
          res.status,
          res.status === 200 ? 'Security bug: Authentication not enforced – 200 without token' : undefined
        ).to.be.oneOf([401, 403]);
      });
    });
  });

  describe('Roles', function () {
    before(function () {
      if (!traderToken) this.skip();
    });

    it('functional: GET /api/trader/rbac/roles returns 200 and array', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${RBAC_ROLES}`,
        headers: authHeaders(traderToken!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
      });
    });

    let createdRoleId: number | null = null;

    it('functional: POST /api/trader/rbac/roles creates role and returns 201 with body and Location', () => {
      const payload = {
        roleName: `Cypress Role ${Date.now()}`,
        description: 'Created by Cypress API test',
        modulePermissions: {},
      };
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${RBAC_ROLES}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: payload,
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body).to.have.property('id').and.to.be.a('number');
        expect(res.body.roleName).to.eq(payload.roleName);
        expect(res.body.description).to.eq(payload.description);
        expect(res.headers['location']).to.include('/api/trader/rbac/roles/');
        createdRoleId = res.body.id;
      });
    });

    it('functional: PUT /api/trader/rbac/roles/:id updates role', () => {
      expect(createdRoleId).to.be.a('number');
      const roleId = createdRoleId!;
      const updatePayload = {
        id: roleId,
        roleName: `Cypress Role Updated ${roleId}`,
        description: 'Updated by Cypress',
        modulePermissions: {},
      };
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${RBAC_ROLES}/${roleId}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: updatePayload,
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.id).to.eq(roleId);
        expect(res.body.roleName).to.eq(updatePayload.roleName);
      });
    });

    it('functional: DELETE /api/trader/rbac/roles/:id returns 204', () => {
      expect(createdRoleId).to.be.a('number');
      cy.request({
        method: 'DELETE',
        url: `${apiUrl()}${RBAC_ROLES}/${createdRoleId}`,
        headers: authHeaders(traderToken!),
      }).then((res) => {
        expect(res.status).to.eq(204);
      });
    });

    it('input validation: POST /api/trader/rbac/roles with id returns 400 (idexists)', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${RBAC_ROLES}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: { id: 999, roleName: 'Bad', description: 'Has ID' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        expect(res.body?.detail ?? res.body?.message ?? '').to.satisfy(
          (s: string) => !s || s.includes('ID') || s.includes('idexists')
        );
        expectErrorSanitized(res.body);
      });
    });

    it('input validation: POST /api/trader/rbac/roles with malicious/invalid payload returns 400', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${RBAC_ROLES}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: {
          roleName: "'; DROP TABLE role; --",
          description: 'x'.repeat(10001),
          modulePermissions: {},
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'Security: invalid or malicious input should be rejected with 400').to.eq(400);
        expectErrorSanitized(res.body);
      });
    });

    it('PUT /api/trader/rbac/roles/:id with non-existent id returns 404', () => {
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${RBAC_ROLES}/999999`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: { id: 999999, roleName: 'X', description: 'Y', modulePermissions: {} },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(404);
        expectErrorSanitized(res.body);
      });
    });

    it('IDOR (Rule 5): PUT /api/trader/rbac/roles/:id with another trader\'s role id returns 403', function () {
      const otherRoleId = Cypress.env('otherTraderRoleId') as number | undefined;
      if (otherRoleId == null) {
        cy.log('CYPRESS_OTHER_TRADER_ROLE_ID not set; skip IDOR role test (use second trader in env for full coverage)');
        this.skip();
        return;
      }
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${RBAC_ROLES}/${otherRoleId}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: { id: otherRoleId, roleName: 'Hacked', description: 'Y', modulePermissions: {} },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'Security: IDOR – must not allow updating another trader\'s role').to.eq(403);
        expectErrorSanitized(res.body);
      });
    });

    it('IDOR (Rule 5): DELETE /api/trader/rbac/roles/:id with another trader\'s role id returns 403', function () {
      const otherRoleId = Cypress.env('otherTraderRoleId') as number | undefined;
      if (otherRoleId == null) {
        this.skip();
        return;
      }
      cy.request({
        method: 'DELETE',
        url: `${apiUrl()}${RBAC_ROLES}/${otherRoleId}`,
        headers: authHeaders(traderToken!),
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'Security: IDOR – must not allow deleting another trader\'s role').to.eq(403);
        expectErrorSanitized(res.body);
      });
    });

    it('security headers (Rule 6): GET /roles response includes X-Content-Type-Options and X-Frame-Options', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${RBAC_ROLES}`,
        headers: authHeaders(traderToken!),
      }).then((res) => {
        const headers = res.headers as Record<string, string>;
        expect(headers['x-content-type-options'] ?? headers['X-Content-Type-Options'], 'Security: X-Content-Type-Options header should be present').to.be.a('string').and.not.empty;
        expect(headers['x-frame-options'] ?? headers['X-Frame-Options'], 'Security: X-Frame-Options header should be present').to.be.a('string').and.not.empty;
        if (!(headers['x-xss-protection'] ?? headers['X-XSS-Protection']) && !(headers['cache-control'] ?? headers['Cache-Control'])) {
          cy.log('Security warning: X-XSS-Protection or Cache-Control not found (optional per policy)');
        }
      });
    });

    it('method access (Rule 8): PUT to GET list path /api/trader/rbac/roles returns 405', () => {
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${RBAC_ROLES}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: {},
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'Security: GET-only list path must not accept PUT').to.eq(405);
      });
    });
  });

  describe('Users', function () {
    before(function () {
      if (!traderToken) this.skip();
    });

    let createdUserId: number | null = null;

    it('functional: GET /api/trader/rbac/users returns 200 and array', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${RBAC_USERS}`,
        headers: authHeaders(traderToken!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
      });
    });

    it('sensitive data (Rule 3): GET /users response does not contain password, passwordHash, or token', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${RBAC_USERS}`,
        headers: authHeaders(traderToken!),
      }).then((res) => {
        expect(res.status).to.eq(200);
        if (Array.isArray(res.body)) {
          res.body.forEach((item: unknown) => expectNoSensitiveData(item));
        }
      });
    });

    it('functional: POST /api/trader/rbac/users creates user and returns 201 with TraderRbacUserVM shape', () => {
      const payload = {
        email: `cypress-rbac-${Date.now()}@example.com`,
        fullName: 'Cypress Staff',
        password: 'password123',
        roleInTrader: 'STAFF',
        activated: true,
      };
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${RBAC_USERS}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: payload,
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body).to.have.property('id').and.to.be.a('number');
        expect(res.body).to.have.property('login');
        expect(res.body.email).to.eq(payload.email);
        expect(res.body.fullName).to.eq(payload.fullName);
        expect(res.body.activated).to.eq(true);
        expect(res.body.roleInTrader).to.eq('STAFF');
        expect(res.body).to.have.property('roleIds').and.to.be.an('array');
        expect(res.headers['location']).to.include('/api/trader/rbac/users/');
        expectNoSensitiveData(res.body);
        createdUserId = res.body.id;
      });
    });

    it('functional: PUT /api/trader/rbac/users/:id updates user and roleIds', () => {
      expect(createdUserId).to.be.a('number');
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${RBAC_USERS}/${createdUserId}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: {
          email: `cypress-updated-${createdUserId}@example.com`,
          fullName: 'Cypress Updated Name',
          activated: false,
          roleInTrader: 'STAFF',
          roleIds: [],
        },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.fullName).to.eq('Cypress Updated Name');
        expect(res.body.activated).to.eq(false);
        expectNoSensitiveData(res.body);
      });
    });

    it('functional: DELETE /api/trader/rbac/users/:id returns 204', () => {
      expect(createdUserId).to.be.a('number');
      cy.request({
        method: 'DELETE',
        url: `${apiUrl()}${RBAC_USERS}/${createdUserId}`,
        headers: authHeaders(traderToken!),
      }).then((res) => {
        expect(res.status).to.eq(204);
      });
    });

    it('security headers (Rule 6): GET /users response includes X-Content-Type-Options and X-Frame-Options', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${RBAC_USERS}`,
        headers: authHeaders(traderToken!),
      }).then((res) => {
        const headers = res.headers as Record<string, string>;
        expect(headers['x-content-type-options'] ?? headers['X-Content-Type-Options'], 'Security: X-Content-Type-Options header should be present').to.be.a('string').and.not.empty;
        expect(headers['x-frame-options'] ?? headers['X-Frame-Options'], 'Security: X-Frame-Options header should be present').to.be.a('string').and.not.empty;
      });
    });

    it('method access (Rule 8): PUT to GET list path /api/trader/rbac/users returns 405', () => {
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${RBAC_USERS}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: {},
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'Security: GET-only list path must not accept PUT').to.eq(405);
      });
    });
  });

  describe('User validation and errors', function () {
    before(function () {
      if (!traderToken) this.skip();
    });

    it('input validation: POST /api/trader/rbac/users with short password returns 400', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${RBAC_USERS}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: {
          email: 'short-pw@example.com',
          fullName: 'Test',
          password: '12345',
          roleInTrader: 'STAFF',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        const detail = res.body?.detail ?? res.body?.message ?? '';
        expect(detail.toLowerCase()).to.satisfy(
          (s: string) => !s || s.includes('password') || s.includes('6') || s.includes('passwordtooshort')
        );
        expectErrorSanitized(res.body);
      });
    });

    it('input validation: POST /api/trader/rbac/users with invalid email returns 400', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${RBAC_USERS}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: {
          email: 'not-an-email',
          fullName: 'Test',
          password: 'password123',
          roleInTrader: 'STAFF',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        expectErrorSanitized(res.body);
      });
    });

    it('input validation: POST /api/trader/rbac/users with malicious payload returns 400', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${RBAC_USERS}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: {
          email: "admin'--@example.com",
          fullName: "'; DROP TABLE user_trader; --",
          password: 'password123',
          roleInTrader: 'STAFF',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'Security: invalid or malicious input should be rejected with 400').to.be.oneOf([400, 422]);
        expectErrorSanitized(res.body);
      });
    });

    it('RBAC / data integrity (Rule 2, 9): POST /api/trader/rbac/users with roleInTrader OWNER returns 403', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}${RBAC_USERS}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: {
          email: `owner-attempt-${Date.now()}@example.com`,
          fullName: 'Owner Attempt',
          password: 'password123',
          roleInTrader: 'OWNER',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(403);
        const body = res.body?.detail ?? res.body?.message ?? (res.body ? String(res.body) : '');
        expect(body.toLowerCase()).to.satisfy(
          (s: string) => !s || s.includes('owner') || s.includes('staff') || s.includes('rbac')
        );
        expectErrorSanitized(res.body);
      });
    });

    it('RBAC / data integrity (Rule 2, 9): PUT /api/trader/rbac/users/:id with roleInTrader OWNER returns 403', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl()}${RBAC_USERS}`,
        headers: authHeaders(traderToken!),
      }).then((listRes) => {
        const first = Array.isArray(listRes.body) ? listRes.body[0] : null;
        if (!first?.id) {
          cy.log('No staff user to update; skipping PUT OWNER test');
          return;
        }
        cy.request({
          method: 'PUT',
          url: `${apiUrl()}${RBAC_USERS}/${first.id}`,
          headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
          body: { roleInTrader: 'OWNER' },
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(403);
          expectErrorSanitized(res.body);
        });
      });
    });

    it('IDOR (Rule 5): PUT /api/trader/rbac/users/:id with user not mapped to current trader returns 403', function () {
      const otherUserId = Cypress.env('otherUserId') as number | undefined;
      if (otherUserId == null) {
        cy.log('CYPRESS_OTHER_USER_ID not set; skip IDOR user test (use user from another trader for full coverage)');
        this.skip();
        return;
      }
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${RBAC_USERS}/${otherUserId}`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: { fullName: 'Hacked', roleInTrader: 'STAFF' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'Security: IDOR – must not allow updating user not mapped to current trader').to.eq(403);
        expectErrorSanitized(res.body);
      });
    });

    it('IDOR (Rule 5): DELETE /api/trader/rbac/users/:id with user not mapped to current trader returns 403', function () {
      const otherUserId = Cypress.env('otherUserId') as number | undefined;
      if (otherUserId == null) {
        this.skip();
        return;
      }
      cy.request({
        method: 'DELETE',
        url: `${apiUrl()}${RBAC_USERS}/${otherUserId}`,
        headers: authHeaders(traderToken!),
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'Security: IDOR – must not allow deleting user not mapped to current trader').to.eq(403);
        expectErrorSanitized(res.body);
      });
    });

    it('PUT /api/trader/rbac/users/:id with non-existent id returns 404', () => {
      cy.request({
        method: 'PUT',
        url: `${apiUrl()}${RBAC_USERS}/999999`,
        headers: { ...authHeaders(traderToken!), 'Content-Type': 'application/json' },
        body: { fullName: 'X', roleInTrader: 'STAFF' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(404);
        expectErrorSanitized(res.body);
      });
    });
  });
});
