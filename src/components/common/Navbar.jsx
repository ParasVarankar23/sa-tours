/* eslint-disable react/prop-types */
"use client";

import { showAppToast } from "@/lib/client/toast";
import { Bell, LogOut, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar({ title = "Dashboard", role = "User" }) {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [logoutCountdown, setLogoutCountdown] = useState(8);

    useEffect(() => {
        let active = true;

        async function loadProfile() {
            try {
                const res = await fetch("/api/auth/me", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (active) {
                    setFullName(String(data.fullName || "").trim());
                }
            } catch {
                // Keep navbar functional even if profile fetch fails.
            }
        }

        loadProfile();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!showLogoutModal) return undefined;

        setLogoutCountdown(8);
        const intervalId = setInterval(() => {
            setLogoutCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalId);
                    void performLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [showLogoutModal]);

    async function performLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            localStorage.removeItem("authToken");
            showAppToast("success", "Logged out successfully.");
        } catch {
            showAppToast("error", "Network error while logging out. Please try again.");
        } finally {
            setShowLogoutModal(false);
            router.replace("/login");
            router.refresh();
        }
    }

    async function handleLogout() {
        setShowLogoutModal(true);
    }

    return (
        <>
            {showLogoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900">Confirm Logout</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            You will be logged out automatically in {logoutCountdown} seconds.
                        </p>
                        <div className="mt-4 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowLogoutModal(false)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                            >
                                Stay Logged In
                            </button>
                            <button
                                type="button"
                                onClick={() => void performLogout()}
                                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                            >
                                Logout Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>
                        <p className="text-sm text-slate-500">Role: {role}</p>
                        {fullName && <p className="text-sm font-medium text-orange-600">Welcome, {fullName}</p>}
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
        </>
    );
}
