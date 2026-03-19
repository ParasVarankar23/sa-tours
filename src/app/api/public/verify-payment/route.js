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

        // Debug: log incoming metadata userId to help trace missing payments
        try {
            console.debug("/api/public/verify-payment incoming metadata.userId=", metadata && metadata.userId ? String(metadata.userId) : null);
        } catch (e) { }

        // normalize and store a `details` object similar to Razorpay response shape
        const amountRupees = Number(body.amount || 0);
        const amountPaise = Math.round((Number.isFinite(amountRupees) ? amountRupees : 0) * 100);

        const details = {
            amount: amountPaise,
            currency: String(body.currency || "INR"),
            created_at: Math.floor(Date.now() / 1000),
            // keep original incoming payload for reference
            raw: body,
        };

        const record = {
            id: paymentId,
            method: "razorpay",
            orderId,
            paymentId,
            signature,
            details,
            metadata: metadata || null,
            verifiedAt: now,
        };

        await db.ref(`payments/${paymentId}`).set(record);

        try {
            console.debug(`/api/public/verify-payment saved payment id=${paymentId} userId=${record.metadata && record.metadata.userId ? record.metadata.userId : 'null'} amount=${record.details && record.details.amount ? record.details.amount : 'na'}`);
        } catch (e) { }

        // Return the saved payment record for client to attach to bookings
        return NextResponse.json({ success: true, payment: record }, { status: 200 });
    } catch (err) {
        console.error("/api/public/verify-payment error:", err && err.message ? err.message : err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
