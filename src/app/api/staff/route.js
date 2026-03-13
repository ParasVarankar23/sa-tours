import { generateId, generateTempPassword, hashPassword, verifyToken } from "@/lib/server/auth";
import { getUsers, saveUsers } from "@/lib/server/dataStore";
import { syncUserToFirebase } from "@/lib/server/firebaseSync";
import { sendSignupPasswordEmail } from "@/lib/server/mailer";
import { NextResponse } from "next/server";

function getAuthPayload(request) {
    const token = request.cookies.get("sa_auth_token")?.value;
    return verifyToken(token);
}

export async function GET(request) {
    const payload = getAuthPayload(request);
    if (payload?.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const users = await getUsers();
    const staff = users.filter((u) => u.role === "staff").map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
    }));

    return NextResponse.json({ staff });
}

export async function POST(request) {
    const payload = getAuthPayload(request);
    if (payload?.role !== "admin") {
        return NextResponse.json({ message: "Only admin can create staff access" }, { status: 401 });
    }

    const body = await request.json();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();

    if (!fullName || !email || !phone) {
        return NextResponse.json({ message: "Full name, email and phone are required" }, { status: 400 });
    }

    const users = await getUsers();
    const exists = users.some((u) => u.email === email || u.phone === phone);
    if (exists) {
        return NextResponse.json({ message: "Email or phone already exists" }, { status: 409 });
    }

    const password = generateTempPassword(fullName);
    const { salt, hash } = hashPassword(password);

    const staffUser = {
        id: generateId(),
        fullName,
        email,
        phone,
        role: "staff",
        passwordSalt: salt,
        passwordHash: hash,
        createdAt: new Date().toISOString(),
        createdBy: payload.userId,
    };

    const syncResult = await syncUserToFirebase({
        localUserId: staffUser.id,
        fullName,
        email,
        phone,
        role: staffUser.role,
        password,
        authProvider: "password",
    });

    if (syncResult.authResult.firebaseAuthUid) {
        staffUser.firebaseAuthUid = syncResult.authResult.firebaseAuthUid;
    }

    users.push(staffUser);
    await saveUsers(users);
    await sendSignupPasswordEmail(email, fullName, password);

    return NextResponse.json({
        message: "Staff access created and password emailed",
        credentialsPreview: {
            email,
            password,
        },
        firebaseSync: {
            auth: syncResult.authResult.status,
            realtimeDb: syncResult.dbResult.status,
            warnings: syncResult.warnings,
        },
    });
}
