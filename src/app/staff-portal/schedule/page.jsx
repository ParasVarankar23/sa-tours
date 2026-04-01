"use client";

import { useAutoRefresh } from "@/context/AutoRefreshContext";
import {
    Bus,
    CalendarDays,
    CheckCircle2,
    Eye,
    Filter,
    MapPin,
    Route,
    Search,
    X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export default function StaffSchedulePage() {
    const [buses, setBuses] = useState([]);
    const [schedules, setSchedules] = useState({});
    const [loading, setLoading] = useState(true);
    const isMountedRef = useRef(false);

    const { subscribeRefresh } = useAutoRefresh();

    const fetchAllData = async () => {
        try {
            if (isMountedRef.current) setLoading(true);

            const [bRes, sRes] = await Promise.all([
                fetch("/api/bus"),
                fetch("/api/schedule"),
            ]);

            const bData = await bRes.json();
            const sData = await sRes.json();

            if (!bRes.ok) throw new Error(bData.error || "Failed to load buses");
            if (!sRes.ok) throw new Error(sData.error || "Failed to load schedules");

            if (isMountedRef.current) {
                setBuses(Array.isArray(bData.buses) ? bData.buses : []);
                setSchedules(
                    sData && typeof sData.schedules === "object" && sData.schedules
                        ? sData.schedules
                        : {}
                );
            }
        } catch (error) {
            console.error("Schedule fetch error:", error);
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);

    // Filters
    const [busFilter, setBusFilter] = useState("All Buses");
    const [dateFilterType, setDateFilterType] = useState("All");
    const [specificDate, setSpecificDate] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        isMountedRef.current = true;
        fetchAllData();

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (typeof subscribeRefresh !== "function") return;
        const unsub = subscribeRefresh(() => {
            fetchAllData();
        });

        return () => {
            try {
                if (typeof unsub === "function") unsub();
            } catch (e) { }
        };
    }, [subscribeRefresh]);

    // =========================
    // SAFE HELPERS
    // =========================
    const getPointName = (point) => {
        if (!point) return "-";
        if (typeof point === "string") return point;
        if (typeof point === "object") return point.name || "-";
        return String(point);
    };

    const getPointTime = (point, fallback = "--") => {
        if (point && typeof point === "object" && point.time) return point.time;
        if (typeof fallback === "string" && fallback.trim()) return fallback;
        return "--";
    };

    const getRouteName = (bus) => {
        if (!bus) return "-";

        if (typeof bus.routeName === "string" && bus.routeName.trim()) {
            return bus.routeName;
        }

        const start = getPointName(bus.startPoint);
        const end = getPointName(bus.endPoint);

        if (start !== "-" || end !== "-") {
            return `${start} - ${end}`;
        }

        return "-";
    };

    const getStartTime = (bus) => {
        if (!bus) return "--";
        return getPointTime(bus.startPoint, bus.startTime || "--");
    };

    const getEndTime = (bus) => {
        if (!bus) return "--";
        return getPointTime(bus.endPoint, bus.endTime || "--");
    };

    const formatDate = (date) => {
        if (!date) return "-";

        try {
            const d = new Date(date);
            if (Number.isNaN(d.getTime())) return String(date);

            return d.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        } catch {
            return String(date);
        }
    };

    const normalizeDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return null;
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const isSameDay = (d1, d2) => {
        const a = normalizeDate(d1);
        const b = normalizeDate(d2);
        if (!a || !b) return false;
        return a.getTime() === b.getTime();
    };

    const isWithinRange = (date, start, end) => {
        const d = normalizeDate(date);
        if (!d) return false;

        const s = start ? normalizeDate(start) : null;
        const e = end ? normalizeDate(end) : null;

        if (s && e) return d >= s && d <= e;
        if (s) return d >= s;
        if (e) return d <= e;
        return true;
    };

    const getStartOfWeek = (date) => {
        const d = normalizeDate(date) || new Date();
        const day = d.getDay(); // 0 Sunday
        const diff = day === 0 ? -6 : 1 - day; // Monday start
        const result = new Date(d);
        result.setDate(d.getDate() + diff);
        result.setHours(0, 0, 0, 0);
        return result;
    };

    const getEndOfWeek = (date) => {
        const start = getStartOfWeek(date);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return end;
    };

    // =========================
    // FLATTEN SCHEDULES
    // =========================
    const allItems = useMemo(() => {
        const out = [];

        for (const b of buses || []) {
            const id = b.busId || b.id || b.busNumber;
            const busSchedules = schedules[id];

            if (!busSchedules || typeof busSchedules !== "object") continue;

            const dates = Object.keys(busSchedules);

            for (const date of dates) {
                out.push({
                    bus: b,
                    date,
                });
            }
        }

        return out.sort((a, b) => {
            const da = normalizeDate(a.date);
            const db = normalizeDate(b.date);
            if (!da && !db) return 0;
            if (!da) return 1;
            if (!db) return -1;
            return da - db;
        });
    }, [buses, schedules]);

    // =========================
    // UNIQUE BUS OPTIONS (FIXED)
    // =========================
    const busOptions = useMemo(() => {
        const uniqueBusNumbers = Array.from(
            new Set((buses || []).map((b) => String(b.busNumber || "-")))
        );

        return ["All Buses", ...uniqueBusNumbers];
    }, [buses]);

    // =========================
    // FILTERED DATA
    // =========================
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const today = normalizeDate(new Date());
        const weekStart = getStartOfWeek(new Date());
        const weekEnd = getEndOfWeek(new Date());

        return allItems.filter((it) => {
            const routeName = getRouteName(it.bus);
            const startPoint = getPointName(it.bus.startPoint);
            const endPoint = getPointName(it.bus.endPoint);
            const busNumber = String(it.bus.busNumber || "");
            const itemDate = normalizeDate(it.date);

            // Search filter
            const matchesSearch =
                !q ||
                busNumber.toLowerCase().includes(q) ||
                String(routeName).toLowerCase().includes(q) ||
                String(it.date || "").toLowerCase().includes(q) ||
                String(startPoint).toLowerCase().includes(q) ||
                String(endPoint).toLowerCase().includes(q);

            // Bus filter
            const matchesBus =
                busFilter === "All Buses" || String(busNumber) === String(busFilter);

            // Quick date filter
            let matchesQuickDate = true;

            if (dateFilterType === "Today") {
                matchesQuickDate = itemDate ? itemDate.getTime() === today.getTime() : false;
            } else if (dateFilterType === "Specific Date") {
                matchesQuickDate = specificDate ? isSameDay(it.date, specificDate) : true;
            } else if (dateFilterType === "This Week") {
                matchesQuickDate = itemDate ? itemDate >= weekStart && itemDate <= weekEnd : false;
            } else if (dateFilterType === "This Month") {
                matchesQuickDate = itemDate
                    ? itemDate.getMonth() === today.getMonth() &&
                    itemDate.getFullYear() === today.getFullYear()
                    : false;
            } else if (dateFilterType === "This Year") {
                matchesQuickDate = itemDate
                    ? itemDate.getFullYear() === today.getFullYear()
                    : false;
            }

            // Date range filter
            const matchesRange = isWithinRange(it.date, startDate, endDate);

            return matchesSearch && matchesBus && matchesQuickDate && matchesRange;
        });
    }, [
        allItems,
        search,
        busFilter,
        dateFilterType,
        specificDate,
        startDate,
        endDate,
    ]);

    // =========================
    // STATS
    // =========================
    const stats = useMemo(() => {
        const totalSchedules = allItems.length;
        const totalBuses = busOptions.length > 0 ? busOptions.length - 1 : 0;
        const selectedBus = busFilter === "All Buses" ? "--" : busFilter;

        return {
            totalSchedules,
            totalBuses,
            selectedBus,
            status: "Ready",
        };
    }, [allItems, busOptions, busFilter]);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#f97316] sm:text-sm">
                        SA TOURS DASHBOARD
                    </p>
                    <h1 className="text-3xl font-bold text-[#0f172a] sm:text-4xl">
                        Schedule Management
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 sm:text-base">
                        View bus schedules, filter by bus, date, specific date and date range.
                    </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-600 shadow-sm">
                    View Only Access
                </div>
            </div>

            {/* Stats */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Schedules"
                    value={stats.totalSchedules}
                    icon={<CalendarDays className="h-8 w-8 text-orange-500" />}
                />
                <StatCard
                    title="Total Buses"
                    value={stats.totalBuses}
                    icon={<Bus className="h-8 w-8 text-orange-500" />}
                />
                <StatCard
                    title="Selected Bus"
                    value={stats.selectedBus}
                    icon={<Route className="h-8 w-8 text-orange-500" />}
                />
                <StatCard
                    title="Status"
                    value={stats.status}
                    icon={<CheckCircle2 className="h-8 w-8 text-orange-500" />}
                />
            </div>

            {/* Filter Panel */}
            <div className="mb-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-2xl font-bold text-[#0f172a]">Filter Schedules</h2>
                <p className="mt-2 text-sm text-slate-500 sm:text-base">
                    Search schedules by bus, quick date filter, specific date, or date range.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
                    {/* Search */}
                    <div className="xl:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-600">
                            Search
                        </label>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <Search className="h-5 w-5 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by bus number, route, date..."
                                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Bus Select */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-600">
                            Select Bus
                        </label>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <Bus className="h-5 w-5 text-slate-400" />
                            <select
                                value={busFilter}
                                onChange={(e) => setBusFilter(e.target.value)}
                                className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                            >
                                {busOptions.map((bus, index) => (
                                    <option key={`${bus}-${index}`} value={bus}>
                                        {bus}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Quick Date Filter */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-600">
                            Date Filter
                        </label>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <Filter className="h-5 w-5 text-slate-400" />
                            <select
                                value={dateFilterType}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setDateFilterType(value);
                                    if (value !== "Specific Date") {
                                        setSpecificDate("");
                                    }
                                }}
                                className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                            >
                                <option value="All">All</option>
                                <option value="Today">Today</option>
                                <option value="Specific Date">Specific Date</option>
                                <option value="This Week">This Week</option>
                                <option value="This Month">This Month</option>
                                <option value="This Year">This Year</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Date Inputs */}
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Specific Date */}
                    {dateFilterType === "Specific Date" ? (
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-600">
                                Select One Date
                            </label>
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <CalendarDays className="h-5 w-5 text-slate-400" />
                                <input
                                    type="date"
                                    value={specificDate}
                                    onChange={(e) => setSpecificDate(e.target.value)}
                                    className="w-full bg-transparent text-sm outline-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="hidden md:block" />
                    )}

                    {/* Start Date */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-600">
                            Start Date
                        </label>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <CalendarDays className="h-5 w-5 text-slate-400" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-transparent text-sm outline-none"
                            />
                        </div>
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-600">
                            End Date
                        </label>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <CalendarDays className="h-5 w-5 text-slate-400" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-transparent text-sm outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Selected Preview */}
            <div className="mb-8 rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-2xl font-bold text-[#0f172a]">Selected Schedule Preview</h2>
                <p className="mt-2 text-sm text-slate-500 sm:text-base">
                    Quick overview of the selected schedule details.
                </p>

                <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-5">
                    {selected ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <InfoCard
                                icon={<Bus className="h-4 w-4" />}
                                label="Bus Number"
                                value={selected.bus.busNumber || "-"}
                            />
                            <InfoCard
                                icon={<Route className="h-4 w-4" />}
                                label="Route"
                                value={getRouteName(selected.bus)}
                            />
                            <InfoCard
                                icon={<CalendarDays className="h-4 w-4" />}
                                label="Scheduled Date"
                                value={formatDate(selected.date)}
                            />
                        </div>
                    ) : (
                        <div className="py-6 text-center">
                            <p className="text-lg font-semibold text-slate-700">No schedule selected</p>
                            <p className="mt-2 text-sm text-slate-500">
                                Select a schedule to preview its route and timing details.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Table Section */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
                    <h2 className="text-2xl font-bold text-[#0f172a]">Schedules</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Showing {filtered.length} of {allItems.length} result(s)
                    </p>
                </div>

                {/* Desktop Table */}
                <div className="hidden overflow-x-auto lg:block">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr className="text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-6 py-5">Bus</th>
                                <th className="px-6 py-5">Route</th>
                                <th className="px-6 py-5">Scheduled Date</th>
                                <th className="px-6 py-5">Timing</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                                        Loading schedules...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                                        No schedules found
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((it, i) => (
                                    <tr
                                        key={`${it.bus.busId || it.bus.id || it.bus.busNumber || "bus"}-${it.date}-${i}`}
                                        className="border-t border-slate-100 hover:bg-slate-50/70"
                                    >
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                                                    <Bus className="h-7 w-7 text-orange-500" />
                                                </div>
                                                <div>
                                                    <div className="text-[15px] font-bold text-slate-800">
                                                        {it.bus.busNumber || "-"}
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {it.bus.busName || "SA TRAVELS"} • {it.bus.busType || "Non-AC"}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-6">
                                            <div className="text-[15px] font-semibold text-slate-800">
                                                {getRouteName(it.bus)}
                                            </div>
                                        </td>

                                        <td className="px-6 py-6">
                                            <div className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
                                                {formatDate(it.date)}
                                            </div>
                                        </td>

                                        <td className="px-6 py-6">
                                            <div className="text-sm text-slate-700">
                                                {getStartTime(it.bus)} → {getEndTime(it.bus)}
                                            </div>
                                        </td>

                                        <td className="px-6 py-6">
                                            <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                                                Active
                                            </span>
                                        </td>

                                        <td className="px-6 py-6">
                                            <button
                                                onClick={() => setSelected(it)}
                                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                            >
                                                <Eye className="h-4 w-4" />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-4 p-4 lg:hidden">
                    {loading ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-slate-500">
                            Loading schedules...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-slate-500">
                            No schedules found
                        </div>
                    ) : (
                        filtered.map((it, i) => (
                            <div
                                key={`${it.bus.busId || it.bus.id || it.bus.busNumber || "bus"}-${it.date}-${i}`}
                                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="mb-4 flex items-start gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
                                        <Bus className="h-6 w-6 text-orange-500" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-lg font-bold text-slate-800">
                                            {it.bus.busNumber || "-"}
                                        </h3>
                                        <p className="truncate text-sm text-slate-500">
                                            {getRouteName(it.bus)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-2xl bg-slate-50 p-3">
                                        <p className="text-xs text-slate-500">Date</p>
                                        <p className="mt-1 font-semibold text-orange-600">
                                            {formatDate(it.date)}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-3">
                                        <p className="text-xs text-slate-500">Timing</p>
                                        <p className="mt-1 font-semibold text-slate-800">
                                            {getStartTime(it.bus)} → {getEndTime(it.bus)}
                                        </p>
                                    </div>

                                    <div className="col-span-2 rounded-2xl bg-slate-50 p-3">
                                        <p className="text-xs text-slate-500">Route</p>
                                        <p className="mt-1 font-semibold text-slate-800">
                                            {getPointName(it.bus.startPoint)} → {getPointName(it.bus.endPoint)}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelected(it)}
                                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <Eye className="h-4 w-4" />
                                    View Details
                                </button>
                            </div>
                        ))
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
                                    {selected.bus.busNumber} — {formatDate(selected.date)}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {getRouteName(selected.bus)}
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
                                <InfoCard
                                    icon={<Bus className="h-4 w-4" />}
                                    label="Bus Number"
                                    value={selected.bus.busNumber || "-"}
                                />
                                <InfoCard
                                    icon={<Route className="h-4 w-4" />}
                                    label="Route Name"
                                    value={getRouteName(selected.bus)}
                                />
                                <InfoCard
                                    icon={<MapPin className="h-4 w-4" />}
                                    label="Start Point"
                                    value={getPointName(selected.bus.startPoint)}
                                />
                                <InfoCard
                                    icon={<MapPin className="h-4 w-4" />}
                                    label="End Point"
                                    value={getPointName(selected.bus.endPoint)}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <InfoChip
                                    label="Scheduled Date"
                                    value={formatDate(selected.date)}
                                    color="orange"
                                />
                                <InfoChip
                                    label="Start Time"
                                    value={getStartTime(selected.bus)}
                                    color="green"
                                />
                                <InfoChip
                                    label="End Time"
                                    value={getEndTime(selected.bus)}
                                    color="slate"
                                />
                            </div>

                            <div className="rounded-2xl border border-slate-200 p-4">
                                <h3 className="mb-3 text-lg font-semibold text-slate-800">
                                    Schedule Summary
                                </h3>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs text-slate-500">Route Timing</p>
                                        <p className="mt-1 font-semibold text-slate-800">
                                            {getStartTime(selected.bus)} → {getEndTime(selected.bus)}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs text-slate-500">Bus Type</p>
                                        <p className="mt-1 font-semibold text-slate-800">
                                            {selected.bus.busType || "Non-AC"}
                                        </p>
                                    </div>
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

function StatCard({ title, value, icon }) {
    return (
        <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-lg text-slate-500">{title}</p>
                    <p className="mt-1 break-words text-2xl font-bold text-[#0f172a] sm:text-3xl xl:text-4xl">
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}

function InfoCard({ icon, label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-500">
                {icon}
                <p className="text-sm font-medium">{label}</p>
            </div>
            <p className="break-words text-lg font-semibold text-slate-800">{value || "-"}</p>
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
            <p className="mt-2 break-words text-sm font-bold sm:text-base">{value}</p>
        </div>
    );
}