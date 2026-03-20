"use client";

import SeatLayout from "@/components/SeatLayout";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function StaffBookingPage() {
    const [buses, setBuses] = useState([]);
    const [date, setDate] = useState("");
    const [selectedBusId, setSelectedBusId] = useState("");
    const [bookings, setBookings] = useState({});
    const [loading, setLoading] = useState(false);
    const [viewBooking, setViewBooking] = useState(null);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [pickup, setPickup] = useState("");
    const [drop, setDrop] = useState("");

    // Helpers copied / simplified from admin booking implementation
    function normalizeText(v) {
        return String(v || "").trim();
    }

    function normalizeKey(v) {
        return normalizeText(v).toLowerCase();
    }

    function resolvePointValue(val, fallback = "") {
        if (!val) return String(fallback || "");
        if (typeof val === "object") return String(val.name || "");
        return String(val);
    }

    function buildRouteStops(bus) {
        if (!bus) return [];
        const resolve = (p) => {
            if (!p) return "";
            if (typeof p === "object") return normalizeText(p.name);
            return normalizeText(p);
        };

        if (Array.isArray(bus.pickupPoints) || Array.isArray(bus.dropPoints)) {
            const start = resolve(bus.startPoint);
            const pickups = Array.isArray(bus.pickupPoints)
                ? bus.pickupPoints.map((p) => normalizeText(typeof p === "string" ? p : p?.name)).filter(Boolean)
                : [];
            const drops = Array.isArray(bus.dropPoints)
                ? bus.dropPoints.map((p) => normalizeText(typeof p === "string" ? p : p?.name)).filter(Boolean)
                : [];
            const end = resolve(bus.endPoint);

            const all = [];
            if (start) all.push(start);
            for (const p of pickups) {
                if (!all.some((x) => normalizeKey(x) === normalizeKey(p))) all.push(p);
            }
            for (const d of drops) {
                if (!all.some((x) => normalizeKey(x) === normalizeKey(d))) all.push(d);
            }
            if (end && !all.some((x) => normalizeKey(x) === normalizeKey(end))) all.push(end);

            return all;
        }

        const middleStops = Array.isArray(bus.stops)
            ? bus.stops
                .map((s) => (typeof s === "string" ? s : s?.stopName))
                .filter(Boolean)
                .map((s) => normalizeText(s))
            : [];

        return [resolve(bus.startPoint), ...middleStops, resolve(bus.endPoint)].filter(Boolean);
    }

    function getPickupOptions(bus) {
        if (!bus) return [];
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

    function getDropOptions(bus, pickupVal) {
        if (!bus || !pickupVal) return [];

        if (Array.isArray(bus.pickupPoints) || Array.isArray(bus.dropPoints)) {
            const resolve = (p) => {
                if (!p) return "";
                if (typeof p === "object") return normalizeText(p.name);
                return normalizeText(p);
            };

            const start = resolve(bus.startPoint);
            const pickups = Array.isArray(bus.pickupPoints)
                ? bus.pickupPoints.map((p) => resolve(p)).filter(Boolean)
                : [];
            const drops = Array.isArray(bus.dropPoints)
                ? bus.dropPoints.map((p) => resolve(p)).filter(Boolean)
                : [];
            const end = resolve(bus.endPoint);

            const all = [];
            if (start) all.push(start);
            for (const p of pickups) if (!all.some((x) => normalizeKey(x) === normalizeKey(p))) all.push(p);
            for (const d of drops) if (!all.some((x) => normalizeKey(x) === normalizeKey(d))) all.push(d);
            if (end && !all.some((x) => normalizeKey(x) === normalizeKey(end))) all.push(end);

            const pickupIndex = all.findIndex((s) => normalizeKey(s) === normalizeKey(pickupVal));
            if (pickupIndex === -1) return [];

            const sliced = all.slice(pickupIndex + 1);
            const dropSet = new Set(drops.map((d) => normalizeKey(d)));
            const pickupSet = new Set(pickups.map((p) => normalizeKey(p)));

            return sliced.filter((s) => {
                const key = normalizeKey(s);
                if (pickupSet.has(key)) return false;
                return dropSet.has(key) || (end && key === normalizeKey(end));
            });
        }

        const stops = buildRouteStops(bus);
        const pickupIndex = stops.findIndex((s) => normalizeKey(s) === normalizeKey(pickupVal));
        if (pickupIndex === -1) return [];
        return stops.slice(pickupIndex + 1);
    }

    function calculateFare(bus, pickupVal, dropVal) {
        if (!bus || !pickupVal || !dropVal) return null;

        // base fare from fare.js
        try {
            const base = getFare({ route: bus.routeName || bus.route || "", pickup: pickupVal, drop: dropVal, busType: bus.busType || "NON_AC" });
            let amount = Number(base?.amount || 0);

            const rules = Array.isArray(bus.fareRulesRaw) ? bus.fareRulesRaw : Array.isArray(bus.fareRules) ? bus.fareRules : [];
            if (rules.length > 0) {
                const pickupOptions = getPickupOptions(bus);
                const expanded = [];
                for (let i = 0; i < rules.length; i++) {
                    const r = rules[i] || {};
                    const from = String(r.from || "").trim();
                    const to = String(r.to || "").trim();
                    const fareVal = r.fare;
                    const fareStartDate = r.fareStartDate || "";
                    const fareEndDate = r.fareEndDate || "";
                    const apply = !!r.applyToAllNextPickupsBeforeDrop;
                    if (!from && !to && (fareVal === undefined || fareVal === "")) continue;
                    if (apply) {
                        const fromIndex = pickupOptions.findIndex((p) => normalizeKey(p) === normalizeKey(from));
                        const endIndex = pickupOptions.length;
                        const startIdx = fromIndex === -1 ? 0 : fromIndex;
                        for (let j = startIdx; j < endIndex; j++) {
                            expanded.push({ from: pickupOptions[j], to, fare: fareVal, fareStartDate, fareEndDate, sourceIndex: i });
                        }
                    } else {
                        expanded.push({ from, to, fare: fareVal, fareStartDate, fareEndDate, sourceIndex: i });
                    }
                }

                const ruleAppliesOnDate = (rule, dateStr) => {
                    if (!dateStr) return true;
                    try {
                        const d = new Date(dateStr);
                        if (Number.isNaN(d.getTime())) return false;
                        if (rule.fareStartDate) {
                            const s = new Date(rule.fareStartDate);
                            if (Number.isNaN(s.getTime())) return false;
                            if (d < new Date(s.getFullYear(), s.getMonth(), s.getDate())) return false;
                        }
                        if (rule.fareEndDate) {
                            const e = new Date(rule.fareEndDate);
                            if (Number.isNaN(e.getTime())) return false;
                            if (d > new Date(e.getFullYear(), e.getMonth(), e.getDate())) return false;
                        }
                        return true;
                    } catch (e) {
                        return false;
                    }
                };

                const dateStr = String(date || "");
                const matches = expanded.filter((r) => normalizeKey(r.from) === normalizeKey(pickupVal) && normalizeKey(r.to) === normalizeKey(dropVal) && ruleAppliesOnDate(r, dateStr));
                if (matches && matches.length > 0) {
                    const chosen = matches[matches.length - 1];
                    const overrideFare = Number(chosen.fare);
                    if (Number.isFinite(overrideFare) && overrideFare > 0) amount = overrideFare;
                }
            }

            return amount;
        } catch (e) {
            return null;
        }
    }

    useEffect(() => {
        let mounted = true;
        const fetchBuses = async () => {
            try {
                const res = await fetch("/api/bus");
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to load buses");
                if (mounted) setBuses(data.buses || []);
            } catch (e) {
                console.error(e);
            }
        };

        fetchBuses();
        return () => (mounted = false);
    }, []);

    const fetchBookings = async () => {
        if (!selectedBusId || !date) {
            setBookings({});
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/booking?busId=${encodeURIComponent(selectedBusId)}&date=${encodeURIComponent(date)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load bookings");
            setBookings(data.bookings || {});
            // reset selected seats when bookings change
            setSelectedSeats([]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const visible = useMemo(() => {
        return Object.entries(bookings || {}).map(([k, v]) => ({ seat: k, data: v }));
    }, [bookings]);

    const selectedBus = useMemo(() => {
        return (buses || []).find((b) => (b.busId || b.id || b.busNumber) === selectedBusId) || null;
    }, [buses, selectedBusId]);

    const pickupOptions = useMemo(() => getPickupOptions(selectedBus), [selectedBus]);
    const dropOptions = useMemo(() => getDropOptions(selectedBus, pickup), [selectedBus, pickup]);

    const bookedSeatsArray = useMemo(() => Object.keys(bookings || {}), [bookings]);
    const bookedMap = bookings || {};

    const seatFare = useMemo(() => calculateFare(selectedBus, pickup, drop), [selectedBus, pickup, drop]);
    const totalFare = useMemo(() => {
        if (!seatFare) return null;
        return seatFare * (selectedSeats.length || 0);
    }, [seatFare, selectedSeats]);

    const toggleSeat = (seat) => {
        const key = String(seat);
        const booking = bookedMap && bookedMap[key] ? bookedMap[key] : null;
        if (booking && booking.status !== "available") {
            // booked or blocked — do not allow selecting
            return;
        }

        setSelectedSeats((prev) => {
            const set = new Set(prev.map(String));
            if (set.has(key)) {
                set.delete(key);
            } else {
                set.add(key);
            }
            return Array.from(set);
        });
    };

    return (
        <div className="p-6">
            <h1 className="mb-4 text-2xl font-bold">Bookings — Staff (View Only)</h1>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <select value={selectedBusId} onChange={(e) => setSelectedBusId(e.target.value)} className="rounded border px-3 py-2">
                    <option value="">Select bus</option>
                    {buses.map((b) => (
                        <option key={b.busId || b.id || b.busNumber} value={b.busId || b.id || b.busNumber}>
                            {b.busNumber} {b.busName ? `— ${b.busName}` : ""}
                        </option>
                    ))}
                </select>

                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-3 py-2" />

                <button onClick={fetchBookings} className="rounded bg-slate-50 px-3 py-2">Load</button>
            </div>

            {/* Pickup / Drop selectors + Seat layout + Fare summary */}
            {selectedBus ? (
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="md:col-span-1">
                        <label className="mb-1 block text-sm font-medium text-slate-600">Pickup</label>
                        <select value={pickup} onChange={(e) => { setPickup(e.target.value); setDrop(""); }} className="w-full rounded border px-3 py-2">
                            <option value="">Select pickup</option>
                            {pickupOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>

                        <label className="mt-3 mb-1 block text-sm font-medium text-slate-600">Drop</label>
                        <select value={drop} onChange={(e) => setDrop(e.target.value)} className="w-full rounded border px-3 py-2">
                            <option value="">Select drop</option>
                            {dropOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>

                        <div className="mt-4 rounded border bg-white p-3">
                            <div className="text-sm text-slate-500">Fare per seat</div>
                            <div className="mt-1 text-lg font-semibold">{seatFare ? `₹${Number(seatFare).toFixed(2)}` : "-"}</div>
                            <div className="mt-3 text-sm text-slate-500">Selected seats</div>
                            <div className="mt-1 text-lg font-semibold">{selectedSeats.length}</div>
                            <div className="mt-3 text-sm text-slate-500">Total fare</div>
                            <div className="mt-1 text-lg font-bold">{totalFare !== null ? `₹${Number(totalFare).toFixed(2)}` : "-"}</div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <SeatLayout
                            layout={String(selectedBus?.seatLayout || selectedBus?.layout || "31")}
                            bookedSeats={bookedSeatsArray}
                            bookedMap={bookedMap}
                            selectedSeats={selectedSeats}
                            onSelect={toggleSeat}
                            onViewBooking={(id, booking) => setViewBooking({ seat: id, data: booking })}
                        />
                    </div>
                </div>
            ) : null}

            {loading ? <p>Loading…</p> : (
                <div className="space-y-3">
                    {visible.length === 0 ? <p className="text-sm text-slate-500">No bookings</p> : null}
                    {visible.map((b) => (
                        <div key={b.seat} className="rounded border p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-500">Seat</div>
                                    <div className="text-lg font-semibold">{b.seat}</div>
                                </div>
                                <div>
                                    <button onClick={() => setViewBooking(b)} className="rounded bg-slate-50 px-3 py-1 text-sm">View</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewBooking ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded bg-white p-6">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-bold">Booking — Seat {viewBooking.seat}</h2>
                            </div>
                            <button onClick={() => setViewBooking(null)} className="p-2"><X /></button>
                        </div>

                        <div className="space-y-2">
                            <p><strong>Name:</strong> {viewBooking.data?.name || "-"}</p>
                            <p><strong>Phone:</strong> {viewBooking.data?.phone || "-"}</p>
                            <p><strong>Email:</strong> {viewBooking.data?.email || "-"}</p>
                            <p><strong>Status:</strong> {viewBooking.data?.status || "-"}</p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
