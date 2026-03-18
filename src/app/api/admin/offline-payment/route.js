import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin";

export async function POST(req) {
    try {
        // require admin auth
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

        const body = await req.json();
        const amount = Number(body.amount || 0);
        const currency = String(body.currency || "INR");
        const userId = body.userId ? String(body.userId) : null;
        const note = body.note ? String(body.note) : null;
        const metadata = body.metadata || null; // can include booking {date,busId,seatNo}

        if (!amount || amount <= 0) return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });

        const db = getAdminDb();
        const id = `offline_${Date.now()}`;
        const now = new Date().toISOString();
        const record = {
            id,
            method: "offline",
            amount,
            currency,
            userId: userId || null,
            note: note || null,
            metadata: metadata || null,
            createdAt: now,
        };

        await db.ref(`payments/${id}`).set(record);

        // attach to booking if provided
        try {
            if (metadata && metadata.booking && metadata.booking.date && metadata.booking.busId && metadata.booking.seatNo) {
                const { date, busId, seatNo } = metadata.booking;
                await db.ref(`bookings/${date}/${busId}/${seatNo}/payment`).set(id);
                await db.ref(`bookings/${date}/${busId}/${seatNo}/paymentMethod`).set("offline");
            }
        } catch (e) {
            console.warn("Failed to attach offline payment to booking:", e && e.message ? e.message : e);
        }

        return NextResponse.json({ success: true, payment: record }, { status: 200 });
    } catch (err) {
        console.error("/api/admin/offline-payment error:", err);
        return NextResponse.json({ success: false, error: "Failed to record offline payment" }, { status: 500 });
    }
}
