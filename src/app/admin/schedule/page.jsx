"use client";

import { showAppToast } from "@/lib/client/toast";
import {
    BusFront,
    CalendarDays,
    CheckCircle2,
    Clock3,
    MapPin,
    Route,
    Save,
    ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function SchedulePage() {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busId, setBusId] = useState("");
    const [date, setDate] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchBuses = async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/bus");
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load buses");
                }

                setBuses(data.buses || []);
            } catch (err) {
                console.error(err);
                showAppToast("error", err.message || "Failed to load buses");
            } finally {
                setLoading(false);
            }
        };

        fetchBuses();
    }, []);

    const selectedBus = useMemo(() => {
        return buses.find((b) => b.busId === busId) || null;
    }, [buses, busId]);

    const handleSetAvailable = async () => {
        if (!busId) return showAppToast("error", "Select a bus");
        if (!date) return showAppToast("error", "Select a date");

        setSaving(true);
        try {
            const res = await fetch("/api/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ busId, date }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to set availability");
            }

            showAppToast("success", "Bus marked available on selected date");
            setBusId("");
            setDate("");
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to set availability");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#f8fafc] p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
                        SA TOURS DASHBOARD
                    </p>
                    <h1 className="mt-1 text-3xl font-bold text-slate-900">
                        Bus Schedule Management
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Assign buses to a specific date and make them available for booking.
                    </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm">
                    <ShieldCheck className="h-5 w-5 text-[#f97316]" />
                    <span className="text-sm font-semibold text-slate-700">
                        Admin Availability Control
                    </span>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    title="Total Buses"
                    value={loading ? "..." : buses.length}
                    icon={<BusFront className="h-6 w-6 text-[#f97316]" />}
                />
                <SummaryCard
                    title="Selected Bus"
                    value={selectedBus ? selectedBus.busNumber : "--"}
                    icon={<Route className="h-6 w-6 text-[#f97316]" />}
                />
                <SummaryCard
                    title="Selected Date"
                    value={date || "--"}
                    icon={<CalendarDays className="h-6 w-6 text-[#f97316]" />}
                />
                <SummaryCard
                    title="Status"
                    value={saving ? "Saving..." : "Ready"}
                    icon={<CheckCircle2 className="h-6 w-6 text-[#f97316]" />}
                />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {/* Left Form Card */}
                <div className="xl:col-span-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-slate-900">
                                Assign Bus Availability
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Select a bus and a date to make it available for user booking.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            {/* Select Bus */}
                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Select Bus
                                </label>

                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                    <BusFront className="h-5 w-5 text-[#f97316]" />
                                    <select
                                        className="w-full bg-transparent text-slate-900 outline-none"
                                        value={busId}
                                        onChange={(e) => setBusId(e.target.value)}
                                        disabled={loading}
                                    >
                                        <option value="">
                                            {loading ? "Loading buses..." : "-- Select bus --"}
                                        </option>
                                        {buses.map((b) => (
                                            <option key={b.busId} value={b.busId}>
                                                {`${b.busNumber} — ${b.routeName} (${b.startPoint} → ${b.endPoint})`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Date */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Select Date
                                </label>

                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                    <CalendarDays className="h-5 w-5 text-[#f97316]" />
                                    <input
                                        className="w-full bg-transparent text-slate-900 outline-none"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Time Preview */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Route Timing
                                </label>

                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <Clock3 className="h-5 w-5 text-[#f97316]" />
                                    <span className="text-sm font-medium text-slate-700">
                                        {selectedBus
                                            ? `${selectedBus.startTime} → ${selectedBus.endTime}`
                                            : "--:-- → --:--"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                disabled={saving || loading}
                                onClick={handleSetAvailable}
                                className="inline-flex items-center gap-2 rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Save className="h-5 w-5" />
                                {saving ? "Saving..." : "Set Available"}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setBusId("");
                                    setDate("");
                                }}
                                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Preview Card */}
                <div className="space-y-6">
                    <div className="rounded-3xl border border-orange-100 bg-orange-50/30 p-5 shadow-sm">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-900">
                                Selected Bus Preview
                            </h3>
                            <p className="text-sm text-slate-500">
                                Quick overview of the selected bus before scheduling.
                            </p>
                        </div>

                        {selectedBus ? (
                            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
                                        <BusFront className="h-6 w-6 text-[#f97316]" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-slate-900">
                                            {selectedBus.busNumber}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {selectedBus.busName} • {selectedBus.busType}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <InfoRow
                                        icon={<Route className="h-4 w-4 text-[#f97316]" />}
                                        label="Route"
                                        value={selectedBus.routeName || "--"}
                                    />

                                    <InfoRow
                                        icon={<MapPin className="h-4 w-4 text-[#f97316]" />}
                                        label="Path"
                                        value={`${selectedBus.startPoint || "--"} → ${selectedBus.endPoint || "--"}`}
                                    />

                                    <InfoRow
                                        icon={<Clock3 className="h-4 w-4 text-[#f97316]" />}
                                        label="Timing"
                                        value={`${selectedBus.startTime || "--:--"} → ${selectedBus.endTime || "--:--"}`}
                                    />

                                    <InfoRow
                                        icon={<CalendarDays className="h-4 w-4 text-[#f97316]" />}
                                        label="Schedule Date"
                                        value={date || "--"}
                                    />

                                    <div className="flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3">
                                        <span className="text-sm font-medium text-slate-700">
                                            Seat Layout
                                        </span>
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#f97316] shadow-sm">
                                            {selectedBus.seatLayout} Seats
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                                <p className="text-sm font-medium text-slate-700">
                                    No bus selected
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Select a bus to preview its route and details.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* =========================
   Small Components
========================= */
function SummaryCard({ title, value, icon }) {
    return (
        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-slate-500">{title}</p>
                    <h3 className="text-xl font-bold text-slate-900 break-words">
                        {value}
                    </h3>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                </p>
                <p className="text-sm font-medium text-slate-800">{value}</p>
            </div>
        </div>
    );
}