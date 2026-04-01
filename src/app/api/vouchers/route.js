import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin";

function normalizeText(v) {
    return String(v || "").trim();
}

function validateCode(c) {
    return /^[A-Z0-9\-]{4,64}$/.test(String(c || "").toUpperCase());
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const code = normalizeText(searchParams.get("code") || searchParams.get("voucher"));

        if (!code) {
            return NextResponse.json({ success: false, error: "Missing voucher code" }, { status: 400 });
        }

        const db = getAdminDb();
        const snap = await db.ref(`vouchers/${code}`).once("value");
        if (!snap.exists()) {
            return NextResponse.json({ success: false, error: "Voucher not found" }, { status: 404 });
        }

        const v = snap.val() || {};
        return NextResponse.json({ success: true, voucher: v }, { status: 200 });
    } catch (err) {
        console.error("GET /api/vouchers error:", err);
        return NextResponse.json({ success: false, error: "Failed to fetch voucher" }, { status: 500 });
    }
}
