#!/usr/bin/env tsx
/**
 * One-time VAPID key generation script for Web Push notifications.
 * Run: npx tsx scripts/generate-vapid.ts
 *
 * Copy the output into your .env.local:
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 *   VAPID_SUBJECT=mailto:admin@getpidief.com
 */

import webpush from "web-push";

const vapidKeys = webpush.generateVAPIDKeys();

console.log("\n🔑  VAPID Keys generated!\n");
console.log("Add these to your .env.local:\n");
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@getpidief.com`);
console.log("\n⚠️  Keep VAPID_PRIVATE_KEY secret — never commit it to version control.\n");