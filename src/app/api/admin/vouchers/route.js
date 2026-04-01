import { getAdminDb, verifyAuthToken } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

function normalizeText(v) {
    return String(v || "").trim();
}

async function isAdmin(req) {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return false;

    const token = authHeader.split(" ")[1];
    if (!token) return false;

    try {
        const decoded = await verifyAuthToken(token);
        return !!decoded && (decoded.role === "admin" || decoded.role === "owner");
    } catch {
        return false;
    }
}

export async function GET(req) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const db = getAdminDb();
        const snap = await db.ref("vouchers").once("value");
        const data = snap.exists() ? snap.val() : {};

        const list = Object.keys(data || {}).map((k) => ({
            id: k,
            ...data[k],
        }));

        return NextResponse.json(
            { success: true, vouchers: list },
            { status: 200 }
        );
    } catch (err) {
        console.error("GET /api/admin/vouchers error:", err);
        return NextResponse.json(
            { success: false, error: "Failed to fetch vouchers" },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();

        const amount = Number(body.amount) || 0;
        const code =
            normalizeText(body.code || body.voucherCode || "").toUpperCase() || null;

        const name = normalizeText(body.name || body.customerName) || null;
        const email = normalizeText(body.email) || null;
        const phone = normalizeText(body.phone) || null;
        const pickup = normalizeText(body.pickup) || null;
        const drop = normalizeText(body.drop) || null;
        const pickupTime = normalizeText(body.pickupTime) || null;
        const dropTime = normalizeText(body.dropTime) || null;

        // ✅ Ticket No support (includes your actual Firebase path)
        const ticketNo =
            normalizeText(
                body.ticketNo ||
                body.ticketNumber ||
                body.ticket ||
                body.metadata?.ticketNo ||
                body.metadata?.ticketNumber ||
                body.metadata?.ticket ||
                body.metadata?.cancelledBooking?.ticketNo ||
                body.metadata?.cancelledBooking?.ticketNumber ||
                body.metadata?.cancelledBooking?.ticket
            ) || null;

        // ✅ Seat No support (includes your actual Firebase path)
        const seatNo =
            normalizeText(
                body.seatNo ||
                body.seatNumber ||
                body.metadata?.seatNo ||
                body.metadata?.seatNumber ||
                body.metadata?.cancelledBooking?.seatNo ||
                body.metadata?.cancelledBooking?.seatNumber
            ) || null;

        const days = Number(body.expiresInDays) || 365;

        if (!amount || amount <= 0) {
            return NextResponse.json(
                { success: false, error: "Invalid amount" },
                { status: 400 }
            );
        }

        const db = getAdminDb();
        const now = new Date().toISOString();
        const expiresAt = new Date(
            Date.now() + days * 24 * 60 * 60 * 1000
        ).toISOString();

        const finalCode = code || `VCHR-${Date.now().toString(36).toUpperCase()}`;

        const payload = {
            code: finalCode,
            amount,
            currency: "INR",

            name: name || null,
            email,
            phone,

            pickup: pickup || null,
            drop: drop || null,
            pickupTime: pickupTime || null,
            dropTime: dropTime || null,

            // ✅ Save directly for easy access in future
            ticketNo,
            seatNo,

            issuedAt: now,
            expiresAt,
            issuedBy: null,

            usedAt: null,
            usedByBookingId: null,

            metadata: body.metadata || null,
        };

        await db.ref(`vouchers/${finalCode}`).set(payload);

        return NextResponse.json(
            {
                success: true,
                voucher: payload,
                message: "Voucher created successfully",
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("POST /api/admin/vouchers error:", err);
        return NextResponse.json(
            { success: false, error: "Failed to create voucher" },
            { status: 500 }
        );
    }
}