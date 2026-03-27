import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    // Use server env vars by default (no NEXT_PUBLIC_). Keep NEXT_PUBLIC_* as a fallback.
    apiKey: process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let appInstance;

function validateFirebaseConfig() {
    if (!firebaseConfig.apiKey) {
        throw new Error("Missing Firebase API key. Set NEXT_PUBLIC_FIREBASE_API_KEY (for client) or FIREBASE_API_KEY (server) in your .env.");
    }

    if (!firebaseConfig.authDomain) {
        throw new Error("Missing Firebase auth domain. Set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN or FIREBASE_AUTH_DOMAIN in your .env.");
    }

    if (!firebaseConfig.databaseURL) {
        throw new Error("Missing Firebase database URL. Set NEXT_PUBLIC_FIREBASE_DATABASE_URL or FIREBASE_DATABASE_URL in your .env.");
    }

    if (!firebaseConfig.projectId) {
        throw new Error("Missing Firebase project ID. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID or FIREBASE_PROJECT_ID in your .env.");
    }
}

export function getFirebaseApp() {
    if (!appInstance) {
        validateFirebaseConfig();
        appInstance = initializeApp(firebaseConfig);
    }

    return appInstance;
}

export function getFirebaseAuth() {
    return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
    return getDatabase(getFirebaseApp());
}