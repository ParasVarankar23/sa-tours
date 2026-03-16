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
        if (!snapshot.exists()) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }
        const user = snapshot.val();
        return Response.json({
            fullName: user.name || "",
            email: user.email || "",
            role: user.role || "user"
        });
    } catch (error) {
        return Response.json({ error: error.message || "Failed to fetch profile" }, { status: 500 });
    }
}
