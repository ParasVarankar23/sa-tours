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
    if (!role) return "user";
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

        const adminAuth = getAdminAuth();
        const db = getAdminDb();

        const decoded = await adminAuth.verifyIdToken(idToken);
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

        const roleByUid = normalizeRole(existingByUid?.role);
        const roleByEmail = normalizeRole(existingByEmail?.data?.role);

        let resolvedRole = roleByUid || roleByEmail || "user";
        if (roleByUid !== "admin" && roleByEmail === "admin") {
            resolvedRole = "admin";
        }

        const resolvedUser = existingByUid || existingByEmail?.data || null;

        if (expectedRole === "admin" && resolvedRole !== "admin") {
            return Response.json(
                { error: "Admin is not found" },
                { status: 404 }
            );
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
