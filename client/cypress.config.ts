import { defineConfig } from 'cypress';

/**
 * Cypress config for MERCO.
 * API-only tests use baseUrl to hit the backend; override via CYPRESS_API_URL (e.g. http://localhost:8080).
 */
export default defineConfig({
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports',
    overwrite: false,
    html: true,
    json: true,
    reportFilename: 'trader-rbac-report',
  },
  e2e: {
    baseUrl: process.env.CYPRESS_API_URL || process.env.VITE_API_URL || 'http://localhost:8080',
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
    supportFile: 'cypress/support/e2e.ts',
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    env: {
      apiUrl: process.env.CYPRESS_API_URL || process.env.VITE_API_URL || 'http://localhost:8080',
      skipAuth: process.env.CYPRESS_SKIP_AUTH === 'true',
      traderLogin: process.env.CYPRESS_TRADER_LOGIN || '',
      traderPassword: process.env.CYPRESS_TRADER_PASSWORD || '',
      otherTraderRoleId: process.env.CYPRESS_OTHER_TRADER_ROLE_ID ? Number(process.env.CYPRESS_OTHER_TRADER_ROLE_ID) : undefined,
      otherUserId: process.env.CYPRESS_OTHER_USER_ID ? Number(process.env.CYPRESS_OTHER_USER_ID) : undefined,
    },
  },
  video: false,
});
