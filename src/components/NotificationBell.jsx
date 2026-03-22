"use client";

import { showAppToast } from "@/lib/client/toast";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function NotificationBell({ pollInterval = 10000 }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [meta, setMeta] = useState({ total: 0, unreadCount: 0 });
    const [loading, setLoading] = useState(false);
    const mounted = useRef(true);
    const containerRef = useRef(null);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const fetchList = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;
            const res = await fetch("/api/auth/notifications", { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (!res.ok) return;
            if (!mounted.current) return;
            setNotifications(data.notifications || []);
            setMeta({ total: data.total || (data.notifications || []).length, unreadCount: data.unreadCount || 0 });
        } catch (e) {
            // ignore
        }
    };

    useEffect(() => {
        fetchList();
        const id = setInterval(fetchList, pollInterval);
        return () => clearInterval(id);
    }, [pollInterval]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleDocClick(e) {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleDocClick);
        return () => document.removeEventListener("mousedown", handleDocClick);
    }, []);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markRead = async (n) => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;
            const res = await fetch("/api/auth/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id: n.id, type: n.type, read: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to mark read");
            setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
            showAppToast("success", "Notification marked read");
        } catch (e) {
            showAppToast("error", e.message || "Failed to update notification");
        }
    };

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;
            const unread = notifications.filter((n) => !n.read);
            for (const n of unread) {
                await fetch("/api/auth/notifications", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ id: n.id, type: n.type, read: true }),
                });
            }
            setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
            showAppToast("success", "All notifications marked as read");
        } catch (e) {
            showAppToast("error", e.message || "Failed to mark all read");
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={async () => { setOpen((s) => !s); if (!open) await fetchList(); }}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-orange-300 hover:text-orange-500 sm:h-11 sm:w-11"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-semibold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="
    fixed left-1/2 top-[88px] z-[9999]
    w-[calc(100vw-24px)] max-w-[calc(100vw-24px)]
    -translate-x-1/2
    rounded-3xl border border-slate-200 bg-white shadow-2xl
    sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-3
    sm:w-[380px] sm:max-w-[380px] sm:translate-x-0
  "
                >
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                            <p className="text-xs text-slate-500">Recent updates & alerts • {meta.total || 0} total</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={markAllRead} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-50 flex-nowrap whitespace-nowrap">Mark all read</button>
                            <button onClick={() => { setOpen(false); window.open('/notifications?show=all&page=1', '_blank'); }} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 flex-nowrap whitespace-nowrap">View all</button>
                        </div>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto p-3">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                                <Bell className="h-6 w-6 text-slate-400" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">No recent notifications</p>
                                <p className="mt-1 text-xs text-slate-500">New alerts will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {notifications.slice(0, 20).map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => setOpen(false)}
                                        className={`rounded-2xl border p-3 transition ${n.read ? 'border-slate-200 bg-white' : 'border-orange-100 bg-orange-50/70'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? 'bg-slate-300' : 'bg-orange-500'}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-900">{n.title || 'Notification'}</p>
                                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{typeof n.message === 'object' ? JSON.stringify(n.message) : (n.message || 'No message')}</p>
                                                <p className="mt-2 text-[11px] text-slate-400">{n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, day: '2-digit', month: 'short' }) : ''}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {!n.read && (
                                                <button onClick={(e) => { e.stopPropagation(); markRead(n); }} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white">Mark as read</button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); setOpen(false); window.open('/notifications?show=all&page=1', '_blank'); }} className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600">Open</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
