"use client";

import { useAuth } from "@/hooks/useAuth";
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
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function SchedulePage() {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busId, setBusId] = useState("");
    const [date, setDate] = useState("");
    const [saving, setSaving] = useState(false);
    const [seasonFlag, setSeasonFlag] = useState(false);
    const [pricingOverrideText, setPricingOverrideText] = useState("");
    const [exactFareMap, setExactFareMap] = useState({});
    const [pricingTerminals, setPricingTerminals] = useState({ forward: null, return: null });
    const [schedules, setSchedules] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [selectedDate, setSelectedDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const ROWS_PER_PAGE = 10;
    const today = new Date();
    const router = useRouter();
    const { user } = useAuth();

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState("");
    const [confirmAction, setConfirmAction] = useState(() => () => { });

    const formatDate = (dateStr) => new Date(dateStr);

    const isSameDay = (d1, d2) =>
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    const startOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay(); // 0 = Sunday
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    };

    const endOfWeek = (date) => {
        const start = startOfWeek(date);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return end;
    };

    const openConfirm = (message, action) => {
        setConfirmMessage(message);
        setConfirmAction(() => action);
        setConfirmOpen(true);
    };

    const closeConfirm = () => {
        setConfirmOpen(false);
        setConfirmMessage("");
        setConfirmAction(() => () => { });
    };

    const fetchSchedules = async () => {
        try {
            const res = await fetch("/api/schedule");
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to load schedules");
            }

            setSchedules(data.schedules || {});
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to load schedules");
        }
    };

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

    useEffect(() => {
        fetchSchedules();
    }, []);

    const selectedBus = useMemo(() => {
        return buses.find((b) => b.busId === busId) || null;
    }, [buses, busId]);

    // initialize exactFareMap from pricingOverrideText or selectedBus pricingRules
    useEffect(() => {
        let map = {};
        let terminals = { forward: null, return: null };

        if (pricingOverrideText && pricingOverrideText.trim()) {
            try {
                const parsed = JSON.parse(pricingOverrideText);
                map = (parsed && parsed.exactFareMap) || {};
                if (parsed && parsed.terminals) terminals = parsed.terminals;
            } catch {
                // ignore invalid JSON
            }
        } else if (
            selectedBus &&
            selectedBus.pricingRules &&
            selectedBus.pricingRules.exactFareMap
        ) {
            map = { ...(selectedBus.pricingRules.exactFareMap || {}) };
        }

        setExactFareMap(map);
        setPricingTerminals(terminals);
    }, [pricingOverrideText, selectedBus]);

    // read pricing saved by fare-editor (localStorage) when busId/date change
    useEffect(() => {
        if (!busId || !date) return;

        try {
            const key = `schedule_pricing_override:${busId}:${date}`;
            const raw =
                typeof window !== "undefined" ? localStorage.getItem(key) : null;

            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.exactFareMap) {
                    setExactFareMap(parsed.exactFareMap || {});
                    setPricingOverrideText(JSON.stringify(parsed));
                    if (parsed.terminals) setPricingTerminals(parsed.terminals || { forward: null, return: null });
                }
            }
        } catch {
            // ignore
        }
    }, [busId, date]);

    const allSchedules = buses.flatMap((b) => {
        const dates = schedules[b.busId] ? Object.keys(schedules[b.busId]) : [];
        return dates.map((d) => ({
            busId: b.busId,
            busNumber: b.busNumber,
            routeName: b.routeName,
            date: d,
        }));
    });

    const filteredSchedules = allSchedules.filter((item) => {
        const scheduleDate = formatDate(item.date);

        const matchesSearch =
            item.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.routeName.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filterType === "today") {
            return isSameDay(scheduleDate, today);
        }

        if (filterType === "date") {
            return selectedDate ? isSameDay(scheduleDate, new Date(selectedDate)) : true;
        }

        if (filterType === "week") {
            const start = startOfWeek(today);
            const end = endOfWeek(today);
            return scheduleDate >= start && scheduleDate <= end;
        }

        if (filterType === "month") {
            return (
                scheduleDate.getMonth() === today.getMonth() &&
                scheduleDate.getFullYear() === today.getFullYear()
            );
        }

        if (filterType === "year") {
            return scheduleDate.getFullYear() === today.getFullYear();
        }

        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / ROWS_PER_PAGE));

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType, selectedDate, buses, schedules]);

    const paginatedSchedules = filteredSchedules.slice(
        (currentPage - 1) * ROWS_PER_PAGE,
        currentPage * ROWS_PER_PAGE
    );

    const handleSetAvailable = async () => {
        if (!busId) return showAppToast("error", "Select a bus");
        if (!date) return showAppToast("error", "Select a date");

        setSaving(true);
        try {
            let pricingOverride = null;

            const hasExact = Object.keys(exactFareMap || {}).some(
                (k) =>
                    exactFareMap[k] !== "" &&
                    exactFareMap[k] !== undefined &&
                    exactFareMap[k] !== null
            );

            if (hasExact) {
                const filtered = {};
                Object.keys(exactFareMap).forEach((k) => {
                    const v = exactFareMap[k];
                    if (v !== "" && v !== undefined && v !== null) {
                        filtered[k] = Number(v);
                    }
                });
                pricingOverride = { exactFareMap: filtered, terminals: pricingTerminals };
            } else if (pricingOverrideText && pricingOverrideText.trim()) {
                try {
                    pricingOverride = JSON.parse(pricingOverrideText);
                } catch {
                    setSaving(false);
                    return showAppToast("error", "Pricing override JSON is invalid");
                }
            }

            const res = await fetch("/api/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ busId, date, season: seasonFlag, pricingOverride }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to set availability");
            }

            showAppToast("success", "Bus marked available on selected date");
            setBusId("");
            setDate("");
            setPricingOverrideText("");
            setExactFareMap({});
            setSeasonFlag(false);
            setPricingTerminals({ forward: null, return: null });
            fetchSchedules();
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to set availability");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAvailability = async () => {
        if (!busId) return showAppToast("error", "Select a bus");
        if (!date) return showAppToast("error", "Select a date");

        openConfirm(
            `Are you sure you want to remove availability for ${selectedBus?.busNumber || busId
            } on ${date}?`,
            async () => {
                setSaving(true);
                try {
                    const res = await fetch(
                        `/api/schedule?busId=${encodeURIComponent(busId)}&date=${encodeURIComponent(
                            date
                        )}`,
                        {
                            method: "DELETE",
                        }
                    );

                    const data = await res.json();

                    if (!res.ok) {
                        throw new Error(data.error || "Failed to remove availability");
                    }

                    showAppToast("success", "Availability removed");
                    setBusId("");
                    setDate("");
                    fetchSchedules();
                } catch (err) {
                    console.error(err);
                    showAppToast("error", err.message || "Failed to remove availability");
                } finally {
                    setSaving(false);
                }
            }
        );
    };

    const handleDeleteFor = async (targetBusId, targetDate) => {
        const bus = buses.find((b) => b.busId === targetBusId);

        openConfirm(
            `Are you sure you want to remove availability for ${bus?.busNumber || targetBusId
            } on ${targetDate}?`,
            async () => {
                try {
                    const res = await fetch(
                        `/api/schedule?busId=${encodeURIComponent(
                            targetBusId
                        )}&date=${encodeURIComponent(targetDate)}`,
                        {
                            method: "DELETE",
                        }
                    );

                    const data = await res.json();

                    if (!res.ok) throw new Error(data.error || "Failed to remove availability");

                    showAppToast("success", "Availability removed");
                    fetchSchedules();
                } catch (err) {
                    console.error(err);
                    showAppToast("error", err.message || "Failed to remove availability");
                }
            }
        );
    };

    const handleEditFor = (targetBusId, targetDate) => {
        router.push(
            `/admin/schedule/edit?busId=${encodeURIComponent(
                targetBusId
            )}&date=${encodeURIComponent(targetDate)}`
        );
    };

    const handleEdit = () => {
        if (!busId) return showAppToast("error", "Select a bus");
        if (!date) return showAppToast("error", "Select a date");

        router.push(
            `/admin/schedule/edit?busId=${encodeURIComponent(busId)}&date=${encodeURIComponent(
                date
            )}`
        );
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

            {/* Confirm Modal */}
            {confirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-bold">Confirm action</h3>
                        <p className="mt-3 text-sm text-slate-700">{confirmMessage}</p>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                onClick={closeConfirm}
                                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={async () => {
                                    try {
                                        await confirmAction();
                                    } finally {
                                        closeConfirm();
                                    }
                                }}
                                className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                        {/* Season Toggle */}
                        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
                            <input
                                id="seasonFlag"
                                type="checkbox"
                                checked={seasonFlag}
                                onChange={(e) => setSeasonFlag(e.target.checked)}
                                className="h-4 w-4 accent-[#f97316]"
                            />
                            <label htmlFor="seasonFlag" className="text-sm font-medium text-slate-700">
                                Apply Season Pricing (+₹100)
                            </label>
                        </div>

                        {/* Pricing Override */}
                        <div className="mt-6">
                            <div className="mb-2 flex items-start justify-between gap-3">
                                <label className="text-sm font-medium text-slate-700">
                                    Pricing Override (Route-wise)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!busId || !date) {
                                            return showAppToast(
                                                "error",
                                                "Select bus and date first to open editor"
                                            );
                                        }
                                        router.push(
                                            `/admin/schedule/fare-editor?busId=${encodeURIComponent(
                                                busId
                                            )}&date=${encodeURIComponent(date)}`
                                        );
                                    }}
                                    className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Open Route Editor
                                </button>
                            </div>

                            {selectedBus &&
                                Array.isArray(selectedBus.stops) &&
                                selectedBus.stops.length > 0 ? (
                                <div className="max-h-72 overflow-auto rounded-lg border bg-white p-2">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs text-slate-500">
                                                <th className="px-2 py-1">From</th>
                                                <th className="px-2 py-1">To</th>
                                                <th className="px-2 py-1">Fare (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const stops = (selectedBus.stops || []).map((s) =>
                                                    typeof s === "string" ? s : s.stopName
                                                );

                                                const rows = [];
                                                for (let i = 0; i < stops.length; i++) {
                                                    for (let j = i + 1; j < stops.length; j++) {
                                                        const from = stops[i];
                                                        const to = stops[j];
                                                        const key = `${from}|${to}`;

                                                        rows.push(
                                                            <tr key={key} className="border-t">
                                                                <td className="px-2 py-2 text-slate-700">{from}</td>
                                                                <td className="px-2 py-2 text-slate-700">{to}</td>
                                                                <td className="px-2 py-2">
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        value={exactFareMap[key] ?? ""}
                                                                        onChange={(e) =>
                                                                            setExactFareMap((prev) => ({
                                                                                ...prev,
                                                                                [key]: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="w-28 rounded-md border px-2 py-1 text-sm"
                                                                        placeholder="e.g. 500"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                }
                                                return rows;
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <textarea
                                    value={pricingOverrideText}
                                    onChange={(e) => setPricingOverrideText(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border px-3 py-2 font-mono text-xs"
                                    placeholder='{"exactFareMap":{"Borli|Dighi":500}}'
                                />
                            )}

                            <p className="mt-2 text-xs text-slate-500">
                                Enter fares for specific From → To pairs. Values left empty will not
                                be included.
                            </p>
                        </div>

                        {/* Action Buttons */}
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
                                    setPricingOverrideText("");
                                    setExactFareMap({});
                                    setSeasonFlag(false);
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
                                        value={`${selectedBus.startPoint || "--"} → ${selectedBus.endPoint || "--"
                                            }`}
                                    />

                                    <InfoRow
                                        icon={<Clock3 className="h-4 w-4 text-[#f97316]" />}
                                        label="Timing"
                                        value={`${selectedBus.startTime || "--:--"} → ${selectedBus.endTime || "--:--"
                                            }`}
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

                                    {user?.role === "admin" && date ? (
                                        <div className="mt-4 flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={handleEdit}
                                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleDeleteAvailability}
                                                disabled={saving}
                                                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                                <p className="text-sm font-medium text-slate-700">No bus selected</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Select a bus to preview its route and details.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Schedules Table */}
            <div className="mt-8">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Schedules</h2>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by bus number or route..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
                            />
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                                />
                            </svg>
                        </div>

                        {/* Filter */}
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="all">All</option>
                            <option value="today">Today</option>
                            <option value="date">Specific Date</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="year">This Year</option>
                        </select>

                        {/* Specific Date */}
                        {filterType === "date" && (
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <table className="min-w-full table-auto">
                        <thead>
                            <tr className="border-b bg-slate-50 text-left text-sm font-semibold text-slate-600">
                                <th className="px-3 py-3">Bus</th>
                                <th className="px-3 py-3">Route</th>
                                <th className="px-3 py-3">Scheduled Date</th>
                                <th className="px-3 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSchedules.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-3 py-8 text-center text-sm text-slate-500"
                                    >
                                        No schedules found
                                    </td>
                                </tr>
                            ) : (
                                paginatedSchedules.map((item) => (
                                    <tr
                                        key={`${item.busId}-${item.date}`}
                                        className="border-b last:border-b-0 transition hover:bg-slate-50"
                                    >
                                        <td className="px-3 py-3 font-medium text-slate-800">
                                            {item.busNumber}
                                        </td>
                                        <td className="px-3 py-3 text-slate-700">{item.routeName}</td>
                                        <td className="px-3 py-3 text-slate-700">{item.date}</td>
                                        <td className="px-3 py-3">
                                            {user?.role === "admin" ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditFor(item.busId, item.date)}
                                                        className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteFor(item.busId, item.date)}
                                                        className="rounded-2xl bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-500">No access</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                            Showing{" "}
                            {filteredSchedules.length === 0
                                ? 0
                                : (currentPage - 1) * ROWS_PER_PAGE + 1}{" "}
                            -{" "}
                            {filteredSchedules.length === 0
                                ? 0
                                : Math.min(currentPage * ROWS_PER_PAGE, filteredSchedules.length)}{" "}
                            of {filteredSchedules.length}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-700 disabled:opacity-50"
                            >
                                Prev
                            </button>

                            <div className="text-sm text-slate-700">
                                Page {currentPage} / {totalPages}
                            </div>

                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-700 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
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
                    <h3 className="break-words text-xl font-bold text-slate-900">{value}</h3>
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