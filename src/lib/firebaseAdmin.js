import admin from "firebase-admin";

let adminApp = null;

function getAdminApp() {
    if (adminApp) return adminApp;

    if (admin.apps.length) {
        adminApp = admin.app();
        return adminApp;
    }

    const projectId =
        process.env.FIREBASE_PROJECT_ID ||
        process.env.FIREBASE_PROJECT_ID;

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Firebase Admin env vars missing: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
        );
    }

    adminApp = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    return adminApp;
}

export function getAdminAuth() {
    return admin.auth(getAdminApp());
}

export function getAdminDb() {
    return admin.database(getAdminApp());
}

// Verify an incoming bearer token. Supports either a Firebase ID token
// (verified using Admin SDK) or the server JWT (signed with JWT_SECRET).
// Returns an object with at least { uid, role } on success, or throws on failure.
export async function verifyAuthToken(token) {
    if (!token) throw new Error('no-token');

    // Try Firebase ID token first
    try {
        const decoded = await getAdminAuth().verifyIdToken(token);
        // decoded may include uid and role (if custom claims); normalize
        return { uid: decoded.uid || decoded.user_id || null, role: decoded.role || decoded.roles || null, raw: decoded };
    } catch (e) {
        // ignore and try JWT
    }

    // Try server JWT (signed with JWT_SECRET)
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('no-jwt-secret');
    try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.verify(token, jwtSecret);
        // server tokens use `user_id` and `role`
        return { uid: decoded.user_id || decoded.uid || null, role: decoded.role || null, raw: decoded };
    } catch (e) {
        throw new Error('invalid-token');
    }
}
