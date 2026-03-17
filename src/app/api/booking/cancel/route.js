import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getAdminDb } from "../../../../lib/firebaseAdmin";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

function initRazorpay() {
    if (!keyId || !keySecret) {
        throw new Error("Razorpay keys missing");
    }
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function parseTravelTimestamp(travelDate, startTime) {
    if (!travelDate) return null;
    try {
        if (startTime) {
            // assume ISO date YYYY-MM-DD and HH:mm
            const iso = `${travelDate}T${startTime}:00`;
            const d = new Date(iso);
            if (!isNaN(d.getTime())) return d.getTime();
        }

        const d = new Date(travelDate);
        if (!isNaN(d.getTime())) return d.getTime();
    } catch (e) {
        return null;
    }
    return null;
}

export async function POST(req) {
    try {
        const body = await req.json();
        const bookingId = String(body.bookingId || "").trim();

        if (!bookingId) {
            return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
        }

        const db = getAdminDb();
        const bookingSnap = await db.ref(`bookings/${bookingId}`).once("value");
        if (!bookingSnap.exists()) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const booking = bookingSnap.val();

        // find payment for this booking
        const paymentsSnap = await db.ref("payments").orderByChild("bookingId").equalTo(bookingId).once("value");
        const paymentsVal = paymentsSnap.val() || {};
        const payments = Object.entries(paymentsVal).map(([k, v]) => ({ key: k, ...v }));
        const paid = payments.find((p) => p.status === "paid") || payments[0] || null;

        if (!paid) {
            // no payment found; just cancel booking
            await db.ref(`bookings/${bookingId}`).update({ status: "Cancelled", updatedAt: Date.now() });
            return NextResponse.json({ success: true, message: "Booking cancelled (no payment found)" });
        }

        const paidAmount = Number(paid.amount || 0);

        // compute hours before travel
        const travelTs = parseTravelTimestamp(booking.travelDate, booking.startTime);
        let hoursBefore = Infinity;
        if (travelTs) {
            hoursBefore = (travelTs - Date.now()) / (1000 * 60 * 60);
        }

        let feePercent = 0.05; // default 5%
        if (hoursBefore <= 1) feePercent = 0.15;
        else if (hoursBefore <= 6) feePercent = 0.10;

        const refundAmount = Math.max(0, Math.round((paidAmount * (1 - feePercent) + Number.EPSILON) * 100) / 100);

        // attempt razorpay refund
        let refundResult = null;
        try {
            const razorpay = initRazorpay();
            // amount in paise
            const rAmount = Math.round(refundAmount * 100);
            refundResult = await razorpay.payments.refund(paid.paymentId || paid.paymentId, { amount: rAmount });
        } catch (err) {
            // log but continue to record refund attempt
            console.error("Razorpay refund failed:", err.message || err);
        }

        // record refund and update payment + booking
        const paymentKey = paid.key;
        const refundRecord = {
            refundAmount,
            feePercent,
            attemptedAt: Date.now(),
            razorpayRefund: refundResult || null,
        };

        await db.ref(`payments/${paymentKey}/refund`).set(refundRecord);
        await db.ref(`payments/${paymentKey}`).update({ status: refundResult ? "refunded" : "refund_pending", updatedAt: Date.now() });

        await db.ref(`bookings/${bookingId}`).update({ status: "Cancelled", updatedAt: Date.now(), refund: refundRecord });

        return NextResponse.json({ success: true, refund: refundRecord });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
