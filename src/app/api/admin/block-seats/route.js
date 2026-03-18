import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin";

export async function POST(req) {
    try {
        // require admin auth
        const authHeader = req.headers.get('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        try {
            const { verifyAuthToken } = await import("../../../../lib/firebaseAdmin");
            const decoded = await verifyAuthToken(token);
            const role = (decoded && decoded.role) ? String(decoded.role).toLowerCase() : null;
            if (!(role === 'admin' || role === 'owner')) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const busId = String(body.busId || "").trim();
        const date = String(body.date || "").trim();
        const seats = Array.isArray(body.seats) ? body.seats : [];
        const action = String(body.action || "block").trim(); // 'block' or 'unblock'
        const note = body.note ? String(body.note) : null;

        if (!busId || !date || seats.length === 0) {
            return NextResponse.json({ success: false, error: "busId,date and seats[] are required" }, { status: 400 });
        }

        const db = getAdminDb();
        const now = new Date().toISOString();

        const results = [];
        for (const s of seats) {
            const seatNo = String(s).trim();
            const ref = db.ref(`bookings/${date}/${busId}/${seatNo}`);
            if (action === "block") {
                // create a blocked placeholder only if seat not already booked
                const snap = await ref.once("value");
                if (snap.exists()) {
                    // if already a booking, report it
                    results.push({ seatNo, status: "exists" });
                    continue;
                }
                const payload = {
                    status: "blocked",
                    blockedAt: now,
                    blockedBy: "admin",
                    note: note || null,
                };
                // allow optional details (name, phone, email, pickup, drop, etc.) when admin blocks
                if (body.details && typeof body.details === 'object') {
                    try {
                        payload.blockedInfo = body.details;
                    } catch (e) {
                        // ignore malformed details
                    }
                }
                await ref.set(payload);
                results.push({ seatNo, status: "blocked" });
            } else {
                // unblock: only remove if status is 'blocked'
                const snap = await ref.once("value");
                if (!snap.exists()) {
                    results.push({ seatNo, status: "not_found" });
                    continue;
                }
                const val = snap.val() || {};
                if (val.status === "blocked") {
                    await ref.remove();
                    results.push({ seatNo, status: "unblocked" });
                } else {
                    results.push({ seatNo, status: "skipped_not_blocked" });
                }
            }
        }

        return NextResponse.json({ success: true, results }, { status: 200 });
    } catch (err) {
        console.error("/api/admin/block-seats error:", err);
        return NextResponse.json({ success: false, error: "Failed to process block/unblock" }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const authHeader = req.headers.get('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        try {
            const { verifyAuthToken } = await import("../../../../lib/firebaseAdmin");
            const decoded = await verifyAuthToken(token);
            const role = (decoded && decoded.role) ? String(decoded.role).toLowerCase() : null;
            if (!(role === 'admin' || role === 'owner')) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const busId = searchParams.get("busId");
        const date = searchParams.get("date");
        const seatNo = searchParams.get("seatNo");

        if (!busId || !date || !seatNo) {
            return NextResponse.json({ success: false, error: "busId,date,seatNo required" }, { status: 400 });
        }

        const db = getAdminDb();
        const ref = db.ref(`bookings/${date}/${busId}/${seatNo}`);
        const snap = await ref.once("value");
        if (!snap.exists()) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        const val = snap.val() || {};
        if (val.status === "blocked") {
            await ref.remove();
            return NextResponse.json({ success: true, message: "Unblocked" }, { status: 200 });
        }
        return NextResponse.json({ success: false, error: "Seat not blocked" }, { status: 400 });
    } catch (err) {
        console.error("DELETE /api/admin/block-seats error:", err);
        return NextResponse.json({ success: false, error: "Failed to remove block" }, { status: 500 });
    }
}
