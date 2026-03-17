import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import jwt from "jsonwebtoken";

async function findUserByEmail(adminAuth, db, email) {
    try {
        const authUser = await adminAuth.getUserByEmail(email);
        const snapshot = await db.ref(`users/${authUser.uid}`).get();
        if (!snapshot.exists()) return null;
        return { uid: authUser.uid, data: snapshot.val() };
    } catch {
        return null;
    }
}

function normalizeRole(role) {
    if (!role) return null;
    return String(role).trim().toLowerCase();
}

async function parseJsonBody(request) {
    try {
        return await request.json();
    } catch {
        return {};
    }
}

export async function POST(request) {
    try {
        const { idToken, expectedRole } = await parseJsonBody(request);

        if (!idToken) {
            return Response.json(
                { error: "Google ID token is required" },
                { status: 400 }
            );
        }

        let adminAuth, db;
        try {
            adminAuth = getAdminAuth();
            db = getAdminDb();
        } catch (e) {
            console.error("google-login: failed to initialize firebase admin:", e && e.message ? e.message : e);
            return Response.json({ error: "Server misconfiguration: firebase admin init failed" }, { status: 500 });
        }

        let decoded;
        try {
            decoded = await adminAuth.verifyIdToken(idToken);
        } catch (e) {
            console.error("google-login: failed to verify idToken:", e && e.message ? e.message : e);
            return Response.json({ error: "Invalid or expired Google ID token" }, { status: 401 });
        }
        const uid = decoded.uid;
        const email = (decoded.email || "").toLowerCase();
        const name = decoded.name || "";

        if (!email) {
            return Response.json(
                { error: "Google account email not found" },
                { status: 400 }
            );
        }

        const userRef = db.ref(`users/${uid}`);
        const snapshot = await userRef.get();
        const existingByUid = snapshot.exists() ? snapshot.val() : null;
        const existingByEmail = await findUserByEmail(adminAuth, db, email);

        // Check if this uid exists under staff collection
        let staffData = null;
        try {
            const staffSnap = await db.ref(`staff/${uid}`).get();
            if (staffSnap.exists()) staffData = staffSnap.val();
        } catch (e) {
            // ignore
        }

        const roleByUid = existingByUid?.role ? normalizeRole(existingByUid.role) : null;
        const roleByEmail = existingByEmail?.data?.role ? normalizeRole(existingByEmail.data.role) : null;

        // Role precedence: admin > staff > user
        let resolvedRole = "user";
        if (roleByUid === "admin" || roleByEmail === "admin") resolvedRole = "admin";
        else if (staffData || roleByUid === "staff" || roleByEmail === "staff") resolvedRole = "staff";
        else if (roleByUid === "user" || roleByEmail === "user") resolvedRole = "user";

        const resolvedUser = existingByUid || existingByEmail?.data || null;

        if (expectedRole) {
            const exp = normalizeRole(expectedRole) || "user";
            if (exp !== resolvedRole) {
                return Response.json(
                    { error: `${exp.charAt(0).toUpperCase() + exp.slice(1)} is not found` },
                    { status: 404 }
                );
            }
        }

        const nowIso = new Date().toISOString();

        await userRef.update({
            name: name || resolvedUser?.name || "",
            email: email || resolvedUser?.email || "",
            role: resolvedRole,
            provider: "google",
            updatedAt: nowIso,
            ...(resolvedUser ? {} : { createdAt: nowIso }),
        });

        const userRole = resolvedRole;
        const jwtSecret = process.env.JWT_SECRET;
        const jwtExpiration = process.env.JWT_EXPIRATION || "7d";

        if (!jwtSecret) {
            return Response.json(
                { error: "Server configuration error: missing JWT_SECRET" },
                { status: 500 }
            );
        }

        const authToken = jwt.sign({ user_id: uid, role: userRole }, jwtSecret, {
            expiresIn: jwtExpiration,
        });

        return Response.json(
            {
                success: true,
                message: "Google login successful",
                user: {
                    uid,
                    email,
                    name,
                    role: userRole,
                    position: staffData?.position || null,
                },
                authToken,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Google login error:", error);
        return Response.json(
            { error: error.message || "Google login failed" },
            { status: 500 }
        );
    }
}
