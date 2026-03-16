import { sendForgotPasswordEmail } from "@/lib/emailService";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

const ALLOWED_ROLES = new Set(["admin", "teacher", "student"]);

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
    return typeof password === "string" && password.length >= 6;
}

function normalizeRole(role) {
    return String(role || "").trim().toLowerCase();
}

async function getAllowedRoleByUid(db, uid) {
    const snapshot = await db.ref(`users/${uid}`).get();
    if (!snapshot.exists()) return "";

    const role = normalizeRole(snapshot.val()?.role);
    return ALLOWED_ROLES.has(role) ? role : "";
}

function emailToKey(email) {
    return email.replaceAll(".", "_dot_").replaceAll("@", "_at_");
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function mapFirebaseError(error) {
    const code = error?.code || error?.errorInfo?.code || "";

    if (code === "auth/user-not-found") {
        return { status: 404, error: "No account found with this email" };
    }

    if (code === "auth/invalid-email") {
        return { status: 400, error: "Invalid email address" };
    }

    if (code === "auth/invalid-password" || code === "auth/weak-password") {
        return { status: 400, error: "Invalid password format" };
    }

    return { status: 500, error: "Internal server error" };
}

async function handleSendOtp(body) {
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
        return Response.json({ error: "Email is required" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
        return Response.json({ error: "Invalid email address" }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const db = getAdminDb();

    let authUser;

    try {
        authUser = await adminAuth.getUserByEmail(email);
    } catch (error) {
        const code = error?.code || error?.errorInfo?.code;

        if (code !== "auth/user-not-found") {
            throw error;
        }

        return Response.json({ error: "No account found with this email" }, { status: 404 });
    }

    const role = await getAllowedRoleByUid(db, authUser.uid);

    if (!role) {
        return Response.json(
            { error: "Only admin, teacher, or student accounts can reset password" },
            { status: 403 }
        );
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await db.ref(`otps/${emailToKey(email)}`).set({
        otp,
        expiresAt,
        attempts: 0,
        role,
        createdAt: Date.now(),
    });

    await sendForgotPasswordEmail(email, otp);

    return Response.json(
        {
            success: true,
            message: "A 6-digit OTP has been sent to your email. It expires in 10 minutes.",
            role,
        },
        { status: 200 }
    );
}

async function handleResetPassword(body) {
    const email = String(body?.email || "").trim().toLowerCase();
    const otp = String(body?.otp || "").trim();
    const newPassword = String(body?.newPassword || "");
    const confirmPassword = String(body?.confirmPassword || "");

    if (!email || !otp || !newPassword || !confirmPassword) {
        return Response.json(
            { error: "Email, OTP, new password and confirm password are required" },
            { status: 400 }
        );
    }

    if (!isValidEmail(email)) {
        return Response.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
        return Response.json({ error: "Passwords do not match" }, { status: 400 });
    }

    if (!isStrongPassword(newPassword)) {
        return Response.json(
            { error: "Password must be at least 6 characters" },
            { status: 400 }
        );
    }

    const db = getAdminDb();
    const otpRef = db.ref(`otps/${emailToKey(email)}`);
    const snapshot = await otpRef.get();

    if (!snapshot.exists()) {
        return Response.json(
            { error: "OTP not found. Please request a new OTP." },
            { status: 400 }
        );
    }

    const record = snapshot.val();

    if ((record.attempts || 0) >= 3) {
        await otpRef.remove();
        return Response.json(
            { error: "Too many failed attempts. Please request a new OTP." },
            { status: 400 }
        );
    }

    if (Date.now() > record.expiresAt) {
        await otpRef.remove();
        return Response.json(
            { error: "OTP has expired. Please request a new OTP." },
            { status: 400 }
        );
    }

    if (record.otp !== otp) {
        const nextAttempts = (record.attempts || 0) + 1;
        await otpRef.update({ attempts: nextAttempts });

        const remaining = 3 - nextAttempts;

        return Response.json(
            { error: `Invalid OTP. ${Math.max(remaining, 0)} attempt(s) remaining.` },
            { status: 400 }
        );
    }

    const adminAuth = getAdminAuth();
    const user = await adminAuth.getUserByEmail(email);
    const role = await getAllowedRoleByUid(db, user.uid);

    if (!role) {
        return Response.json(
            { error: "Only admin, teacher, or student accounts can reset password" },
            { status: 403 }
        );
    }

    if (record.role && normalizeRole(record.role) !== role) {
        await otpRef.remove();
        return Response.json(
            { error: "Account role mismatch. Please request a new OTP." },
            { status: 400 }
        );
    }

    await adminAuth.updateUser(user.uid, { password: newPassword });
    await otpRef.remove();

    return Response.json(
        {
            success: true,
            message: "Password reset successful. You can now login.",
            role,
        },
        { status: 200 }
    );
}

export async function POST(request) {
    try {
        const body = await request.json();
        const action = String(body?.action || "").trim();

        console.log("FORGOT PASSWORD BODY:", body);

        if (!action) {
            return Response.json({ error: "Action is required" }, { status: 400 });
        }

        if (action === "send-otp") {
            return await handleSendOtp(body);
        }

        if (action === "reset-password") {
            return await handleResetPassword(body);
        }

        return Response.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Forgot password error:", error);
        const mapped = mapFirebaseError(error);
        return Response.json({ error: mapped.error }, { status: mapped.status });
    }
}