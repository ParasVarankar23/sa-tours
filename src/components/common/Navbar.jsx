/* eslint-disable react/prop-types */
"use client";

import { Bell, LogOut, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Navbar({ title = "Dashboard", role = "User" }) {
    const router = useRouter();

    async function handleLogout() {
        try {
            await fetch("/api/logout", { method: "POST" });
        } finally {
            router.replace("/login");
            router.refresh();
        }
    }

    return (
        <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>
                    <p className="text-sm text-slate-500">Role: {role}</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-500 md:flex">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search pages..."
                            className="w-48 bg-transparent text-sm outline-none"
                        />
                    </div>

                    <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-orange-300 hover:text-orange-500"
                        aria-label="Notifications"
                    >
                        <Bell size={18} />
                    </button>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}
