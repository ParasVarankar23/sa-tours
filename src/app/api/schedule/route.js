import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin";

const COLLECTION = "schedules";

function validateDate(d) {
    // basic YYYY-MM-DD check
    return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export async function POST(req) {
    try {
        const body = await req.json();
        const busId = String(body.busId || "").trim();
        const date = String(body.date || "").trim();

        if (!busId || !date || !validateDate(date)) {
            return NextResponse.json({ success: false, error: "busId and valid date (YYYY-MM-DD) are required" }, { status: 400 });
        }

        const db = getAdminDb();
        const path = `${COLLECTION}/${busId}/${date}`;

        await db.ref(path).set({ available: true, updatedAt: new Date().toISOString() });

        return NextResponse.json({ success: true, message: "Availability set" }, { status: 200 });
    } catch (err) {
        console.error("POST /api/schedule error:", err);
        return NextResponse.json({ success: false, error: "Failed to set availability" }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const busId = searchParams.get("busId");
        const date = searchParams.get("date");

        if (!busId || !date || !validateDate(date)) {
            return NextResponse.json({ success: false, error: "busId and valid date are required" }, { status: 400 });
        }

        const db = getAdminDb();
        const path = `${COLLECTION}/${busId}/${date}`;
        await db.ref(path).remove();

        return NextResponse.json({ success: true, message: "Availability removed" }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/schedule error:", err);
        return NextResponse.json({ success: false, error: "Failed to remove availability" }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const busId = searchParams.get("busId");

        const db = getAdminDb();

        if (busId) {
            const snapshot = await db.ref(`${COLLECTION}/${busId}`).once("value");
            const data = snapshot.exists() ? snapshot.val() : {};
            return NextResponse.json({ success: true, schedules: data }, { status: 200 });
        }

        const snapshot = await db.ref(COLLECTION).once("value");
        const data = snapshot.exists() ? snapshot.val() : {};

        return NextResponse.json({ success: true, schedules: data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/schedule error:", err);
        return NextResponse.json({ success: false, error: "Failed to fetch schedules" }, { status: 500 });
    }
}
