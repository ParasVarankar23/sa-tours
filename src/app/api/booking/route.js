import { NextResponse } from "next/server";
import { sendBookingCancellation, sendBookingConfirmation } from "../../../lib/emailService";
import { getAdminDb } from "../../../lib/firebaseAdmin";

function validateDate(d) {
    return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const busId = searchParams.get("busId");
        const date = searchParams.get("date");

        if (!busId || !date || !validateDate(date)) {
            return NextResponse.json({ success: false, error: "busId and valid date are required" }, { status: 400 });
        }

        const db = getAdminDb();
        const snap = await db.ref(`bookings/${date}/${busId}`).once("value");
        const data = snap.exists() ? snap.val() : {};

        return NextResponse.json({ success: true, bookings: data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/booking error:", err);
        return NextResponse.json({ success: false, error: "Failed to fetch bookings" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const busId = String(body.busId || "").trim();
        const date = String(body.date || "").trim();
        const seatNo = String(body.seatNo || "").trim();
        const name = String(body.name || "").trim();
        const phone = String(body.phone || "").trim();
        const email = String(body.email || "").trim();
        const pickup = String(body.pickup || "").trim();
        const pickupTime = String(body.pickupTime || "").trim();
        const drop = String(body.drop || "").trim();
        const dropTime = String(body.dropTime || "").trim();
        const busNumber = String(body.busNumber || "").trim();
        const startTime = String(body.startTime || "").trim();
        const endTime = String(body.endTime || "").trim();

        if (!busId || !date || !seatNo || !name || !phone || !validateDate(date)) {
            return NextResponse.json({ success: false, error: "busId,date,seatNo,name,phone are required" }, { status: 400 });
        }

        const db = getAdminDb();

        // check schedule availability
        const schedSnap = await db.ref(`schedules/${busId}/${date}`).once("value");
        if (!schedSnap.exists() || !schedSnap.val().available) {
            return NextResponse.json({ success: false, error: "Bus is not scheduled/available on this date" }, { status: 400 });
        }

        // if pickupTime or dropTime missing, try to fetch from bus stops
        let resolvedPickupTime = pickupTime;
        let resolvedDropTime = dropTime;
        try {
            const busSnap = await db.ref(`buses/${busId}`).once("value");
            if (busSnap.exists()) {
                const busData = busSnap.val() || {};
                const stops = Array.isArray(busData.stops) ? busData.stops : [];
                if (pickup && !resolvedPickupTime) {
                    const found = stops.find((s) => (s && (s.stopName || s)) === pickup || (s.stopName && s.stopName === pickup));
                    if (found) resolvedPickupTime = String(found.time || found.stopTime || "").trim();
                }
                if (drop && !resolvedDropTime) {
                    const found = stops.find((s) => (s && (s.stopName || s)) === drop || (s.stopName && s.stopName === drop));
                    if (found) resolvedDropTime = String(found.time || found.stopTime || "").trim();
                }
            }
        } catch (err) {
            console.warn("Failed to resolve pickup/drop times from bus record:", err.message || err);
        }

        const seatRef = db.ref(`bookings/${date}/${busId}/${seatNo}`);
        const existing = await seatRef.once("value");
        if (existing.exists()) {
            return NextResponse.json({ success: false, error: "Seat already booked" }, { status: 409 });
        }

        const now = new Date().toISOString();
        const payload = {
            name,
            phone,
            email: email || null,
            pickup: pickup || null,
            pickupTime: resolvedPickupTime || null,
            drop: drop || null,
            dropTime: resolvedDropTime || null,
            busNumber: busNumber || null,
            startTime: startTime || null,
            endTime: endTime || null,
            createdAt: now,
            updatedAt: now,
            status: "booked",
        };

        await seatRef.set(payload);

        // send confirmation email asynchronously if email provided
        if (email) {
            try {
                sendBookingConfirmation(email, name || "Passenger", { seatNo, date, ...payload })
                    .catch((e) => console.error("sendBookingConfirmation error:", e));
            } catch (err) {
                console.error("Failed to trigger booking confirmation email:", err);
            }
        }

        return NextResponse.json({ success: true, message: "Seat booked", booking: { seatNo, ...payload } }, { status: 200 });
    } catch (err) {
        console.error("POST /api/booking error:", err);
        return NextResponse.json({ success: false, error: "Failed to create booking" }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const busId = String(body.busId || "").trim();
        const date = String(body.date || "").trim();
        const seatNo = String(body.seatNo || "").trim();
        const name = String(body.name || "").trim();
        const phone = String(body.phone || "").trim();
        const email = String(body.email || "").trim();
        const pickupTime = String(body.pickupTime || "").trim();
        const dropTime = String(body.dropTime || "").trim();
        const pickup = String(body.pickup || "").trim();
        const drop = String(body.drop || "").trim();

        if (!busId || !date || !seatNo || !validateDate(date)) {
            return NextResponse.json({ success: false, error: "busId,date,seatNo are required" }, { status: 400 });
        }

        const db = getAdminDb();
        const seatRef = db.ref(`bookings/${date}/${busId}/${seatNo}`);
        const existing = await seatRef.once("value");
        if (!existing.exists()) {
            return NextResponse.json({ success: false, error: "Booking not found for seat" }, { status: 404 });
        }

        const now = new Date().toISOString();
        const updates = { updatedAt: now };
        if (name) updates.name = name;
        if (phone) updates.phone = phone;
        if (email) updates.email = email;
        if (pickup) updates.pickup = pickup;
        if (pickupTime) updates.pickupTime = pickupTime;
        if (drop) updates.drop = drop;
        if (dropTime) updates.dropTime = dropTime;
        if (body.busNumber) updates.busNumber = String(body.busNumber || "").trim();
        if (body.startTime) updates.startTime = String(body.startTime || "").trim();
        if (body.endTime) updates.endTime = String(body.endTime || "").trim();

        await seatRef.update(updates);

        // attempt to send updated booking confirmation email (non-blocking)
        try {
            // determine email and name to use: prefer updated values, fall back to existing record
            const existingVal = existing.exists() ? existing.val() || {} : {};
            const emailToUse = (updates.email && String(updates.email).trim()) || String(existingVal.email || "").trim();
            const nameToUse = (updates.name && String(updates.name).trim()) || String(existingVal.name || "Passenger").trim();

            if (emailToUse) {
                console.log("Triggering booking update confirmation email to", emailToUse, "for seat", seatNo);
                const mergedBooking = { seatNo, date, ...existingVal, ...updates };
                const p = sendBookingConfirmation(emailToUse, nameToUse || "Passenger", mergedBooking);
                p.then(() => console.log("sendBookingConfirmation (update) completed for", emailToUse, "seat", seatNo)).catch((e) => console.error("sendBookingConfirmation (update) error:", e && e.message ? e.message : e));
            }
        } catch (err) {
            console.error("Failed to trigger booking update confirmation email:", err && err.message ? err.message : err);
        }

        return NextResponse.json({ success: true, message: "Booking updated", booking: { seatNo, ...updates } }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/booking error:", err);
        return NextResponse.json({ success: false, error: "Failed to update booking" }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const busId = searchParams.get("busId");
        const date = searchParams.get("date");
        const seatNo = searchParams.get("seatNo");

        if (!busId || !date || !seatNo || !validateDate(date)) {
            return NextResponse.json({ success: false, error: "busId,date,seatNo are required" }, { status: 400 });
        }

        const db = getAdminDb();
        const seatRef = db.ref(`bookings/${date}/${busId}/${seatNo}`);
        const existing = await seatRef.once("value");
        const existingVal = existing.exists() ? existing.val() || {} : null;
        await seatRef.remove();

        // send cancellation email if booking had an email — await result and return diagnostic info
        let emailResult = { attempted: false, sent: false, error: null };
        if (existingVal && existingVal.email) {
            const emailTo = String(existingVal.email || "").trim();
            const nameTo = String(existingVal.name || "Passenger").trim();
            console.log("Triggering booking cancellation email to", emailTo, "for seat", seatNo);
            emailResult.attempted = true;
            try {
                await sendBookingCancellation(emailTo, nameTo, { seatNo, date, ...existingVal });
                emailResult.sent = true;
                console.log("sendBookingCancellation completed for", emailTo, "seat", seatNo);
            } catch (e) {
                const msg = e && e.message ? e.message : String(e);
                emailResult.error = msg;
                console.error("sendBookingCancellation error:", msg);
            }
        }

        return NextResponse.json({ success: true, message: "Booking cancelled", email: emailResult }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/booking error:", err);
        return NextResponse.json({ success: false, error: "Failed to cancel booking" }, { status: 500 });
    }
}
