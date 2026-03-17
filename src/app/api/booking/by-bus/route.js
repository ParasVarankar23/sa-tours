import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin";

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const busId = url.searchParams.get("busId");
        const travelDate = url.searchParams.get("travelDate");

        if (!busId || !travelDate) {
            return NextResponse.json({ error: "Missing busId or travelDate" }, { status: 400 });
        }

        const db = getAdminDb();
        const snap = await db.ref("bookings").orderByChild("busId").equalTo(busId).once("value");
        const val = snap.val() || {};
        const list = Object.keys(val)
            .map((k) => val[k])
            .filter((b) => String(b.travelDate) === String(travelDate));

        return NextResponse.json({ success: true, bookings: list });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
