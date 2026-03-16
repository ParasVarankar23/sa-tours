import { getAdminDb } from "@/lib/firebaseAdmin";
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

export async function GET(request) {
    const uid = getUidFromRequest(request);
    if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getAdminDb();
    const snapshot = await db.ref(`users/${uid}`).get();
    if (!snapshot.exists()) return Response.json({ error: "Profile not found" }, { status: 404 });

    const p = snapshot.val();
    return Response.json({
        success: true,
        profile: {
            uid,
            name: p.name || "",
            email: p.email || "",
            phone: p.phone || "",
            address: p.address || "",
            role: p.role || "student",
        },
    });
}

export async function PUT(request) {
    const uid = getUidFromRequest(request);
    if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, phone, address } = body;

    if (!name?.trim()) {
        return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const db = getAdminDb();
    await db.ref(`users/${uid}`).update({
        name: name.trim(),
        phone: phone?.trim() || "",
        address: address?.trim() || "",
        updatedAt: new Date().toISOString(),
    });

    return Response.json({ success: true, message: "Profile updated successfully" });
}
