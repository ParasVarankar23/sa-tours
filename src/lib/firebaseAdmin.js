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
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Firebase Admin env vars missing: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
        );
    }

    adminApp = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });

    return adminApp;
}

export function getAdminAuth() {
    return admin.auth(getAdminApp());
}

export function getAdminDb() {
    return admin.database(getAdminApp());
}
