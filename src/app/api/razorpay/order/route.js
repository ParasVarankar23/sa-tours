import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req) {
    try {
        const body = await req.json();
        const { amount, currency = "INR", receipt } = body;

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return NextResponse.json({ error: "Razorpay keys not configured" }, { status: 500 });
        }

        const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

        const options = {
            amount: Math.round(amount * 100), // rupees to paise
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
        };

        const order = await rzp.orders.create(options);

        return NextResponse.json({ success: true, order, keyId });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
