/* eslint-disable react/prop-types */
"use client";
import CookieConsent from "@/components/common/CookieConsent";
import DashboardNavbar from "@/components/common/Navbar";
import Sidebar from "@/components/common/Sidebar";
import Footer from "@/components/layout/Footer";
import PublicNavbar from "@/components/layout/Navbar";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";

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

function getPortalMeta(pathname) {
    if (pathname?.startsWith("/admin")) {
        return { roleKey: "admin", roleLabel: "Admin", title: "Admin Dashboard" };
    }
    if (pathname?.startsWith("/staff-portal")) {
        return { roleKey: "staff", roleLabel: "Staff", title: "Staff Portal" };
    }
    if (pathname?.startsWith("/user")) {
        return { roleKey: "user", roleLabel: "User", title: "User Dashboard" };
    }
    return null;
}

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const portalMeta = getPortalMeta(pathname);
    const showPublicShell = publicShellRoutes.has(pathname || "");

    if (portalMeta) {
        return (
            <div className="min-h-screen bg-[#f7f7f7] text-gray-900">
                <Toaster position="top-center" richColors closeButton duration={3200} />
                <div className="flex min-h-screen flex-col lg:flex-row">
                    <Sidebar role={portalMeta.roleKey} />
                    <div className="flex min-h-screen flex-1 flex-col">
                        <DashboardNavbar title={portalMeta.title} role={portalMeta.roleLabel} />
                        <main className="flex-1 p-4 sm:p-6">{children}</main>
                    </div>
                </div>
                <CookieConsent />
            </div>
        );
    }

    if (!showPublicShell) {
        return (
            <div className="min-h-screen bg-[#f7f7f7] text-gray-900">
                <Toaster position="top-center" richColors closeButton duration={3200} />
                {children}
                <CookieConsent />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f7f7] text-gray-900">
            <Toaster position="top-center" richColors closeButton duration={3200} />
            <div className="mx-auto flex min-h-screen max-w-7xl flex-col bg-white shadow-sm">
                {/* Global Navbar */}
                <PublicNavbar />

                {/* Page Content */}
                <main className="flex-1">
                    {children}
                </main>

                {/* Global Footer */}
                <Footer />
            </div>

            <CookieConsent />
        </div>
    );
}