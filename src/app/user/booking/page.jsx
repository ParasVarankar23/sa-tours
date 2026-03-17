"use client";

import SeatLayout from "@/components/SeatLayout";
import { showAppToast } from "@/lib/client/toast";
import {
    BusFront,
    CalendarDays,
    Clock3,
    Eye,
    MapPin,
    Route,
    ShieldCheck,
    Ticket,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function BookingPage() {
    const [date, setDate] = useState("");
    const [buses, setBuses] = useState([]);
    const [schedules, setSchedules] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedBus, setSelectedBus] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [bRes, sRes] = await Promise.all([
                    fetch("/api/bus"),
                    fetch("/api/schedule"),
                ]);

                const bData = await bRes.json();
                const sData = await sRes.json();

                if (!bRes.ok) {
                    throw new Error(bData.error || "Failed to load buses");
                }

                if (!sRes.ok) {
                    throw new Error(sData.error || "Failed to load schedules");
                }

                setBuses(bData.buses || []);
                setSchedules(sData.schedules || {});
            } catch (err) {
                console.error(err);
                showAppToast("error", err.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, []);

    const availableBuses = useMemo(() => {
        if (!date) return [];

        return buses.filter((bus) => {
            const busSched = schedules[bus.busId] || {};
            return busSched[date] && busSched[date].available;
        });
    }, [date, buses, schedules]);

    return (
        <div className="min-h-screen w-full bg-[#f8fafc] p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
                        SA TOURS BOOKING
                    </p>
                    <h1 className="mt-1 text-3xl font-bold text-slate-900">
                        Book a Bus — Select Date
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Choose a date to see available buses and view the seat layout before booking.
                    </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm">
                    <ShieldCheck className="h-5 w-5 text-[#f97316]" />
                    <span className="text-sm font-semibold text-slate-700">
                        Live Bus Availability
                    </span>
                </div>
            </div>

            {/* Top Section */}
            <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
                <SummaryCard
                    title="Selected Date"
                    value={date || "--"}
                    icon={<CalendarDays className="h-6 w-6 text-[#f97316]" />}
                />

                <SummaryCard
                    title="Available Buses"
                    value={date ? availableBuses.length : 0}
                    icon={<BusFront className="h-6 w-6 text-[#f97316]" />}
                />

                <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <label className="mb-3 block text-sm font-semibold text-slate-700">
                        Select Travel Date
                    </label>

                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <CalendarDays className="h-5 w-5 text-[#f97316]" />
                        <input
                            type="date"
                            className="w-full bg-transparent text-slate-900 outline-none"
                            value={date}
                            onChange={(e) => {
                                setDate(e.target.value);
                                setSelectedBus(null);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Bus List */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Available Buses
                    </h2>
                    <p className="text-sm text-slate-500">
                        {date
                            ? `Showing ${availableBuses.length} bus(es) available on ${date}`
                            : "Please select a date to view available buses"}
                    </p>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
                            <p className="text-sm font-medium text-slate-700">
                                Loading buses...
                            </p>
                        </div>
                    ) : !date ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
                            <p className="text-sm font-medium text-slate-700">
                                Select a date first
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Available buses will appear here after choosing a travel date.
                            </p>
                        </div>
                    ) : availableBuses.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
                            <p className="text-sm font-medium text-slate-700">
                                No buses available for this date
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Please try another date or contact admin.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5">
                            {availableBuses.map((bus) => (
                                <div
                                    key={bus.busId}
                                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
                                >
                                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                                        {/* Left Details */}
                                        <div className="flex-1">
                                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                                                        <BusFront className="h-7 w-7 text-[#f97316]" />
                                                    </div>

                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-900">
                                                            {bus.busNumber}
                                                        </h3>
                                                        <p className="text-sm text-slate-500">
                                                            {bus.busName} • {bus.busType}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-xs font-semibold text-[#f97316]">
                                                    {bus.seatLayout} Seats
                                                </div>
                                            </div>

                                            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                                                <InfoCard
                                                    icon={<Route className="h-4 w-4 text-[#f97316]" />}
                                                    label="Route"
                                                    value={bus.routeName || "--"}
                                                />
                                                <InfoCard
                                                    icon={<MapPin className="h-4 w-4 text-[#f97316]" />}
                                                    label="Path"
                                                    value={`${bus.startPoint || "--"} → ${bus.endPoint || "--"}`}
                                                />
                                                <InfoCard
                                                    icon={<Clock3 className="h-4 w-4 text-[#f97316]" />}
                                                    label="Timing"
                                                    value={`${bus.startTime || "--:--"} → ${bus.endTime || "--:--"}`}
                                                />
                                            </div>
                                        </div>

                                        {/* Right Button */}
                                        <div className="flex xl:justify-end">
                                            <button
                                                className="inline-flex items-center gap-2 rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#ea580c]"
                                                onClick={() => setSelectedBus(bus)}
                                            >
                                                <Eye className="h-5 w-5" />
                                                View Seats
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Seat Layout Modal */}
            {selectedBus && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                        {/* Modal Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-white px-6 py-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
                                    SEAT LAYOUT VIEW
                                </p>
                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    {selectedBus.busNumber} — {selectedBus.routeName}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {selectedBus.startPoint} → {selectedBus.endPoint} • {selectedBus.startTime} → {selectedBus.endTime}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedBus(null)}
                                className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            {/* Bus Summary */}
                            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <SummaryCard
                                    title="Bus Number"
                                    value={selectedBus.busNumber || "--"}
                                    icon={<BusFront className="h-6 w-6 text-[#f97316]" />}
                                />
                                <SummaryCard
                                    title="Bus Type"
                                    value={selectedBus.busType || "--"}
                                    icon={<BusFront className="h-6 w-6 text-[#f97316]" />}
                                />
                                <SummaryCard
                                    title="Travel Date"
                                    value={date || "--"}
                                    icon={<CalendarDays className="h-6 w-6 text-[#f97316]" />}
                                />
                                <SummaryCard
                                    title="Seat Layout"
                                    value={`${selectedBus.seatLayout || "--"} Seats`}
                                    icon={<Ticket className="h-6 w-6 text-[#f97316]" />}
                                />
                            </div>

                            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                                <InfoCard
                                    icon={<Route className="h-4 w-4 text-[#f97316]" />}
                                    label="Route Name"
                                    value={selectedBus.routeName || "--"}
                                />
                                <InfoCard
                                    icon={<MapPin className="h-4 w-4 text-[#f97316]" />}
                                    label="From → To"
                                    value={`${selectedBus.startPoint || "--"} → ${selectedBus.endPoint || "--"}`}
                                />
                                <InfoCard
                                    icon={<Clock3 className="h-4 w-4 text-[#f97316]" />}
                                    label="Timing"
                                    value={`${selectedBus.startTime || "--:--"} → ${selectedBus.endTime || "--:--"}`}
                                />
                            </div>

                            {/* Seat Layout Section */}
                            <div className="rounded-3xl border border-orange-100 bg-orange-50/30 p-5">
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Bus Seat Layout
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        View the full seat layout before starting the booking process.
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                                    <SeatLayout
                                        layout={String(selectedBus.seatLayout || "31")}
                                        cabins={selectedBus.cabins || []}
                                    />
                                </div>
                            </div>

                            {/* Footer Action */}
                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                                <button
                                    onClick={() => setSelectedBus(null)}
                                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Close
                                </button>

                                <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#059669] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-[#047857]">
                                    <Ticket className="h-5 w-5" />
                                    Start Booking
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
                    <h3 className="text-lg font-bold text-slate-900 break-words">
                        {value}
                    </h3>
                </div>
            </div>
        </div>
    );
}

function InfoCard({ icon, label, value }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
                {icon}
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                </p>
            </div>
            <p className="text-sm font-medium text-slate-800">{value}</p>
        </div>
    );
}