/**
 * Admin Utilities
 *
 * Centralised admin email whitelist and check for moderation features.
 */

import { getAuthService } from './safe';

/** Admin emails that have moderation powers */
const ADMIN_EMAILS: ReadonlySet<string> = new Set(['me@markedmondson.me', 'sanneharder@gmail.com']);

/**
 * Check if the currently authenticated user is an admin.
 * Returns false if not authenticated or email not in whitelist.
 */
export function isAdmin(): boolean {
  const auth = getAuthService();
  const state = auth.getState();
  if (!state.isAuthenticated || !state.user) return false;
  const email = state.user.email;
  return email !== null && ADMIN_EMAILS.has(email);
}

/**
 * Get the admin emails list (for display in UI).
 */
export function getAdminEmails(): readonly string[] {
  return [...ADMIN_EMAILS];
}
