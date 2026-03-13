import { generateId, generateTempPassword, hashPassword, signToken } from "@/lib/server/auth";
import { getUsers, saveUsers } from "@/lib/server/dataStore";
import { syncUserToFirebase } from "@/lib/server/firebaseSync";
import { NextResponse } from "next/server";

function roleRedirect(role) {
    if (role === "admin") return "/admin";
    if (role === "staff") return "/staff-portal";
    return "/user";
}

export async function POST(request) {
    try {
        const body = await request.json();
        const idToken = String(body.idToken || "").trim();
        const providedName = String(body.fullName || "").trim();
        const providedPhone = String(body.phone || "").trim();

        if (!idToken) {
            return NextResponse.json({ message: "Google token is required" }, { status: 400 });
        }

        const verifyResponse = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
            { cache: "no-store" }
        );

        if (!verifyResponse.ok) {
            return NextResponse.json({ message: "Invalid Google token" }, { status: 401 });
        }

        const tokenData = await verifyResponse.json();
        const email = String(tokenData.email || "").trim().toLowerCase();
        const emailVerified = tokenData.email_verified === "true" || tokenData.email_verified === true;
        const googleName = String(tokenData.name || "").trim();

        if (!email || !emailVerified) {
            return NextResponse.json({ message: "Google account email is not verified" }, { status: 401 });
        }

        const users = await getUsers();
        let user = users.find((u) => u.email === email);
        let created = false;
        let syncResult = null;

        if (!user) {
            const fullName = providedName || googleName || "Google User";
            const password = generateTempPassword(fullName);
            const { salt, hash } = hashPassword(password);

            user = {
                id: generateId(),
                fullName,
                email,
                phone: providedPhone,
                role: "user",
                passwordSalt: salt,
                passwordHash: hash,
                createdAt: new Date().toISOString(),
                authProvider: "google",
            };

            syncResult = await syncUserToFirebase({
                localUserId: user.id,
                fullName,
                email,
                phone: providedPhone,
                role: user.role,
                password,
                authProvider: "google",
            });

            if (syncResult.authResult.firebaseAuthUid) {
                user.firebaseAuthUid = syncResult.authResult.firebaseAuthUid;
            }

            users.push(user);
            await saveUsers(users);
            created = true;
        }

        const token = signToken({ userId: user.id, role: user.role, email: user.email });
        const response = NextResponse.json({
            message: created ? "Google signup successful" : "Google login successful",
            role: user.role,
            redirectTo: roleRedirect(user.role),
            token,
            firebaseSync: syncResult
                ? {
                    auth: syncResult.authResult.status,
                    realtimeDb: syncResult.dbResult.status,
                    warnings: syncResult.warnings,
                }
                : null,
        });

        response.cookies.set("sa_auth_token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });

        return response;
    } catch (error) {
        return NextResponse.json({ message: "Google auth failed", error: String(error?.message || error) }, { status: 500 });
    }
}
