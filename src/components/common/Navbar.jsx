/* eslint-disable react/prop-types */
"use client";

import { showAppToast } from "@/lib/client/toast";
import {
    Bell,
    ChevronDown,
    LogOut,
    Menu,
    Search,
    Settings,
    User,
    X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function Navbar({
    role = "User",
    onMenuClick = () => { },
}) {
    const router = useRouter();

    const [fullName, setFullName] = useState("");
    const [profileImage, setProfileImage] = useState("");
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [logoutCountdown, setLogoutCountdown] = useState(8);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const profileMenuRef = useRef(null);

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
                // Navbar should still work even if profile fetch fails
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
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function performLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            localStorage.removeItem("authToken");
            showAppToast("success", "Logged out successfully.");
        } catch {
            localStorage.removeItem("authToken");
            showAppToast("warning", "Logged out locally. Server logout may have failed.");
        } finally {
            setShowLogoutModal(false);
            setShowProfileMenu(false);
            router.replace("/login");
            router.refresh();
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

    return (
        <>
            {/* LOGOUT MODAL */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Confirm Logout</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    You will be logged out automatically in {logoutCountdown} seconds.
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
                <div className="px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex w-full items-center justify-between gap-3">
                            {/* LEFT SIDE */}
                            <div className="flex min-w-0 items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onMenuClick}
                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-orange-300 hover:text-orange-500 lg:hidden"
                                    aria-label="Open sidebar"
                                >
                                    <Menu size={20} />
                                </button>

                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500 sm:text-xs">
                                        SA Tours Dashboard
                                    </p>

                                    <p className="mt-1 truncate text-sm font-medium text-slate-600 sm:text-base">
                                        Welcome back,{" "}
                                        <span className="font-semibold text-slate-900">
                                            {fullName || "User"}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* RIGHT SIDE */}
                            <div className="flex items-center gap-3">
                                {/* Search (desktop only) */}
                                <div className="hidden xl:block">
                                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                                        <Search size={17} className="shrink-0 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search pages..."
                                            className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none sm:min-w-[220px] lg:min-w-[280px] xl:min-w-[320px]"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 sm:gap-3">
                                    {/* Notifications */}
                                    <button
                                        type="button"
                                        className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-orange-300 hover:text-orange-500"
                                        aria-label="Notifications"
                                    >
                                        <Bell size={18} />
                                        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white" />
                                    </button>

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

                                            <div className="hidden min-w-0 text-left lg:block">
                                                <p className="max-w-[150px] truncate text-sm font-semibold text-slate-900 lg:max-w-[180px]">
                                                    {fullName || "Dashboard User"}
                                                </p>
                                                <p className="text-xs text-slate-500">{role}</p>
                                            </div>

                                            <ChevronDown
                                                size={16}
                                                className={`hidden text-slate-500 transition lg:block ${showProfileMenu ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </button>

                                        {showProfileMenu && (
                                            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
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
                        </div>

                        {/* Mobile search row */}
                        <div className="block xl:hidden">
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                                <Search size={17} className="shrink-0 text-slate-400" />
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