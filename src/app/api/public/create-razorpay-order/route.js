import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const body = await req.json();
        const amount = Number(body.amount || 0); // rupees
        const currency = String(body.currency || "INR").trim();
        const receipt = String(body.receipt || `rcpt_${Date.now()}`);
        if (!amount || amount <= 0) return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) return NextResponse.json({ success: false, error: "Razorpay keys not configured" }, { status: 500 });

        const payload = { amount: Math.round(amount * 100), currency, receipt, payment_capture: 1 };

        const basic = Buffer.from(keyId + ":" + keySecret).toString("base64");
        const resp = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Basic " + basic,
            },
            body: JSON.stringify(payload),
        });

        const data = await resp.json();
        if (!resp.ok) {
            console.error("Razorpay create order failed:", data);
            return NextResponse.json({ success: false, error: data.error || "Failed to create order" }, { status: 500 });
        }

        const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || null;
        return NextResponse.json({ success: true, order: data, keyId: publicKey }, { status: 200 });
    } catch (err) {
        console.error("/api/public/create-razorpay-order error:", err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
