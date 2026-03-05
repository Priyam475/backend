// Thin re-export layer so that production API files do not contain mock logic.
// Vehicle CRUD is stubbed in api/vehicles.ts (use arrivals API).
// RBAC: use api/rbac.ts for admin & trader role/user management.
// Admin RBAC uses /api/admin/rbac/**; trader RBAC uses /api/trader/rbac/**.
