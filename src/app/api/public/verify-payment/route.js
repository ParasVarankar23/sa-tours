import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin";

async function createRoleNotification(db, role, { title, message, data }) {
    if (!db || !role || !title) return null;
    const now = new Date().toISOString();
    const ts = Date.now();
    const payload = { title, message: message || "", data: data || null, createdAt: now, ts, read: false };
    try {
        const ref = db.ref(`notifications/roles/${role}`).push();
        await ref.set(payload);
        return ref.key;
    } catch (e) {
        console.error("createRoleNotification error:", e);
        return null;
    }
}

async function createUserNotification(db, uid, { title, message, data }) {
    if (!db || !uid || !title) return null;
    const now = new Date().toISOString();
    const ts = Date.now();
    const payload = { title, message: message || "", data: data || null, createdAt: now, ts, read: false };
    try {
        const ref = db.ref(`notifications/users/${uid}`).push();
        await ref.set(payload);
        return ref.key;
    } catch (e) {
        console.error("createUserNotification error:", e);
        return null;
    }
}

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

        // create notifications for admin and user (if metadata.userId present)
        try {
            const userId = record.metadata && record.metadata.userId ? String(record.metadata.userId) : "";
            await createRoleNotification(db, "admin", {
                title: "Payment received",
                message: `Payment ${paymentId} received for order ${orderId}. Amount: ₹${(amountRupees || 0).toFixed ? (amountRupees).toFixed(2) : amountRupees}`,
                data: { payment: record },
            });

            if (userId) {
                await createUserNotification(db, userId, {
                    title: "Payment successful",
                    message: `We received your payment of ₹${(amountRupees || 0).toFixed ? (amountRupees).toFixed(2) : amountRupees}`,
                    data: { payment: record },
                });
            }
        } catch (e) {
            console.error("Failed to create payment notifications:", e);
        }

        // Return the saved payment record for client to attach to bookings
        return NextResponse.json({ success: true, payment: record }, { status: 200 });
    } catch (err) {
        console.error("/api/public/verify-payment error:", err && err.message ? err.message : err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
