import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin";
import { calculateFare } from "../../../../lib/pricing";

export async function POST(req) {
    try {
        const body = await req.json();
        const { busId, fromStop, toStop, busType } = body;

        if (!busId || !fromStop || !toStop) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const db = getAdminDb();
        const snap = await db.ref(`buses/${busId}`).once("value");
        if (!snap.exists()) return NextResponse.json({ error: "Bus not found" }, { status: 404 });

        const bus = snap.val();
        const res = calculateFare({ bus, fromStop, toStop, busType: busType || bus.busType });

        return NextResponse.json({ success: true, ...res });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
