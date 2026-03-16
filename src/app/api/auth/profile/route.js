import { getAdminDb } from "@/lib/firebaseAdmin";
import { uploadAssetToCloudinary, deleteCloudinaryImage } from "@/lib/cloudinary";
import jwt from "jsonwebtoken";

function getUidFromRequest(request) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        return payload.user_id || payload.uid || payload.sub || null;
    } catch {
        return null;
    }
}

function normalizeRole(role) {
    const value = String(role || "").trim().toLowerCase();
    if (value === "admin") return "admin";
    if (value === "staff") return "staff";
    return "user";
}

export async function GET(request) {
    try {
        const uid = getUidFromRequest(request);

        if (!uid) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = getAdminDb();
        const snapshot = await db.ref(`users/${uid}`).get();

        if (!snapshot.exists()) {
            return Response.json({ error: "Profile not found" }, { status: 404 });
        }

        const p = snapshot.val();

        return Response.json({
            success: true,
            profile: {
                uid,
                name: p.name || "",
                email: p.email || "",
                phone: p.phone || "",
                address: p.address || "",
                role: normalizeRole(p.role),
                photoUrl: p.photoUrl || "",
                photoPublicId: p.photoPublicId || "",
            },
        });
    } catch (error) {
        console.error("GET /api/profile error:", error);
        return Response.json({ error: "Failed to load profile" }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const uid = getUidFromRequest(request);

        if (!uid) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = getAdminDb();
        const userRef = db.ref(`users/${uid}`);
        const snapshot = await userRef.get();

        if (!snapshot.exists()) {
            return Response.json({ error: "Profile not found" }, { status: 404 });
        }

        const currentProfile = snapshot.val() || {};

        const formData = await request.formData();

        const name = String(formData.get("name") || "").trim();
        const phone = String(formData.get("phone") || "").trim();
        const address = String(formData.get("address") || "").trim();
        const photo = formData.get("photo");

        if (!name) {
            return Response.json({ error: "Name is required" }, { status: 400 });
        }

        const updateData = {
            name,
            phone,
            address,
            updatedAt: new Date().toISOString(),
        };

        // If new image uploaded
        if (photo && typeof photo !== "string" && photo.size > 0) {
            const bytes = await photo.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const uploaded = await uploadAssetToCloudinary({
                buffer,
                folder: "sa-tours/profile",
                mimeType: photo.type || "image/jpeg",
                resourceType: "image",
            });

            // Delete old image if exists
            if (currentProfile.photoPublicId) {
                try {
                    await deleteCloudinaryImage(currentProfile.photoPublicId);
                } catch (error) {
                    console.warn("Failed to delete old profile image:", error);
                }
            }

            updateData.photoUrl = uploaded.secure_url || "";
            updateData.photoPublicId = uploaded.public_id || "";
        }

        await userRef.update(updateData);

        const updatedSnapshot = await userRef.get();
        const updated = updatedSnapshot.val() || {};

        return Response.json({
            success: true,
            message: "Profile updated successfully",
            profile: {
                uid,
                name: updated.name || "",
                email: updated.email || "",
                phone: updated.phone || "",
                address: updated.address || "",
                role: normalizeRole(updated.role),
                photoUrl: updated.photoUrl || "",
                photoPublicId: updated.photoPublicId || "",
            },
        });
    } catch (error) {
        console.error("PUT /api/profile error:", error);
        return Response.json({ error: "Failed to update profile" }, { status: 500 });
    }
}