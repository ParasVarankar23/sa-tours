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

        // Support either single `date` or a `startDate` + `endDate` range
        const date = String(body.date || "").trim();
        const startDate = String(body.startDate || "").trim();
        const endDate = String(body.endDate || "").trim();

        if (!busId) {
            return NextResponse.json({ success: false, error: "busId is required" }, { status: 400 });
        }

        // Allow schedule-specific meta: startTime, endTime, stops, available, season, pricingOverride
        const startTime = body.startTime ? String(body.startTime).trim() : null;
        const endTime = body.endTime ? String(body.endTime).trim() : null;
        const stops = Array.isArray(body.stops) ? body.stops : null;
        const available = body.available === undefined ? true : Boolean(body.available);
        const season = body.season === undefined ? false : Boolean(body.season);
        const pricingOverride = body.pricingOverride && typeof body.pricingOverride === 'object' ? body.pricingOverride : null;

        const db = getAdminDb();

        const valueBase = {
            available,
            updatedAt: new Date().toISOString(),
        };

        if (startTime) valueBase.startTime = startTime;
        if (endTime) valueBase.endTime = endTime;
        if (stops) valueBase.stops = stops;
        if (season) valueBase.season = true;
        if (pricingOverride) valueBase.pricingOverride = pricingOverride;

        const datesCreated = [];

        const writeForDate = async (d) => {
            const path = `${COLLECTION}/${busId}/${d}`;
            await db.ref(path).set(valueBase);
            datesCreated.push(d);
        };

        // Single date
        if (date) {
            if (!validateDate(date)) {
                return NextResponse.json({ success: false, error: "Invalid date format (YYYY-MM-DD)" }, { status: 400 });
            }

            await writeForDate(date);
            return NextResponse.json({ success: true, message: "Schedule saved", dates: datesCreated }, { status: 200 });
        }

        // Range
        if (startDate && endDate) {
            if (!validateDate(startDate) || !validateDate(endDate)) {
                return NextResponse.json({ success: false, error: "Invalid startDate or endDate format (YYYY-MM-DD)" }, { status: 400 });
            }

            const s = new Date(startDate + 'T00:00:00');
            const e = new Date(endDate + 'T00:00:00');
            if (e < s) {
                return NextResponse.json({ success: false, error: "endDate must be same or after startDate" }, { status: 400 });
            }

            for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
                const iso = d.toISOString().split('T')[0];
                await writeForDate(iso);
            }

            return NextResponse.json({ success: true, message: "Schedule range saved", dates: datesCreated }, { status: 200 });
        }

        return NextResponse.json({ success: false, error: "Provide either `date` or `startDate` and `endDate`" }, { status: 400 });
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
