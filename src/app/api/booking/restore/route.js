import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin";

export async function POST(req) {
    try {
        const body = await req.json();
        const bookingId = String(body.bookingId || "").trim();

        if (!bookingId) {
            return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
        }

        const db = getAdminDb();
        const bookingRef = db.ref(`bookings/${bookingId}`);
        const snap = await bookingRef.once("value");
        if (!snap.exists()) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // restore booking status
        await bookingRef.update({ status: "Confirmed", updatedAt: Date.now() });

        // restore related payments: mark as paid again
        const paymentsSnap = await db.ref("payments").orderByChild("bookingId").equalTo(bookingId).once("value");
        const paymentsVal = paymentsSnap.val() || {};
        for (const key of Object.keys(paymentsVal)) {
            try {
                await db.ref(`payments/${key}`).update({ status: "paid", updatedAt: Date.now() });
                // optionally remove refund record if present
                await db.ref(`payments/${key}/refund`).remove();
            } catch (e) {
                console.error("Failed to restore payment", key, e.message || e);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
