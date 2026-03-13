import { generateId, hashPassword } from "@/lib/server/auth";
import { getUsers, saveUsers } from "@/lib/server/dataStore";
import { syncUserToFirebase } from "@/lib/server/firebaseSync";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const seedKey = String(process.env.ADMIN_SEED_KEY || "").trim();
        if (!seedKey) {
            return NextResponse.json(
                { message: "ADMIN_SEED_KEY is not configured on server" },
                { status: 500 }
            );
        }

        const headerKey = String(request.headers.get("x-admin-seed-key") || "").trim();
        if (!headerKey || headerKey !== seedKey) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const fullName = String(body.fullName || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const phone = String(body.phone || "").trim();
        const password = String(body.password || "");

        if (!fullName || !email || !phone || !password) {
            return NextResponse.json(
                { message: "fullName, email, phone, password are required" },
                { status: 400 }
            );
        }

        const users = await getUsers();
        const exists = users.some((u) => u.email === email || u.phone === phone);
        if (exists) {
            return NextResponse.json({ message: "Email or phone already registered" }, { status: 409 });
        }

        const { salt, hash } = hashPassword(password);
        const adminUser = {
            id: generateId(),
            fullName,
            email,
            phone,
            role: "admin",
            passwordSalt: salt,
            passwordHash: hash,
            createdAt: new Date().toISOString(),
            createdBy: "postman-admin-create",
        };

        const syncResult = await syncUserToFirebase({
            localUserId: adminUser.id,
            fullName,
            email,
            phone,
            role: adminUser.role,
            password,
            authProvider: "password",
        });

        if (syncResult.authResult.firebaseAuthUid) {
            adminUser.firebaseAuthUid = syncResult.authResult.firebaseAuthUid;
        }

        users.push(adminUser);
        await saveUsers(users);

        return NextResponse.json({
            message: "Admin created successfully",
            admin: {
                id: adminUser.id,
                fullName: adminUser.fullName,
                email: adminUser.email,
                phone: adminUser.phone,
                role: adminUser.role,
            },
            firebaseSync: {
                auth: syncResult.authResult.status,
                realtimeDb: syncResult.dbResult.status,
                warnings: syncResult.warnings,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to create admin", error: String(error?.message || error) },
            { status: 500 }
        );
    }
}
