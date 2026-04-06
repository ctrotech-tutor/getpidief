// ─────────────────────────────────────────────────────────────────────────────
// INNGEST FUNCTIONS INDEX
// All Inngest functions must be registered here and exported as `functions`
// This array is passed to serve() in /api/webhooks/inngest/route.ts
// ─────────────────────────────────────────────────────────────────────────────

// Document workers
export {
  processUploadedDocument,
  handleDocumentApproved,
  handleDocumentRejected,
  recalculateTrending,
  flushEngagementCounters,
  rebuildSearchVectors,
} from "./documents/processDocument";

// Reputation workers
export {
  updateReputation,
  checkAndAwardBadges,
  updateUserStreak,
} from "./reputation/reputationWorker";

// Notification workers
export {
  sendNotification,
  sendWeeklyDigest,
  processWeeklyDigest,
} from "./notifications/notificationWorker";

// Analytics workers
export {
  takeDailySnapshot,
  aggregatePopularSearches,
  updateInstitutionLeaderboard,
  cleanupExpiredData,
} from "./analytics/analyticsWorker";

// ─── Collect all functions into a single array for serve() ───────────────────

import {
  processUploadedDocument,
  handleDocumentApproved,
  handleDocumentRejected,
  recalculateTrending,
  flushEngagementCounters,
  rebuildSearchVectors,
} from "./documents/processDocument";

import {
  updateReputation,
  checkAndAwardBadges,
  updateUserStreak,
} from "./reputation/reputationWorker";

import {
  sendNotification,
  sendWeeklyDigest,
  processWeeklyDigest,
} from "./notifications/notificationWorker";

import {
  takeDailySnapshot,
  aggregatePopularSearches,
  updateInstitutionLeaderboard,
  cleanupExpiredData,
} from "./analytics/analyticsWorker";

export const functions = [
  // Documents
  processUploadedDocument,
  handleDocumentApproved,
  handleDocumentRejected,
  recalculateTrending,
  flushEngagementCounters,
  rebuildSearchVectors,

  // Reputation
  updateReputation,
  checkAndAwardBadges,
  updateUserStreak,

  // Notifications
  sendNotification,
  sendWeeklyDigest,
  processWeeklyDigest,

  // Analytics
  takeDailySnapshot,
  aggregatePopularSearches,
  updateInstitutionLeaderboard,
  cleanupExpiredData,
];
