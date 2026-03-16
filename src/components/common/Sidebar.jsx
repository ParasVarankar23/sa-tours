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

export default function Sidebar({ role = "user" }) {
    const pathname = usePathname();
    const links = roleLinks[role] || roleLinks.user;

    return (
        <aside className="w-full border-r border-slate-200 bg-white lg:w-72">
            <div className="border-b border-slate-200 px-5 py-5">
                <h2 className="text-xl font-bold text-slate-900">SA Tours</h2>
                <p className="text-sm text-slate-500">SA Tours & Travels</p>
            </div>

            <nav className="space-y-1 p-3">
                {links.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active
                                ? "bg-orange-50 text-orange-600"
                                : "text-slate-600 hover:bg-slate-50 hover:text-orange-500"
                                }`}
                        >
                            <Icon size={17} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
                © 2026 SA Tours
            </div>
        </aside>
    );
}
