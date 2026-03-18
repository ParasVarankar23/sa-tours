import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin";

const COLLECTION_NAME = "buses";
const seatLayoutOptions = ["31", "27", "23"];

function sanitizeStops(stops) {
    if (!Array.isArray(stops)) return [];

    return stops
        .filter((stop) => stop && (String(stop.stopName || "").trim() || String(stop.time || "").trim()))
        .slice(0, 20)
        .map((stop) => ({
            stopName: String(stop.stopName || "").trim(),
            time: String(stop.time || "").trim(),
        }));
}

function sanitizeCabins(cabins) {
    if (!Array.isArray(cabins)) return [];

    return cabins
        .filter((cabin) => cabin && String(cabin.label || "").trim())
        .slice(0, 8)
        .map((cabin, index) => ({
            cabinNo: index + 1,
            label: String(cabin.label || "").trim(),
        }));
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
        if (!String(body[field] || "").trim()) {
            return `${field} is required`;
        }
    }

    if (!["AC", "Non-AC"].includes(String(body.busType).trim())) {
        return "Invalid bus type";
    }

    if (!seatLayoutOptions.includes(String(body.seatLayout).trim())) {
        return "Invalid seat layout";
    }

    if (isUpdate && !String(body.busId || "").trim()) {
        return "busId is required for update";
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

        const buses = Object.keys(data || {}).map((key) => ({ id: key, ...data[key] }));
        buses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

        const busNumber = String(body.busNumber).trim();
        const startTime = String(body.startTime || "").trim();
        const startPoint = String(body.startPoint || "").trim();

        // Duplicate check: same bus number + same start time + same start point
        const db = getAdminDb();
        const existingSnapshot = await db.ref(COLLECTION_NAME).once("value");

        const existing = existingSnapshot.exists() ? Object.values(existingSnapshot.val() || {}) : [];

        if (
            existing.some(
                (b) =>
                    String(b.busNumber || "").trim() === busNumber &&
                    String(b.startTime || "").trim() === startTime &&
                    String(b.startPoint || "").trim() === startPoint
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
            busName: String(body.busName).trim(),
            busType: String(body.busType).trim(),
            routeName: String(body.routeName).trim(),
            startPoint: String(body.startPoint).trim(),
            endPoint: String(body.endPoint).trim(),
            startTime: String(body.startTime).trim(),
            endTime: String(body.endTime).trim(),
            seatLayout: String(body.seatLayout).trim(),
            stops: sanitizeStops(body.stops),
            cabins: sanitizeCabins(body.cabins),
            pricingRules: (function () {
                try {
                    const pr = body.pricingRules || null;
                    if (!pr) return null;
                    const exact = pr.exactFareMap && typeof pr.exactFareMap === 'object' ? pr.exactFareMap : {};
                    const seasonInc = pr.seasonIncrement !== undefined && pr.seasonIncrement !== null ? Number(pr.seasonIncrement) : undefined;
                    const out = {};
                    if (Object.keys(exact).length) out.exactFareMap = exact;
                    if (!Number.isNaN(seasonInc) && seasonInc !== undefined) out.seasonIncrement = seasonInc;
                    return Object.keys(out).length ? out : null;
                } catch (e) { return null; }
            })(),
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

        const busId = String(body.busId).trim();
        const busNumber = String(body.busNumber).trim();
        const startTime = String(body.startTime || "").trim();
        const startPoint = String(body.startPoint || "").trim();

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
        // Duplicate check for another bus (scan existing entries)
        const allSnapshot = await db.ref(COLLECTION_NAME).once("value");
        const allBuses = allSnapshot.exists() ? Object.entries(allSnapshot.val() || {}) : [];

        const duplicateExists = allBuses.some(([key, val]) => {
            return (
                key !== busId &&
                String(val.busNumber || "").trim() === busNumber &&
                String(val.startTime || "").trim() === startTime &&
                String(val.startPoint || "").trim() === startPoint
            );
        });

        if (duplicateExists) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Another bus already exists with this bus number and travel date",
                },
                { status: 409 }
            );
        }

        const updatedBusData = {
            busNumber,
            busName: String(body.busName).trim(),
            busType: String(body.busType).trim(),
            routeName: String(body.routeName).trim(),
            startPoint: String(body.startPoint).trim(),
            endPoint: String(body.endPoint).trim(),
            startTime: String(body.startTime).trim(),
            endTime: String(body.endTime).trim(),
            seatLayout: String(body.seatLayout).trim(),
            stops: sanitizeStops(body.stops),
            cabins: sanitizeCabins(body.cabins),
            pricingRules: (function () {
                try {
                    const pr = body.pricingRules || null;
                    if (!pr) return null;
                    const exact = pr.exactFareMap && typeof pr.exactFareMap === 'object' ? pr.exactFareMap : {};
                    const seasonInc = pr.seasonIncrement !== undefined && pr.seasonIncrement !== null ? Number(pr.seasonIncrement) : undefined;
                    const out = {};
                    if (Object.keys(exact).length) out.exactFareMap = exact;
                    if (!Number.isNaN(seasonInc) && seasonInc !== undefined) out.seasonIncrement = seasonInc;
                    return Object.keys(out).length ? out : null;
                } catch (e) { return null; }
            })(),
            updatedAt: new Date().toISOString(),
        };

        await db.ref(`${COLLECTION_NAME}/${busId}`).update(updatedBusData);

        const existingData = busSnapshot.val() || {};
        const updatedBus = {
            busId,
            ...updatedBusData,
            createdAt: existingData.createdAt || null,
        };

        return NextResponse.json(
            {
                success: true,
                message: "Bus updated successfully",
                bus: updatedBus,
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

        if (!busId || !String(busId).trim()) {
            return NextResponse.json(
                {
                    success: false,
                    error: "busId is required",
                },
                { status: 400 }
            );
        }

        const db = getAdminDb();
        const busRef = db.ref(`${COLLECTION_NAME}/${String(busId).trim()}`);
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