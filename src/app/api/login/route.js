import { signToken, verifyPassword } from "@/lib/server/auth";
import { getUsers } from "@/lib/server/dataStore";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const body = await request.json();
        const identifier = String(body.identifier || "").trim().toLowerCase();
        const password = String(body.password || "");

        if (!identifier || !password) {
            return NextResponse.json({ message: "Email/Phone and password are required" }, { status: 400 });
        }

        const users = await getUsers();
        const user = users.find((u) => u.email === identifier || u.phone === identifier);

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        const ok = verifyPassword(password, user.passwordSalt, user.passwordHash);
        if (!ok) {
            return NextResponse.json({ message: "Invalid password" }, { status: 401 });
        }

        const roleToRoute = {
            admin: "/admin",
            staff: "/staff-portal",
            user: "/user",
        };

        const token = signToken({ userId: user.id, role: user.role, email: user.email });
        const response = NextResponse.json({
            message: "Login successful",
            role: user.role,
            redirectTo: roleToRoute[user.role] || "/user",
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
        return NextResponse.json({ message: "Login failed", error: String(error?.message || error) }, { status: 500 });
    }
}
