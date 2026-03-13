import { generateOtp, hashPassword } from "@/lib/server/auth";
import { getOtps, getUsers, saveOtps, saveUsers } from "@/lib/server/dataStore";
import { sendOtpEmail } from "@/lib/server/mailer";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const body = await request.json();
        const action = String(body.action || "");
        const email = String(body.email || "").trim().toLowerCase();

        if (!email) {
            return NextResponse.json({ message: "Email is required" }, { status: 400 });
        }

        const users = await getUsers();
        const user = users.find((u) => u.email === email);
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        if (action === "send-otp") {
            const otp = generateOtp();
            const expiresAt = Date.now() + 10 * 60 * 1000;

            const otps = await getOtps();
            const filtered = otps.filter((o) => o.email !== email);
            filtered.push({ email, otp, expiresAt });
            await saveOtps(filtered);

            await sendOtpEmail(email, otp);
            return NextResponse.json({ message: "OTP sent to your email" });
        }

        if (action === "reset") {
            const otp = String(body.otp || "").trim();
            const newPassword = String(body.newPassword || "");

            if (!otp || !newPassword) {
                return NextResponse.json({ message: "OTP and new password are required" }, { status: 400 });
            }

            const otps = await getOtps();
            const entry = otps.find((o) => o.email === email && o.otp === otp);
            if (!entry || Date.now() > entry.expiresAt) {
                return NextResponse.json({ message: "Invalid or expired OTP" }, { status: 400 });
            }

            const { salt, hash } = hashPassword(newPassword);
            const updatedUsers = users.map((u) => {
                if (u.email !== email) return u;
                return { ...u, passwordSalt: salt, passwordHash: hash, updatedAt: new Date().toISOString() };
            });
            await saveUsers(updatedUsers);

            const remaining = otps.filter((o) => o.email !== email);
            await saveOtps(remaining);

            return NextResponse.json({ message: "Password reset successful" });
        }

        return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ message: "Request failed", error: String(error?.message || error) }, { status: 500 });
    }
}
