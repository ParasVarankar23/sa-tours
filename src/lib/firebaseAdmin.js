import admin from "firebase-admin";
import jwt from "jsonwebtoken";

let adminApp = null;

function getAdminApp() {
    // Reuse existing initialized app
    if (adminApp) return adminApp;

    if (admin.apps.length > 0) {
        adminApp = admin.app();
        return adminApp;
    }

    // Server-side env vars only
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const databaseURL =
        process.env.FIREBASE_DATABASE_URL ||
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    if (!projectId) {
        throw new Error("Missing FIREBASE_PROJECT_ID in environment variables.");
    }

    if (!clientEmail) {
        throw new Error("Missing FIREBASE_CLIENT_EMAIL in environment variables.");
    }

    if (!privateKey) {
        throw new Error("Missing FIREBASE_PRIVATE_KEY in environment variables.");
    }

    try {
        adminApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            databaseURL,
        });

        return adminApp;
    } catch (error) {
        throw new Error(
            `Failed to initialize Firebase Admin SDK: ${error.message || String(error)}`
        );
    }
}

// Export Firebase Admin services
export function getAdminAuth() {
    return admin.auth(getAdminApp());
}

export function getAdminDb() {
    return admin.database(getAdminApp());
}

// Optional helper if you need full admin app
export function getFirebaseAdminApp() {
    return getAdminApp();
}

// Verify incoming token:
// 1. Try Firebase ID token
// 2. If failed, try your server JWT (JWT_SECRET)
export async function verifyAuthToken(token) {
    if (!token) {
        throw new Error("no-token");
    }

    // Try Firebase ID token first
    try {
        const decoded = await getAdminAuth().verifyIdToken(token);

        return {
            uid: decoded.uid || decoded.user_id || null,
            role: decoded.role || decoded.roles || null,
            raw: decoded,
            type: "firebase",
        };
    } catch (firebaseError) {
        // Ignore and try JWT next
    }

    // Try custom server JWT
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        throw new Error("Missing JWT_SECRET in environment variables.");
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);

        return {
            uid: decoded.user_id || decoded.uid || null,
            role: decoded.role || null,
            raw: decoded,
            type: "jwt",
        };
    } catch (jwtError) {
        throw new Error("invalid-token");
    }
}