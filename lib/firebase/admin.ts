import * as admin from "firebase-admin";

// Ensure environment variables are loaded appropriately
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.replace(/"/g, "");

// Handles newline characters generated from the .env safely
const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/"/g, "")
    : undefined;

// Prevent memory leaks on hot reloads in Next.js
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

// Extract essential admin tools uniformly
const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth };
