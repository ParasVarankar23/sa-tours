/* eslint-disable react/prop-types */
"use client";

import {
    CalendarDays,
    GraduationCap,
    LayoutDashboard,
    Settings,
    ShieldCheck,
    Bus,
    X,
    BusFront,
    Ticket,
    ReceiptText,
    UserCog,
    Route,
    UserCircle2,
    Bell,
} from "lucide-react";;
import Link from "next/link";
import { usePathname } from "next/navigation";

const roleLinks = {
    admin: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/staff", label: "Staff Access", icon: UserCog },
        { href: "/admin/bus", label: "Buses", icon: BusFront },
        { href: "/admin/booking", label: "Booking", icon: Ticket },
        { href: "/admin/payment", label: "Payment History", icon: ReceiptText },
        { href: "/admin/notifications", label: "Notifications", icon: Bell },
        { href: "/schedule", label: "Schedule", icon: CalendarDays },
        { href: "/routes", label: "Routes", icon: Route },
        { href: "/settings", label: "Settings", icon: Settings },
    ],

    staff: [
        { href: "/staff-portal", label: "Staff Panel", icon: ShieldCheck },
        { href: "/staff/bus", label: "View Bus", icon: BusFront },
        { href: "/staff/booking", label: "View Booking", icon: Ticket },
        { href: "/staff/payment", label: "View Payment History", icon: ReceiptText },
        { href: "/staff/notifications", label: "Notifications", icon: Bell },
        { href: "/schedule", label: "Schedule", icon: CalendarDays },
        { href: "/routes", label: "Routes", icon: Route },
        { href: "/settings", label: "Settings", icon: Settings },
    ],

    user: [
        { href: "/user", label: "User Home", icon: GraduationCap },
        { href: "/user/bus", label: "View Bus", icon: BusFront },
        { href: "/user/booking", label: "View Booking", icon: Ticket },
        { href: "/user/payment", label: "View Payment History", icon: ReceiptText },
        { href: "/user/notifications", label: "Notifications", icon: Bell },
        { href: "/schedule", label: "Schedule", icon: CalendarDays },
        { href: "/routes", label: "Routes", icon: Route },
        { href: "/profile", label: "Profile", icon: UserCircle2 },
        { href: "/settings", label: "Settings", icon: Settings },
    ],
};

function formatRole(role) {
    const normalized = String(role || "user").toLowerCase();
    if (normalized === "admin") return "Admin";
    if (normalized === "staff") return "Staff";
    return "User";
}

function SidebarContent({ role, pathname, onClose }) {
    const links = roleLinks[role] || roleLinks.user;

    // Find most specific active match
    const matching = links.filter((item) => {
        if (pathname === item.href) return true;
        if (item.href !== "/" && pathname.startsWith(item.href + "/")) return true;
        return false;
    });

    const mostSpecificHref = matching.length
        ? matching.reduce((a, b) => (b.href.length > a.href.length ? b : a)).href
        : null;

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-slate-200 px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200">
                            <Bus size={20} />
                        </div>

                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-bold text-slate-900">
                                SA Tours
                            </h2>
                            <p className="truncate text-xs text-slate-500">
                                SA Tours & Travels
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-orange-300 hover:text-orange-500 lg:hidden"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Role Badge */}
            <div className="px-4 pt-4">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-600 ring-1 ring-orange-100">
                    <ShieldCheck size={14} />
                    {formatRole(role)} Access
                </div>
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto p-3">
                <div className="mb-3 px-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Main Navigation
                    </p>
                </div>

                <nav className="space-y-1.5">
                    {links.map((item) => {
                        const Icon = item.icon;
                        const active = mostSpecificHref === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200 ${active
                                        ? "bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-orange-500"
                                    }`}
                            >
                                {active && (
                                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-orange-500" />
                                )}

                                <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${active
                                            ? "bg-white text-orange-600 shadow-sm"
                                            : "bg-slate-100 text-slate-500 group-hover:bg-orange-50 group-hover:text-orange-500"
                                        }`}
                                >
                                    <Icon size={18} />
                                </div>

                                <span className="truncate">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-4">
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
                    <p className="font-medium text-slate-700">© 2026 SA Tours</p>
                    <p className="mt-1">Travel dashboard management system</p>
                </div>
            </div>
        </div>
    );
}

export default function Sidebar({
    role = "user",
    isMobileOpen = false,
    onClose = () => { },
}) {
    const pathname = usePathname();
    const normalizedRole = String(role || "user").toLowerCase();

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
                <SidebarContent
                    role={normalizedRole}
                    pathname={pathname}
                    onClose={() => { }}
                />
            </aside>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-[70] bg-slate-950/45 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Mobile Drawer */}
            <aside
                className={`fixed inset-y-0 left-0 z-[80] flex w-[86%] max-w-[320px] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 lg:hidden ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <SidebarContent
                    role={normalizedRole}
                    pathname={pathname}
                    onClose={onClose}
                />
            </aside>
        </>
    );
}