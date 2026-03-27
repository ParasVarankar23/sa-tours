import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
};

let appInstance;

function validateFirebaseConfig() {
    if (!firebaseConfig.apiKey) {
        throw new Error("Missing FIREBASE_API_KEY");
    }

    if (!firebaseConfig.authDomain) {
        throw new Error("Missing FIREBASE_AUTH_DOMAIN");
    }

    if (!firebaseConfig.databaseURL) {
        throw new Error("Missing FIREBASE_DATABASE_URL");
    }

    if (!firebaseConfig.projectId) {
        throw new Error("Missing FIREBASE_PROJECT_ID");
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