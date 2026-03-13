import { getUsers } from "@/lib/server/dataStore";
import { NextResponse } from "next/server";

export async function GET() {
    const apiKey = String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
    const dbUrl = String(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").trim();
    const authDomain = String(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();
    const projectId = String(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();

    const users = await getUsers();

    return NextResponse.json({
        firebaseConfig: {
            hasApiKey: Boolean(apiKey),
            hasDatabaseUrl: Boolean(dbUrl),
            hasAuthDomain: Boolean(authDomain),
            hasProjectId: Boolean(projectId),
            databaseHost: dbUrl ? new URL(dbUrl).host : null,
        },
        localUserCount: users.length,
        localUsersPreview: users.slice(0, 5).map((u) => ({
            id: u.id,
            email: u.email,
            phone: u.phone,
            role: u.role,
        })),
    });
}
