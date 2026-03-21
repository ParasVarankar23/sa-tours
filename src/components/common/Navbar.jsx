/* eslint-disable react/prop-types */
"use client";

import NotificationBell from "@/components/NotificationBell";
import { showAppToast } from "@/lib/client/toast";
import {
    ChevronDown,
    LogOut,
    Menu,
    Search,
    Settings,
    User,
    X
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function Navbar({
    role = "User",
    onMenuClick = () => { },
}) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (q) => {
        const s = String(q || "").trim().toLowerCase();
        if (!s) return;

        // booking route is role-based: admin/owner -> /admin/booking, others -> /user/booking
        if (s.includes("booking")) {
            if (role && (String(role).toLowerCase() === "admin" || String(role).toLowerCase() === "owner")) {
                try { router.push("/admin/booking"); } catch { window.location.href = "/admin/booking"; }
            } else {
                try { router.push("/user/booking"); } catch { window.location.href = "/user/booking"; }
            }
            return;
        }

        if (s.includes("profile")) {
            try { router.push("/profile"); } catch { window.location.href = "/profile"; }
            return;
        }

        if (s.includes("notification") || s.includes("notifications")) {
            try { router.push("/notifications"); } catch { window.location.href = "/notifications"; }
            return;
        }

        if (s.includes("payment") || s.includes("payments") || s.includes("pay")) {
            const rl = String(role || "").toLowerCase();
            if (rl === "admin" || rl === "owner") {
                try { router.push("/admin/payment"); } catch { window.location.href = "/admin/payment"; }
            } else if (rl === "staff") {
                try { router.push("/staff-portal/payment"); } catch { window.location.href = "/staff-portal/payment"; }
            } else {
                try { router.push("/user/payment"); } catch { window.location.href = "/user/payment"; }
            }
            return;
        }

        if (s.includes("staff") || s.includes("staffs") || s.includes("team")) {
            try { router.push("/admin/staff"); } catch { window.location.href = "/admin/staff"; }
            return;
        }

        if (s.includes("setting") || s.includes("settings")) {
            try { router.push("/settings"); } catch { window.location.href = "/settings"; }
            return;
        }

        // forgot-password is not role based
        if (s.includes("forgot") || s.includes("forgot-password") || s.includes("reset password")) {
            try { router.push("/forgot-password"); } catch { window.location.href = "/forgot-password"; }
            return;
        }

        showAppToast("info", "No matching page found for your search");
    };

    const [fullName, setFullName] = useState("");
    const [profileImage, setProfileImage] = useState("");
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [logoutCountdown, setLogoutCountdown] = useState(8);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [notifCount, setNotifCount] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);
    const [recentNotifs, setRecentNotifs] = useState([]);

    const profileMenuRef = useRef(null);
    const notifMenuRef = useRef(null);

    useEffect(() => {
        let active = true;

        async function loadProfile() {
            try {
                const authToken = localStorage.getItem("authToken");

                const res = await fetch("/api/auth/profile", {
                    method: "GET",
                    cache: "no-store",
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
                });

                const data = await res.json().catch(() => ({}));
                if (!res.ok) return;

                const p = data?.profile || {};

                if (active) {
                    setFullName(String(p.name || "").trim());
                    setProfileImage(String(p.photoUrl || "").trim());
                }
            } catch {
                // ignore
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

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                profileMenuRef.current &&
                !profileMenuRef.current.contains(event.target)
            ) {
                setShowProfileMenu(false);
            }

            if (
                notifMenuRef.current &&
                !notifMenuRef.current.contains(event.target)
            ) {
                setNotifOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // fetch unread notification count
    useEffect(() => {
        let mounted = true;

        async function loadCount() {
            try {
                const token = localStorage.getItem("authToken");
                if (!token) return;

                const res = await fetch("/api/auth/notifications", {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await res.json();
                if (!res.ok || !mounted) return;

                const list = data.notifications || [];
                const unread = list.filter((n) => !n.read).length;
                setNotifCount(unread);
            } catch {
                // ignore
            }
        }

        loadCount();
        const id = setInterval(loadCount, 30000);

        return () => {
            mounted = false;
            clearInterval(id);
        };
    }, []);

    async function loadRecent() {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;

            const res = await fetch("/api/auth/notifications", {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            if (!res.ok) return;

            const list = data.notifications || [];
            setRecentNotifs(list.slice(0, 5));
        } catch {
            // ignore
        }
    }

    async function markAsRead(notification) {
        try {
            const token = localStorage.getItem("authToken");

            await fetch("/api/auth/notifications", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    id: notification.id,
                    type: notification.type,
                    read: true,
                }),
            });

            setRecentNotifs((prev) =>
                prev.map((x) =>
                    x.id === notification.id ? { ...x, read: true } : x
                )
            );

            if (!notification.read) {
                setNotifCount((c) => Math.max(0, c - 1));
            }
        } catch {
            // ignore
        }
    }

    async function performLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });

            try {
                localStorage.removeItem("authToken");
            } catch { }

            try {
                sessionStorage.removeItem("authToken");
            } catch { }

            try {
                document.cookie =
                    "authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
            } catch { }

            showAppToast("success", "Logged out successfully.");
        } catch {
            try {
                localStorage.removeItem("authToken");
            } catch { }

            showAppToast(
                "warning",
                "Logged out locally. Server logout may have failed."
            );
        } finally {
            setShowLogoutModal(false);
            setShowProfileMenu(false);
            setNotifOpen(false);

            try {
                router.replace("/login");
            } catch { }

            try {
                if (typeof window !== "undefined") {
                    window.location.replace("/login");
                }
            } catch {
                try {
                    window.location.href = "/login";
                } catch { }
            }
        }
    }

    function handleLogout() {
        setShowProfileMenu(false);
        setShowLogoutModal(true);
    }

    function handleViewProfile() {
        setShowProfileMenu(false);
        router.push("/profile");
    }

    function handleSettings() {
        setShowProfileMenu(false);
        router.push("/settings");
    }

    function formatNotifDate(date) {
        if (!date) return "";
        const d = new Date(date);

        return d.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    }

    return (
        <>
            {/* LOGOUT MODAL */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Confirm Logout
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    You will be logged out automatically in{" "}
                                    {logoutCountdown > 0
                                        ? `${logoutCountdown} seconds`
                                        : "..."}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowLogoutModal(false)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-orange-100">
                            <div
                                className="h-full rounded-full bg-orange-500 transition-all duration-1000"
                                style={{ width: `${(logoutCountdown / 8) * 100}%` }}
                            />
                        </div>

                        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setShowLogoutModal(false)}
                                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                Stay Logged In
                            </button>

                            <button
                                type="button"
                                onClick={() => void performLogout()}
                                className="rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                            >
                                Logout Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NAVBAR */}
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
                <div className="px-3 py-3 sm:px-5 lg:px-6">
                    <div className="flex flex-col gap-3">
                        {/* TOP ROW */}
                        <div className="flex items-center justify-between gap-3">
                            {/* LEFT */}
                            <div className="flex min-w-0 items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onMenuClick}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-orange-300 hover:text-orange-500 lg:hidden"
                                    aria-label="Open sidebar"
                                >
                                    <Menu size={18} />
                                </button>

                                <div className="min-w-0">
                                    <p className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500 sm:block">
                                        SA Tours & Travels
                                    </p>

                                    <p className="truncate text-sm font-medium text-slate-600 sm:mt-1 sm:text-base">
                                        Welcome back,{" "}
                                        <span className="font-semibold text-slate-900">
                                            {fullName || "User"}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* RIGHT */}
                            <div className="flex items-center gap-2 sm:gap-3">
                                {/* Desktop Search */}
                                <div className="hidden xl:block">
                                    <div className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                                        <Search
                                            size={16}
                                            className="shrink-0 text-slate-400"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Search pages (e.g. booking, payments, profile, settings)"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleSearch(searchQuery);
                                                }
                                            }}
                                            className="w-full min-w-[220px] bg-transparent text-sm text-slate-700 outline-none xl:min-w-[280px]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleSearch(searchQuery)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded bg-transparent text-slate-500 hover:text-slate-700"
                                            aria-label="Search"
                                        >
                                            <Search size={14} />
                                        </button>
                                    </div>
                                </div>

                                <NotificationBell />

                                {/* Profile Dropdown */}
                                <div className="relative" ref={profileMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowProfileMenu((prev) => !prev)}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm transition hover:border-orange-300 sm:gap-3 sm:px-3"
                                    >
                                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-200 sm:h-11 sm:w-11">
                                            {profileImage ? (
                                                <Image
                                                    src={profileImage}
                                                    alt={fullName || "Profile"}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <User size={18} className="text-white sm:hidden" />
                                            )}

                                            {!profileImage && (
                                                <span className="hidden sm:flex">
                                                    <User size={20} className="text-white" />
                                                </span>
                                            )}
                                        </div>

                                        <div className="hidden min-w-0 text-left md:block">
                                            <p className="max-w-[120px] truncate text-sm font-semibold text-slate-900 lg:max-w-[160px]">
                                                {fullName || "Dashboard User"}
                                            </p>
                                            <p className="text-xs text-slate-500">{role}</p>
                                        </div>

                                        <ChevronDown
                                            size={16}
                                            className={`hidden text-slate-500 transition md:block ${showProfileMenu ? "rotate-180" : ""
                                                }`}
                                        />
                                    </button>

                                    {showProfileMenu && (
                                        <div className="absolute right-0 z-50 mt-3 w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                            <button
                                                type="button"
                                                onClick={handleViewProfile}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-orange-600"
                                            >
                                                <User size={16} />
                                                View Profile
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleSettings}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-orange-600"
                                            >
                                                <Settings size={16} />
                                                Settings
                                            </button>

                                            <div className="my-2 border-t border-slate-100" />

                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                                            >
                                                <LogOut size={16} />
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mobile / Tablet Search */}
                        <div className="block xl:hidden">
                            <div className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                                <Search size={16} className="shrink-0 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search pages..."
                                    className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}