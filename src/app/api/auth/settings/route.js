import { getFirebaseAuth } from "@/lib/firebase";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import jwt from "jsonwebtoken";

function getUidFromRequest(request) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        return payload.user_id || payload.uid || payload.sub || null;
    } catch {
        return null;
    }
}

export async function PUT(request) {
    const uid = getUidFromRequest(request);
    if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { oldPassword, newPassword, confirmPassword } = await request.json();

    if (!oldPassword || !newPassword || !confirmPassword) {
        return Response.json({ error: "All fields are required" }, { status: 400 });
    }
    if (newPassword.length < 6) {
        return Response.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
        return Response.json({ error: "New password and confirm password do not match" }, { status: 400 });
    }
    if (oldPassword === newPassword) {
        return Response.json({ error: "New password must be different from old password" }, { status: 400 });
    }

    const db = getAdminDb();
    const snapshot = await db.ref(`users/${uid}`).get();
    if (!snapshot.exists()) {
        return Response.json({ error: "User not found" }, { status: 404 });
    }
    const email = snapshot.val().email;

    try {
        const auth = getFirebaseAuth();
        const credential = await signInWithEmailAndPassword(auth, email, oldPassword);
        await updatePassword(credential.user, newPassword);
    } catch (err) {
        if (
            err.code === "auth/wrong-password" ||
            err.code === "auth/invalid-credential" ||
            err.code === "auth/invalid-login-credentials"
        ) {
            return Response.json({ error: "Old password is incorrect" }, { status: 401 });
        }
        throw err;
    }

    return Response.json({ success: true, message: "Password changed successfully" });
}
