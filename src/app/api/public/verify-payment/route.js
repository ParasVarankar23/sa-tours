import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin";

export async function POST(req) {
    try {
        const body = await req.json();
        const paymentId = String(body.paymentId || body.razorpay_payment_id || "");
        const orderId = String(body.orderId || body.razorpay_order_id || "");
        const signature = String(body.signature || body.razorpay_signature || "");
        const metadata = body.metadata || null;

        if (!paymentId || !orderId || !signature) return NextResponse.json({ success: false, error: "Missing payment details" }, { status: 400 });

        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) return NextResponse.json({ success: false, error: "Razorpay secret not configured" }, { status: 500 });

        const hmac = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
        if (hmac !== signature) {
            console.warn("Invalid razorpay signature", { hmac, signature });
            return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
        }

        const db = getAdminDb();
        const now = new Date().toISOString();

        const record = {
            id: paymentId,
            method: "razorpay",
            amount: Number(body.amount || 0),
            currency: String(body.currency || "INR"),
            orderId,
            paymentId,
            signature,
            metadata: metadata || null,
            createdAt: now,
        };

        await db.ref(`payments/${paymentId}`).set(record);

        // Return the saved payment id for client to attach to bookings
        return NextResponse.json({ success: true, payment: record }, { status: 200 });
    } catch (err) {
        console.error("/api/public/verify-payment error:", err && err.message ? err.message : err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
