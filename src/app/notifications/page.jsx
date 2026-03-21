"use client";

import { showAppToast } from "@/lib/client/toast";
import {
    Bell,
    CheckCheck,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function NotificationsPage() {
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    async function load() {
        setLoading(true);
        try {
            const token = localStorage.getItem("authToken");
            const res = await fetch("/api/auth/notifications", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load notifications");

            const list = Array.isArray(data.notifications) ? data.notifications : [];
            setNotifications(list);

            try {
                const params = new URLSearchParams(window.location.search);
                if (params.get("show") === "all") {
                    setItemsPerPage(list.length || 1);
                } else {
                    setItemsPerPage(10);
                }
            } catch {
                setItemsPerPage(10);
            }

            setCurrentPage(1);
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to load notifications");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const markRead = async (n, value = true, silent = false) => {
        try {
            const token = localStorage.getItem("authToken");
            const res = await fetch("/api/auth/notifications", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    id: n.id,
                    type: n.type,
                    read: !!value,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update");

            setNotifications((prev) =>
                prev.map((x) => (x.id === n.id ? { ...x, read: !!value } : x))
            );

            if (!silent) {
                showAppToast(
                    "success",
                    value ? "Notification marked as read" : "Notification marked as unread"
                );
            }
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to update notification");
        }
    };

    const markAllRead = async () => {
        try {
            const unread = notifications.filter((n) => !n.read);

            if (unread.length === 0) {
                return showAppToast("info", "All notifications are already read");
            }

            for (const n of unread) {
                await markRead(n, true, true);
            }

            showAppToast("success", "All notifications marked as read");
        } catch {
            // handled inside markRead
        }
    };

    const totalCount = notifications.length;
    const unreadCount = notifications.filter((n) => !n.read).length;
    const readCount = notifications.filter((n) => n.read).length;

    const latestNotification = useMemo(() => {
        if (!notifications.length) return null;

        return [...notifications].sort((a, b) => {
            const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
        })[0];
    }, [notifications]);

    function formatDate(date) {
        if (!date) return "—";
        const d = new Date(date);

        return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }

    function formatTime(date) {
        if (!date) return "";
        const d = new Date(date);

        return d.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    }


    /* =========================
       Pagination Logic
    ========================= */
    const totalPages = Math.ceil(notifications.length / (itemsPerPage || 1));

    const paginatedNotifications = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return notifications.slice(startIndex, endIndex);
    }, [notifications, currentPage, itemsPerPage]);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const startRecord =
        notifications.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endRecord = Math.min(currentPage * itemsPerPage, notifications.length);

    return (
        <div className="min-h-screen w-full bg-[#f8fafc] p-3 md:p-4 lg:p-5">
            {/* Header */}
            <div className="mb-5 rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-[#ea580c]">
                            <Bell className="h-4 w-4" />
                            NOTIFICATION CENTER
                        </div>

                        <h1 className="mt-3 text-2xl font-bold text-slate-900 md:text-4xl lg:text-[40px]">
                            Notifications
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">
                            View recent booking updates, payment alerts, and important account activity in one place.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={load}
                            disabled={loading}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>

                        <button
                            onClick={markAllRead}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
                        >
                            <CheckCheck className="h-4 w-4" />
                            Mark All Read
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Notifications"
                    value={totalCount}
                    subtitle="All account updates"
                    icon={<Bell className="h-5 w-5 text-white" />}
                    iconBg="bg-orange-500"
                />

                <StatCard
                    title="Unread"
                    value={unreadCount}
                    subtitle="Pending to review"
                    icon={<Clock3 className="h-5 w-5 text-white" />}
                    iconBg="bg-blue-500"
                />

                <StatCard
                    title="Read"
                    value={readCount}
                    subtitle="Already reviewed"
                    icon={<CheckCircle2 className="h-5 w-5 text-white" />}
                    iconBg="bg-emerald-500"
                />

                <StatCard
                    title="Latest Update"
                    value={latestNotification ? formatDate(latestNotification.createdAt) : "—"}
                    subtitle={
                        latestNotification ? formatTime(latestNotification.createdAt) : "No data"
                    }
                    icon={<Bell className="h-5 w-5 text-white" />}
                    iconBg="bg-violet-500"
                />
            </div>

            {/* Notifications List */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                {/* Top Bar */}
                <div className="border-b border-slate-200 px-4 py-4 md:px-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 md:text-xl">
                                Recent Notifications
                            </h2>
                            <p className="mt-1 text-xs text-slate-500 md:text-sm">
                                Showing {startRecord}-{endRecord} of {notifications.length} notifications
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                            <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                            {unreadCount} unread
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="px-6 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
                            <RefreshCw className="h-5 w-5 animate-spin text-[#f97316]" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-700">
                            Loading notifications...
                        </p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                            <Bell className="h-5 w-5 text-slate-500" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-800">
                            No notifications found
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            New alerts and updates will appear here.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4 p-4 md:p-5">
                            {paginatedNotifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`rounded-3xl border p-4 transition md:p-5 ${n.read
                                        ? "border-slate-200 bg-white hover:border-slate-300"
                                        : "border-orange-100 bg-orange-50/50 hover:border-orange-200"
                                        }`}
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        {/* Left */}
                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                            <div
                                                className={`mt-1 h-3 w-3 shrink-0 rounded-full ${n.read ? "bg-slate-300" : "bg-orange-500"
                                                    }`}
                                            />

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-sm font-bold text-slate-900 md:text-base">
                                                        {n.title || "Notification"}
                                                    </h3>

                                                    <span
                                                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${n.read
                                                            ? "bg-slate-100 text-slate-600"
                                                            : "bg-orange-100 text-[#ea580c]"
                                                            }`}
                                                    >
                                                        {n.read ? "Read" : "Unread"}
                                                    </span>
                                                </div>

                                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                                    {typeof n.message === 'object' ? JSON.stringify(n.message) : (n.message || "No message available")}
                                                </p>

                                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                                                        <Clock3 className="h-3.5 w-3.5" />
                                                        {formatDate(n.createdAt)}
                                                    </div>

                                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                                                        <Clock3 className="h-3.5 w-3.5" />
                                                        {formatTime(n.createdAt)}
                                                    </div>

                                                    {n.type ? (
                                                        <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 uppercase tracking-wide text-[10px] font-semibold text-slate-500">
                                                            {n.type}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Actions */}
                                        <div className="flex flex-wrap items-center gap-2 lg:min-w-[260px] lg:justify-end">
                                            <button
                                                onClick={() => markRead(n, !n.read)}
                                                className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-semibold transition md:text-sm ${n.read
                                                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                    : "border border-orange-200 bg-white text-[#ea580c] hover:bg-orange-50"
                                                    }`}
                                            >
                                                <CheckCheck className="h-4 w-4" />
                                                {n.read ? "Mark Unread" : "Mark Read"}
                                            </button>

                                        </div>
                                    </div>

                                    {/* Clean Data Preview */}
                                    {n.data && Object.keys(n.data).length > 0 ? (
                                        <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                Booking / Payment Details
                                            </p>

                                            <NotificationDetails data={n.data} />
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="border-t border-slate-200 px-4 py-4 md:px-5">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <p className="text-xs text-slate-500 md:text-sm">
                                        Page <span className="font-semibold text-slate-800">{currentPage}</span> of{" "}
                                        <span className="font-semibold text-slate-800">{totalPages}</span>
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Prev */}
                                        <button
                                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Prev
                                        </button>

                                        {/* Page Numbers */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`inline-flex h-10 min-w-[40px] items-center justify-center rounded-2xl px-3 text-sm font-semibold transition ${currentPage === page
                                                        ? "bg-[#f97316] text-white shadow-sm"
                                                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Next */}
                                        <button
                                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

/* =========================
   Small Components
========================= */
function StatCard({ title, value, subtitle, icon, iconBg }) {
    return (
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm text-slate-500">{title}</p>
                    <h3 className="mt-2 break-words text-xl font-bold text-slate-900 md:text-2xl">
                        {value}
                    </h3>
                    <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
                </div>

                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${iconBg}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function NotificationDetails({ data }) {
    const booking = data?.booking || data || {};
    const payment = data?.payment || data || {};

    function formatValue(v) {
        if (v === undefined || v === null || v === "") return "";
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
        // If it's an object, prefer common id-like fields, otherwise stringify
        if (typeof v === "object") {
            if (v.id) return String(v.id);
            if (v.paymentId) return String(v.paymentId);
            if (v.orderId) return String(v.orderId);
            if (v.amount) return String(v.amount);
            try {
                return JSON.stringify(v);
            } catch {
                return String(v);
            }
        }
        return String(v);
    }

    const bookingFields = [
        { label: "Bus Number", value: formatValue(booking?.busNumber || booking?.busId || "") },
        { label: "Passenger Name", value: formatValue(booking?.name || booking?.passengerName || "") },
        { label: "Seat Number", value: formatValue(booking?.seatNo || booking?.seatNumber || "") },
        { label: "Travel Date", value: formatValue(booking?.date || booking?.travelDate || "") },
        {
            label: "Route",
            value: formatValue(booking?.pickup && booking?.drop ? `${booking.pickup} → ${booking.drop}` : ""),
        },
        { label: "Pickup Time", value: formatValue(booking?.pickupTime || "") },
        { label: "Drop Time", value: formatValue(booking?.dropTime || "") },
        {
            label: "Fare",
            value:
                booking?.fare !== undefined && booking?.fare !== null && booking?.fare !== ""
                    ? `₹${Number(booking.fare).toFixed(2)}`
                    : "",
        },
        { label: "Payment ID", value: formatValue(booking?.payment || booking?.paymentId || "") },
        { label: "Payment Method", value: formatValue(booking?.paymentMethod || "") },
        { label: "Phone", value: formatValue(booking?.phone || booking?.phoneNumber || "") },
        { label: "Email", value: formatValue(booking?.email || "") },
        {
            label: "Created At",
            value: booking?.createdAt ? new Date(booking.createdAt).toLocaleString("en-IN") : "",
        },
    ].filter((item) => item.value);

    const paymentFields = [
        { label: "Payment ID", value: formatValue(payment?.paymentId || payment?.id || "") },
        { label: "Order ID", value: formatValue(payment?.orderId || "") },
        {
            label: "Amount",
            value:
                payment?.amount !== undefined && payment?.amount !== null && payment?.amount !== ""
                    ? `₹${Number(payment.amount).toFixed(2)}`
                    : "",
        },
        { label: "Currency", value: formatValue(payment?.currency || "") },
        { label: "Method", value: formatValue(payment?.paymentMethod || payment?.method || "") },
        {
            label: "Paid At",
            value: payment?.createdAt ? new Date(payment.createdAt).toLocaleString("en-IN") : "",
        },
    ].filter((item) => item.value);

    const fieldsToShow = bookingFields.length > 0 ? bookingFields : paymentFields;

    if (!fieldsToShow.length) {
        return (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
                No additional details available.
            </div>
        );
    }

    return (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {fieldsToShow.map((item, index) => (
                <div
                    key={`${item.label}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {item.label}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                        {item.value}
                    </p>
                </div>
            ))}
        </div>
    );
}