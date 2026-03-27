import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    // Client-side Firebase MUST use NEXT_PUBLIC_* env vars in Next.js
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

function validateFirebaseConfig() {
    if (!firebaseConfig.apiKey) {
        throw new Error(
            "Missing NEXT_PUBLIC_FIREBASE_API_KEY in environment variables."
        );
    }

    if (!firebaseConfig.authDomain) {
        throw new Error(
            "Missing NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN in environment variables."
        );
    }

    if (!firebaseConfig.databaseURL) {
        throw new Error(
            "Missing NEXT_PUBLIC_FIREBASE_DATABASE_URL in environment variables."
        );
    }

    if (!firebaseConfig.projectId) {
        throw new Error(
            "Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID in environment variables."
        );
    }
}

// Validate once before app initialization
validateFirebaseConfig();

// Prevent duplicate Firebase app initialization
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getDatabase(app);

export default app;