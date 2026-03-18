import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin";

const COLLECTION_NAME = "buses";
const seatLayoutOptions = ["31", "27", "23"];
const MIN_STOP_GAP = 5; // block nearby pairs like Borli -> Mhasala

/* =========================
   Helpers
========================= */

function normalizeText(value) {
    return String(value || "").trim();
}

function normalizeKey(value) {
    return normalizeText(value).toLowerCase();
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

function sanitizeFareRules(fareRules, routePoints) {
    if (!Array.isArray(fareRules)) return [];

    const uniqueMap = new Map();

    for (const rule of fareRules.slice(0, 100)) {
        const from = normalizeText(rule?.from);
        const to = normalizeText(rule?.to);
        const fare = Number(rule?.fare);

        if (!from || !to || Number.isNaN(fare) || fare <= 0) continue;

        const fromIndex = routePoints.findIndex((p) => normalizeKey(p) === normalizeKey(from));
        const toIndex = routePoints.findIndex((p) => normalizeKey(p) === normalizeKey(to));

        // must exist in route
        if (fromIndex === -1 || toIndex === -1) continue;

        // drop must come after pickup
        if (toIndex <= fromIndex) continue;

        // block nearby stops
        if (toIndex - fromIndex < MIN_STOP_GAP) continue;

        const key = `${normalizeKey(from)}|${normalizeKey(to)}`;

        uniqueMap.set(key, {
            from: routePoints[fromIndex],
            to: routePoints[toIndex],
            fare,
        });
    }

    return Array.from(uniqueMap.values());
}

function validateFareRulesStrict(fareRules, routePoints) {
    if (!Array.isArray(fareRules)) return null;

    const seenPairs = new Set();

    for (const rule of fareRules.slice(0, 100)) {
        const from = normalizeText(rule?.from);
        const to = normalizeText(rule?.to);
        const fare = Number(rule?.fare);

        // allow empty row to be ignored
        if (!from && !to && (rule?.fare === "" || rule?.fare === undefined || rule?.fare === null)) {
            continue;
        }

        if (!from || !to) {
            return "Each fare rule must have pickup and drop";
        }

        if (!Number.isFinite(fare) || fare <= 0) {
            return `Invalid fare for ${from} → ${to}`;
        }

        const fromIndex = routePoints.findIndex((p) => normalizeKey(p) === normalizeKey(from));
        const toIndex = routePoints.findIndex((p) => normalizeKey(p) === normalizeKey(to));

        if (fromIndex === -1 || toIndex === -1) {
            return `Invalid fare rule route point: ${from} → ${to}`;
        }

        if (toIndex <= fromIndex) {
            return `Drop must come after pickup for ${from} → ${to}`;
        }

        if (toIndex - fromIndex < MIN_STOP_GAP) {
            return `Nearby stop fare not allowed for ${from} → ${to}`;
        }

        const pairKey = `${normalizeKey(routePoints[fromIndex])}|${normalizeKey(routePoints[toIndex])}`;
        if (seenPairs.has(pairKey)) {
            return `Duplicate fare rule found for ${routePoints[fromIndex]} → ${routePoints[toIndex]}`;
        }

        seenPairs.add(pairKey);
    }

    return null;
}

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
        const routePoints = buildRoutePointsFromSanitized(startPoint, sanitizedStops, endPoint);

        if (hasDuplicateRoutePoints(routePoints)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Duplicate route point names are not allowed",
                },
                { status: 400 }
            );
        }

        const timeValidationError = validateRoutePointTimes(startTime, sanitizedStops, endTime);
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
            return NextResponse.json(
                {
                    success: false,
                    error: strictFareError,
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
            fareRules: sanitizeFareRules(body.fareRules, routePoints),
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
                error: "Failed to create bus",
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
        const routePoints = buildRoutePointsFromSanitized(startPoint, sanitizedStops, endPoint);

        if (hasDuplicateRoutePoints(routePoints)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Duplicate route point names are not allowed",
                },
                { status: 400 }
            );
        }

        const timeValidationError = validateRoutePointTimes(startTime, sanitizedStops, endTime);
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
            return NextResponse.json(
                {
                    success: false,
                    error: strictFareError,
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
        const allBuses = allSnapshot.exists() ? Object.entries(allSnapshot.val() || {}) : [];

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
                    error: "Another bus already exists with this bus number, start point and time",
                },
                { status: 409 }
            );
        }

        const existingData = busSnapshot.val() || {};

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
            fareRules: sanitizeFareRules(body.fareRules, routePoints),
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
                error: "Failed to update bus",
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