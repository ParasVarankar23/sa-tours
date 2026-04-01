import { NextResponse } from "next/server";
import {
    sendBookingCancellation,
    sendBookingConfirmation,
} from "../../../lib/emailService";
import {
    getFare,
    isBorliVillageStop,
    isCityStop,
    isDighiVillageStop,
    normalizeStopName,
    ROUTES,
} from "../../../lib/fare";
import { getAdminDb } from "../../../lib/firebaseAdmin";

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

async function isAdminOrOwnerFromRequest(req) {
    const authHeader =
        req.headers.get("authorization") || req.headers.get("Authorization") || "";

    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
        return false;
    }

    const token = authHeader.split(" ")[1];
    if (!token) return false;

    try {
        const { verifyAuthToken } = await import("../../../lib/firebaseAdmin");
        const decoded = await verifyAuthToken(token);

        return !!decoded && (decoded.role === "admin" || decoded.role === "owner");
    } catch {
        return false;
    }
}

/* =========================
   New Bus Structure Helpers
========================= */

function getStartPoint(busData) {
    const sp = busData?.startPoint;
    if (!sp) {
        return {
            name: normalizeText(busData?.startPointName || busData?.startStop || busData?.from),
            time: normalizeText(busData?.startTime),
        };
    }

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
    if (!ep) {
        return {
            name: normalizeText(busData?.endPointName || busData?.endStop || busData?.to),
            time: normalizeText(busData?.endTime),
        };
    }

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

function buildRouteStops(busData) {
    const startPoint = getStartPoint(busData);
    const endPoint = getEndPoint(busData);

    const pickupPoints = Array.isArray(busData?.pickupPoints)
        ? busData.pickupPoints
            .map((p) => ({
                name: normalizeText(typeof p === "string" ? p : p?.name),
                time: normalizeText(typeof p === "object" ? p?.time : ""),
            }))
            .filter((p) => p.name)
        : [];

    const dropPoints = Array.isArray(busData?.dropPoints)
        ? busData.dropPoints
            .map((p) => ({
                name: normalizeText(typeof p === "string" ? p : p?.name),
                time: normalizeText(typeof p === "object" ? p?.time : ""),
            }))
            .filter((p) => p.name)
        : [];

    const all = [];

    if (startPoint.name) {
        all.push({ name: startPoint.name, time: startPoint.time });
    }

    for (const p of pickupPoints) {
        const exists = all.some((x) => normalizeKey(x.name) === normalizeKey(p.name));
        if (!exists) all.push(p);
    }

    for (const d of dropPoints) {
        const exists = all.some((x) => normalizeKey(x.name) === normalizeKey(d.name));
        if (!exists) all.push(d);
    }

    if (endPoint.name) {
        const exists = all.some((x) => normalizeKey(x.name) === normalizeKey(endPoint.name));
        if (!exists) {
            all.push({ name: endPoint.name, time: endPoint.time });
        }
    }

    return all;
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

    if (startPoint.name) {
        all.push(startPoint);
    }

    for (const p of pickupPoints) {
        const exists = all.some((x) => normalizeKey(x.name) === normalizeKey(p.name));
        if (!exists) all.push(p);
    }

    return all;
}

function getDropOptions(busData, pickup = "") {
    const allStops = buildRouteStops(busData);
    const pickupOptions = getPickupOptions(busData);
    const pickupSet = new Set(pickupOptions.map((p) => normalizeKey(p.name)));

    let startIndex = 0;
    if (pickup) {
        const idx = allStops.findIndex((s) => normalizeKey(s.name) === normalizeKey(pickup));
        if (idx !== -1) startIndex = idx + 1;
    }

    return allStops.filter((s, idx) => idx >= startIndex && !pickupSet.has(normalizeKey(s.name)));
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

function ruleAppliesOnDate(rule, dateStr) {
    if (!dateStr) return true;

    const toDateOnly = (s) => String(s || "").slice(0, 10);

    const d = toDateOnly(dateStr);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;

    if (rule.fareStartDate) {
        const s = toDateOnly(rule.fareStartDate);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
        if (d < s) return false;
    }

    if (rule.fareEndDate) {
        const e = toDateOnly(rule.fareEndDate);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(e)) return false;
        if (d > e) return false;
    }

    return true;
}

function expandFareRules(busData, dateStr = "") {
    const raw = Array.isArray(busData?.fareRulesRaw)
        ? busData.fareRulesRaw
        : Array.isArray(busData?.fareRules)
            ? busData.fareRules
            : [];

    if (!raw.length) return [];

    const pickupOptions = getPickupOptions(busData);
    const allStops = buildRouteStops(busData);

    const pickupSet = new Set(pickupOptions.map((p) => normalizeKey(p.name)));
    const dropCandidates = allStops.filter((s) => !pickupSet.has(normalizeKey(s.name)));

    const expanded = [];

    for (let i = 0; i < raw.length; i++) {
        const r = raw[i] || {};

        const from = normalizeText(r.from);
        const to = normalizeText(r.to);
        const fare = Number(r.fare);
        const fareStartDate = r.fareStartDate || "";
        const fareEndDate = r.fareEndDate || "";

        const applyNextPickups = !!r.applyToAllNextPickupsBeforeDrop;
        const applyPreviousDrops = !!r.applyToAllPreviousDrops;

        if (!from || !to || !Number.isFinite(fare) || fare <= 0) continue;

        let fromList = [from];
        if (applyNextPickups) {
            const fromIndex = pickupOptions.findIndex(
                (p) => normalizeKey(p.name) === normalizeKey(from)
            );
            if (fromIndex !== -1) {
                fromList = pickupOptions.slice(fromIndex).map((p) => p.name);
            }
        }

        let toList = [to];
        if (applyPreviousDrops) {
            const toIndex = dropCandidates.findIndex(
                (d) => normalizeKey(d.name) === normalizeKey(to)
            );
            if (toIndex !== -1) {
                toList = dropCandidates.slice(0, toIndex + 1).map((d) => d.name);
            } else if (dropCandidates.length) {
                toList = dropCandidates.map((d) => d.name);
            }
        }

        for (const fromStop of fromList) {
            for (const toStop of toList) {
                const fromIdx = allStops.findIndex(
                    (s) => normalizeKey(s.name) === normalizeKey(fromStop)
                );
                const toIdx = allStops.findIndex(
                    (s) => normalizeKey(s.name) === normalizeKey(toStop)
                );

                if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx) {
                    const expandedRule = {
                        from: fromStop,
                        to: toStop,
                        fare,
                        fareStartDate,
                        fareEndDate,
                        sourceIndex: i,
                    };

                    if (ruleAppliesOnDate(expandedRule, dateStr)) {
                        expanded.push(expandedRule);
                    }
                }
            }
        }
    }

    return expanded;
}

function findExactFare(busData, fromStop, toStop, dateStr = "") {
    const rules = Array.isArray(busData?.fareRules) ? busData.fareRules : [];

    const datedExact = rules.find(
        (r) =>
            normalizeKey(r?.from) === normalizeKey(fromStop) &&
            normalizeKey(r?.to) === normalizeKey(toStop) &&
            ruleAppliesOnDate(r, dateStr)
    );

    if (datedExact) {
        const fare = Number(datedExact.fare);
        if (Number.isFinite(fare) && fare > 0) return fare;
    }

    const expanded = expandFareRules(busData, dateStr);

    const match = expanded.find(
        (r) =>
            normalizeKey(r.from) === normalizeKey(fromStop) &&
            normalizeKey(r.to) === normalizeKey(toStop)
    );

    if (match) {
        const fare = Number(match.fare);
        if (Number.isFinite(fare) && fare > 0) return fare;
    }

    try {
        const pickupNorm = normalizeStopName(fromStop);
        const dropNorm = normalizeStopName(toStop);

        let routeKey = null;

        if (isBorliVillageStop(pickupNorm) && isCityStop(dropNorm)) {
            routeKey = ROUTES.BORLI_TO_DONGRI;
        } else if (isDighiVillageStop(pickupNorm) && isCityStop(dropNorm)) {
            routeKey = ROUTES.DIGHI_TO_DONGRI;
        } else if (isCityStop(pickupNorm) && isBorliVillageStop(dropNorm)) {
            routeKey = ROUTES.DONGRI_TO_BORLI;
        } else if (isCityStop(pickupNorm) && isDighiVillageStop(dropNorm)) {
            routeKey = ROUTES.DONGRI_TO_DIGHI;
        }

        if (routeKey) {
            const rawType = String(busData?.busType || "").trim();

            const mappedType = (() => {
                const s = rawType.toLowerCase();
                if (!s) return "NON_AC";
                if (
                    s === "non-ac" ||
                    s === "non ac" ||
                    s === "nonac" ||
                    s.includes("non")
                ) {
                    return "NON_AC";
                }
                if (s === "ac" || s === "a/c" || s.includes("ac")) {
                    return "AC";
                }
                return "NON_AC";
            })();

            const base = getFare({
                route: routeKey,
                pickup: fromStop,
                drop: toStop,
                busType: mappedType,
            });

            if (base && Number.isFinite(Number(base.amount)) && Number(base.amount) > 0) {
                return Number(base.amount);
            }
        }
    } catch {
        // silent fallback
    }

    return null;
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

    if (normalizeKey(pickup) === normalizeKey(drop)) {
        return { ok: false, error: "Pickup and drop cannot be the same" };
    }

    const allStops = buildRouteStops(busData);
    const pickupIndex = allStops.findIndex((s) => normalizeKey(s.name) === normalizeKey(pickup));
    const dropIndex = allStops.findIndex((s) => normalizeKey(s.name) === normalizeKey(drop));

    if (pickupIndex === -1 || dropIndex === -1 || dropIndex <= pickupIndex) {
        return { ok: false, error: "Drop must be after pickup in route order" };
    }

    return { ok: true };
}

/* =========================
   Notification helpers
========================= */

async function createRoleNotification(db, role, { title, message, data }) {
    if (!db || !role || !title) return null;
    const now = new Date().toISOString();
    const ts = Date.now();
    const payload = { title, message: message || "", data: data || null, createdAt: now, ts, read: false };
    try {
        const ref = db.ref(`notifications/roles/${role}`).push();
        await ref.set(payload);
        return ref.key;
    } catch (e) {
        console.error("createRoleNotification error:", e);
        return null;
    }
}

async function createUserNotification(db, uid, { title, message, data }) {
    if (!db || !uid || !title) return null;
    const now = new Date().toISOString();
    const ts = Date.now();
    const payload = { title, message: message || "", data: data || null, createdAt: now, ts, read: false };
    try {
        const ref = db.ref(`notifications/users/${uid}`).push();
        await ref.set(payload);
        return ref.key;
    } catch (e) {
        console.error("createUserNotification error:", e);
        return null;
    }
}

/* =========================
   GET - Fetch bookings for bus/date
========================= */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const ticketQ = searchParams.get("ticket") || searchParams.get("ticketNo") || searchParams.get("ticketNumber");
        if (ticketQ) {
            const code = normalizeText(ticketQ);
            const db = getAdminDb();
            const rootSnap = await db.ref(`bookings`).once("value");
            const all = rootSnap.exists() ? rootSnap.val() : {};
            for (const d of Object.keys(all || {})) {
                const buses = all[d] || {};
                for (const bId of Object.keys(buses || {})) {
                    const seats = buses[bId] || {};
                    for (const sNo of Object.keys(seats || {})) {
                        const rec = seats[sNo] || {};
                        if (String(rec.ticket || "") === String(code)) {
                            return NextResponse.json({ success: true, booking: { date: d, busId: bId, seatNo: sNo, ...rec }, source: "booking" }, { status: 200 });
                        }
                    }
                }
            }

            // fallback: check vouchers by code — vouchers may be issued on cancellation and contain passenger details
            try {
                // first try exact voucher code lookup (user entered voucher code)
                const vSnap = await db.ref(`vouchers/${code}`).once("value");
                if (vSnap.exists()) {
                    const v = vSnap.val() || {};
                    const mapped = {
                        name: v.name || null,
                        phone: v.phone || null,
                        email: v.email || null,
                        pickup: v.pickup || (v.metadata && v.metadata.cancelledBooking && v.metadata.cancelledBooking.pickup) || "",
                        drop: v.drop || (v.metadata && v.metadata.cancelledBooking && v.metadata.cancelledBooking.drop) || "",
                        pickupTime:
                            v.pickupTime || v.metadata?.pickupTime || v.metadata?.cancelledBooking?.time || null,
                        dropTime:
                            v.dropTime || v.metadata?.dropTime || v.metadata?.cancelledBooking?.time || null,
                        voucherCode: v.code || code,
                        voucherAmount: v.amount || null,
                        voucherExpiresAt: v.expiresAt || null,
                    };

                    return NextResponse.json({ success: true, booking: mapped, source: "voucher", voucher: v }, { status: 200 });
                }

                // If not found by voucher key, scan all vouchers to see if any voucher was
                // created from a cancelled booking that contains the requested ticket number.
                const allVouchersSnap = await db.ref(`vouchers`).once("value");
                if (allVouchersSnap.exists()) {
                    const allVouchers = allVouchersSnap.val() || {};
                    for (const k of Object.keys(allVouchers)) {
                        const v = allVouchers[k] || {};
                        const cancelled = v.metadata && v.metadata.cancelledBooking ? v.metadata.cancelledBooking : null;
                        const ticketInVoucher = String((cancelled && cancelled.ticket) || v.ticket || "").trim();
                        if (ticketInVoucher && String(ticketInVoucher) === String(code)) {
                            const mapped = {
                                name: v.name || null,
                                phone: v.phone || null,
                                email: v.email || null,
                                pickup: v.pickup || (cancelled && cancelled.pickup) || "",
                                drop: v.drop || (cancelled && cancelled.drop) || "",
                                pickupTime:
                                    v.pickupTime || v.metadata?.pickupTime || (cancelled && cancelled.time) || null,
                                dropTime:
                                    v.dropTime || v.metadata?.dropTime || (cancelled && cancelled.time) || null,
                                voucherCode: v.code || k || null,
                                voucherAmount: v.amount || null,
                                voucherExpiresAt: v.expiresAt || null,
                            };

                            return NextResponse.json({ success: true, booking: mapped, source: "voucher", voucher: v }, { status: 200 });
                        }
                    }
                }
            } catch (e) {
                // ignore
            }

            return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
        }

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

        const schedSnap = await db.ref(`schedules/${busId}/${date}`).once("value");
        if (!schedSnap.exists() || !schedSnap.val()?.available) {
            return NextResponse.json(
                { success: false, error: "Bus is not scheduled/available on this date" },
                { status: 400 }
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

        const routeValidation = validatePickupDrop(busData, pickup, drop);
        if (!routeValidation.ok) {
            return NextResponse.json(
                { success: false, error: routeValidation.error },
                { status: 400 }
            );
        }

        let exactFare = findExactFare(busData, pickup, drop, date);
        let finalFare = exactFare;

        if (exactFare === null) {
            const adminAllowed = await isAdminOrOwnerFromRequest(req);

            if (!adminAllowed) {
                return NextResponse.json(
                    { success: false, error: "Fare not available for selected pickup and drop" },
                    { status: 400 }
                );
            }

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

            finalFare = sentFareOnly;
        }

        if (body.fare !== undefined && body.fare !== null && body.fare !== "") {
            const sentFare = Number(body.fare);

            if (!Number.isFinite(sentFare) || sentFare <= 0) {
                return NextResponse.json(
                    { success: false, error: "Invalid fare sent from frontend" },
                    { status: 400 }
                );
            }

            if (exactFare !== null && sentFare !== exactFare) {
                const allowed = await isAdminOrOwnerFromRequest(req);

                if (!allowed) {
                    return NextResponse.json(
                        { success: false, error: "Invalid fare sent from frontend" },
                        { status: 400 }
                    );
                }
            }

            finalFare = sentFare;
        }

        const resolvedPickupTime = getPickupTime(busData, pickup) || null;
        const resolvedDropTime = getDropTime(busData, drop) || null;

        const startPointData = getStartPoint(busData);
        const endPointData = getEndPoint(busData);

        const seatRef = db.ref(`bookings/${date}/${busId}/${seatNo}`);
        const existing = await seatRef.once("value");

        if (existing.exists()) {
            return NextResponse.json(
                { success: false, error: "Seat already booked" },
                { status: 409 }
            );
        }

        const now = new Date().toISOString();
        // Generate monthly ticket number (e.g. 26JAN0001)
        let ticket = null;
        try {
            const y = String(date || "");
            const yearShort = y.slice(2, 4); // '2026' -> '26'
            const monthIdx = Number(y.slice(5, 7)) || 0;
            const MONTHS = [
                "JAN",
                "FEB",
                "MAR",
                "APR",
                "MAY",
                "JUN",
                "JUL",
                "AUG",
                "SEP",
                "OCT",
                "NOV",
                "DEC",
            ];
            const mon = MONTHS[monthIdx - 1] || "UNK";
            const key = `${yearShort}${mon}`;

            // Try to reuse a cancelled ticket from the pool first (transactionally remove first child)
            try {
                const poolSnap = await db.ref(`ticketPools/${key}`).orderByKey().limitToFirst(1).once("value");
                if (poolSnap.exists()) {
                    const entries = Object.entries(poolSnap.val() || {});
                    if (entries.length) {
                        const childKey = entries[0][0];
                        let popped = null;
                        const childRef = db.ref(`ticketPools/${key}/${childKey}`);
                        await childRef.transaction((curr) => {
                            if (curr === null) return; // nothing to do
                            popped = curr;
                            return null; // remove
                        });

                        if (popped) {
                            ticket = String(popped);
                        }
                    }
                }
            } catch (e) {
                console.warn("Ticket pool reuse check failed:", e?.message || e);
            }

            if (!ticket) {
                const counterRef = db.ref(`ticketCounters/${key}`);
                const trans = await counterRef.transaction((curr) => {
                    return (Number(curr) || 0) + 1;
                });

                const seq = (trans && trans.snapshot && Number(trans.snapshot.val())) ? Number(trans.snapshot.val()) : 1;
                const seqStr = String(seq).padStart(4, "0");
                ticket = `${yearShort}${mon}${seqStr}`;
            }
        } catch (e) {
            console.error("Ticket generation failed:", e?.message || e);
            ticket = null;
        }

        // Normalize payment method: prefer 'Online Payment' label for gateway payments
        let paymentMethodNormalized = body.paymentMethod ? normalizeText(body.paymentMethod) : null;
        if (paymentMethodNormalized && /razor/i.test(paymentMethodNormalized)) {
            paymentMethodNormalized = "Online Payment";
        } else if (!paymentMethodNormalized && body.payment) {
            paymentMethodNormalized = "Online Payment";
        }

        const payload = {
            name,
            phone,
            email: email || null,

            pickup,
            pickupTime: resolvedPickupTime,

            drop,
            dropTime: resolvedDropTime,

            fare: finalFare,

            busNumber: busNumber || normalizeText(busData.busNumber) || null,
            startTime:
                startTime ||
                startPointData.time ||
                normalizeText(busData.startTime) ||
                null,
            endTime:
                endTime ||
                endPointData.time ||
                normalizeText(busData.endTime) ||
                null,

            createdAt: now,
            updatedAt: now,
            status: "booked",
            payment: body.payment ? normalizeText(body.payment) : null,
            paymentMethod: paymentMethodNormalized,
            ticket: ticket,
        };

        // If a voucher code is provided, verify it first and then attempt to atomically mark it used
        if (body.voucherCode) {
            try {
                const code = String(body.voucherCode || "").trim().toUpperCase();
                if (code) {
                    const vRef = db.ref(`vouchers/${code}`);

                    // quick pre-check so we can return a clearer error (not found vs already used)
                    try {
                        const vSnap = await vRef.once("value");
                        if (!vSnap.exists()) {
                            return NextResponse.json({ success: false, error: "Voucher not found" }, { status: 404 });
                        }
                        const vVal = vSnap.val() || {};

                        // If voucher already has been marked used, allow it only when it was
                        // pre-redeemed for THIS exact booking id (admin redeem flow).
                        const intendedBookingId = `${date}/${busId}/${seatNo}`;
                        if (vVal.usedAt) {
                            const usedById = vVal.usedByBookingId || (vVal.usedByBooking && `${vVal.usedByBooking.date}/${vVal.usedByBooking.busId}/${vVal.usedByBooking.seatNo}`) || null;
                            if (usedById && usedById === intendedBookingId) {
                                // voucher was already redeemed for this exact booking — accept it
                                payload.voucherCode = code;
                            } else {
                                return NextResponse.json({ success: false, error: "Voucher already used" }, { status: 400 });
                            }
                        } else {
                            // perform atomic transaction to mark voucher used
                            let txResult = null;
                            try {
                                txResult = await vRef.transaction((curr) => {
                                    if (!curr) return; // voucher not found -> abort
                                    if (curr.usedAt) return; // already used -> abort
                                    const nowLocal = new Date().toISOString();
                                    curr.usedAt = nowLocal;
                                    // store a compact booking identifier for consistency with other voucher APIs
                                    try {
                                        curr.usedByBookingId = `${date}/${busId}/${seatNo}`;
                                    } catch { }
                                    // also keep verbose reference for backward compatibility
                                    curr.usedByBooking = { date, busId, seatNo };
                                    return curr;
                                });
                            } catch (e) {
                                console.error("Voucher transaction error:", e);
                                txResult = null;
                            }

                            if (!txResult || !txResult.committed) {
                                return NextResponse.json({ success: false, error: "Voucher invalid or already used" }, { status: 400 });
                            }

                            payload.voucherCode = code;
                        }
                    } catch (e) {
                        // ignore and continue to attempt transaction below, but log for debugging
                        console.warn("Voucher pre-check failed:", e && e.message ? e.message : e);
                    }
                }
            } catch (e) {
                console.error("Failed to consume voucher:", e);
                return NextResponse.json({ success: false, error: "Voucher consume failed" }, { status: 500 });
            }
        }

        await seatRef.set(payload);

        // create notifications: admin + user (if userId present)
        try {
            const db2 = getAdminDb();
            // role notification for admin
            try {
                const roleKey = await createRoleNotification(db2, "admin", {
                    title: "New booking created",
                    message: `Seat ${seatNo} booked on ${date} for ${payload.busNumber || "bus"} (${payload.pickup} → ${payload.drop}) Fare: ₹${payload.fare}`,
                    data: { busId, date, seatNo, booking: payload },
                });
            } catch (e) {
                console.error("[Notifications] createRoleNotification error:", e);
            }

            // user notification when userId provided in request body
            const userIdFromBody = normalizeText(body.userId || "");
            if (userIdFromBody) {
                try {
                    const userKey = await createUserNotification(db2, userIdFromBody, {
                        title: "Booking confirmed",
                        message: `Your booking for seat ${seatNo} on ${date} is confirmed.`,
                        data: { busId, date, seatNo, booking: payload },
                    });
                } catch (e) {
                    console.error("[Notifications] createUserNotification error for userId", userIdFromBody, e);
                }
            } else {
                // no userId provided in booking body; skipping user notification
            }
        } catch (e) {
            console.error("Failed to create booking notifications:", e);
        }

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

        if (body.name !== undefined) {
            updates.name = name || existingVal.name || "";
        }

        if (body.phone !== undefined) {
            updates.phone = phone || existingVal.phone || "";
        }

        if (body.email !== undefined) {
            updates.email = email || null;
        }

        let finalFare = null;

        if (body.pickup !== undefined || body.drop !== undefined) {
            const finalPickup = body.pickup !== undefined ? pickup : existingVal.pickup || "";
            const finalDrop = body.drop !== undefined ? drop : existingVal.drop || "";

            const routeValidation = validatePickupDrop(busData, finalPickup, finalDrop);
            if (!routeValidation.ok) {
                return NextResponse.json(
                    { success: false, error: routeValidation.error },
                    { status: 400 }
                );
            }

            let exactFare = findExactFare(busData, finalPickup, finalDrop, date);

            if (exactFare === null) {
                const adminAllowed = await isAdminOrOwnerFromRequest(req);

                if (!adminAllowed) {
                    return NextResponse.json(
                        { success: false, error: "Fare not available for selected pickup and drop" },
                        { status: 400 }
                    );
                }

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

            finalFare = exactFare;
        }

        if (body.fare !== undefined && body.fare !== null && body.fare !== "") {
            const sentFare = Number(body.fare);

            if (!Number.isFinite(sentFare) || sentFare <= 0) {
                return NextResponse.json(
                    { success: false, error: "Invalid fare sent from frontend" },
                    { status: 400 }
                );
            }

            const currentFareForCompare =
                finalFare !== null
                    ? finalFare
                    : existingVal.fare !== undefined && existingVal.fare !== null
                        ? Number(existingVal.fare)
                        : null;

            if (
                currentFareForCompare !== null &&
                Number(sentFare) !== Number(currentFareForCompare)
            ) {
                const allowed = await isAdminOrOwnerFromRequest(req);

                if (!allowed) {
                    return NextResponse.json(
                        { success: false, error: "Invalid fare sent from frontend" },
                        { status: 400 }
                    );
                }
            }

            if (currentFareForCompare === null) {
                const allowed = await isAdminOrOwnerFromRequest(req);

                if (!allowed) {
                    return NextResponse.json(
                        { success: false, error: "Invalid fare sent from frontend" },
                        { status: 400 }
                    );
                }
            }

            finalFare = sentFare;
        }

        if (finalFare !== null) {
            updates.fare = finalFare;
        }

        if (body.payment !== undefined) {
            updates.payment = body.payment ? normalizeText(body.payment) : null;
        }

        if (body.paymentMethod !== undefined) {
            updates.paymentMethod = body.paymentMethod
                ? normalizeText(body.paymentMethod)
                : null;
        }

        if (body.status !== undefined) {
            updates.status = body.status
                ? normalizeText(body.status)
                : existingVal.status || "booked";
        }

        await seatRef.update(updates);

        try {
            const emailToUse = updates.email ?? existingVal.email ?? "";
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

        const action = String(searchParams.get("action") || "refund").toLowerCase();

        // if booking had a ticket, push it to monthly pool for reuse
        try {
            const t = existingVal.ticket;
            if (t) {
                const d = String(date || "");
                const yearShort = d.slice(2, 4);
                const monthIdx = Number(d.slice(5, 7)) || 0;
                const MONTHS = [
                    "JAN",
                    "FEB",
                    "MAR",
                    "APR",
                    "MAY",
                    "JUN",
                    "JUL",
                    "AUG",
                    "SEP",
                    "OCT",
                    "NOV",
                    "DEC",
                ];
                const mon = MONTHS[monthIdx - 1] || "UNK";
                const key = `${yearShort}${mon}`;
                await db.ref(`ticketPools/${key}`).push(String(t));
            }
        } catch (e) {
            console.warn("Failed to return ticket to pool:", e?.message || e);
        }
        // Handle cancel action: 'refund' (try gateway refund), 'voucher' (create voucher), 'void' (no refund)
        let refundResult = { attempted: false, success: false, amount: 0, error: null, raw: null };
        let voucherIssued = null;

        if (action === "voucher") {
            try {
                const fare = existingVal && existingVal.fare ? Number(existingVal.fare) : 0;
                const amount = fare && Number.isFinite(fare) ? Math.round((fare + Number.EPSILON) * 100) / 100 : 0;
                const now = new Date().toISOString();
                const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
                const base = `VCHR-${Date.now().toString(36).toUpperCase()}`;
                const code = `${base}-${Math.floor(Math.random() * 9000 + 1000)}`;

                const payload = {
                    code,
                    amount: amount || 0,
                    currency: "INR",
                    name: existingVal.name || null,
                    email: existingVal.email || null,
                    phone: existingVal.phone || null,
                    pickup: existingVal.pickup || null,
                    drop: existingVal.drop || null,
                    pickupTime: existingVal.pickupTime || null,
                    dropTime: existingVal.dropTime || null,
                    issuedAt: now,
                    expiresAt,
                    issuedBy: null,
                    usedAt: null,
                    usedByBookingId: null,
                    metadata: { cancelledBooking: { date, busId, seatNo, ticket: existingVal.ticket || null }, originalFare: fare || 0 },
                };

                await db.ref(`vouchers/${code}`).set(payload);
                voucherIssued = code;
            } catch (e) {
                console.error("Failed to create voucher on cancel:", e);
            }
        } else if (action === "refund") {
            try {
                const fare = existingVal && existingVal.fare ? Number(existingVal.fare) : 0;
                const refundPct = 1; // refund full fare
                const refundAmount = fare && Number.isFinite(fare) ? Math.round((fare * refundPct + Number.EPSILON) * 100) / 100 : 0;
                refundResult.amount = refundAmount;

                const paymentId = existingVal && existingVal.payment ? String(existingVal.payment) : "";
                const paymentMethod = existingVal && existingVal.paymentMethod ? String(existingVal.paymentMethod).toLowerCase() : "";

                if (paymentId && paymentMethod && /razor/.test(paymentMethod)) {
                    const keyId = process.env.RAZORPAY_KEY_ID;
                    const keySecret = process.env.RAZORPAY_KEY_SECRET;
                    if (keyId && keySecret && refundAmount > 0) {
                        refundResult.attempted = true;
                        const paise = Math.round(refundAmount * 100);
                        try {
                            const basic = Buffer.from(keyId + ":" + keySecret).toString("base64");
                            const resp = await fetch(
                                `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        Authorization: "Basic " + basic,
                                    },
                                    body: JSON.stringify({ amount: paise }),
                                }
                            );

                            const data = await resp.json();
                            if (!resp.ok) {
                                refundResult.success = false;
                                refundResult.error = data.error || data.description || "Refund failed";
                                refundResult.raw = data;
                            } else {
                                refundResult.success = true;
                                refundResult.raw = data;
                            }
                        } catch (e) {
                            refundResult.success = false;
                            refundResult.error = e?.message || String(e);
                            refundResult.raw = null;
                        }
                    }
                }
            } catch (e) {
                refundResult.error = e?.message || String(e);
            }
        }

        // Persist refund metadata into payments/{paymentId}/refund so admin UI can reflect refunds (only for refund action)
        try {
            if (action === "refund") {
                const paymentId = existingVal && existingVal.payment ? String(existingVal.payment) : "";
                if (paymentId) {
                    const refundRecord = {
                        attempted: !!refundResult.attempted,
                        success: !!refundResult.success,
                        amount: refundResult.amount || 0,
                        error: refundResult.error || null,
                        raw: refundResult.raw || null,
                        refundedAt: new Date().toISOString(),
                    };

                    const paymentMethod = existingVal && existingVal.paymentMethod ? String(existingVal.paymentMethod).toLowerCase() : "";
                    if (paymentMethod && paymentMethod.includes("offline") && !refundResult.attempted) {
                        refundRecord.note = "offline_cancellation_needs_manual_refund";
                    }

                    await db.ref(`payments/${paymentId}/refund`).set(refundRecord);
                }
            }
        } catch (e) {
            console.warn("Failed to persist refund metadata to payments:", e && e.message ? e.message : e);
        }

        let emailResult = { attempted: false, sent: false, error: null };

        if (existingVal && existingVal.email) {
            const emailTo = normalizeText(existingVal.email);
            const nameTo = normalizeText(existingVal.name || "Passenger");

            emailResult.attempted = true;
            try {
                // include refund/voucher info into booking passed to email generator
                const bookingForEmail = { seatNo, date, ...existingVal, refund: refundResult };
                if (voucherIssued) bookingForEmail.voucherCode = voucherIssued;
                await sendBookingCancellation(emailTo, nameTo, bookingForEmail);
                emailResult.sent = true;
            } catch (e) {
                emailResult.error = e?.message || String(e);
            }
        }

        // send notifications about cancellation
        try {
            const db3 = getAdminDb();
            await createRoleNotification(db3, "admin", {
                title: "Booking cancelled",
                message: `Seat ${seatNo} on ${date} (${existingVal.busNumber || "bus"}) has been cancelled.`,
                data: { busId, date, seatNo, booking: existingVal },
            });

            const uid = normalizeText(existingVal.userId || existingVal.user || existingVal.userId || "");
            if (uid) {
                await createUserNotification(db3, uid, {
                    title: "Booking cancelled",
                    message: `Your booking for seat ${seatNo} on ${date} has been cancelled.`,
                    data: { busId, date, seatNo, booking: existingVal },
                });
            }
        } catch (e) {
            console.error("Failed to create cancellation notifications:", e);
        }

        return NextResponse.json(
            {
                success: true,
                message: "Booking cancelled",
                email: emailResult,
                refund: refundResult,
                voucherCode: voucherIssued || null,
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