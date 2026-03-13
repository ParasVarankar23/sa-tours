import { NextResponse } from "next/server";

const roleRoutes = {
    admin: "/admin",
    staff: "/staff-portal",
    user: "/user",
};

function base64UrlToBase64(input) {
    return input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
}

function decodePart(input) {
    const json = atob(base64UrlToBase64(input));
    return JSON.parse(json);
}

async function hmacSha256Base64Url(data, secret) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
    let binary = "";
    const bytes = new Uint8Array(signature);
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function verifyToken(token) {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerPart, bodyPart, sigPart] = parts;
    const secret = process.env.JWT_SECRET || "dev-secret";
    const data = `${headerPart}.${bodyPart}`;
    const expectedSig = await hmacSha256Base64Url(data, secret);

    if (expectedSig !== sigPart) return null;

    try {
        const header = decodePart(headerPart);
        if (header.alg !== "HS256") return null;

        const payload = decodePart(bodyPart);
        if (!payload.exp || Date.now() > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}

function routeForRole(role) {
    return roleRoutes[role] || "/login";
}

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get("sa_auth_token")?.value;
    const payload = await verifyToken(token);

    if (!payload) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (pathname.startsWith("/admin") && payload.role !== "admin") {
        return NextResponse.redirect(new URL(routeForRole(payload.role), request.url));
    }

    if (pathname.startsWith("/staff-portal") && payload.role !== "staff") {
        return NextResponse.redirect(new URL(routeForRole(payload.role), request.url));
    }

    if (pathname.startsWith("/user") && payload.role !== "user") {
        return NextResponse.redirect(new URL(routeForRole(payload.role), request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/staff-portal/:path*", "/user/:path*"],
};
