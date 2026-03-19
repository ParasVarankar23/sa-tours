import { NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "../../../../lib/firebaseAdmin";

function nowIso() {
    return new Date().toISOString();
}

async function requireAuth(req) {
    const auth = req.headers.get("authorization") || "";
    const parts = auth.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") throw new Error("no-token");
    const token = parts[1];
    return await verifyAuthToken(token);
}

export async function GET(req) {
    try {
        const user = await requireAuth(req);
        const uid = user.uid || null;
        const role = (user.role || "user").toString().toLowerCase();

        const db = getAdminDb();

        // fetch role notifications
        const roleSnap = await db.ref(`notifications/roles/${role}`).once("value");
        const roleData = roleSnap.exists() ? roleSnap.val() : {};

        // fetch user notifications
        const userSnap = uid ? await db.ref(`notifications/users/${uid}`).once("value") : null;
        const userData = userSnap && userSnap.exists() ? userSnap.val() : {};

        // fetch per-user read map for role notifications
        const readSnap = uid ? await db.ref(`notifications/reads/${uid}`).once("value") : null;
        const readMap = readSnap && readSnap.exists() ? readSnap.val() : {};

        const out = [];

        for (const [id, n] of Object.entries(roleData || {})) {
            out.push({
                id,
                type: "role",
                title: n.title || "",
                message: n.message || "",
                data: n.data || null,
                createdAt: n.createdAt || n.ts || null,
                read: !!(readMap && readMap[id]),
            });
        }

        for (const [id, n] of Object.entries(userData || {})) {
            out.push({
                id,
                type: "user",
                title: n.title || "",
                message: n.message || "",
                data: n.data || null,
                createdAt: n.createdAt || n.ts || null,
                read: !!n.read,
            });
        }

        // optionally include public notifications
        const publicSnap = await db.ref(`notifications/public`).once("value");
        const publicData = publicSnap.exists() ? publicSnap.val() : {};
        for (const [id, n] of Object.entries(publicData || {})) {
            out.push({
                id,
                type: "public",
                title: n.title || "",
                message: n.message || "",
                data: n.data || null,
                createdAt: n.createdAt || n.ts || null,
                read: !!(readMap && readMap[id]),
            });
        }

        out.sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
        });

        // pagination support via query params: offset (default 0) and limit (default 10)
        const url = new URL(req.url);
        const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 100));
        const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 100));

        const total = out.length;
        const unreadCount = out.filter((n) => !n.read).length;
        const readCount = total - unreadCount;

        const latestNotification = out.length ? out[0] : null;

        const sliced = out.slice(offset, offset + limit);

        return NextResponse.json(
            {
                success: true,
                notifications: sliced,
                total,
                unreadCount,
                readCount,
                offset,
                limit,
                latestNotification,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("GET /api/auth/notifications error:", err);
        return NextResponse.json({ success: false, error: err.message || "Unauthorized" }, { status: 401 });
    }
}

export async function POST(req) {
    try {
        const user = await requireAuth(req);
        // allow any authenticated user to create notifications; callers should be privileged in practice
        const body = await req.json();
        const { targetType, target, title, message, data } = body;
        if (!targetType || !title) {
            return NextResponse.json({ success: false, error: "targetType and title required" }, { status: 400 });
        }

        const db = getAdminDb();
        const payload = { title, message: message || "", data: data || null, createdAt: nowIso(), creator: user.uid || null };

        if (targetType === "user") {
            if (!target) return NextResponse.json({ success: false, error: "target userId required" }, { status: 400 });
            const ref = db.ref(`notifications/users/${target}`).push();
            await ref.set(payload);
            return NextResponse.json({ success: true, id: ref.key }, { status: 200 });
        }

        if (targetType === "role") {
            if (!target) return NextResponse.json({ success: false, error: "target role required" }, { status: 400 });
            const role = String(target).toLowerCase();
            const ref = db.ref(`notifications/roles/${role}`).push();
            await ref.set(payload);
            return NextResponse.json({ success: true, id: ref.key }, { status: 200 });
        }

        if (targetType === "public") {
            const ref = db.ref(`notifications/public`).push();
            await ref.set(payload);
            return NextResponse.json({ success: true, id: ref.key }, { status: 200 });
        }

        return NextResponse.json({ success: false, error: "unknown targetType" }, { status: 400 });
    } catch (err) {
        console.error("POST /api/auth/notifications error:", err);
        return NextResponse.json({ success: false, error: err.message || "Failed" }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const user = await requireAuth(req);
        const uid = user.uid || null;
        if (!uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { id, type, read } = body;
        if (!id || !type) return NextResponse.json({ success: false, error: "id and type required" }, { status: 400 });

        const db = getAdminDb();

        if (type === "role" || type === "public") {
            // role/public notifications are shared, track per-user read map
            await db.ref(`notifications/reads/${uid}/${id}`).set(!!read);
            return NextResponse.json({ success: true }, { status: 200 });
        }

        if (type === "user") {
            // mark the user notification as read
            await db.ref(`notifications/users/${uid}/${id}/read`).set(!!read);
            return NextResponse.json({ success: true }, { status: 200 });
        }

        return NextResponse.json({ success: false, error: "unknown type" }, { status: 400 });
    } catch (err) {
        console.error("PATCH /api/auth/notifications error:", err);
        return NextResponse.json({ success: false, error: err.message || "Failed" }, { status: 500 });
    }
}
