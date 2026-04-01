import { NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebaseAdmin";
function normalizeText(v) {
    return String(v || "").trim();
}

async function isAdmin(req) {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return false;
    const token = authHeader.split(" ")[1];
    if (!token) return false;
    try {
        const decoded = await verifyAuthToken(token);
        return !!decoded && (decoded.role === "admin" || decoded.role === "owner");
    } catch {
        return false;
    }
}

export async function POST(req) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const code = normalizeText(body.code || body.voucherCode).toUpperCase();
        const bookingId = normalizeText(body.bookingId) || null;

        if (!code) {
            return NextResponse.json({ success: false, error: "Missing voucher code" }, { status: 400 });
        }

        const db = getAdminDb();
        const snap = await db.ref(`vouchers/${code}`).once("value");
        if (!snap.exists()) {
            return NextResponse.json({ success: false, error: "Voucher not found" }, { status: 404 });
        }

        const v = snap.val() || {};
        if (v.usedAt) {
            return NextResponse.json({ success: false, error: "Voucher already used" }, { status: 400 });
        }

        const now = new Date().toISOString();
        await db.ref(`vouchers/${code}/usedAt`).set(now);
        if (bookingId) await db.ref(`vouchers/${code}/usedByBookingId`).set(bookingId);

        return NextResponse.json({ success: true, message: "Voucher redeemed", code }, { status: 200 });
    } catch (err) {
        console.error("POST /api/admin/vouchers/redeem error:", err);
        return NextResponse.json({ success: false, error: "Redeem failed" }, { status: 500 });
    }
}
