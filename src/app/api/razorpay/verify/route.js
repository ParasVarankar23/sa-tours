import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin";

export async function POST(req) {
    try {
        const body = await req.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingMeta } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingMeta) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) return NextResponse.json({ error: "Razorpay secret not configured" }, { status: 500 });

        const generatedSignature = crypto.createHmac("sha256", secret).update(razorpay_order_id + "|" + razorpay_payment_id).digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        // Save booking to Firebase
        const db = getAdminDb();
        const bookingId = `BK_${Date.now()}`;
        const booking = {
            bookingId,
            ...bookingMeta,
            paymentStatus: "paid",
            bookingStatus: "Confirmed",
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            amount: bookingMeta.amount || 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        await db.ref(`bookings/${bookingId}`).set(booking);

        // record payment
        const paymentKey = `PAY_${Date.now()}`;
        await db.ref(`payments/${paymentKey}`).set({
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            bookingId,
            status: "paid",
            amount: booking.amount || bookingMeta.amount || 0,
            createdAt: Date.now(),
        });

        return NextResponse.json({ success: true, bookingId, booking });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
