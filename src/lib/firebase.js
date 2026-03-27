import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let appInstance;

function validateFirebaseConfig() {
    if (!firebaseConfig.apiKey) {
        throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");
    }

    if (!firebaseConfig.authDomain) {
        throw new Error("Missing NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
    }

    if (!firebaseConfig.databaseURL) {
        throw new Error("Missing NEXT_PUBLIC_FIREBASE_DATABASE_URL");
    }

    if (!firebaseConfig.projectId) {
        throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");
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