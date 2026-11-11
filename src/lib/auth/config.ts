// Legacy compatibility shim: use the canonical auth module.
export { handlers, signIn, signOut, auth } from "./auth";
export { getCurrentUser, requireAuth, requireRole, isAdmin } from "./auth";
