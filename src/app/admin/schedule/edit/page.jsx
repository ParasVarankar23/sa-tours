"use client";

import { useAuth } from "@/hooks/useAuth";
import { showAppToast } from "@/lib/client/toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, MapPin, Save } from "lucide-react";

function timeToMinutes(t) {
    if (!t) return null;
    const parts = String(t).split(":");
    if (parts.length < 2) return null;
    const hh = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
}

function minutesToTime(m) {
    if (m === null || m === undefined || Number.isNaN(m)) return "";
    const wrap = ((m % (24 * 60)) + 24 * 60) % (24 * 60);
    const hh = Math.floor(wrap / 60)
        .toString()
        .padStart(2, "0");
    const mm = (wrap % 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
}

export default function EditSchedulePage() {
    const router = useRouter();
    const params = useSearchParams();
    const busId = params?.get("busId") || "";
    const date = params?.get("date") || "";

    const { user, loading: authLoading } = useAuth();

    const [bus, setBus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [localStartTime, setLocalStartTime] = useState("");
    const [localEndTime, setLocalEndTime] = useState("");
    const [localStops, setLocalStops] = useState([]);
    const [scheduleDate, setScheduleDate] = useState(date || "");

    useEffect(() => {
        if (!busId) return;

        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/bus");
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to load buses");

                const found = (data.buses || []).find((b) => b.busId === busId || b.id === busId);

                if (!found) {
                    showAppToast("error", "Bus not found");
                    setLoading(false);
                    return;
                }

                setBus(found);
                setLocalStartTime(found.startTime || "");
                setLocalEndTime(found.endTime || "");
                setLocalStops((found.stops || []).map((s) => ({ ...s })));
            } catch (err) {
                console.error(err);
                showAppToast("error", err.message || "Failed to load bus");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [busId]);

    const onChangeStartTime = (newTime) => {
        const prev = timeToMinutes(localStartTime);
        const now = timeToMinutes(newTime);

        if (prev === null || now === null) {
            setLocalStartTime(newTime);
            return;
        }

        const delta = now - prev;

        const shifted = (localStops || []).map((s) => {
            const orig = timeToMinutes(s.time || s.stopTime || "");
            if (orig === null) return { ...s };
            return { ...s, time: minutesToTime(orig + delta) };
        });

        const prevEnd = timeToMinutes(localEndTime);
        const newEnd = prevEnd === null ? localEndTime : minutesToTime(prevEnd + delta);

        setLocalStartTime(newTime);
        setLocalStops(shifted);
        setLocalEndTime(newEnd);
    };

    const onChangeStopTime = (index, value) => {
        setLocalStops((prev) => {
            const updated = (prev || []).map((s) => ({ ...(s || {}) }));
            const orig = updated[index] && (updated[index].time || updated[index].stopTime || "");
            const origMin = timeToMinutes(orig);
            const newMin = timeToMinutes(value);

            if (updated[index]) updated[index].time = value;

            if (origMin === null || newMin === null) {
                return updated;
            }

            const delta = newMin - origMin;

            for (let i = index + 1; i < updated.length; i++) {
                const sMin = timeToMinutes(updated[i].time || updated[i].stopTime || "");
                if (sMin !== null) {
                    updated[i].time = minutesToTime(sMin + delta);
                }
            }

            const prevEnd = timeToMinutes(localEndTime);
            if (prevEnd !== null) {
                setLocalEndTime(minutesToTime(prevEnd + delta));
            }

            if (index === 0) {
                const prevStart = timeToMinutes(localStartTime);
                if (prevStart !== null) {
                    setLocalStartTime(minutesToTime(prevStart + delta));
                }
            }

            return updated;
        });
    };

    const onChangeStopName = (index, value) => {
        setLocalStops((prev) => {
            const updated = (prev || []).map((s) => ({ ...(s || {}) }));
            if (updated[index]) updated[index].stopName = value;
            return updated;
        });
    };

    const handleSave = async () => {
        if (!bus) return;
        if (saving) return;

        setSaving(true);
        try {
            const schedulePayload = {
                busId: bus.busId || bus.id,
                date: scheduleDate || date || "",
                startTime: localStartTime || "",
                endTime: localEndTime || "",
                stops: (localStops || []).map((s) => ({
                    stopName: s.stopName || "",
                    time: s.time || "",
                })),
                available: true,
            };

            const res = await fetch("/api/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(schedulePayload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save schedule");

            const origDate = date || "";
            const newDate = schedulePayload.date || "";

            if (newDate && origDate && newDate !== origDate) {
                const delRes = await fetch(
                    `/api/schedule?busId=${encodeURIComponent(schedulePayload.busId)}&date=${encodeURIComponent(origDate)}`,
                    { method: "DELETE" }
                );

                if (!delRes.ok) {
                    const delData = await delRes.json().catch(() => ({}));
                    console.warn("Failed to delete old schedule date:", delData.error || delRes.statusText);
                }
            }

            showAppToast("success", "Schedule updated successfully");
            router.push("/admin/schedule");
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to update schedule");
        } finally {
            setSaving(false);
        }
    };

    if (authLoading) return null;

    const allowedRoles = ["admin", "owner"];

    if (!user || !allowedRoles.includes(user.role)) {
        return (
            <div className="p-6">
                <div className="rounded-3xl border border-red-100 bg-red-50 p-6">
                    <h2 className="text-lg font-bold text-red-700">No access</h2>
                    <p className="mt-1 text-sm text-red-600">You need admin access to edit schedules.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 w-56 rounded bg-slate-200"></div>
                        <div className="h-4 w-80 rounded bg-slate-100"></div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="h-20 rounded-2xl bg-slate-100"></div>
                            <div className="h-20 rounded-2xl bg-slate-100"></div>
                        </div>
                        <div className="h-20 rounded-2xl bg-slate-100"></div>
                        <div className="h-40 rounded-2xl bg-slate-100"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
            <div className="mx-auto max-w-6xl">
                {/* Top Header */}
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                        <button
                            onClick={() => router.back()}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                Edit Schedule
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Update timing, date, and stop details for this bus schedule.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 shadow-sm">
                        <p className="text-sm font-semibold text-orange-700">
                            Bus: <span className="text-slate-900">{bus?.busNumber || "—"}</span>
                        </p>
                        <p className="mt-1 text-xs text-orange-600">
                            Route: {bus?.routeName || "Not available"}
                        </p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
                    {/* Schedule Info */}
                    <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-2 flex items-center gap-2 text-slate-600">
                                <Clock3 className="h-4 w-4" />
                                <span className="text-sm font-medium">Start Time</span>
                            </div>
                            <input
                                value={localStartTime}
                                onChange={(e) => onChangeStartTime(e.target.value)}
                                type="time"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-2 flex items-center gap-2 text-slate-600">
                                <Clock3 className="h-4 w-4" />
                                <span className="text-sm font-medium">End Time</span>
                            </div>
                            <input
                                value={localEndTime}
                                onChange={(e) => setLocalEndTime(e.target.value)}
                                type="time"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-2 flex items-center gap-2 text-slate-600">
                                <CalendarDays className="h-4 w-4" />
                                <span className="text-sm font-medium">Schedule Date</span>
                            </div>
                            <input
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                type="date"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                        </div>
                    </div>

                    {/* Stops Section */}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 lg:p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Stops & Timing</h3>
                                <p className="text-sm text-slate-500">
                                    Edit stop names and times. Changing one stop time will shift later stops automatically.
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                                Total Stops: {localStops.length}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {(localStops || []).map((s, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                                >
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                                            {i + 1}
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">
                                            Stop {i + 1}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px]">
                                        <div>
                                            <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                                <MapPin className="h-3.5 w-3.5" />
                                                Stop Name
                                            </label>
                                            <input
                                                value={s.stopName || ""}
                                                onChange={(e) => onChangeStopName(i, e.target.value)}
                                                placeholder={`Enter stop ${i + 1} name`}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                                <Clock3 className="h-3.5 w-3.5" />
                                                Time
                                            </label>
                                            <input
                                                type="time"
                                                value={s.time || ""}
                                                onChange={(e) => onChangeStopTime(i, e.target.value)}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? "Updating..." : "Update Schedule"}
                        </button>

                        <button
                            onClick={() => router.back()}
                            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}