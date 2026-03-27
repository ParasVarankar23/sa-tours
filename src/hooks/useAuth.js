"use client";

import { getFirebaseDb } from "@/lib/firebase";
import { get, ref } from "firebase/database";
import { useEffect, useState } from "react";

function decodeJwtPayload(token) {
    try {
        const payload = token.split(".")[1];
        if (!payload) return null;

        const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
        const decoded = atob(base64);
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

function normalizeRole(role) {
    return String(role || "").trim().toLowerCase();
}

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const initAuth = async () => {
            setLoading(true);
            const authToken = localStorage.getItem("authToken");

            if (!authToken) {
                setUser(null);
                setIsAuthenticated(false);
                setLoading(false);
                return;
            }

            const payload = decodeJwtPayload(authToken);
            const uid = payload?.user_id || payload?.uid || payload?.sub;
            const roleFromToken = payload?.role || null;

            if (!uid) {
                localStorage.removeItem("authToken");
                setUser(null);
                setIsAuthenticated(false);
                setLoading(false);
                return;
            }

            setIsAuthenticated(true);

            try {
                const snapshot = await get(ref(getFirebaseDb(), `users/${uid}`));
                const profile = snapshot.exists() ? snapshot.val() : {};

                setUser({
                    uid,
                    name: profile?.name || null,
                    email: profile?.email || null,
                    phone: profile?.phone || null,
                    address: profile?.address || null,
                    // Prefer the role asserted in the auth token (source of truth for permissions)
                    // to avoid DB/profile out-of-sync showing an incorrect role.
                    role: normalizeRole(roleFromToken || profile?.role),
                });
            } catch {
                // Keep auth state from token even if profile fetch fails
                setUser({ uid, name: null, email: null, phone: null, address: null, role: normalizeRole(roleFromToken) });
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        const handleAuthChanged = () => {
            initAuth();
        };

        const handleStorage = (event) => {
            if (event.key === "authToken") {
                initAuth();
            }
        };

        globalThis.addEventListener("auth-changed", handleAuthChanged);
        globalThis.addEventListener("storage", handleStorage);

        return () => {
            globalThis.removeEventListener("auth-changed", handleAuthChanged);
            globalThis.removeEventListener("storage", handleStorage);
        };
    }, []);

    const logout = () => {
        localStorage.removeItem("authToken");

        // Remove all Firebase-cached entries (e.g. firebase:host:*, firebase:previous_websocket_failure)
        const firebaseKeys = Object.keys(localStorage).filter((k) => k.startsWith("firebase:"));
        firebaseKeys.forEach((k) => localStorage.removeItem(k));

        setUser(null);
        setIsAuthenticated(false);
        globalThis.dispatchEvent(new Event("auth-changed"));
    };

    const updateUser = (updates) => {
        setUser((prev) => (prev ? { ...prev, ...updates } : prev));
    };

    return {
        user,
        loading,
        isAuthenticated,
        logout,
        updateUser,
    };
}
