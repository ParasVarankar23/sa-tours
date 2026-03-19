import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin";

const COLLECTION_NAME = "buses";
const seatLayoutOptions = ["31", "27", "23"];
const MIN_STOP_GAP = 2; // blocks nearby stop pairs

/* =========================
   Helpers
========================= */

function normalizeText(value) {
    return String(value || "").trim();
}

function normalizeKey(value) {
    return normalizeText(value).toLowerCase();
}

function normalizeDateOnly(dateStr) {
    const value = normalizeText(dateStr);
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
}

function isValidDateString(dateStr) {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    return !Number.isNaN(d.getTime());
}

function rangesOverlap(startA, endA, startB, endB) {
    const aStart = startA ? new Date(startA).setHours(0, 0, 0, 0) : -Infinity;
    const aEnd = endA ? new Date(endA).setHours(0, 0, 0, 0) : Infinity;
    const bStart = startB ? new Date(startB).setHours(0, 0, 0, 0) : -Infinity;
    const bEnd = endB ? new Date(endB).setHours(0, 0, 0, 0) : Infinity;

    return aStart <= bEnd && bStart <= aEnd;
}

function sanitizeStops(stops) {
    if (!Array.isArray(stops)) return [];

    return stops
        .filter(
            (stop) =>
                stop &&
                (normalizeText(stop.stopName) || normalizeText(stop.time))
        )
        .slice(0, 20)
        .map((stop) => ({
            stopName: normalizeText(stop.stopName),
            time: normalizeText(stop.time),
        }))
        .filter((stop) => stop.stopName);
}

function sanitizeCabins(cabins) {
    if (!Array.isArray(cabins)) return [];

    return cabins
        .filter((cabin) => cabin && normalizeText(cabin.label))
        .slice(0, 8)
        .map((cabin, index) => ({
            cabinNo: index + 1,
            label: normalizeText(cabin.label),
        }));
}

function buildRoutePointsFromSanitized(startPoint, stops, endPoint) {
    return [
        normalizeText(startPoint),
        ...stops.map((s) => normalizeText(s.stopName)).filter(Boolean),
        normalizeText(endPoint),
    ].filter(Boolean);
}

function hasDuplicateRoutePoints(routePoints) {
    const seen = new Set();

    for (const point of routePoints) {
        const key = normalizeKey(point);
        if (seen.has(key)) return true;
        seen.add(key);
    }

    return false;
}

function validateRoutePointTimes(startTime, stops, endTime) {
    if (!normalizeText(startTime)) return "startTime is required";
    if (!normalizeText(endTime)) return "endTime is required";

    for (const stop of stops) {
        if (!normalizeText(stop.time)) {
            return `Time is required for stop ${stop.stopName}`;
        }
    }

    return null;
}

/* =========================
   Fare Rules Logic
========================= */

function buildExpandedFareEntries(rawFareRules, routePoints) {
    if (!Array.isArray(rawFareRules)) return [];

    const expandedEntries = [];

    for (let ruleIndex = 0; ruleIndex < rawFareRules.slice(0, 100).length; ruleIndex++) {
        const rule = rawFareRules[ruleIndex];

        const from = normalizeText(rule?.from);
        const to = normalizeText(rule?.to);
        const fare = Number(rule?.fare);
        const fareStartDate = normalizeDateOnly(rule?.fareStartDate);
        const fareEndDate = normalizeDateOnly(rule?.fareEndDate);

        // NEW FLAG
        const applyToAllNextPickupsBeforeDrop = Boolean(
            rule?.applyToAllNextPickupsBeforeDrop ?? rule?.applyToAllPreviousPickups
        );

        // allow fully empty row
        if (
            !from &&
            !to &&
            (rule?.fare === "" || rule?.fare === undefined || rule?.fare === null) &&
            !fareStartDate &&
            !fareEndDate
        ) {
            continue;
        }

        if (!from || !to) {
            throw new Error("Each fare rule must have pickup and drop");
        }

        if (!Number.isFinite(fare) || fare <= 0) {
            throw new Error(`Invalid fare for ${from} → ${to}`);
        }

        const fromIndex = routePoints.findIndex(
            (p) => normalizeKey(p) === normalizeKey(from)
        );
        const toIndex = routePoints.findIndex(
            (p) => normalizeKey(p) === normalizeKey(to)
        );

        if (fromIndex === -1 || toIndex === -1) {
            throw new Error(`Invalid fare rule route point: ${from} → ${to}`);
        }

        if (toIndex <= fromIndex) {
            throw new Error(`Drop must come after pickup for ${from} → ${to}`);
        }

        if (toIndex - fromIndex < MIN_STOP_GAP) {
            throw new Error(`Nearby stop fare not allowed for ${from} → ${to}`);
        }

        if (fareStartDate && !isValidDateString(fareStartDate)) {
            throw new Error(`Invalid fare start date for ${from} → ${to}`);
        }

        if (fareEndDate && !isValidDateString(fareEndDate)) {
            throw new Error(`Invalid fare end date for ${from} → ${to}`);
        }

        if (fareStartDate && fareEndDate) {
            const start = new Date(fareStartDate);
            const end = new Date(fareEndDate);

            if (end < start) {
                throw new Error(`Fare end date must be after start date for ${from} → ${to}`);
            }
        }

        const pushExpanded = (expandedFrom, expandedTo, expandedFromIndex, expandedToIndex) => {
            expandedEntries.push({
                from: expandedFrom,
                to: expandedTo,
                fare,
                fareStartDate: fareStartDate || "",
                fareEndDate: fareEndDate || "",
                sourceRuleIndex: ruleIndex,
                sourceFrom: from,
                sourceTo: to,
                sourceFromIndex: fromIndex,
                sourceToIndex: toIndex,
                expandedFromIndex,
                expandedToIndex,
                applyToAllNextPickupsBeforeDrop,
            });
        };

        if (applyToAllNextPickupsBeforeDrop) {
            // NEW LOGIC: selected pickup + all next pickups before drop
            for (let i = fromIndex; i < toIndex; i++) {
                if (toIndex - i < MIN_STOP_GAP) continue;
                pushExpanded(routePoints[i], routePoints[toIndex], i, toIndex);
            }
        } else {
            pushExpanded(routePoints[fromIndex], routePoints[toIndex], fromIndex, toIndex);
        }
    }

    return expandedEntries;
}

function validateFareRulesStrict(fareRules, routePoints) {
    try {
        const expandedEntries = buildExpandedFareEntries(fareRules, routePoints);

        // Overlap check on SAME FINAL PAIR (for same date ranges)
        for (let i = 0; i < expandedEntries.length; i++) {
            for (let j = i + 1; j < expandedEntries.length; j++) {
                const a = expandedEntries[i];
                const b = expandedEntries[j];

                const samePair =
                    normalizeKey(a.from) === normalizeKey(b.from) &&
                    normalizeKey(a.to) === normalizeKey(b.to);

                if (!samePair) continue;

                const overlap = rangesOverlap(
                    a.fareStartDate,
                    a.fareEndDate,
                    b.fareStartDate,
                    b.fareEndDate
                );

                if (overlap) {
                    const aIdx = Number.isFinite(a.sourceRuleIndex) ? a.sourceRuleIndex : null;
                    const bIdx = Number.isFinite(b.sourceRuleIndex) ? b.sourceRuleIndex : null;

                    // Debug logging to help trace overlaps
                    console.log("[fare-validator] Overlap detected between expanded entries:", {
                        pair: `${a.from} → ${a.to}`,
                        entryA: {
                            from: a.from,
                            to: a.to,
                            fare: a.fare,
                            fareStartDate: a.fareStartDate,
                            fareEndDate: a.fareEndDate,
                            sourceRuleIndex: aIdx,
                            sourceFrom: a.sourceFrom,
                            sourceTo: a.sourceTo,
                        },
                        entryB: {
                            from: b.from,
                            to: b.to,
                            fare: b.fare,
                            fareStartDate: b.fareStartDate,
                            fareEndDate: b.fareEndDate,
                            sourceRuleIndex: bIdx,
                            sourceFrom: b.sourceFrom,
                            sourceTo: b.sourceTo,
                        },
                    });

                    // If entries come from different source rules, let later override earlier
                    if (aIdx !== null && bIdx !== null && aIdx !== bIdx) {
                        console.log(
                            `[fare-validator] Overlap skipped: later rule (index ${Math.max(aIdx, bIdx)}) overrides earlier rule (index ${Math.min(aIdx, bIdx)}) for ${a.from} → ${a.to}`
                        );
                        continue;
                    }

                    console.log(`[fare-validator] Overlap error: same source rule or missing indices for ${a.from} → ${a.to}`);

                    // return structured conflict so caller can include it in API response
                    return {
                        message: `Overlapping fare dates found for ${a.from} → ${a.to}`,
                        conflict: {
                            pair: `${a.from} → ${a.to}`,
                            entryA: {
                                from: a.from,
                                to: a.to,
                                fare: a.fare,
                                fareStartDate: a.fareStartDate,
                                fareEndDate: a.fareEndDate,
                                sourceRuleIndex: aIdx,
                                sourceFrom: a.sourceFrom,
                                sourceTo: a.sourceTo,
                            },
                            entryB: {
                                from: b.from,
                                to: b.to,
                                fare: b.fare,
                                fareStartDate: b.fareStartDate,
                                fareEndDate: b.fareEndDate,
                                sourceRuleIndex: bIdx,
                                sourceFrom: b.sourceFrom,
                                sourceTo: b.sourceTo,
                            },
                        },
                    };
                }
            }
        }

        return null;
    } catch (err) {
        return err.message || "Invalid fare rules";
    }
}

function sanitizeFareRulesRaw(fareRules, routePoints) {
    if (!Array.isArray(fareRules)) return [];

    const cleaned = [];

    for (const rule of fareRules.slice(0, 100)) {
        const from = normalizeText(rule?.from);
        const to = normalizeText(rule?.to);
        const fare = Number(rule?.fare);
        const fareStartDate = normalizeDateOnly(rule?.fareStartDate);
        const fareEndDate = normalizeDateOnly(rule?.fareEndDate);

        const applyToAllNextPickupsBeforeDrop = Boolean(
            rule?.applyToAllNextPickupsBeforeDrop ?? rule?.applyToAllPreviousPickups
        );

        // skip fully empty row
        if (
            !from &&
            !to &&
            (rule?.fare === "" || rule?.fare === undefined || rule?.fare === null) &&
            !fareStartDate &&
            !fareEndDate
        ) {
            continue;
        }

        if (!from || !to || !Number.isFinite(fare) || fare <= 0) continue;

        const fromIndex = routePoints.findIndex(
            (p) => normalizeKey(p) === normalizeKey(from)
        );
        const toIndex = routePoints.findIndex(
            (p) => normalizeKey(p) === normalizeKey(to)
        );

        if (fromIndex === -1 || toIndex === -1) continue;
        if (toIndex <= fromIndex) continue;
        if (toIndex - fromIndex < MIN_STOP_GAP) continue;

        if (fareStartDate && !isValidDateString(fareStartDate)) continue;
        if (fareEndDate && !isValidDateString(fareEndDate)) continue;

        if (fareStartDate && fareEndDate) {
            const start = new Date(fareStartDate);
            const end = new Date(fareEndDate);
            if (end < start) continue;
        }

        cleaned.push({
            from: routePoints[fromIndex],
            to: routePoints[toIndex],
            fare,
            fareStartDate: fareStartDate || "",
            fareEndDate: fareEndDate || "",
            applyToAllNextPickupsBeforeDrop,
        });
    }

    return cleaned;
}

function buildEffectiveFareRules(fareRules, routePoints) {
    const expandedEntries = buildExpandedFareEntries(fareRules, routePoints);

    // latest rule wins for same final pair + same date bucket
    const effectiveMap = new Map();

    for (const entry of expandedEntries) {
        const key = `${normalizeKey(entry.from)}|${normalizeKey(entry.to)}|${entry.fareStartDate}|${entry.fareEndDate}`;

        // later rules override earlier rules automatically because Map.set replaces
        effectiveMap.set(key, {
            from: entry.from,
            to: entry.to,
            fare: entry.fare,
            fareStartDate: entry.fareStartDate || "",
            fareEndDate: entry.fareEndDate || "",
            sourceRuleIndex: entry.sourceRuleIndex,
            sourceFrom: entry.sourceFrom,
            sourceTo: entry.sourceTo,
        });
    }

    return Array.from(effectiveMap.values());
}

/* =========================
   Main Validation
========================= */

function validateBusPayload(body, isUpdate = false) {
    const requiredFields = [
        "busNumber",
        "busName",
        "busType",
        "routeName",
        "startPoint",
        "endPoint",
        "startTime",
        "endTime",
        "seatLayout",
    ];

    for (const field of requiredFields) {
        if (!normalizeText(body[field])) {
            return `${field} is required`;
        }
    }

    if (!["AC", "Non-AC"].includes(normalizeText(body.busType))) {
        return "Invalid bus type";
    }

    if (!seatLayoutOptions.includes(normalizeText(body.seatLayout))) {
        return "Invalid seat layout";
    }

    if (isUpdate && !normalizeText(body.busId)) {
        return "busId is required for update";
    }

    if (normalizeKey(body.startPoint) === normalizeKey(body.endPoint)) {
        return "Start point and end point cannot be same";
    }

    return null;
}

function generateBusId() {
    return `BUS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/* =========================
   GET - Fetch all buses
========================= */
export async function GET() {
    try {
        const db = getAdminDb();
        const snapshot = await db.ref(COLLECTION_NAME).once("value");

        if (!snapshot.exists()) {
            return NextResponse.json({ success: true, buses: [] }, { status: 200 });
        }

        const data = snapshot.val();

        const buses = Object.keys(data || {}).map((key) => ({
            id: key,
            ...data[key],
        }));

        buses.sort(
            (a, b) =>
                new Date(b.createdAt || 0).getTime() -
                new Date(a.createdAt || 0).getTime()
        );

        return NextResponse.json(
            {
                success: true,
                buses,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("GET /api/bus error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch buses",
            },
            { status: 500 }
        );
    }
}

/* =========================
   POST - Create bus
========================= */
export async function POST(req) {
    try {
        const body = await req.json();

        const validationError = validateBusPayload(body);
        if (validationError) {
            return NextResponse.json(
                {
                    success: false,
                    error: validationError,
                },
                { status: 400 }
            );
        }

        const busNumber = normalizeText(body.busNumber);
        const busName = normalizeText(body.busName);
        const busType = normalizeText(body.busType);
        const routeName = normalizeText(body.routeName);
        const startPoint = normalizeText(body.startPoint);
        const endPoint = normalizeText(body.endPoint);
        const startTime = normalizeText(body.startTime);
        const endTime = normalizeText(body.endTime);
        const seatLayout = normalizeText(body.seatLayout);

        const sanitizedStops = sanitizeStops(body.stops);
        const sanitizedCabins = sanitizeCabins(body.cabins);
        const routePoints = buildRoutePointsFromSanitized(
            startPoint,
            sanitizedStops,
            endPoint
        );

        if (hasDuplicateRoutePoints(routePoints)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Duplicate route point names are not allowed",
                },
                { status: 400 }
            );
        }

        const timeValidationError = validateRoutePointTimes(
            startTime,
            sanitizedStops,
            endTime
        );
        if (timeValidationError) {
            return NextResponse.json(
                {
                    success: false,
                    error: timeValidationError,
                },
                { status: 400 }
            );
        }

        const strictFareError = validateFareRulesStrict(body.fareRules, routePoints);
        if (strictFareError) {
            if (typeof strictFareError === "string") {
                return NextResponse.json(
                    {
                        success: false,
                        error: strictFareError,
                    },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                {
                    success: false,
                    error: strictFareError.message || "Overlapping fare rules",
                    conflict: strictFareError.conflict || null,
                },
                { status: 400 }
            );
        }

        const db = getAdminDb();
        const existingSnapshot = await db.ref(COLLECTION_NAME).once("value");
        const existing = existingSnapshot.exists()
            ? Object.values(existingSnapshot.val() || {})
            : [];

        // Duplicate check: same bus number + same start time + same start point
        if (
            existing.some(
                (b) =>
                    normalizeKey(b.busNumber) === normalizeKey(busNumber) &&
                    normalizeText(b.startTime) === startTime &&
                    normalizeKey(b.startPoint) === normalizeKey(startPoint)
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "A bus with same number, start point and time already exists",
                },
                { status: 409 }
            );
        }

        const busId = generateBusId();
        const now = new Date().toISOString();

        const fareRulesRaw = sanitizeFareRulesRaw(body.fareRules, routePoints);
        const fareRules = buildEffectiveFareRules(body.fareRules, routePoints);

        const newBus = {
            busId,
            busNumber,
            busName,
            busType,
            routeName,
            startPoint,
            endPoint,
            startTime,
            endTime,
            seatLayout,
            stops: sanitizedStops,
            cabins: sanitizedCabins,

            // IMPORTANT:
            fareRulesRaw, // admin original rules
            fareRules,    // final effective expanded rules for booking

            createdAt: now,
            updatedAt: now,
        };

        await db.ref(`${COLLECTION_NAME}/${busId}`).set(newBus);

        return NextResponse.json(
            {
                success: true,
                message: "Bus created successfully",
                bus: newBus,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST /api/bus error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to create bus",
            },
            { status: 500 }
        );
    }
}

/* =========================
   PUT - Update bus
========================= */
export async function PUT(req) {
    try {
        const body = await req.json();

        const validationError = validateBusPayload(body, true);
        if (validationError) {
            return NextResponse.json(
                {
                    success: false,
                    error: validationError,
                },
                { status: 400 }
            );
        }

        const busId = normalizeText(body.busId);
        const busNumber = normalizeText(body.busNumber);
        const busName = normalizeText(body.busName);
        const busType = normalizeText(body.busType);
        const routeName = normalizeText(body.routeName);
        const startPoint = normalizeText(body.startPoint);
        const endPoint = normalizeText(body.endPoint);
        const startTime = normalizeText(body.startTime);
        const endTime = normalizeText(body.endTime);
        const seatLayout = normalizeText(body.seatLayout);

        const sanitizedStops = sanitizeStops(body.stops);
        const sanitizedCabins = sanitizeCabins(body.cabins);
        const routePoints = buildRoutePointsFromSanitized(
            startPoint,
            sanitizedStops,
            endPoint
        );

        if (hasDuplicateRoutePoints(routePoints)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Duplicate route point names are not allowed",
                },
                { status: 400 }
            );
        }

        const timeValidationError = validateRoutePointTimes(
            startTime,
            sanitizedStops,
            endTime
        );
        if (timeValidationError) {
            return NextResponse.json(
                {
                    success: false,
                    error: timeValidationError,
                },
                { status: 400 }
            );
        }

        const strictFareError = validateFareRulesStrict(body.fareRules, routePoints);
        if (strictFareError) {
            if (typeof strictFareError === "string") {
                return NextResponse.json(
                    {
                        success: false,
                        error: strictFareError,
                    },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                {
                    success: false,
                    error: strictFareError.message || "Overlapping fare rules",
                    conflict: strictFareError.conflict || null,
                },
                { status: 400 }
            );
        }

        const db = getAdminDb();
        const busSnapshot = await db.ref(`${COLLECTION_NAME}/${busId}`).once("value");

        if (!busSnapshot.exists()) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Bus not found",
                },
                { status: 404 }
            );
        }

        const allSnapshot = await db.ref(COLLECTION_NAME).once("value");
        const allBuses = allSnapshot.exists()
            ? Object.entries(allSnapshot.val() || {})
            : [];

        const duplicateExists = allBuses.some(([key, val]) => {
            return (
                key !== busId &&
                normalizeKey(val.busNumber) === normalizeKey(busNumber) &&
                normalizeText(val.startTime) === startTime &&
                normalizeKey(val.startPoint) === normalizeKey(startPoint)
            );
        });

        if (duplicateExists) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Another bus already exists with this bus number, start point and time",
                },
                { status: 409 }
            );
        }

        const existingData = busSnapshot.val() || {};

        const fareRulesRaw = sanitizeFareRulesRaw(body.fareRules, routePoints);
        const fareRules = buildEffectiveFareRules(body.fareRules, routePoints);

        const updatedBusData = {
            busId,
            busNumber,
            busName,
            busType,
            routeName,
            startPoint,
            endPoint,
            startTime,
            endTime,
            seatLayout,
            stops: sanitizedStops,
            cabins: sanitizedCabins,

            // IMPORTANT:
            fareRulesRaw, // admin original rules
            fareRules,    // final effective expanded rules for booking

            createdAt: existingData.createdAt || null,
            updatedAt: new Date().toISOString(),
        };

        await db.ref(`${COLLECTION_NAME}/${busId}`).set(updatedBusData);

        return NextResponse.json(
            {
                success: true,
                message: "Bus updated successfully",
                bus: updatedBusData,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("PUT /api/bus error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to update bus",
            },
            { status: 500 }
        );
    }
}

/* =========================
   DELETE - Delete bus
========================= */
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const busId = searchParams.get("busId");

        if (!busId || !normalizeText(busId)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "busId is required",
                },
                { status: 400 }
            );
        }

        const db = getAdminDb();
        const busRef = db.ref(`${COLLECTION_NAME}/${normalizeText(busId)}`);
        const busDoc = await busRef.once("value");

        if (!busDoc.exists()) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Bus not found",
                },
                { status: 404 }
            );
        }

        await busRef.remove();

        return NextResponse.json(
            {
                success: true,
                message: "Bus deleted successfully",
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("DELETE /api/bus error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to delete bus",
            },
            { status: 500 }
        );
    }
}