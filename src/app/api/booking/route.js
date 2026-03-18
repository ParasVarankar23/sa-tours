import { NextResponse } from "next/server";
import {
    sendBookingCancellation,
    sendBookingConfirmation,
} from "../../../lib/emailService";
import { getAdminDb } from "../../../lib/firebaseAdmin";

function validateDate(d) {
    return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function normalizeText(v) {
    return String(v || "").trim();
}

function normalizeKey(v) {
    return normalizeText(v).toLowerCase();
}

function buildRouteStops(busData) {
    const middleStops = Array.isArray(busData?.stops)
        ? busData.stops
            .map((s) => (typeof s === "string" ? s : s?.stopName))
            .filter(Boolean)
            .map((s) => normalizeText(s))
        : [];

    return [
        normalizeText(busData?.startPoint),
        ...middleStops,
        normalizeText(busData?.endPoint),
    ].filter(Boolean);
}

function getStopTime(busData, stopName) {
    if (!busData || !stopName) return "";

    if (normalizeKey(busData.startPoint) === normalizeKey(stopName)) {
        return normalizeText(busData.startTime);
    }

    if (normalizeKey(busData.endPoint) === normalizeKey(stopName)) {
        return normalizeText(busData.endTime);
    }

    const found = (busData.stops || []).find((s) => {
        const name = typeof s === "string" ? s : s?.stopName;
        return normalizeKey(name) === normalizeKey(stopName);
    });

    if (!found) return "";
    return typeof found === "string" ? "" : normalizeText(found.time);
}

function findExactFare(busData, fromStop, toStop) {
    const rules = Array.isArray(busData?.fareRules) ? busData.fareRules : [];

    const rule = rules.find(
        (r) =>
            normalizeKey(r?.from) === normalizeKey(fromStop) &&
            normalizeKey(r?.to) === normalizeKey(toStop)
    );

    if (!rule) return null;

    const fare = Number(rule.fare);
    if (!Number.isFinite(fare) || fare <= 0) return null;

    return fare;
}

function validatePickupDrop(busData, pickup, drop) {
    const routeStops = buildRouteStops(busData);

    const pickupIndex = routeStops.findIndex((s) => normalizeKey(s) === normalizeKey(pickup));
    const dropIndex = routeStops.findIndex((s) => normalizeKey(s) === normalizeKey(drop));

    if (pickupIndex === -1) return { ok: false, error: "Invalid pickup point" };
    if (dropIndex === -1) return { ok: false, error: "Invalid drop point" };
    if (dropIndex <= pickupIndex) {
        return { ok: false, error: "Drop point must come after pickup point" };
    }

    return { ok: true };
}

/* =========================
   GET - Fetch bookings for bus/date
========================= */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const busId = searchParams.get("busId");
        const date = searchParams.get("date");

        if (!busId || !date || !validateDate(date)) {
            return NextResponse.json(
                { success: false, error: "busId and valid date are required" },
                { status: 400 }
            );
        }

        const db = getAdminDb();
        const snap = await db.ref(`bookings/${date}/${busId}`).once("value");
        const data = snap.exists() ? snap.val() : {};

        return NextResponse.json({ success: true, bookings: data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/booking error:", err);
        return NextResponse.json(
            { success: false, error: "Failed to fetch bookings" },
            { status: 500 }
        );
    }
}

/* =========================
   POST - Create booking
========================= */
export async function POST(req) {
    try {
        const body = await req.json();

        const busId = normalizeText(body.busId);
        const date = normalizeText(body.date);
        const seatNo = normalizeText(body.seatNo);
        const name = normalizeText(body.name);
        const phone = normalizeText(body.phone);
        const email = normalizeText(body.email);
        const pickup = normalizeText(body.pickup);
        const drop = normalizeText(body.drop);
        const busNumber = normalizeText(body.busNumber);
        const startTime = normalizeText(body.startTime);
        const endTime = normalizeText(body.endTime);

        if (!busId || !date || !seatNo || !name || !phone || !validateDate(date)) {
            return NextResponse.json(
                { success: false, error: "busId,date,seatNo,name,phone are required" },
                { status: 400 }
            );
        }

        const db = getAdminDb();

        // schedule check
        const schedSnap = await db.ref(`schedules/${busId}/${date}`).once("value");
        if (!schedSnap.exists() || !schedSnap.val()?.available) {
            return NextResponse.json(
                { success: false, error: "Bus is not scheduled/available on this date" },
                { status: 400 }
            );
        }

        // bus fetch
        const busSnap = await db.ref(`buses/${busId}`).once("value");
        if (!busSnap.exists()) {
            return NextResponse.json(
                { success: false, error: "Bus not found" },
                { status: 404 }
            );
        }

        const busData = busSnap.val() || {};

        // pickup/drop required
        if (!pickup || !drop) {
            return NextResponse.json(
                { success: false, error: "Pickup and drop are required" },
                { status: 400 }
            );
        }

        // validate route order
        const routeValidation = validatePickupDrop(busData, pickup, drop);
        if (!routeValidation.ok) {
            return NextResponse.json(
                { success: false, error: routeValidation.error },
                { status: 400 }
            );
        }

        // exact fare from bus fareRules only
        const exactFare = findExactFare(busData, pickup, drop);
        if (exactFare === null) {
            return NextResponse.json(
                { success: false, error: "Fare not available for selected pickup and drop" },
                { status: 400 }
            );
        }

        // if frontend sent fare, validate it
        if (body.fare !== undefined && body.fare !== null) {
            const sentFare = Number(body.fare);
            if (!Number.isFinite(sentFare) || sentFare !== exactFare) {
                return NextResponse.json(
                    { success: false, error: "Invalid fare sent from frontend" },
                    { status: 400 }
                );
            }
        }

        const resolvedPickupTime = getStopTime(busData, pickup) || null;
        const resolvedDropTime = getStopTime(busData, drop) || null;

        const seatRef = db.ref(`bookings/${date}/${busId}/${seatNo}`);
        const existing = await seatRef.once("value");

        if (existing.exists()) {
            return NextResponse.json(
                { success: false, error: "Seat already booked" },
                { status: 409 }
            );
        }

        const now = new Date().toISOString();

        const payload = {
            name,
            phone,
            email: email || null,
            pickup,
            pickupTime: resolvedPickupTime,
            drop,
            dropTime: resolvedDropTime,
            fare: exactFare,
            busNumber: busNumber || normalizeText(busData.busNumber) || null,
            startTime: startTime || normalizeText(busData.startTime) || null,
            endTime: endTime || normalizeText(busData.endTime) || null,
            createdAt: now,
            updatedAt: now,
            status: "booked",
            payment: body.payment ? normalizeText(body.payment) : null,
            paymentMethod: body.paymentMethod ? normalizeText(body.paymentMethod) : null,
        };

        await seatRef.set(payload);

        if (email) {
            try {
                sendBookingConfirmation(email, name || "Passenger", {
                    seatNo,
                    date,
                    ...payload,
                }).catch((e) => console.error("sendBookingConfirmation error:", e));
            } catch (err) {
                console.error("Failed to trigger booking confirmation email:", err);
            }
        }

        return NextResponse.json(
            {
                success: true,
                message: "Seat booked successfully",
                booking: { seatNo, ...payload },
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("POST /api/booking error:", err);
        return NextResponse.json(
            { success: false, error: "Failed to create booking" },
            { status: 500 }
        );
    }
}

/* =========================
   PUT - Update booking
========================= */
export async function PUT(req) {
    try {
        const body = await req.json();

        const busId = normalizeText(body.busId);
        const date = normalizeText(body.date);
        const seatNo = normalizeText(body.seatNo);
        const name = normalizeText(body.name);
        const phone = normalizeText(body.phone);
        const email = normalizeText(body.email);
        const pickup = normalizeText(body.pickup);
        const drop = normalizeText(body.drop);

        if (!busId || !date || !seatNo || !validateDate(date)) {
            return NextResponse.json(
                { success: false, error: "busId,date,seatNo are required" },
                { status: 400 }
            );
        }

        const db = getAdminDb();

        const seatRef = db.ref(`bookings/${date}/${busId}/${seatNo}`);
        const existing = await seatRef.once("value");

        if (!existing.exists()) {
            return NextResponse.json(
                { success: false, error: "Booking not found for seat" },
                { status: 404 }
            );
        }

        const busSnap = await db.ref(`buses/${busId}`).once("value");
        if (!busSnap.exists()) {
            return NextResponse.json(
                { success: false, error: "Bus not found" },
                { status: 404 }
            );
        }

        const busData = busSnap.val() || {};

        const updates = {
            updatedAt: new Date().toISOString(),
        };

        if (name) updates.name = name;
        if (phone) updates.phone = phone;
        if (email) updates.email = email;

        if (pickup || drop) {
            const finalPickup = pickup || existing.val()?.pickup || "";
            const finalDrop = drop || existing.val()?.drop || "";

            if (!finalPickup || !finalDrop) {
                return NextResponse.json(
                    { success: false, error: "Pickup and drop are required" },
                    { status: 400 }
                );
            }

            const routeValidation = validatePickupDrop(busData, finalPickup, finalDrop);
            if (!routeValidation.ok) {
                return NextResponse.json(
                    { success: false, error: routeValidation.error },
                    { status: 400 }
                );
            }

            const exactFare = findExactFare(busData, finalPickup, finalDrop);
            if (exactFare === null) {
                return NextResponse.json(
                    { success: false, error: "Fare not available for selected pickup and drop" },
                    { status: 400 }
                );
            }

            updates.pickup = finalPickup;
            updates.drop = finalDrop;
            updates.pickupTime = getStopTime(busData, finalPickup) || null;
            updates.dropTime = getStopTime(busData, finalDrop) || null;
            updates.fare = exactFare;
        }

        await seatRef.update(updates);

        try {
            const existingVal = existing.val() || {};
            const emailToUse = updates.email || existingVal.email || "";
            const nameToUse = updates.name || existingVal.name || "Passenger";

            if (emailToUse) {
                const mergedBooking = { seatNo, date, ...existingVal, ...updates };
                sendBookingConfirmation(emailToUse, nameToUse, mergedBooking).catch((e) =>
                    console.error("sendBookingConfirmation (update) error:", e)
                );
            }
        } catch (err) {
            console.error("Failed to trigger booking update email:", err);
        }

        return NextResponse.json(
            {
                success: true,
                message: "Booking updated",
                booking: { seatNo, ...updates },
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("PUT /api/booking error:", err);
        return NextResponse.json(
            { success: false, error: "Failed to update booking" },
            { status: 500 }
        );
    }
}

/* =========================
   DELETE - Cancel booking
========================= */
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const busId = searchParams.get("busId");
        const date = searchParams.get("date");
        const seatNo = searchParams.get("seatNo");

        if (!busId || !date || !seatNo || !validateDate(date)) {
            return NextResponse.json(
                { success: false, error: "busId,date,seatNo are required" },
                { status: 400 }
            );
        }

        const db = getAdminDb();
        const seatRef = db.ref(`bookings/${date}/${busId}/${seatNo}`);
        const existing = await seatRef.once("value");
        const existingVal = existing.exists() ? existing.val() || {} : null;

        await seatRef.remove();

        let emailResult = { attempted: false, sent: false, error: null };

        if (existingVal && existingVal.email) {
            const emailTo = normalizeText(existingVal.email);
            const nameTo = normalizeText(existingVal.name || "Passenger");

            emailResult.attempted = true;
            try {
                await sendBookingCancellation(emailTo, nameTo, { seatNo, date, ...existingVal });
                emailResult.sent = true;
            } catch (e) {
                emailResult.error = e?.message || String(e);
            }
        }

        return NextResponse.json(
            {
                success: true,
                message: "Booking cancelled",
                email: emailResult,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("DELETE /api/booking error:", err);
        return NextResponse.json(
            { success: false, error: "Failed to cancel booking" },
            { status: 500 }
        );
    }
}