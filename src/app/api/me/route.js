import { verifyToken } from "@/lib/server/auth";
import { getUsers } from "@/lib/server/dataStore";
import { NextResponse } from "next/server";

export async function GET(request) {
    const token = request.cookies.get("sa_auth_token")?.value;
    const payload = verifyToken(token);

    if (!payload) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const users = await getUsers();
    const user = users.find((u) => u.id === payload.userId) || users.find((u) => u.email === payload.email);

    if (!user) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
    });
}
