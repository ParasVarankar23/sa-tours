function getFirebaseConfig() {
    return {
        apiKey: String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim(),
        dbUrl: String(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").trim().replace(/\/$/, ""),
    };
}

async function createAuthUser({ apiKey, email, password, fullName, phone }) {
    if (!apiKey) {
        return { status: "skipped", reason: "Missing NEXT_PUBLIC_FIREBASE_API_KEY" };
    }

    const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email,
            password,
            displayName: fullName,
            phoneNumber: phone || undefined,
            returnSecureToken: true,
        }),
    });

    const data = await res.json();
    if (res.ok) {
        return {
            status: "created",
            firebaseAuthUid: data.localId || null,
            idToken: data.idToken || null,
        };
    }

    const code = data?.error?.message || "UNKNOWN";
    if (code === "EMAIL_EXISTS") {
        return { status: "exists", firebaseAuthUid: null, idToken: null };
    }

    return { status: "failed", reason: code, idToken: null };
}

async function signInAuthUser({ apiKey, email, password }) {
    if (!apiKey) {
        return { status: "skipped", reason: "Missing NEXT_PUBLIC_FIREBASE_API_KEY", idToken: null, firebaseAuthUid: null };
    }

    if (!password) {
        return { status: "skipped", reason: "Missing password for Firebase sign in", idToken: null, firebaseAuthUid: null };
    }

    const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
        }),
    });

    const data = await res.json();
    if (!res.ok) {
        return {
            status: "failed",
            reason: data?.error?.message || "UNKNOWN",
            idToken: null,
            firebaseAuthUid: null,
        };
    }

    return {
        status: "signed-in",
        idToken: data.idToken || null,
        firebaseAuthUid: data.localId || null,
    };
}

async function upsertRealtimeUser({ dbUrl, idToken, localUserId, payload }) {
    if (!dbUrl) {
        return { status: "skipped", reason: "Missing NEXT_PUBLIC_FIREBASE_DATABASE_URL" };
    }

    const endpoint = idToken
        ? `${dbUrl}/users/${encodeURIComponent(localUserId)}.json?auth=${encodeURIComponent(idToken)}`
        : `${dbUrl}/users/${encodeURIComponent(localUserId)}.json`;

    const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text();
        return { status: "failed", reason: text || `HTTP_${res.status}` };
    }

    return { status: "upserted" };
}

export async function syncUserToFirebase({
    localUserId,
    fullName,
    email,
    phone,
    role,
    password,
    authProvider = "password",
}) {
    const { apiKey, dbUrl } = getFirebaseConfig();

    const authResult = await createAuthUser({
        apiKey,
        email,
        password,
        fullName,
        phone,
    });

    let resolvedAuthResult = authResult;
    if (authResult.status === "exists") {
        const signInResult = await signInAuthUser({ apiKey, email, password });
        resolvedAuthResult = {
            status: signInResult.status === "signed-in" ? "exists" : authResult.status,
            firebaseAuthUid: signInResult.firebaseAuthUid || authResult.firebaseAuthUid || null,
            idToken: signInResult.idToken || null,
            reason: signInResult.status === "failed" ? signInResult.reason : undefined,
        };
    }

    const realtimePayload = {
        id: localUserId,
        fullName,
        email,
        phone,
        role,
        authProvider,
        firebaseAuthStatus: resolvedAuthResult.status,
        firebaseAuthUid: resolvedAuthResult.firebaseAuthUid || null,
        syncedAt: new Date().toISOString(),
    };

    const dbResult = await upsertRealtimeUser({
        dbUrl,
        idToken: resolvedAuthResult.idToken,
        localUserId,
        payload: realtimePayload,
    });

    const warnings = [];
    if (resolvedAuthResult.status === "failed" || resolvedAuthResult.status === "skipped") {
        warnings.push(`Firebase Auth sync: ${resolvedAuthResult.reason || resolvedAuthResult.status}`);
    }
    if (dbResult.status === "failed" || dbResult.status === "skipped") {
        warnings.push(`Realtime DB sync: ${dbResult.reason || dbResult.status}`);
    }

    if (!resolvedAuthResult.idToken) {
        warnings.push("Realtime DB write used unauthenticated request. Check Firebase Realtime Database rules.");
    }

    return {
        authResult: resolvedAuthResult,
        dbResult,
        warnings,
    };
}
