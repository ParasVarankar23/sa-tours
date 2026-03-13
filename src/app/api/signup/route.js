import { generateId, generateTempPassword, hashPassword, signToken } from "@/lib/server/auth";
import { getUsers, saveUsers } from "@/lib/server/dataStore";
import { sendSignupPasswordEmail } from "@/lib/server/mailer";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const body = await request.json();
        const fullName = String(body.fullName || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const phone = String(body.phone || "").trim();

        if (!fullName || !email || !phone) {
            return NextResponse.json({ message: "Full name, email and phone are required" }, { status: 400 });
        }

        const users = await getUsers();
        const emailExists = users.some((u) => u.email === email);
        const phoneExists = users.some((u) => u.phone === phone);

        if (emailExists || phoneExists) {
            return NextResponse.json({ message: "Email or phone already registered" }, { status: 409 });
        }

        const password = generateTempPassword(fullName);
        const { salt, hash } = hashPassword(password);

        const user = {
            id: generateId(),
            fullName,
            email,
            phone,
            role: "user",
            passwordSalt: salt,
            passwordHash: hash,
            createdAt: new Date().toISOString(),
        };

        users.push(user);
        await saveUsers(users);
        await sendSignupPasswordEmail(email, fullName, password);

        const token = signToken({ userId: user.id, role: user.role, email: user.email });
        const response = NextResponse.json({
            message: "Signup successful. Password sent to your email.",
            role: user.role,
            redirectTo: "/user",
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
        return NextResponse.json({ message: "Signup failed", error: String(error?.message || error) }, { status: 500 });
    }
}
