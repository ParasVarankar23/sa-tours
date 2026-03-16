/* eslint-disable react/prop-types */
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import AppToaster from "@/components/AppToaster";
import CookieConsent from "@/components/common/CookieConsent";
import DashboardNavbar from "@/components/common/Navbar";
import Sidebar from "@/components/common/Sidebar";
import Footer from "@/components/layout/Footer";
import PublicNavbar from "@/components/layout/Navbar";

const publicShellRoutes = new Set([
    "/",
    "/about",
    "/contact",
    "/forgot-password",
    "/login",
    "/offices",
    "/owner",
    "/privacy",
    "/routes",
    "/schedule",
    "/services",
    "/signup",
    "/staff",
    "/terms",
]);

const commonDashboardRoutes = new Set([
    "/profile",
    "/settings",
]);

function decodeJwtPayload(token) {
    try {
        const parts = String(token || "").split(".");
        if (parts.length !== 3) return null;

        const base64 = parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

        const decoded =
            typeof window !== "undefined"
                ? window.atob(padded)
                : Buffer.from(padded, "base64").toString("binary");

        return JSON.parse(decoded);
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

function getPortalMetaFromPath(pathname) {
    if (pathname?.startsWith("/admin")) {
        return { roleKey: "admin", roleLabel: "Admin" };
    }
    if (pathname?.startsWith("/staff-portal")) {
        return { roleKey: "staff", roleLabel: "Staff" };
    }
    if (pathname?.startsWith("/user")) {
        return { roleKey: "user", roleLabel: "User" };
    }
    return null;
}

function getRoleLabel(roleKey) {
    if (roleKey === "admin") return "Admin";
    if (roleKey === "staff") return "Staff";
    return "User";
}

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [tokenRole, setTokenRole] = useState(null);
    const [tokenReady, setTokenReady] = useState(false);

    useEffect(() => {
        const authToken = localStorage.getItem("authToken");
        const payload = decodeJwtPayload(authToken);
        const normalized = normalizeRole(payload?.role);

        setTokenRole(normalized);
        setTokenReady(true);
    }, []);

    const pathPortalMeta = useMemo(() => getPortalMetaFromPath(pathname), [pathname]);
    const isCommonDashboardRoute = commonDashboardRoutes.has(pathname || "");
    const showPublicShell = publicShellRoutes.has(pathname || "");

    const effectivePortalMeta = useMemo(() => {
        if (pathPortalMeta) return pathPortalMeta;

        if (isCommonDashboardRoute && tokenRole) {
            return {
                roleKey: tokenRole,
                roleLabel: getRoleLabel(tokenRole),
            };
        }

        return null;
    }, [pathPortalMeta, isCommonDashboardRoute, tokenRole]);

    // Prevent flash for /profile or /settings until token role is loaded
    if (isCommonDashboardRoute && !tokenReady) {
        return (
            <div className="min-h-screen bg-[#f7f7f7] text-gray-900">
                <AppToaster />
                <div className="flex min-h-screen items-center justify-center">
                    <div className="rounded-2xl bg-white px-6 py-4 shadow-sm border border-slate-200 text-sm font-medium text-slate-600">
                        Loading dashboard...
                    </div>
                </div>
                <CookieConsent />
            </div>
        );
    }

    // DASHBOARD SHELL (admin / staff / user + common pages like /profile /settings)
    if (effectivePortalMeta) {
        return (
            <div className="min-h-screen bg-[#f7f7f7] text-gray-900">
                <AppToaster />

                <div className="flex min-h-screen">
                    <Sidebar
                        role={effectivePortalMeta.roleKey}
                        isMobileOpen={isMobileSidebarOpen}
                        onClose={() => setIsMobileSidebarOpen(false)}
                    />

                    <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                        <DashboardNavbar
                            role={effectivePortalMeta.roleLabel}
                            onMenuClick={() => setIsMobileSidebarOpen(true)}
                        />

                        <main className="flex-1 p-4 sm:p-6 lg:p-8">
                            {children}
                        </main>
                    </div>
                </div>

                <CookieConsent />
            </div>
        );
    }

    // NO PUBLIC SHELL
    if (!showPublicShell) {
        return (
            <div className="min-h-screen bg-[#f7f7f7] text-gray-900">
                <AppToaster />
                {children}
                <CookieConsent />
            </div>
        );
    }

    // PUBLIC SHELL
    return (
        <div className="min-h-screen bg-[#f7f7f7] text-gray-900">
            <AppToaster />

            <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col bg-white shadow-sm">
                {/* Global Navbar */}
                <PublicNavbar />

                {/* Page Content */}
                <main className="flex-1 min-w-0">
                    {children}
                </main>

                {/* Global Footer */}
                <Footer />
            </div>

            <CookieConsent />
        </div>
    );
}