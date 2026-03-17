import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin";

function generateBusId() {
    return `BUS_${Date.now()}`;
}

function normalizeStops(stops = []) {
    if (!Array.isArray(stops)) return [];

    return stops
        .map((stop) => ({
            stopName: String(stop.stopName || "").trim(),
            time: String(stop.time || "").trim(),
        }))
        .filter((stop) => stop.stopName && stop.time);
}

function normalizeSeatLayout(layout = "") {
    const allowed = ["32", "27", "23"];
    const value = String(layout || "").trim();
    return allowed.includes(value) ? value : "32";
}

function normalizeCabins(cabins = []) {
    if (!Array.isArray(cabins)) return [];

    return cabins.slice(0, 6).map((cabin, index) => ({
        cabinNo: index + 1,
        label: String(cabin?.label || `CB${index + 1}`).trim(),
    }));
}

export async function GET() {
    try {
        const db = getAdminDb();
        const snapshot = await db.ref("buses").once("value");

        if (!snapshot.exists()) {
            return NextResponse.json({ success: true, buses: [] });
        }

        const data = snapshot.val();
        const buses = Object.values(data).sort(
            (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
        );

        return NextResponse.json({
            success: true,
            buses,
        });
    } catch (error) {
        console.error("GET /api/bus error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to fetch buses",
            },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const body = await req.json();

        const busNumber = String(body.busNumber || "").trim().toUpperCase();
        const busName = String(body.busName || "").trim();
        const busType = String(body.busType || "").trim();
        const travelDate = String(body.travelDate || "").trim();
        const routeName = String(body.routeName || "").trim();
        const startPoint = String(body.startPoint || "").trim();
        const endPoint = String(body.endPoint || "").trim();
        const startTime = String(body.startTime || "").trim();
        const endTime = String(body.endTime || "").trim();
        const seatLayout = normalizeSeatLayout(body.seatLayout);
        const stops = normalizeStops(body.stops || []);
        const cabins = normalizeCabins(body.cabins || []);

        if (
            !busNumber ||
            !busName ||
            !busType ||
            !travelDate ||
            !routeName ||
            !startPoint ||
            !endPoint ||
            !startTime ||
            !endTime
        ) {
            return NextResponse.json(
                {
                    error: "All required bus fields must be provided",
                },
                { status: 400 }
            );
        }

        const db = getAdminDb();

        // Check duplicate bus number for same date
        const existingSnapshot = await db.ref("buses").once("value");
        if (existingSnapshot.exists()) {
            const existingData = existingSnapshot.val();
            const existingList = Object.values(existingData);

            const duplicate = existingList.find(
                (bus) =>
                    bus.busNumber === busNumber && bus.travelDate === travelDate
            );

            if (duplicate) {
                return NextResponse.json(
                    {
                        error: "A bus with this number already exists for the selected date",
                    },
                    { status: 400 }
                );
            }
        }

        const busId = generateBusId();

        const payload = {
            busId,
            busNumber,
            busName,
            busType,
            travelDate,
            routeName,
            startPoint,
            endPoint,
            startTime,
            endTime,
            seatLayout,
            stops,
            cabins:
                cabins.length > 0
                    ? cabins
                    : Array.from({ length: 6 }, (_, i) => ({
                        cabinNo: i + 1,
                        label: `CB${i + 1}`,
                    })),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        await db.ref(`buses/${busId}`).set(payload);

        return NextResponse.json({
            success: true,
            message: "Bus created successfully",
            bus: payload,
        });
    } catch (error) {
        console.error("POST /api/bus error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to create bus",
            },
            { status: 500 }
        );
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();

        const busId = String(body.busId || "").trim();
        const busNumber = String(body.busNumber || "").trim().toUpperCase();
        const busName = String(body.busName || "").trim();
        const busType = String(body.busType || "").trim();
        const travelDate = String(body.travelDate || "").trim();
        const routeName = String(body.routeName || "").trim();
        const startPoint = String(body.startPoint || "").trim();
        const endPoint = String(body.endPoint || "").trim();
        const startTime = String(body.startTime || "").trim();
        const endTime = String(body.endTime || "").trim();
        const seatLayout = normalizeSeatLayout(body.seatLayout);
        const stops = normalizeStops(body.stops || []);
        const cabins = normalizeCabins(body.cabins || []);

        if (
            !busId ||
            !busNumber ||
            !busName ||
            !busType ||
            !travelDate ||
            !routeName ||
            !startPoint ||
            !endPoint ||
            !startTime ||
            !endTime
        ) {
            return NextResponse.json(
                {
                    error: "Missing required fields for update",
                },
                { status: 400 }
            );
        }

        const db = getAdminDb();
        const snapshot = await db.ref(`buses/${busId}`).once("value");

        if (!snapshot.exists()) {
            return NextResponse.json(
                {
                    error: "Bus not found",
                },
                { status: 404 }
            );
        }

        const existing = snapshot.val();

        const updatedPayload = {
            ...existing,
            busId,
            busNumber,
            busName,
            busType,
            travelDate,
            routeName,
            startPoint,
            endPoint,
            startTime,
            endTime,
            seatLayout,
            stops,
            cabins:
                cabins.length > 0
                    ? cabins
                    : Array.from({ length: 6 }, (_, i) => ({
                        cabinNo: i + 1,
                        label: `CB${i + 1}`,
                    })),
            updatedAt: Date.now(),
        };

        await db.ref(`buses/${busId}`).set(updatedPayload);

        return NextResponse.json({
            success: true,
            message: "Bus updated successfully",
            bus: updatedPayload,
        });
    } catch (error) {
        console.error("PUT /api/bus error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to update bus",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const busId = searchParams.get("busId");

        if (!busId) {
            return NextResponse.json(
                {
                    error: "Bus ID is required",
                },
                { status: 400 }
            );
        }

        const db = getAdminDb();
        await db.ref(`buses/${busId}`).remove();

        return NextResponse.json({
            success: true,
            message: "Bus deleted successfully",
        });
    } catch (error) {
        console.error("DELETE /api/bus error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to delete bus",
            },
            { status: 500 }
        );
    }
}