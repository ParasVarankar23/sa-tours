import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin";

function generateBookingId() {
    return `BOOK_${Date.now()}`;
}

export async function GET() {
    try {
        const db = getAdminDb();
        const snapshot = await db.ref("bookings").once("value");

        if (!snapshot.exists()) {
            return NextResponse.json({ success: true, bookings: [] });
        }

        const data = snapshot.val();
        const bookings = Object.values(data).sort(
            (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
        );

        return NextResponse.json({
            success: true,
            bookings,
        });
    } catch (error) {
        console.error("GET /api/booking error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch bookings" },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const body = await req.json();

        const busId = String(body.busId || "").trim();
        const busNumber = String(body.busNumber || "").trim();
        const busName = String(body.busName || "").trim();
        const routeName = String(body.routeName || "").trim();
        const travelDate = String(body.travelDate || "").trim();
        const startTime = String(body.startTime || "").trim();
        const endTime = String(body.endTime || "").trim();

        const passengerName = String(body.passengerName || "").trim();
        const phoneNumber = String(body.phoneNumber || "").trim();
        const pickupPoint = String(body.pickupPoint || "").trim();
        const dropPoint = String(body.dropPoint || "").trim();
        const seatNumber = String(body.seatNumber || "").trim();
        const notes = String(body.notes || "").trim();

        if (
            !busId ||
            !busNumber ||
            !busName ||
            !routeName ||
            !travelDate ||
            !startTime ||
            !endTime ||
            !passengerName ||
            !phoneNumber ||
            !pickupPoint ||
            !dropPoint ||
            !seatNumber
        ) {
            return NextResponse.json(
                { error: "Please fill all required booking fields" },
                { status: 400 }
            );
        }

        const db = getAdminDb();

        // Optional: Prevent duplicate same bus + same date + same seat
        const snapshot = await db.ref("bookings").once("value");
        if (snapshot.exists()) {
            const existing = Object.values(snapshot.val());
            const duplicateSeat = existing.find(
                (b) =>
                    b.busId === busId &&
                    b.travelDate === travelDate &&
                    String(b.seatNumber) === String(seatNumber)
            );

            if (duplicateSeat) {
                return NextResponse.json(
                    { error: `Seat ${seatNumber} is already booked for this bus/date` },
                    { status: 400 }
                );
            }
        }

        const bookingId = generateBookingId();

        const payload = {
            bookingId,
            busId,
            busNumber,
            busName,
            routeName,
            travelDate,
            startTime,
            endTime,
            passengerName,
            phoneNumber,
            pickupPoint,
            dropPoint,
            seatNumber,
            notes: notes || "",
            status: "Confirmed",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        await db.ref(`bookings/${bookingId}`).set(payload);

        return NextResponse.json({
            success: true,
            message: "Booking created successfully",
            booking: payload,
        });
    } catch (error) {
        console.error("POST /api/booking error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create booking" },
            { status: 500 }
        );
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();

        const bookingId = String(body.bookingId || "").trim();
        if (!bookingId) {
            return NextResponse.json(
                { error: "Booking ID is required" },
                { status: 400 }
            );
        }

        const db = getAdminDb();
        const existingSnap = await db.ref(`bookings/${bookingId}`).once("value");

        if (!existingSnap.exists()) {
            return NextResponse.json(
                { error: "Booking not found" },
                { status: 404 }
            );
        }

        const existing = existingSnap.val();

        const updatedPayload = {
            ...existing,
            passengerName: String(body.passengerName || "").trim(),
            phoneNumber: String(body.phoneNumber || "").trim(),
            pickupPoint: String(body.pickupPoint || "").trim(),
            dropPoint: String(body.dropPoint || "").trim(),
            seatNumber: String(body.seatNumber || "").trim(),
            notes: String(body.notes || "").trim(),
            updatedAt: Date.now(),
        };

        if (
            !updatedPayload.passengerName ||
            !updatedPayload.phoneNumber ||
            !updatedPayload.pickupPoint ||
            !updatedPayload.dropPoint ||
            !updatedPayload.seatNumber
        ) {
            return NextResponse.json(
                { error: "Please fill all required booking fields" },
                { status: 400 }
            );
        }

        // Prevent duplicate seat (excluding self)
        const allSnap = await db.ref("bookings").once("value");
        if (allSnap.exists()) {
            const all = Object.values(allSnap.val());
            const duplicateSeat = all.find(
                (b) =>
                    b.bookingId !== bookingId &&
                    b.busId === existing.busId &&
                    b.travelDate === existing.travelDate &&
                    String(b.seatNumber) === String(updatedPayload.seatNumber)
            );

            if (duplicateSeat) {
                return NextResponse.json(
                    { error: `Seat ${updatedPayload.seatNumber} is already booked` },
                    { status: 400 }
                );
            }
        }

        await db.ref(`bookings/${bookingId}`).set(updatedPayload);

        return NextResponse.json({
            success: true,
            message: "Booking updated successfully",
            booking: updatedPayload,
        });
    } catch (error) {
        console.error("PUT /api/booking error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update booking" },
            { status: 500 }
        );
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const bookingId = searchParams.get("bookingId");

        if (!bookingId) {
            return NextResponse.json(
                { error: "Booking ID is required" },
                { status: 400 }
            );
        }

        const db = getAdminDb();
        await db.ref(`bookings/${bookingId}`).remove();

        return NextResponse.json({
            success: true,
            message: "Booking deleted successfully",
        });
    } catch (error) {
        console.error("DELETE /api/booking error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete booking" },
            { status: 500 }
        );
    }
}