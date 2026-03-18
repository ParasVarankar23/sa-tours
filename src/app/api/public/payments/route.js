import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const all = searchParams.get("all");

        const db = getAdminDb();
        const snap = await db.ref(`payments`).once("value");
        const data = snap.exists() ? snap.val() : {};

        const payments = Object.values(data || {});
        if (userId && String(userId).trim()) {
            const filtered = payments.filter((p) => (p.metadata && p.metadata.userId && String(p.metadata.userId) === String(userId)) || false);
            return NextResponse.json({ success: true, payments: filtered }, { status: 200 });
        }

        // if ?all=true return all, else return empty (protect accidental exposure)
        if (all === "true") {
            // require admin auth for full listing
            const authHeader = req.headers.get('authorization') || '';
            const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
            if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            try {
                const { verifyAuthToken } = await import("../../../../lib/firebaseAdmin");
                const decoded = await verifyAuthToken(token);
                const role = (decoded && decoded.role) ? String(decoded.role).toLowerCase() : null;
                if (!(role === 'admin' || role === 'owner')) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
            } catch (e) {
                return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            }
            return NextResponse.json({ success: true, payments }, { status: 200 });
        }

        return NextResponse.json({ success: true, payments: [] }, { status: 200 });
    } catch (err) {
        console.error("/api/public/payments error:", err);
        return NextResponse.json({ success: false, error: "Failed to fetch payments" }, { status: 500 });
    }
}
