import { NextResponse } from "next/server";
import { sendSignupEmail } from "../../../lib/emailService";
import { getAdminAuth, getAdminDb } from "../../../lib/firebaseAdmin";

/* =========================
   Password Generator
   Example: Siddhi4345@
========================= */
function generatePassword(name = "Staff") {
    const cleanName = name.trim().split(" ")[0] || "Staff";
    const formattedName =
        cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();

    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // 4 digits
    const specialChars = ["!", "@", "#", "$", "%"];
    const randomSpecial =
        specialChars[Math.floor(Math.random() * specialChars.length)];

    return `${formattedName}${randomNumbers}${randomSpecial}`;
}

/* =========================
   GET - Fetch all staff
========================= */
export async function GET() {
    try {
        const db = getAdminDb();
        const snapshot = await db.ref("staff").once("value");

        if (!snapshot.exists()) {
            return NextResponse.json({ success: true, staff: [] });
        }

        const data = snapshot.val();

        // Merge profile photo info from users/{uid} when available
        const staffEntries = Object.values(data);

        const staff = await Promise.all(
            staffEntries.map(async (s) => {
                try {
                    const userSnap = await db.ref(`users/${s.uid}`).once("value");
                    if (userSnap.exists()) {
                        const u = userSnap.val();
                        return {
                            ...s,
                            photoUrl: u.photoUrl || s.photoUrl || "",
                            photoPublicId: u.photoPublicId || s.photoPublicId || "",
                        };
                    }
                } catch (e) {
                    console.warn("Failed to fetch user profile for staff merge:", e && e.message ? e.message : e);
                }

                return {
                    ...s,
                    photoUrl: s.photoUrl || "",
                    photoPublicId: s.photoPublicId || "",
                };
            })
        );

        staff.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return NextResponse.json({ success: true, staff });
    } catch (err) {
        console.error("GET /api/staff error:", err);
        return NextResponse.json(
            { error: err.message || "Failed to fetch staff" },
            { status: 500 }
        );
    }
}

/* =========================
   POST - Create staff
========================= */
export async function POST(req) {
    try {
        const body = await req.json();

        const name = (body.name || "").trim();
        const email = (body.email || "").trim().toLowerCase();
        const phoneNumber = (body.phoneNumber || "").trim();
        const position = (body.position || "").trim();

        if (!name || !email || !phoneNumber || !position) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        const generatedPassword = generatePassword(name);

        const auth = getAdminAuth();

        // Create Firebase Auth user
        const userRecord = await auth.createUser({
            email,
            password: generatedPassword,
            displayName: name,
        });

        const uid = userRecord.uid;

        // Save in Realtime Database
        const db = getAdminDb();
        await db.ref(`staff/${uid}`).set({
            uid,
            name,
            email,
            phoneNumber,
            position,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Send password email
        try {
            await sendSignupEmail(email, name, generatedPassword);
        } catch (emailErr) {
            console.error("Failed to send signup email:", emailErr);
        }

        return NextResponse.json({
            success: true,
            message: "Staff created successfully",
            uid,
        });
    } catch (err) {
        console.error("POST /api/staff error:", err);

        if (err.code === "auth/email-already-exists") {
            return NextResponse.json(
                { error: "This email is already registered" },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: err.message || "Failed to create staff" },
            { status: 500 }
        );
    }
}

/* =========================
   PUT - Update staff
========================= */
export async function PUT(req) {
    try {
        const body = await req.json();

        const uid = (body.uid || "").trim();
        const name = (body.name || "").trim();
        const phoneNumber = (body.phoneNumber || "").trim();
        const position = (body.position || "").trim();

        if (!uid || !name || !phoneNumber || !position) {
            return NextResponse.json(
                { error: "Missing required fields for update" },
                { status: 400 }
            );
        }

        const db = getAdminDb();

        const snapshot = await db.ref(`staff/${uid}`).once("value");
        if (!snapshot.exists()) {
            return NextResponse.json(
                { error: "Staff not found" },
                { status: 404 }
            );
        }

        const existing = snapshot.val();

        await db.ref(`staff/${uid}`).update({
            name,
            phoneNumber,
            position,
            updatedAt: Date.now(),
        });

        // Update Firebase Auth display name also
        const auth = getAdminAuth();
        try {
            await auth.updateUser(uid, {
                displayName: name,
            });
        } catch (authErr) {
            console.error("Auth update warning:", authErr);
        }

        return NextResponse.json({
            success: true,
            message: "Staff updated successfully",
            staff: {
                ...existing,
                name,
                phoneNumber,
                position,
                updatedAt: Date.now(),
            },
        });
    } catch (err) {
        console.error("PUT /api/staff error:", err);
        return NextResponse.json(
            { error: err.message || "Failed to update staff" },
            { status: 500 }
        );
    }
}

/* =========================
   DELETE - Delete staff
========================= */
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const uid = searchParams.get("uid");

        if (!uid) {
            return NextResponse.json(
                { error: "UID is required" },
                { status: 400 }
            );
        }

        const db = getAdminDb();
        const auth = getAdminAuth();

        // Remove from Realtime Database
        await db.ref(`staff/${uid}`).remove();

        // Remove from Firebase Auth
        try {
            await auth.deleteUser(uid);
        } catch (authErr) {
            console.error("Failed to delete auth user:", authErr);
        }

        return NextResponse.json({
            success: true,
            message: "Staff deleted successfully",
        });
    } catch (err) {
        console.error("DELETE /api/staff error:", err);
        return NextResponse.json(
            { error: err.message || "Failed to delete staff" },
            { status: 500 }
        );
    }
}   