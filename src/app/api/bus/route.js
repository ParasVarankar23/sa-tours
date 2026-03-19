import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin";

const COLLECTION_NAME = "buses";
const seatLayoutOptions = ["31", "27", "23"];

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

function sanitizeSinglePoint(point) {
    if (!point || (!normalizeText(point.name) && !normalizeText(point.time))) {
        return { name: "", time: "" };
    }

    return {
        name: normalizeText(point.name),
        time: normalizeText(point.time),
    };
}

function sanitizePoints(points, max = 20) {
    if (!Array.isArray(points)) return [];

    return points
        .filter((point) => point && (normalizeText(point.name) || normalizeText(point.time)))
        .slice(0, max)
        .map((point) => ({
            name: normalizeText(point.name),
            time: normalizeText(point.time),
        }))
        .filter((point) => point.name);
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

/* =========================
   New Cleanup Helpers
========================= */

function removeStartPointFromPickupPoints(pickupPoints, startPoint) {
    if (!Array.isArray(pickupPoints)) return [];

    const startKey = normalizeKey(startPoint?.name);
    if (!startKey) return pickupPoints;

    return pickupPoints.filter((point) => normalizeKey(point?.name) !== startKey);
}

function removeEndPointFromDropPoints(dropPoints, endPoint) {
    if (!Array.isArray(dropPoints)) return [];

    const endKey = normalizeKey(endPoint?.name);
    if (!endKey) return dropPoints;

    return dropPoints.filter((point) => normalizeKey(point?.name) !== endKey);
}

function hasDuplicateNames(points) {
    const seen = new Set();

    for (const point of points) {
        const key = normalizeKey(point.name);
        if (!key) continue;

        if (seen.has(key)) return true;
        seen.add(key);
    }

    return false;
}

function validatePointTimes(points, label) {
    for (const point of points) {
        if (!normalizeText(point.time)) {
            return `Time is required for ${label}: ${point.name}`;
        }
    }
    return null;
}

function validateSinglePoint(point, label) {
    if (!normalizeText(point?.name)) {
        return `${label} name is required`;
    }

    if (!normalizeText(point?.time)) {
        return `${label} time is required`;
    }

    return null;
}

function generateBusId() {
    return `BUS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/* =========================
   Fare Rules Logic

   Rules:
   - from => only pickupPoints
   - to   => only dropPoints

   NOTE:
   startPoint and endPoint are separate.
   pickupPoints should NOT include startPoint.
   dropPoints should NOT include endPoint.
========================= */

function buildExpandedFareEntries(rawFareRules, pickupPoints, dropPoints) {
    if (!Array.isArray(rawFareRules)) return [];

    const expandedEntries = [];

    for (let ruleIndex = 0; ruleIndex < rawFareRules.slice(0, 100).length; ruleIndex++) {
        const rule = rawFareRules[ruleIndex];

        const from = normalizeText(rule?.from);
        const to = normalizeText(rule?.to);
        const fare = Number(rule?.fare);
        const fareStartDate = normalizeDateOnly(rule?.fareStartDate);
        const fareEndDate = normalizeDateOnly(rule?.fareEndDate);

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

        const fromIndex = pickupPoints.findIndex(
            (p) => normalizeKey(p.name) === normalizeKey(from)
        );

        const toIndex = dropPoints.findIndex(
            (p) => normalizeKey(p.name) === normalizeKey(to)
        );

        if (fromIndex === -1) {
            throw new Error(`Invalid pickup point in fare rule: ${from}`);
        }

        if (toIndex === -1) {
            throw new Error(`Invalid drop point in fare rule: ${to}`);
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
            for (let i = fromIndex; i < pickupPoints.length; i++) {
                pushExpanded(pickupPoints[i].name, dropPoints[toIndex].name, i, toIndex);
            }
        } else {
            pushExpanded(
                pickupPoints[fromIndex].name,
                dropPoints[toIndex].name,
                fromIndex,
                toIndex
            );
        }
    }

    return expandedEntries;
}

function validateFareRulesStrict(fareRules, pickupPoints, dropPoints) {
    try {
        const expandedEntries = buildExpandedFareEntries(fareRules, pickupPoints, dropPoints);

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

                    // later rule overrides earlier rule
                    if (aIdx !== null && bIdx !== null && aIdx !== bIdx) {
                        continue;
                    }

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

function sanitizeFareRulesRaw(fareRules, pickupPoints, dropPoints) {
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

        const fromIndex = pickupPoints.findIndex(
            (p) => normalizeKey(p.name) === normalizeKey(from)
        );

        const toIndex = dropPoints.findIndex(
            (p) => normalizeKey(p.name) === normalizeKey(to)
        );

        if (fromIndex === -1 || toIndex === -1) continue;

        if (fareStartDate && !isValidDateString(fareStartDate)) continue;
        if (fareEndDate && !isValidDateString(fareEndDate)) continue;

        if (fareStartDate && fareEndDate) {
            const start = new Date(fareStartDate);
            const end = new Date(fareEndDate);
            if (end < start) continue;
        }

        cleaned.push({
            from: pickupPoints[fromIndex].name,
            to: dropPoints[toIndex].name,
            fare,
            fareStartDate: fareStartDate || "",
            fareEndDate: fareEndDate || "",
            applyToAllNextPickupsBeforeDrop,
        });
    }

    return cleaned;
}

function buildEffectiveFareRules(fareRules, pickupPoints, dropPoints) {
    const expandedEntries = buildExpandedFareEntries(fareRules, pickupPoints, dropPoints);

    const effectiveMap = new Map();

    for (const entry of expandedEntries) {
        const key = `${normalizeKey(entry.from)}|${normalizeKey(entry.to)}|${entry.fareStartDate}|${entry.fareEndDate}`;

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
   Common Payload Sanitizer
========================= */

function getSanitizedBusData(body) {
    const busNumber = normalizeText(body.busNumber);
    const busName = normalizeText(body.busName);
    const busType = normalizeText(body.busType);
    const routeName = normalizeText(body.routeName);
    const startTime = normalizeText(body.startTime);
    const endTime = normalizeText(body.endTime);
    const seatLayout = normalizeText(body.seatLayout);

    const startPoint = sanitizeSinglePoint(body.startPoint);
    const endPoint = sanitizeSinglePoint(body.endPoint);

    let pickupPoints = sanitizePoints(body.pickupPoints, 20);
    let dropPoints = sanitizePoints(body.dropPoints, 20);

    // IMPORTANT:
    // Remove start point if frontend sends it inside pickupPoints
    // Remove end point if frontend sends it inside dropPoints
    pickupPoints = removeStartPointFromPickupPoints(pickupPoints, startPoint);
    dropPoints = removeEndPointFromDropPoints(dropPoints, endPoint);

    const cabins = sanitizeCabins(body.cabins);

    return {
        busNumber,
        busName,
        busType,
        routeName,
        startTime,
        endTime,
        seatLayout,
        startPoint,
        endPoint,
        pickupPoints,
        dropPoints,
        cabins,
    };
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

    const {
        startPoint,
        endPoint,
        pickupPoints,
        dropPoints,
    } = getSanitizedBusData(body);

    const startPointError = validateSinglePoint(startPoint, "Start point");
    if (startPointError) return startPointError;

    const endPointError = validateSinglePoint(endPoint, "End point");
    if (endPointError) return endPointError;

    if (pickupPoints.length === 0) {
        return "At least one pickup point is required";
    }

    if (dropPoints.length === 0) {
        return "At least one drop point is required";
    }

    if (hasDuplicateNames(pickupPoints)) {
        return "Duplicate pickup point names are not allowed";
    }

    if (hasDuplicateNames(dropPoints)) {
        return "Duplicate drop point names are not allowed";
    }

    // Extra safety:
    // startPoint must not match any pickupPoint after cleanup
    if (
        pickupPoints.some((p) => normalizeKey(p.name) === normalizeKey(startPoint.name))
    ) {
        return "Start point cannot be repeated inside pickup points";
    }

    // Extra safety:
    // endPoint must not match any dropPoint after cleanup
    if (
        dropPoints.some((p) => normalizeKey(p.name) === normalizeKey(endPoint.name))
    ) {
        return "End point cannot be repeated inside drop points";
    }

    return null;
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
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
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

        const {
            busNumber,
            busName,
            busType,
            routeName,
            startTime,
            endTime,
            seatLayout,
            startPoint,
            endPoint,
            pickupPoints,
            dropPoints,
            cabins,
        } = getSanitizedBusData(body);

        const startPointTimeError = validateSinglePoint(startPoint, "Start point");
        if (startPointTimeError) {
            return NextResponse.json(
                {
                    success: false,
                    error: startPointTimeError,
                },
                { status: 400 }
            );
        }

        const endPointTimeError = validateSinglePoint(endPoint, "End point");
        if (endPointTimeError) {
            return NextResponse.json(
                {
                    success: false,
                    error: endPointTimeError,
                },
                { status: 400 }
            );
        }

        const pickupTimeError = validatePointTimes(pickupPoints, "pickup point");
        if (pickupTimeError) {
            return NextResponse.json(
                {
                    success: false,
                    error: pickupTimeError,
                },
                { status: 400 }
            );
        }

        const dropTimeError = validatePointTimes(dropPoints, "drop point");
        if (dropTimeError) {
            return NextResponse.json(
                {
                    success: false,
                    error: dropTimeError,
                },
                { status: 400 }
            );
        }

        // For fare validation, include startPoint as the first pickup option and endPoint as the last drop option
        const pickupPointsForFare = (startPoint && startPoint.name) ? [{ name: startPoint.name, time: startPoint.time }, ...pickupPoints] : pickupPoints;
        const dropPointsForFare = (endPoint && endPoint.name) ? [...dropPoints, { name: endPoint.name, time: endPoint.time }] : dropPoints;

        const strictFareError = validateFareRulesStrict(
            body.fareRules,
            pickupPointsForFare,
            dropPointsForFare
        );

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

        if (
            existing.some(
                (b) =>
                    normalizeKey(b.busNumber) === normalizeKey(busNumber) &&
                    normalizeText(b.startTime) === startTime &&
                    normalizeKey(b.routeName) === normalizeKey(routeName)
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "A bus with same number, route and start time already exists",
                },
                { status: 409 }
            );
        }

        const busId = generateBusId();
        const now = new Date().toISOString();

        const fareRulesRaw = sanitizeFareRulesRaw(body.fareRules, pickupPointsForFare, dropPointsForFare);

        const fareRules = buildEffectiveFareRules(body.fareRules, pickupPointsForFare, dropPointsForFare);

        const newBus = {
            busId,
            busNumber,
            busName,
            busType,
            routeName,
            startTime,
            endTime,
            seatLayout,

            startPoint,
            pickupPoints,
            dropPoints,
            endPoint,

            cabins,

            // admin original rules
            fareRulesRaw,

            // effective expanded rules used for booking
            fareRules,

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

        const {
            busNumber,
            busName,
            busType,
            routeName,
            startTime,
            endTime,
            seatLayout,
            startPoint,
            endPoint,
            pickupPoints,
            dropPoints,
            cabins,
        } = getSanitizedBusData(body);

        const startPointTimeError = validateSinglePoint(startPoint, "Start point");
        if (startPointTimeError) {
            return NextResponse.json(
                {
                    success: false,
                    error: startPointTimeError,
                },
                { status: 400 }
            );
        }

        const endPointTimeError = validateSinglePoint(endPoint, "End point");
        if (endPointTimeError) {
            return NextResponse.json(
                {
                    success: false,
                    error: endPointTimeError,
                },
                { status: 400 }
            );
        }

        const pickupTimeError = validatePointTimes(pickupPoints, "pickup point");
        if (pickupTimeError) {
            return NextResponse.json(
                {
                    success: false,
                    error: pickupTimeError,
                },
                { status: 400 }
            );
        }

        const dropTimeError = validatePointTimes(dropPoints, "drop point");
        if (dropTimeError) {
            return NextResponse.json(
                {
                    success: false,
                    error: dropTimeError,
                },
                { status: 400 }
            );
        }

        // For fare validation on update, include start/end points in the options
        const pickupPointsForFareU = (startPoint && startPoint.name) ? [{ name: startPoint.name, time: startPoint.time }, ...pickupPoints] : pickupPoints;
        const dropPointsForFareU = (endPoint && endPoint.name) ? [...dropPoints, { name: endPoint.name, time: endPoint.time }] : dropPoints;

        const strictFareError = validateFareRulesStrict(
            body.fareRules,
            pickupPointsForFareU,
            dropPointsForFareU
        );

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
                normalizeKey(val.routeName) === normalizeKey(routeName)
            );
        });

        if (duplicateExists) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Another bus already exists with this bus number, route and start time",
                },
                { status: 409 }
            );
        }

        const existingData = busSnapshot.val() || {};

        const fareRulesRaw = sanitizeFareRulesRaw(body.fareRules, pickupPointsForFareU, dropPointsForFareU);

        const fareRules = buildEffectiveFareRules(body.fareRules, pickupPointsForFareU, dropPointsForFareU);

        const updatedBusData = {
            busId,
            busNumber,
            busName,
            busType,
            routeName,
            startTime,
            endTime,
            seatLayout,

            startPoint,
            pickupPoints,
            dropPoints,
            endPoint,

            cabins,

            // admin original rules
            fareRulesRaw,

            // effective expanded rules used for booking
            fareRules,

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