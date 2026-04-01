"use client";

import SeatLayout from "@/components/SeatLayout";
import { useAutoRefresh } from "@/context/AutoRefreshContext";
import {
    BUS_TYPES,
    getFare,
    isBorliVillageStop,
    isCityStop,
    isDighiVillageStop,
    normalizeStopName,
    ROUTES,
} from "@/lib/fare";
import { Bus, Clock3, Eye, Filter, MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export default function StaffBusPage() {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);
    const [layoutFilter, setLayoutFilter] = useState("All Layouts");

    const isMountedRef = useRef(false);
    const { subscribeRefresh } = useAutoRefresh();

    const fetchBuses = async () => {
        try {
            if (isMountedRef.current) setLoading(true);
            const res = await fetch("/api/bus");
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to load buses");

            if (isMountedRef.current) {
                setBuses(data.buses || []);
            }
        } catch (error) {
            console.error("Failed to fetch buses:", error);
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        fetchBuses();

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (typeof subscribeRefresh !== "function") return;
        const unsub = subscribeRefresh(() => {
            fetchBuses();
        });

        return () => {
            try {
                if (typeof unsub === "function") unsub();
            } catch (e) { }
        };
    }, [subscribeRefresh]);

    // Detect seat layout from bus data
    const getSeatCount = (bus) => {
        if (!bus) return 0;

        // explicit numeric seatCount
        if (Number.isFinite(Number(bus.seatCount))) return Number(bus.seatCount);

        // seatLayout may be stored as an array of seat definitions
        if (Array.isArray(bus.seatLayout)) return bus.seatLayout.length;

        // or seatLayout may be stored as a string like "31", "27", "23"
        if (bus.seatLayout && (typeof bus.seatLayout === "string" || typeof bus.seatLayout === "number")) {
            const match = String(bus.seatLayout).match(/\d+/);
            if (match) return Number(match[0]);
        }

        // older payloads might have `seats` array
        if (Array.isArray(bus.seats)) return bus.seats.length;

        // fallback: layoutType may contain digits
        if (bus.layoutType) {
            const match = String(bus.layoutType).match(/\d+/);
            if (match) return Number(match[0]);
        }

        return 0;
    };

    function resolvePointDisplay(p) {
        if (p === null || p === undefined) return "-";
        if (typeof p === "object") return String(p.name || p.pointName || "-");
        return String(p);
    }

    const filtered = useMemo(() => {
        return (buses || []).filter((b) => {
            const q = search.trim().toLowerCase();

            const matchesSearch =
                !q ||
                String(b.busNumber || "").toLowerCase().includes(q) ||
                String(b.busName || "").toLowerCase().includes(q) ||
                String(b.routeName || "").toLowerCase().includes(q) ||
                String(b.startPoint || "").toLowerCase().includes(q) ||
                String(b.endPoint || "").toLowerCase().includes(q);

            const seatCount = getSeatCount(b);

            const matchesLayout =
                layoutFilter === "All Layouts" ||
                (layoutFilter === "31" && seatCount === 31) ||
                (layoutFilter === "27" && seatCount === 27) ||
                (layoutFilter === "23" && seatCount === 23);

            return matchesSearch && matchesLayout;
        });
    }, [buses, search, layoutFilter]);

    const stats = useMemo(() => {
        let total = buses.length;
        let s31 = 0;
        let s27 = 0;
        let s23 = 0;

        buses.forEach((b) => {
            const seatCount = getSeatCount(b);
            if (seatCount === 31) s31++;
            if (seatCount === 27) s27++;
            if (seatCount === 23) s23++;
        });

        return { total, s31, s27, s23 };
    }, [buses]);

    const getBaseFare = (bus) => {
        // Prefer computed fare based on route/pickup/drop
        const computed = computeBaseFareForBus(bus);
        if (Number.isFinite(computed) && computed > 0) return computed;

        if (typeof bus?.baseFare === "number") return bus.baseFare;
        if (typeof bus?.fare === "number") return bus.fare;
        if (typeof bus?.price === "number") return bus.price;
        return 0;
    };

    function normalizeBusType(raw) {
        if (!raw) return BUS_TYPES.NON_AC;
        const s = String(raw || "").trim().toLowerCase();
        if (s === "non-ac" || s === "non ac" || s === "nonac" || s.includes("non")) return BUS_TYPES.NON_AC;
        if (s === "ac" || s === "a/c" || s.includes("ac")) return BUS_TYPES.AC;
        return BUS_TYPES.NON_AC;
    }

    function computeBaseFareForBus(bus) {
        if (!bus) return null;

        const resolve = (p) => {
            if (!p) return "";
            if (typeof p === "object") return String(p.name || "").trim();
            return String(p || "").trim();
        };

        let pickup = resolve(bus.startPoint || bus.start);
        let drop = resolve(bus.endPoint || bus.end);
        if (!pickup && Array.isArray(bus.pickupPoints) && bus.pickupPoints.length) pickup = resolve(bus.pickupPoints[0]);
        if (!drop && Array.isArray(bus.dropPoints) && bus.dropPoints.length) drop = resolve(bus.dropPoints[bus.dropPoints.length - 1]);

        let routeKey = null;
        try {
            const pNorm = normalizeStopName(pickup);
            const dNorm = normalizeStopName(drop);
            if (isBorliVillageStop(pNorm) && isCityStop(dNorm)) routeKey = ROUTES.BORLI_TO_DONGRI;
            else if (isDighiVillageStop(pNorm) && isCityStop(dNorm)) routeKey = ROUTES.DIGHI_TO_DONGRI;
            else if (isCityStop(pNorm) && isBorliVillageStop(dNorm)) routeKey = ROUTES.DONGRI_TO_BORLI;
            else if (isCityStop(pNorm) && isDighiVillageStop(dNorm)) routeKey = ROUTES.DONGRI_TO_DIGHI;
        } catch (e) {
            routeKey = null;
        }

        if (!routeKey && bus.routeName) {
            try {
                const parts = String(bus.routeName || "").split("-").map((x) => x.trim());
                if (parts.length === 2) {
                    const a = normalizeStopName(parts[0]);
                    const b = normalizeStopName(parts[1]);
                    if (isBorliVillageStop(a) && isCityStop(b)) routeKey = ROUTES.BORLI_TO_DONGRI;
                    else if (isDighiVillageStop(a) && isCityStop(b)) routeKey = ROUTES.DIGHI_TO_DONGRI;
                    else if (isCityStop(a) && isBorliVillageStop(b)) routeKey = ROUTES.DONGRI_TO_BORLI;
                    else if (isCityStop(a) && isDighiVillageStop(b)) routeKey = ROUTES.DONGRI_TO_DIGHI;
                }
            } catch (e) {
                // ignore
            }
        }

        if (!routeKey) return null;

        try {
            const mappedType = normalizeBusType(bus.busType);
            const base = getFare({ route: routeKey, pickup, drop, busType: mappedType });
            const amt = Number(base?.amount || 0);
            return amt > 0 ? amt : null;
        } catch (e) {
            return null;
        }
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#f97316] sm:text-sm">
                        SA TOURS DASHBOARD
                    </p>
                    <h1 className="text-3xl font-bold text-[#0f172a] sm:text-4xl">
                        Bus Management
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 sm:text-base">
                        View buses, pickup points, drop points, cabins, seat layouts and fare rules.
                    </p>
                </div>

                {/* NO Add Bus button for staff */}
                <div className="rounded-2xl border border-orange-100 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-600 shadow-sm">
                    View Only Access
                </div>
            </div>

            {/* Stats Cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Total Buses" value={stats.total} />
                <StatCard title="31 Seat Layout" value={stats.s31} />
                <StatCard title="27 Seat Layout" value={stats.s27} />
                <StatCard title="23 Seat Layout" value={stats.s23} />
            </div>

            {/* Main Table Card */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                {/* Top Controls */}
                <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-[#0f172a]">Bus List</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Showing {filtered.length} of {buses.length} result(s)
                        </p>
                    </div>

                    <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
                        {/* Search */}
                        <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:w-[420px]">
                            <Search className="h-5 w-5 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search bus number, route, pickup, drop..."
                                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                            />
                        </div>

                        {/* Filter */}
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:min-w-[220px]">
                            <Filter className="h-5 w-5 text-slate-400" />
                            <select
                                value={layoutFilter}
                                onChange={(e) => setLayoutFilter(e.target.value)}
                                className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                            >
                                <option>All Layouts</option>
                                <option value="31">31 Seat</option>
                                <option value="27">27 Seat</option>
                                <option value="23">23 Seat</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden overflow-x-auto lg:block">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr className="text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-6 py-5">Bus</th>
                                <th className="px-6 py-5">Route</th>
                                <th className="px-6 py-5">Time</th>
                                <th className="px-6 py-5">Pickup / Drop</th>
                                <th className="px-6 py-5">Layout</th>
                                <th className="px-6 py-5">Fare</th>
                                <th className="px-6 py-5">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-10 text-center text-slate-500">
                                        Loading buses...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-10 text-center text-slate-500">
                                        No buses found
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((bus) => {
                                    const seatCount = getSeatCount(bus);
                                    const pickupCount = Array.isArray(bus.pickupPoints)
                                        ? bus.pickupPoints.length
                                        : 0;
                                    const dropCount = Array.isArray(bus.dropPoints)
                                        ? bus.dropPoints.length
                                        : 0;
                                    const baseFare = getBaseFare(bus);

                                    return (
                                        <tr
                                            key={bus.busId || bus.id || bus.busNumber}
                                            className="border-t border-slate-100 hover:bg-slate-50/70"
                                        >
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                                                        <Bus className="h-7 w-7 text-orange-500" />
                                                    </div>
                                                    <div>
                                                        <div className="text-[15px] font-bold text-slate-800">
                                                            {bus.busNumber || "-"}
                                                        </div>
                                                        <div className="text-sm text-slate-500">
                                                            {bus.busName || "SA TRAVELS"} • {bus.busType || "Non-AC"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-6">
                                                <div className="text-lg font-semibold text-slate-800">
                                                    {bus.routeName || `${resolvePointDisplay(bus.startPoint)} - ${resolvePointDisplay(bus.endPoint)}`}
                                                </div>
                                            </td>

                                            <td className="px-6 py-6">
                                                <div className="text-sm leading-7 text-slate-700 ">
                                                    <div>{bus.startTime || "-"}</div>
                                                    <div>→</div>
                                                    <div>{bus.endTime || "-"}</div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-6">
                                                <div className="text-sm text-slate-600 flex-nowrap whitespace-nowrap">
                                                    <div>Pickup: {pickupCount}</div>
                                                    <div className="mt-2">Drop: {dropCount}</div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-6">
                                                <span className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
                                                    {seatCount || "-"} Seats
                                                </span>
                                            </td>

                                            <td className="px-6 py-6">
                                                <div className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                                                    Base: ₹{baseFare || 0}
                                                </div>
                                            </td>

                                            <td className="px-6 py-6">
                                                <button
                                                    onClick={() => setSelected(bus)}
                                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-4 p-4 lg:hidden">
                    {loading ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-slate-500">
                            Loading buses...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-slate-500">
                            No buses found
                        </div>
                    ) : (
                        filtered.map((bus) => {
                            const seatCount = getSeatCount(bus);
                            const pickupCount = Array.isArray(bus.pickupPoints)
                                ? bus.pickupPoints.length
                                : 0;
                            const dropCount = Array.isArray(bus.dropPoints)
                                ? bus.dropPoints.length
                                : 0;
                            const baseFare = getBaseFare(bus);

                            return (
                                <div
                                    key={bus.busId || bus.id || bus.busNumber}
                                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="mb-4 flex items-start gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
                                            <Bus className="h-6 w-6 text-orange-500" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate text-lg font-bold text-slate-800">
                                                {bus.busNumber || "-"}
                                            </h3>
                                            <p className="truncate text-sm text-slate-500">
                                                {bus.busName || "SA TRAVELS"} • {bus.busType || "Non-AC"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="text-xs text-slate-500">Route</p>
                                            <p className="mt-1 font-semibold text-slate-800">
                                                {bus.routeName || `${resolvePointDisplay(bus.startPoint)} - ${resolvePointDisplay(bus.endPoint)}`}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="text-xs text-slate-500">Layout</p>
                                            <p className="mt-1 font-semibold text-orange-600">{seatCount || 0} Seats</p>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="text-xs text-slate-500">Pickup / Drop</p>
                                            <p className="mt-1 font-semibold text-slate-800">
                                                {pickupCount} / {dropCount}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="text-xs text-slate-500">Base Fare</p>
                                            <p className="mt-1 font-semibold text-emerald-700">₹{baseFare || 0}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelected(bus)}
                                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        <Eye className="h-4 w-4" />
                                        View Details
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* View Modal */}
            {selected ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">
                                    {selected.busNumber} {selected.busName ? `— ${selected.busName}` : ""}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {selected.routeName || `${resolvePointDisplay(selected.startPoint)} - ${resolvePointDisplay(selected.endPoint)}`}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelected(null)}
                                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-6 px-5 py-5 sm:px-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                                        <MapPin className="h-4 w-4" />
                                        <p className="text-sm font-medium">Start Point</p>
                                    </div>
                                    <p className="text-lg font-semibold text-slate-800">
                                        {resolvePointDisplay(selected.startPoint)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                                        <MapPin className="h-4 w-4" />
                                        <p className="text-sm font-medium">End Point</p>
                                    </div>
                                    <p className="text-lg font-semibold text-slate-800">
                                        {resolvePointDisplay(selected.endPoint)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                                        <Clock3 className="h-4 w-4" />
                                        <p className="text-sm font-medium">Start Time</p>
                                    </div>
                                    <p className="text-lg font-semibold text-slate-800">
                                        {selected.startTime || "-"}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                                        <Clock3 className="h-4 w-4" />
                                        <p className="text-sm font-medium">End Time</p>
                                    </div>
                                    <p className="text-lg font-semibold text-slate-800">
                                        {selected.endTime || "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <InfoChip
                                    label="Seat Layout"
                                    value={`${getSeatCount(selected) || 0} Seats`}
                                    color="orange"
                                />
                                <InfoChip
                                    label="Base Fare"
                                    value={`₹${getBaseFare(selected) || 0}`}
                                    color="green"
                                />
                                <InfoChip
                                    label="Bus Type"
                                    value={selected.busType || "Non-AC"}
                                    color="slate"
                                />
                            </div>

                            <div className="mt-4">
                                <SeatLayout
                                    layout={String(selected.seatLayout || getSeatCount(selected) || "31")}
                                    cabins={selected.cabins || []}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 p-4">
                                    <h3 className="mb-3 text-lg font-semibold text-slate-800">Pickup Points</h3>
                                    {Array.isArray(selected.pickupPoints) && selected.pickupPoints.length > 0 ? (
                                        <ul className="space-y-2">
                                            {selected.pickupPoints.map((p, i) => (
                                                <li
                                                    key={i}
                                                    className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                                >
                                                    {typeof p === "object" ? p.name || p.pointName || "-" : String(p)}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-slate-500">No pickup points available</p>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-slate-200 p-4">
                                    <h3 className="mb-3 text-lg font-semibold text-slate-800">Drop Points</h3>
                                    {Array.isArray(selected.dropPoints) && selected.dropPoints.length > 0 ? (
                                        <ul className="space-y-2">
                                            {selected.dropPoints.map((p, i) => (
                                                <li
                                                    key={i}
                                                    className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                                >
                                                    {typeof p === "object" ? p.name || p.pointName || "-" : String(p)}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-slate-500">No drop points available</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => setSelected(null)}
                                    className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-orange-600"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function StatCard({ title, value }) {
    return (
        <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50">
                    <Bus className="h-8 w-8 text-orange-500" />
                </div>
                <div>
                    <p className="text-lg text-slate-500">{title}</p>
                    <p className="mt-1 text-4xl font-bold text-[#0f172a]">{value}</p>
                </div>
            </div>
        </div>
    );
}

function InfoChip({ label, value, color = "slate" }) {
    const styles = {
        orange: "bg-orange-50 text-orange-600",
        green: "bg-emerald-50 text-emerald-700",
        slate: "bg-slate-100 text-slate-700",
    };

    return (
        <div className={`rounded-2xl p-4 ${styles[color]}`}>
            <p className="text-xs font-medium opacity-80">{label}</p>
            <p className="mt-2 text-lg font-bold">{value}</p>
        </div>
    );
}