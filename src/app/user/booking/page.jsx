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
import { useAuth } from "../../../hooks/useAuth";

function normalizeText(v) {
    return String(v || "").trim();
}

function normalizeKey(v) {
    return normalizeText(v).toLowerCase();
}

function buildRouteStops(bus) {
    if (!bus) return [];
    const middleStops = Array.isArray(bus.stops)
        ? bus.stops
            .map((s) => (typeof s === "string" ? s : s?.stopName))
            .filter(Boolean)
            .map((s) => normalizeText(s))
        : [];

    const resolvePoint = (p) => {
        if (!p) return "";
        if (typeof p === "object") return normalizeText(p.name);
        return normalizeText(p);
    };

    return [resolvePoint(bus.startPoint), ...middleStops, resolvePoint(bus.endPoint)].filter(Boolean);
}

function getStartEnd(bus) {
    const stops = buildRouteStops(bus);
    return { start: stops[0] || "", end: stops.length ? stops[stops.length - 1] : "" };
}

function getStopTime(bus, stopName) {
    if (!bus || !stopName) return "";
    const startName = typeof bus.startPoint === "object" ? normalizeText(bus.startPoint.name) : normalizeText(bus.startPoint);
    const endName = typeof bus.endPoint === "object" ? normalizeText(bus.endPoint.name) : normalizeText(bus.endPoint);

    if (normalizeKey(startName) === normalizeKey(stopName)) return normalizeText(bus.startTime);
    if (normalizeKey(endName) === normalizeKey(stopName)) return normalizeText(bus.endTime);

    const found = (bus.stops || []).find((s) => {
        const name = typeof s === "string" ? s : s?.stopName;
        return normalizeKey(name) === normalizeKey(stopName);
    });

    if (!found) return "";
    return typeof found === "string" ? "" : normalizeText(found.time || found.stopTime || "");
}

function calculateFare({ bus, fromStop, toStop, busType, season }) {
    if (!bus || !fromStop || !toStop) return { fare: 0 };

    const rules = Array.isArray(bus.fareRules) ? bus.fareRules : [];

    const normalizeForMatch = (s) =>
        normalizeKey(String(s || "")).replace(/\b(stand|stn|stop)\b/g, "").replace(/\s+/g, " ").trim();

    const inputFrom = normalizeForMatch(fromStop);
    const inputTo = normalizeForMatch(toStop);

    // Use last-match semantics so later rules override earlier ones.
    for (let i = rules.length - 1; i >= 0; i--) {
        const r = rules[i] || {};
        const rFrom = normalizeForMatch(r.from);
        const rTo = normalizeForMatch(r.to);

        // exact match
        if (rFrom === inputFrom && rTo === inputTo) {
            const fare = Number(r.fare);
            if (Number.isFinite(fare) && fare > 0) return { fare };
            return { fare: 0 };
        }

        // tolerant matches: handle cases like "Borli" vs "Borli Stand"
        const fromMatch = rFrom === inputFrom || rFrom.includes(inputFrom) || inputFrom.includes(rFrom);
        const toMatch = rTo === inputTo || rTo.includes(inputTo) || inputTo.includes(rTo);

        if (fromMatch && toMatch) {
            const fare = Number(r.fare);
            if (Number.isFinite(fare) && fare > 0) return { fare };
            return { fare: 0 };
        }
    }

    return { fare: 0 };
}

export default function BookingPage() {
    const { user } = useAuth();
    const [date, setDate] = useState("");
    const [buses, setBuses] = useState([]);
    const [schedules, setSchedules] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedBus, setSelectedBus] = useState(null);
    const [bookings, setBookings] = useState({});
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [bookingForms, setBookingForms] = useState({});
    const [bookingForm, setBookingForm] = useState({ name: "", phone: "", email: "", pickup: "", pickupTime: "", drop: "", dropTime: "" });
    const [viewBooking, setViewBooking] = useState(null);
    const [computedFares, setComputedFares] = useState({});

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

    const fetchBookings = async () => {
        try {
            if (!selectedBus || !date) {
                setBookings({});
                return;
            }
            const res = await fetch(`/api/booking?busId=${selectedBus.busId}&date=${date}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load bookings");
            // sanitize bookings keys
            const raw = data.bookings || {};
            const entries = Object.entries(raw).filter(([k]) => /^[0-9]+$/.test(k));
            const safe = Object.fromEntries(entries.map(([k, v]) => [k, v && typeof v === "object" ? v : {}]));
            setBookings(safe);
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to load bookings");
        }
    };

    useEffect(() => {
        fetchBookings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBus, date]);

    // compute fares for selected seats whenever forms/selection/bus/schedules change
    useEffect(() => {
        const out = {};

        for (const seat of selectedSeats) {
            const form = bookingForms[String(seat)] || {};

            try {
                const busForPricing = { ...(selectedBus || {}) };
                const sched = (schedules && selectedBus && schedules[selectedBus.busId] && schedules[selectedBus.busId][date]) || null;
                if (sched && sched.pricingOverride) {
                    busForPricing.pricingRules = {
                        ...(selectedBus.pricingRules || {}),
                        ...(sched.pricingOverride || {}),
                    };
                }
                const season = !!(sched && sched.season);
                const fareRes = calculateFare({
                    bus: busForPricing,
                    fromStop: form.pickup,
                    toStop: form.drop,
                    busType: selectedBus?.busType || "AC",
                    season,
                });

                out[seat] = Number(fareRes?.fare || 0);
            } catch (err) {
                out[seat] = 0;
            }
        }

        setComputedFares(out);
    }, [bookingForms, selectedSeats, selectedBus, schedules, date]);

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
                                                    value={(() => {
                                                        const p = getStartEnd(bus);
                                                        return `${p.start || "--"} → ${p.end || "--"}`;
                                                    })()}
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
                                    {(() => {
                                        const p = getStartEnd(selectedBus);
                                        return `${p.start || "--"} → ${p.end || "--"} • ${selectedBus?.startTime || "--:--"} → ${selectedBus?.endTime || "--:--"}`;
                                    })()}
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
                                    value={(() => {
                                        const p = getStartEnd(selectedBus);
                                        return `${p.start || "--"} → ${p.end || "--"}`;
                                    })()}
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
                                        bookedSeats={Object.keys(bookings || {}).map((k) => String(k))}
                                        bookedMap={bookings}
                                        selectedSeats={selectedSeats}
                                        onSelect={(s) => {
                                            const id = String(s);
                                            setSelectedSeats((prev) => {
                                                // toggle
                                                if (prev.includes(id)) {
                                                    // remove seat and its form
                                                    setBookingForms((bf) => {
                                                        const copy = { ...bf };
                                                        delete copy[id];
                                                        return copy;
                                                    });
                                                    return prev.filter((x) => x !== id);
                                                }

                                                // add seat and initialize form (copy top-level bookingForm if present)
                                                setBookingForms((bf) => ({
                                                    ...bf,
                                                    [id]: bf[id] || { ...bookingForm },
                                                }));

                                                return [...prev, id];
                                            });
                                        }}
                                        onViewBooking={(seat, booking) => {
                                            setViewBooking({ seat, booking });
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Booking Footer */}
                            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                {/* Header Row */}
                                <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50">
                                            <Ticket className="h-5 w-5 text-[#f97316]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-500">Selected Seat(s)</p>
                                            <h3 className="text-xl font-bold text-slate-900">
                                                {selectedSeats.length ? selectedSeats.join(", ") : "—"}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                                        {selectedSeats.length
                                            ? `${selectedSeats.length} seat${selectedSeats.length > 1 ? "s" : ""} selected`
                                            : "No seat selected"}
                                    </div>

                                    <div className="mt-2 md:mt-0 md:ml-4 text-sm text-slate-700">
                                        Total fare: <span className="font-semibold">₹{Object.values(computedFares).reduce((s, v) => s + (Number(v) || 0), 0).toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Form Content */}
                                <div className="mt-5 space-y-4">
                                    {selectedSeats.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                                            <p className="text-sm font-medium text-slate-700">No seat selected</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Please select a seat from the layout to continue booking.
                                            </p>
                                        </div>
                                    ) : (
                                        selectedSeats.map((seat) => {
                                            const form = bookingForms[String(seat)] || { ...bookingForm };

                                            return (
                                                <div
                                                    key={seat}
                                                    className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 md:p-5 shadow-sm"
                                                >
                                                    {/* Seat Header */}
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-semibold text-slate-900">
                                                            <Ticket className="h-4 w-4 text-[#f97316]" />
                                                            Seat {seat}
                                                        </div>
                                                        <div className="text-sm font-medium text-slate-700">
                                                            Fare: <span className="font-semibold">₹{Number(computedFares[String(seat)] || 0).toFixed(2)}</span>
                                                        </div>
                                                    </div>

                                                    {/* Inputs */}
                                                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                                        <input
                                                            placeholder="Passenger Name"
                                                            value={form.name || ""}
                                                            onChange={(e) =>
                                                                setBookingForms((bf) => ({
                                                                    ...bf,
                                                                    [seat]: { ...form, name: e.target.value },
                                                                }))
                                                            }
                                                            className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-orange-100"
                                                        />

                                                        <input
                                                            placeholder="Phone Number"
                                                            value={form.phone || ""}
                                                            onChange={(e) =>
                                                                setBookingForms((bf) => ({
                                                                    ...bf,
                                                                    [seat]: { ...form, phone: e.target.value },
                                                                }))
                                                            }
                                                            className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-orange-100"
                                                        />

                                                        <input
                                                            placeholder="Email Address"
                                                            value={form.email || ""}
                                                            onChange={(e) =>
                                                                setBookingForms((bf) => ({
                                                                    ...bf,
                                                                    [seat]: { ...form, email: e.target.value },
                                                                }))
                                                            }
                                                            className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-orange-100"
                                                        />
                                                    </div>

                                                    {/* Pickup / Drop */}
                                                    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                                                        <div className="space-y-2">
                                                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                Pickup Point
                                                            </label>
                                                            <select
                                                                value={form.pickup || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const time = getStopTime(selectedBus, val) || "";
                                                                    setBookingForms((bf) => ({
                                                                        ...bf,
                                                                        [seat]: {
                                                                            ...form,
                                                                            pickup: val,
                                                                            pickupTime: time,
                                                                            drop: "",
                                                                            dropTime: "",
                                                                        },
                                                                    }));
                                                                }}
                                                                className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-orange-100"
                                                            >
                                                                <option value="">Select pickup</option>
                                                                {getPickupOptions(selectedBus).map((s, i) => (
                                                                    <option key={i} value={s}>
                                                                        {s}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                Drop Point
                                                            </label>
                                                            <select
                                                                value={form.drop || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const time = getStopTime(selectedBus, val) || "";
                                                                    setBookingForms((bf) => ({
                                                                        ...bf,
                                                                        [seat]: { ...form, drop: val, dropTime: time },
                                                                    }));
                                                                }}
                                                                className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-orange-100"
                                                            >
                                                                <option value="">Select drop</option>
                                                                {getDropOptions(selectedBus, form.pickup).map((s, i) => (
                                                                    <option key={i} value={s}>
                                                                        {s}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Timing Info */}
                                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                Pickup Time
                                                            </p>
                                                            <p className="mt-1 text-sm font-semibold text-slate-800">
                                                                {form.pickupTime || "—"}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                Drop Time
                                                            </p>
                                                            <p className="mt-1 text-sm font-semibold text-slate-800">
                                                                {form.dropTime || "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
                                    <button
                                        onClick={() => {
                                            setSelectedBus(null);
                                            setSelectedSeats([]);
                                            setBookingForm({
                                                name: "",
                                                phone: "",
                                                email: "",
                                                pickup: "",
                                                pickupTime: "",
                                                drop: "",
                                                dropTime: "",
                                            });
                                        }}
                                        className="h-12 rounded-2xl border border-slate-300 px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Close
                                    </button>

                                    <button
                                        onClick={async () => {
                                            if (!selectedSeats.length) return showAppToast("error", "Select at least one seat to book");

                                            // Ensure each selected seat has a passenger name and phone
                                            for (const s of selectedSeats) {
                                                const form = bookingForms[String(s)];
                                                if (!form || !form.name || !form.phone) {
                                                    return showAppToast("error", `Provide name and phone for seat ${s}`);
                                                }
                                            }

                                            try {
                                                // Build booking payloads and compute fare per seat
                                                const bookingsPayload = [];
                                                for (const seatNo of selectedSeats) {
                                                    const form = bookingForms[String(seatNo)] || {};
                                                    const payload = {
                                                        busId: selectedBus.busId,
                                                        busNumber: selectedBus.busNumber || "",
                                                        startTime: selectedBus.startTime || "",
                                                        endTime: selectedBus.endTime || "",
                                                        date,
                                                        seatNo,
                                                        name: form.name || "",
                                                        phone: form.phone || "",
                                                        email: form.email || "",
                                                        pickup: form.pickup || "",
                                                        pickupTime: form.pickupTime || "",
                                                        drop: form.drop || "",
                                                        dropTime: form.dropTime || "",
                                                    };

                                                    try {
                                                        const busForPricing = { ...(selectedBus || {}) };
                                                        const sched =
                                                            (schedules &&
                                                                schedules[selectedBus.busId] &&
                                                                schedules[selectedBus.busId][date]) ||
                                                            null;
                                                        if (sched && sched.pricingOverride) {
                                                            busForPricing.pricingRules = {
                                                                ...(selectedBus.pricingRules || {}),
                                                                ...(sched.pricingOverride || {}),
                                                            };
                                                        }
                                                        const season = !!(sched && sched.season);
                                                        const fareRes = calculateFare({
                                                            bus: busForPricing,
                                                            fromStop: form.pickup,
                                                            toStop: form.drop,
                                                            busType: selectedBus.busType || "AC",
                                                            season,
                                                        });
                                                        if (fareRes && fareRes.fare !== undefined) {
                                                            payload.fare = Number(fareRes.fare) || 0;
                                                        }
                                                    } catch (err) {
                                                        // ignore fare calculation errors
                                                        payload.fare = 0;
                                                    }

                                                    bookingsPayload.push(payload);
                                                }

                                                const totalAmount = bookingsPayload.reduce(
                                                    (s, b) => s + (Number(b.fare) || 0),
                                                    0
                                                );
                                                if (!totalAmount || totalAmount <= 0) {
                                                    return showAppToast("error", "Invalid fare amount");
                                                }

                                                // Create Razorpay order on server
                                                const orderRes = await fetch("/api/public/create-razorpay-order", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ amount: totalAmount, currency: "INR" }),
                                                });
                                                const orderData = await orderRes.json();
                                                if (!orderRes.ok) {
                                                    throw new Error(orderData.error || "Failed to create payment order");
                                                }
                                                const order = orderData.order;

                                                // Load Razorpay script
                                                const loaded = await new Promise((resolve) => {
                                                    if (typeof window === "undefined") return resolve(false);
                                                    if (window.Razorpay) return resolve(true);
                                                    const s = document.createElement("script");
                                                    s.src = "https://checkout.razorpay.com/v1/checkout.js";
                                                    s.onload = () => resolve(true);
                                                    s.onerror = () => resolve(false);
                                                    document.body.appendChild(s);
                                                });

                                                if (!loaded) throw new Error("Failed to load payment gateway");

                                                const publicKey =
                                                    orderData?.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

                                                const options = {
                                                    key: publicKey,
                                                    amount: order.amount, // in paise
                                                    currency: order.currency || "INR",
                                                    name: "SA Tours",
                                                    description: "Booking payment",
                                                    order_id: order.id,
                                                    handler: async function (resp) {
                                                        try {
                                                            // verify payment on server
                                                            const vRes = await fetch("/api/public/verify-payment", {
                                                                method: "POST",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({
                                                                    paymentId: resp.razorpay_payment_id,
                                                                    orderId: resp.razorpay_order_id,
                                                                    signature: resp.razorpay_signature,
                                                                    amount: totalAmount,
                                                                    currency: "INR",
                                                                    metadata: {
                                                                        bookings: bookingsPayload,
                                                                        userId: user?.uid || null,
                                                                    },
                                                                }),
                                                            });
                                                            const vData = await vRes.json();
                                                            if (!vRes.ok) {
                                                                throw new Error(vData.error || "Payment verification failed");
                                                            }

                                                            const paymentRecord = vData.payment || {};
                                                            const paymentId =
                                                                paymentRecord.id ||
                                                                paymentRecord.paymentId ||
                                                                resp.razorpay_payment_id;

                                                            // create bookings and attach payment id
                                                            const results = [];
                                                            for (const payload of bookingsPayload) {
                                                                const withPayment = {
                                                                    ...payload,
                                                                    payment: paymentId,
                                                                    paymentMethod: "razorpay",
                                                                };
                                                                const bRes = await fetch("/api/booking", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify(withPayment),
                                                                });
                                                                const bData = await bRes.json();
                                                                results.push({ ok: bRes.ok, data: bData });
                                                            }

                                                            const failed = results.find((r) => !r.ok);
                                                            if (failed) {
                                                                throw new Error(
                                                                    failed.data?.error || "Failed to create booking after payment"
                                                                );
                                                            }

                                                            showAppToast("success", "Payment successful and bookings created");
                                                            await fetchBookings();
                                                            setSelectedSeats([]);
                                                            setBookingForms({});
                                                        } catch (err) {
                                                            console.error(err);
                                                            showAppToast(
                                                                "error",
                                                                err.message || "Payment succeeded but booking failed"
                                                            );
                                                        }
                                                    },
                                                    modal: {
                                                        ondismiss: function () {
                                                            showAppToast("info", "Payment cancelled");
                                                        },
                                                    },
                                                };

                                                const rzp = new window.Razorpay(options);
                                                rzp.open();
                                            } catch (err) {
                                                console.error(err);
                                                showAppToast("error", err.message || "Booking/payment failed");
                                            }
                                        }}
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#059669] px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-[#047857]"
                                    >
                                        <Ticket className="h-5 w-5" />
                                        Book Selected
                                    </button>
                                </div>
                            </div>

                            {viewBooking && (
                                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4">
                                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                                        <h3 className="text-lg font-bold text-slate-900">Booking details — Seat {viewBooking.seat}</h3>
                                        <p className="mt-3 text-sm text-slate-700">Name: <span className="font-semibold">{viewBooking.booking?.name || "—"}</span></p>
                                        <p className="mt-1 text-sm text-slate-700">Phone: <span className="font-semibold">{viewBooking.booking?.phone || viewBooking.booking?.phoneNumber || "—"}</span></p>
                                        <p className="mt-1 text-sm text-slate-700">Email: <span className="font-semibold">{viewBooking.booking?.email || "—"}</span></p>
                                        <p className="mt-2 text-sm text-slate-700">Pickup: <span className="font-semibold">{viewBooking.booking?.pickup || "—"}</span>{viewBooking.booking?.pickupTime ? <span className="ml-2 text-slate-500">({viewBooking.booking?.pickupTime})</span> : null}</p>
                                        <p className="mt-1 text-sm text-slate-700">Drop: <span className="font-semibold">{viewBooking.booking?.drop || "—"}</span>{viewBooking.booking?.dropTime ? <span className="ml-2 text-slate-500">({viewBooking.booking?.dropTime})</span> : null}</p>

                                        <div className="mt-6 flex justify-end gap-3">
                                            <button
                                                onClick={() => setViewBooking(null)}
                                                className="rounded-2xl border px-4 py-2 text-sm"
                                            >
                                                Close
                                            </button>

                                            <button
                                                onClick={() => {
                                                    // populate form with booking data for reference/edit
                                                    const b = viewBooking.booking || {};
                                                    setBookingForm((p) => ({ ...p, name: b.name || "", phone: b.phone || b.phoneNumber || "", email: b.email || "", pickup: b.pickup || "", pickupTime: b.pickupTime || "", drop: b.drop || "", dropTime: b.dropTime || "" }));
                                                    setSelectedSeats([String(viewBooking.seat)]);
                                                    setViewBooking(null);
                                                }}
                                                className="rounded-2xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white"
                                            >
                                                Use passenger
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
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

function getPickupOptions(bus) {
    if (!bus) return [];

    // Prefer explicit pickupPoints when available
    if (Array.isArray(bus.pickupPoints)) {
        const resolve = (p) => {
            if (!p) return "";
            if (typeof p === "object") return normalizeText(p.name);
            return normalizeText(p);
        };

        const start = resolve(bus.startPoint);
        const pickups = bus.pickupPoints.map((p) => resolve(p)).filter(Boolean);

        const out = [];
        if (start) out.push(start);
        for (const p of pickups) {
            if (!out.some((x) => normalizeKey(x) === normalizeKey(p))) out.push(p);
        }

        return out;
    }

    const stops = buildRouteStops(bus);
    if (stops.length <= 1) return [];
    return stops.slice(0, stops.length - 1);
}

function getDropOptions(bus, pickup) {
    if (!bus || !pickup) return [];

    if (Array.isArray(bus.pickupPoints) || Array.isArray(bus.dropPoints)) {
        const resolve = (p) => {
            if (!p) return "";
            if (typeof p === "object") return normalizeText(p.name);
            return normalizeText(p);
        };

        const start = resolve(bus.startPoint);
        const pickups = Array.isArray(bus.pickupPoints) ? bus.pickupPoints.map((p) => resolve(p)).filter(Boolean) : [];
        const drops = Array.isArray(bus.dropPoints) ? bus.dropPoints.map((p) => resolve(p)).filter(Boolean) : [];
        const end = resolve(bus.endPoint);

        const all = [];
        if (start) all.push(start);
        for (const p of pickups) if (!all.some((x) => normalizeKey(x) === normalizeKey(p))) all.push(p);
        for (const d of drops) if (!all.some((x) => normalizeKey(x) === normalizeKey(d))) all.push(d);
        if (end && !all.some((x) => normalizeKey(x) === normalizeKey(end))) all.push(end);

        const pickupIndex = all.findIndex((s) => normalizeKey(s) === normalizeKey(pickup));
        if (pickupIndex === -1) return [];

        const sliced = all.slice(pickupIndex + 1);
        const dropSet = new Set(drops.map((d) => normalizeKey(d)));
        const pickupSet = new Set(pickups.map((p) => normalizeKey(p)));

        // exclude any stop that is also listed as a pickup
        return sliced.filter((s) => {
            const key = normalizeKey(s);
            if (pickupSet.has(key)) return false;
            return dropSet.has(key) || (end && key === normalizeKey(end));
        });
    }

    const stops = buildRouteStops(bus);
    const pickupIndex = stops.findIndex((s) => normalizeKey(s) === normalizeKey(pickup));
    if (pickupIndex === -1) return [];
    return stops.slice(pickupIndex + 1);
}