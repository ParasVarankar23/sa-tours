/* eslint-disable react/prop-types */
"use client";

import {
    BookOpen,
    CalendarDays,
    CreditCard,
    GraduationCap,
    LayoutDashboard,
    Settings,
    ShieldCheck,
    Users,
    Bus,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const roleLinks = {
    admin: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/staff", label: "Staff Access", icon: Users },
        { href: "/schedule", label: "Schedule", icon: CalendarDays },
        { href: "/routes", label: "Routes", icon: BookOpen },
        { href: "/settings", label: "Settings", icon: Settings },
    ],
    staff: [
        { href: "/staff-portal", label: "Staff Panel", icon: ShieldCheck },
        { href: "/schedule", label: "Schedule", icon: CalendarDays },
        { href: "/routes", label: "Routes", icon: BookOpen },
        { href: "/settings", label: "Settings", icon: Settings },
    ],
    user: [
        { href: "/user", label: "User Home", icon: GraduationCap },
        { href: "/schedule", label: "Schedule", icon: CalendarDays },
        { href: "/routes", label: "Routes", icon: BookOpen },
        { href: "/profile", label: "Profile", icon: CreditCard },
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
                            <h2 className="truncate text-lg font-bold text-slate-900">SA Tours</h2>
                            <p className="truncate text-xs text-slate-500">SA Tours & Travels</p>
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
                        const active =
                            pathname === item.href ||
                            (item.href !== "/" && pathname.startsWith(item.href + "/"));

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
            <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
                © 2026 SA Tours
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