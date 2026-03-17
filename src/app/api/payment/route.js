import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getAdminDb } from "../../../lib/firebaseAdmin";

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

function initRazorpay() {
    if (!keyId || !keySecret) {
        throw new Error("Razorpay keys missing (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
    }
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function POST(req) {
    try {
        const body = await req.json();
        const action = body.action || "createOrder";

        const db = getAdminDb();

        if (action === "createOrder") {
            // body: { amount, currency, receipt }
            const amount = Number(body.amount) || 100; // rupees
            const currency = body.currency || "INR";
            const receipt = String(body.receipt || `rcpt_${Date.now()}`);

            const razorpay = initRazorpay();
            const order = await razorpay.orders.create({
                amount: Math.round(amount * 100), // paise
                currency,
                receipt,
                payment_capture: 1,
            });

            return NextResponse.json({ success: true, order, keyId });
        }

        if (action === "confirm") {
            // record payment details in DB
            const paymentId = String(body.razorpay_payment_id || "").trim();
            const bookingId = String(body.bookingId || "").trim();
            const amount = Number(body.amount) || 0;
            const payer = String(body.payer || "").trim();

            if (!paymentId || !bookingId) {
                return NextResponse.json({ error: "Missing paymentId or bookingId" }, { status: 400 });
            }

            const paymentKey = `PAY_${Date.now()}`;
            const payload = {
                paymentId,
                bookingId,
                amount,
                payer: payer || null,
                method: body.method || null,
                raw: body || {},
                status: "paid",
                createdAt: Date.now(),
            };

            await db.ref(`payments/${paymentKey}`).set(payload);

            // update booking status if exists
            try {
                const bookingRef = db.ref(`bookings/${bookingId}`);
                const snap = await bookingRef.once("value");
                if (snap.exists()) {
                    const b = snap.val();
                    await bookingRef.set({ ...b, status: "Paid", updatedAt: Date.now() });
                }
            } catch (e) {
                console.error("Failed to update booking status", e);
            }

            return NextResponse.json({ success: true, paymentKey });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const db = getAdminDb();
        const snapshot = await db.ref("payments").once("value");
        const val = snapshot.val() || {};
        const list = Object.keys(val).map((k) => ({ id: k, ...val[k] }));
        // sort newest first
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return NextResponse.json({ success: true, payments: list });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
