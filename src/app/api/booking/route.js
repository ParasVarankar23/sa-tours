import { NextResponse } from "next/server";
import {
    sendBookingCancellation,
    sendBookingConfirmation,
} from "../../../lib/emailService";
import { getAdminDb } from "../../../lib/firebaseAdmin";
// verifyAuthToken is imported dynamically where needed to avoid startup cost

/* =========================
   Helpers
========================= */
function validateDate(d) {
    return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function normalizeText(v) {
    return String(v || "").trim();
}

function normalizeKey(v) {
    return normalizeText(v).toLowerCase();
}

/* =========================
   New Bus Structure Helpers
   Supports:
   - startPoint: { name, time }
   - pickupPoints: [{ name, time }]
   - dropPoints: [{ name, time }]
   - endPoint: { name, time }
========================= */

function getStartPoint(busData) {
    const sp = busData?.startPoint;
    if (!sp) return { name: "", time: "" };

    if (typeof sp === "string") {
        return {
            name: normalizeText(sp),
            time: normalizeText(busData?.startTime),
        };
    }

    return {
        name: normalizeText(sp?.name),
        time: normalizeText(sp?.time || busData?.startTime),
    };
}

function getEndPoint(busData) {
    const ep = busData?.endPoint;
    if (!ep) return { name: "", time: "" };

    if (typeof ep === "string") {
        return {
            name: normalizeText(ep),
            time: normalizeText(busData?.endTime),
        };
    }

    return {
        name: normalizeText(ep?.name),
        time: normalizeText(ep?.time || busData?.endTime),
    };
}

function getPickupOptions(busData) {
    const startPoint = getStartPoint(busData);

    const pickupPoints = Array.isArray(busData?.pickupPoints)
        ? busData.pickupPoints
            .map((p) => ({
                name: normalizeText(p?.name),
                time: normalizeText(p?.time),
            }))
            .filter((p) => p.name)
        : [];

    const all = [];

    // include start point if available
    if (startPoint.name) {
        all.push(startPoint);
    }

    // include pickup points, avoid duplicate names
    for (const p of pickupPoints) {
        const exists = all.some((x) => normalizeKey(x.name) === normalizeKey(p.name));
        if (!exists) all.push(p);
    }

    return all;
}

function getDropOptions(busData) {
    const endPoint = getEndPoint(busData);

    const dropPoints = Array.isArray(busData?.dropPoints)
        ? busData.dropPoints
            .map((p) => ({
                name: normalizeText(p?.name),
                time: normalizeText(p?.time),
            }))
            .filter((p) => p.name)
        : [];

    const all = [];

    // include drop points first
    for (const p of dropPoints) {
        const exists = all.some((x) => normalizeKey(x.name) === normalizeKey(p.name));
        if (!exists) all.push(p);
    }

    // include end point if available
    if (endPoint.name) {
        const exists = all.some((x) => normalizeKey(x.name) === normalizeKey(endPoint.name));
        if (!exists) {
            all.push(endPoint);
        }
    }

    return all;
}

function isValidPickup(busData, pickup) {
    const options = getPickupOptions(busData);
    return options.some((p) => normalizeKey(p.name) === normalizeKey(pickup));
}

function isValidDrop(busData, drop) {
    const options = getDropOptions(busData);
    return options.some((p) => normalizeKey(p.name) === normalizeKey(drop));
}

function getPickupTime(busData, pickup) {
    const options = getPickupOptions(busData);
    const found = options.find((p) => normalizeKey(p.name) === normalizeKey(pickup));
    return found ? normalizeText(found.time) : "";
}

function getDropTime(busData, drop) {
    const options = getDropOptions(busData);
    const found = options.find((p) => normalizeKey(p.name) === normalizeKey(drop));
    return found ? normalizeText(found.time) : "";
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
    if (!pickup) {
        return { ok: false, error: "Pickup point is required" };
    }

    if (!drop) {
        return { ok: false, error: "Drop point is required" };
    }

    const pickupOk = isValidPickup(busData, pickup);
    if (!pickupOk) {
        return { ok: false, error: "Invalid pickup point" };
    }

    const dropOk = isValidDrop(busData, drop);
    if (!dropOk) {
        return { ok: false, error: "Invalid drop point" };
    }

    // prevent same pickup and drop
    if (normalizeKey(pickup) === normalizeKey(drop)) {
        return { ok: false, error: "Pickup and drop cannot be the same" };
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

        // pickup/drop required + validate
        const routeValidation = validatePickupDrop(busData, pickup, drop);
        if (!routeValidation.ok) {
            return NextResponse.json(
                { success: false, error: routeValidation.error },
                { status: 400 }
            );
        }

        // exact fare from bus fareRules only
        let exactFare = findExactFare(busData, pickup, drop);
        // If there is no configured exact fare, allow admin override with a valid fare
        if (exactFare === null) {
            const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
            let adminAllowed = false;
            if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
                const token = authHeader.split(" ")[1];
                try {
                    const { verifyAuthToken } = await import("../../../lib/firebaseAdmin");
                    const decoded = await verifyAuthToken(token);
                    if (decoded && (decoded.role === "admin" || decoded.role === "owner")) {
                        adminAllowed = true;
                    }
                } catch (e) {
                    adminAllowed = false;
                }
            }

            if (!adminAllowed) {
                return NextResponse.json(
                    { success: false, error: "Fare not available for selected pickup and drop" },
                    { status: 400 }
                );
            }
            // admin is allowed — but require body.fare to be provided and valid
            if (body.fare === undefined || body.fare === null || body.fare === "") {
                return NextResponse.json(
                    { success: false, error: "Admin override requires a fare value" },
                    { status: 400 }
                );
            }
            const sentFareOnly = Number(body.fare);
            if (!Number.isFinite(sentFareOnly) || sentFareOnly <= 0) {
                return NextResponse.json(
                    { success: false, error: "Invalid fare sent from frontend" },
                    { status: 400 }
                );
            }
            // set exactFare to sent value for downstream usage
            exactFare = sentFareOnly;
        }

        // if frontend sent fare, validate it. Allow override if caller is authenticated admin/owner.
        if (body.fare !== undefined && body.fare !== null && body.fare !== "") {
            const sentFare = Number(body.fare);
            if (!Number.isFinite(sentFare)) {
                return NextResponse.json(
                    { success: false, error: "Invalid fare sent from frontend" },
                    { status: 400 }
                );
            }

            if (sentFare !== exactFare) {
                // check Authorization header for admin token
                const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
                let allowed = false;
                if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
                    const token = authHeader.split(" ")[1];
                    try {
                        const { verifyAuthToken } = await import("../../../lib/firebaseAdmin");
                        const decoded = await verifyAuthToken(token);
                        if (decoded && (decoded.role === "admin" || decoded.role === "owner")) {
                            allowed = true;
                        }
                    } catch (e) {
                        allowed = false;
                    }
                }

                if (!allowed) {
                    return NextResponse.json(
                        { success: false, error: "Invalid fare sent from frontend" },
                        { status: 400 }
                    );
                }
                // allowed override; we'll use sent fare when creating booking
            }
        }

        const resolvedPickupTime = getPickupTime(busData, pickup) || null;
        const resolvedDropTime = getDropTime(busData, drop) || null;

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

            // prefer frontend-sent fare when admin override is allowed, otherwise use exactFare
            fare: (body.fare !== undefined && body.fare !== null && body.fare !== "") ? Number(body.fare) : exactFare,

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
            { success: false, error: err.message || "Failed to create booking" },
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
        const existingVal = existing.val() || {};

        const updates = {
            updatedAt: new Date().toISOString(),
        };

        if (name) updates.name = name;
        if (phone) updates.phone = phone;
        if (email) updates.email = email;

        if (pickup || drop) {
            const finalPickup = pickup || existingVal.pickup || "";
            const finalDrop = drop || existingVal.drop || "";

            const routeValidation = validatePickupDrop(busData, finalPickup, finalDrop);
            if (!routeValidation.ok) {
                return NextResponse.json(
                    { success: false, error: routeValidation.error },
                    { status: 400 }
                );
            }

            let exactFare = findExactFare(busData, finalPickup, finalDrop);
            if (exactFare === null) {
                // allow admin override when no exact fare configured
                const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
                let adminAllowed = false;
                if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
                    const token = authHeader.split(" ")[1];
                    try {
                        const { verifyAuthToken } = await import("../../../lib/firebaseAdmin");
                        const decoded = await verifyAuthToken(token);
                        if (decoded && (decoded.role === "admin" || decoded.role === "owner")) {
                            adminAllowed = true;
                        }
                    } catch (e) {
                        adminAllowed = false;
                    }
                }

                if (!adminAllowed) {
                    return NextResponse.json(
                        { success: false, error: "Fare not available for selected pickup and drop" },
                        { status: 400 }
                    );
                }

                // admin must provide a fare when overriding
                if (body.fare === undefined || body.fare === null || body.fare === "") {
                    return NextResponse.json(
                        { success: false, error: "Admin override requires a fare value" },
                        { status: 400 }
                    );
                }
                const sentFareOnly = Number(body.fare);
                if (!Number.isFinite(sentFareOnly) || sentFareOnly <= 0) {
                    return NextResponse.json(
                        { success: false, error: "Invalid fare sent from frontend" },
                        { status: 400 }
                    );
                }
                exactFare = sentFareOnly;
            }

            updates.pickup = finalPickup;
            updates.drop = finalDrop;
            updates.pickupTime = getPickupTime(busData, finalPickup) || null;
            updates.dropTime = getDropTime(busData, finalDrop) || null;
            updates.fare = exactFare;
        }

        // allow admin to override fare via body.fare even when updating
        if (body.fare !== undefined && body.fare !== null && body.fare !== "") {
            const sentFare = Number(body.fare);
            if (!Number.isFinite(sentFare) || sentFare <= 0) {
                return NextResponse.json(
                    { success: false, error: "Invalid fare sent from frontend" },
                    { status: 400 }
                );
            }

            const currentFare = updates.fare || existingVal.fare || null;
            if (currentFare === null || Number(sentFare) !== Number(currentFare)) {
                // require admin token to override
                const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
                let allowed = false;
                if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
                    const token = authHeader.split(" ")[1];
                    try {
                        const { verifyAuthToken } = await import("../../../lib/firebaseAdmin");
                        const decoded = await verifyAuthToken(token);
                        if (decoded && (decoded.role === "admin" || decoded.role === "owner")) {
                            allowed = true;
                        }
                    } catch (e) {
                        allowed = false;
                    }
                }

                if (!allowed) {
                    return NextResponse.json(
                        { success: false, error: "Invalid fare sent from frontend" },
                        { status: 400 }
                    );
                }
            }

            updates.fare = Number(sentFare);
        }

        // allow payment fields update if sent
        if (body.payment !== undefined) {
            updates.payment = body.payment ? normalizeText(body.payment) : null;
        }

        if (body.paymentMethod !== undefined) {
            updates.paymentMethod = body.paymentMethod
                ? normalizeText(body.paymentMethod)
                : null;
        }

        if (body.status !== undefined) {
            updates.status = body.status ? normalizeText(body.status) : existingVal.status || "booked";
        }

        await seatRef.update(updates);

        try {
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
                booking: { seatNo, ...existingVal, ...updates },
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("PUT /api/booking error:", err);
        return NextResponse.json(
            { success: false, error: err.message || "Failed to update booking" },
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

        if (!existing.exists()) {
            return NextResponse.json(
                { success: false, error: "Booking not found" },
                { status: 404 }
            );
        }

        const existingVal = existing.val() || {};

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