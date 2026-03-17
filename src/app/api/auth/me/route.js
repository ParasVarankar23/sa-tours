import { getFirebaseDb } from "@/lib/firebase";
import { get, ref } from "firebase/database";
import jwt from "jsonwebtoken";

export async function GET(request) {
    try {
        // Get token from Authorization header or cookie
        const authHeader = request.headers.get("authorization") || "";
        const token = authHeader.replace(/^Bearer\s+/i, "") || (request.cookies.get("authToken")?.value || "");
        if (!token) {
            return Response.json({ error: "Missing auth token" }, { status: 401 });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return Response.json({ error: "Server configuration error: missing JWT_SECRET" }, { status: 500 });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch {
            return Response.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        const db = getFirebaseDb();
        const userRef = ref(db, `users/${decoded.user_id}`);
        const snapshot = await get(userRef);

        // If users/{uid} exists, use that. Otherwise try staff/{uid} as a fallback
        if (snapshot.exists()) {
            const user = snapshot.val();

            // Also check staff collection for position (if this uid is a staff member)
            let position = null;
            try {
                const staffRef = ref(db, `staff/${decoded.user_id}`);
                const staffSnap = await get(staffRef);
                if (staffSnap.exists()) {
                    const s = staffSnap.val();
                    position = s.position || null;
                }
            } catch (e) {
                // ignore lookup failure
            }

            return Response.json({
                fullName: user.name || "",
                email: user.email || "",
                role: user.role || "user",
                position,
            });
        }

        // users/{uid} missing — try staff/{uid}
        try {
            const staffRef = ref(db, `staff/${decoded.user_id}`);
            const staffSnap = await get(staffRef);
            if (staffSnap.exists()) {
                const s = staffSnap.val();
                return Response.json({
                    fullName: s.name || "",
                    email: s.email || "",
                    role: "staff",
                    position: s.position || null,
                });
            }
        } catch (e) {
            // ignore
        }

        return Response.json({ error: "User not found" }, { status: 404 });
    } catch (error) {
        return Response.json({ error: error.message || "Failed to fetch profile" }, { status: 500 });
    }
}
