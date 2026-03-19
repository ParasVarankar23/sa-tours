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
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [saving, setSaving] = useState(false);
    const [seasonFlag, setSeasonFlag] = useState(false);
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
    const [previewSchedule, setPreviewSchedule] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editDateValue, setEditDateValue] = useState("");
    const [editRangeOpen, setEditRangeOpen] = useState(false);
    const [editRangeStart, setEditRangeStart] = useState("");
    const [editRangeEnd, setEditRangeEnd] = useState("");

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
    function resolvePointName(point, fallback = "--") {
        if (!point) return fallback;
        if (typeof point === "object") return point.name || fallback;
        return String(point);
    }

    useEffect(() => {
        const fetchBuses = async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/bus");
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load buses");
                }

                const normalized = (data.buses || []).map((b) => {
                    const stops = Array.isArray(b.stops) ? b.stops : [];
                    const firstStopName = stops.length
                        ? stops[0].stopName || stops[0].label || ""
                        : "";
                    const lastStopName = stops.length
                        ? stops[stops.length - 1].stopName || stops[stops.length - 1].label || ""
                        : "";

                    const resolvePoint = (val, fallback) => {
                        if (!val && !fallback) return "";
                        if (val && typeof val === "object") return String(val.name || "");
                        if (val) return String(val);
                        return String(fallback || "");
                    };

                    return {
                        ...b,
                        busId: b.busId || b.id || "",
                        startTime: b.startTime || b.start_time || b.start || "",
                        endTime: b.endTime || b.end_time || b.end || "",
                        startPoint: resolvePoint(
                            b.startPoint || b.start_point || b.start,
                            firstStopName
                        ),
                        endPoint: resolvePoint(
                            b.endPoint || b.end_point || b.end,
                            lastStopName
                        ),
                        pickupPoints: Array.isArray(b.pickupPoints) ? b.pickupPoints : [],
                        dropPoints: Array.isArray(b.dropPoints) ? b.dropPoints : [],
                    };
                });

                console.debug("[schedule] loaded buses:", normalized);

                setBuses(normalized);
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
            (item.busNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.routeName || "").toLowerCase().includes(searchTerm.toLowerCase());

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

        const usingSingle = !!date;
        const hasStart = !!startDate;
        const hasEnd = !!endDate;
        const usingRange = hasStart && hasEnd;

        if (usingSingle && (hasStart || hasEnd)) {
            return showAppToast("error", "Use either single date OR date range, not both");
        }

        if (!usingSingle && !hasStart && !hasEnd) {
            return showAppToast("error", "Select a date or a date range");
        }

        if (!usingSingle && hasStart && !hasEnd) {
            return showAppToast("error", "Please select end date");
        }

        if (!usingSingle && !hasStart && hasEnd) {
            return showAppToast("error", "Please select start date");
        }

        if (usingRange && new Date(endDate) < new Date(startDate)) {
            return showAppToast("error", "End date cannot be before start date");
        }

        setSaving(true);
        try {
            const payload = { busId, season: seasonFlag };

            if (usingSingle) {
                payload.date = date;
            }

            if (usingRange) {
                payload.startDate = startDate;
                payload.endDate = endDate;
            }

            const res = await fetch("/api/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to set availability");
            }

            showAppToast(
                "success",
                usingRange
                    ? `Bus marked available for ${startDate} → ${endDate}`
                    : "Bus marked available on selected date"
            );

            setBusId("");
            setDate("");
            setStartDate("");
            setEndDate("");
            setSeasonFlag(false);
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
                    setStartDate("");
                    setEndDate("");
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
                    // clear preview if deleted
                    if (previewSchedule && previewSchedule.busId === targetBusId && previewSchedule.date === targetDate) {
                        setPreviewSchedule(null);
                    }
                } catch (err) {
                    console.error(err);
                    showAppToast("error", err.message || "Failed to remove availability");
                }
            }
        );
    };

    const handleEditFor = (targetBusId, targetDate) => {
        // open inline edit modal with this schedule
        setPreviewSchedule({ busId: targetBusId, date: targetDate });
        setEditDateValue(targetDate);
        setEditModalOpen(true);
    };

    const handleEditRangeFor = (targetBusId, targetDate) => {
        // open range modal; prefill start=end=targetDate
        setPreviewSchedule({ busId: targetBusId, date: targetDate });
        setEditRangeStart(targetDate);
        setEditRangeEnd(targetDate);
        setEditRangeOpen(true);
    };

    const saveEditedRange = async () => {
        if (!previewSchedule) return showAppToast("error", "No schedule selected");
        if (!editRangeStart || !editRangeEnd) return showAppToast("error", "Select start and end dates");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(editRangeStart) || !/^\d{4}-\d{2}-\d{2}$/.test(editRangeEnd)) return showAppToast("error", "Invalid date format");
        if (new Date(editRangeEnd) < new Date(editRangeStart)) return showAppToast("error", "End date cannot be before start date");

        setSaving(true);
        try {
            // create range
            const res = await fetch("/api/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ busId: previewSchedule.busId, startDate: editRangeStart, endDate: editRangeEnd }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save schedule range");

            showAppToast("success", "Schedule range saved");
            setEditRangeOpen(false);
            setPreviewSchedule(null);
            fetchSchedules();
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to save schedule range");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAllFor = (targetBusId) => {
        const bus = buses.find((b) => b.busId === targetBusId);
        openConfirm(
            `Are you sure you want to remove ALL availability for ${bus?.busNumber || targetBusId}? This will delete every scheduled date for this bus.`,
            async () => {
                try {
                    const items = Object.keys(schedules[targetBusId] || {});
                    // delete each date
                    const calls = items.map((d) => fetch(`/api/schedule?busId=${encodeURIComponent(targetBusId)}&date=${encodeURIComponent(d)}`, { method: 'DELETE' }).then((r) => r.json().then((j) => ({ ok: r.ok, data: j }))));
                    const results = await Promise.all(calls);
                    const failed = results.find((r) => !r.ok);
                    if (failed) throw new Error(failed.data?.error || 'Failed to delete some schedules');

                    showAppToast('success', 'All schedule dates removed for bus');
                    fetchSchedules();
                    if (previewSchedule && previewSchedule.busId === targetBusId) setPreviewSchedule(null);
                } catch (err) {
                    console.error(err);
                    showAppToast('error', err.message || 'Failed to delete all schedules');
                }
            }
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

    const saveEditedSchedule = async () => {
        if (!previewSchedule) return showAppToast("error", "No schedule selected");
        if (!editDateValue) return showAppToast("error", "Select a new date");

        // Basic YYYY-MM-DD check
        if (!/^\d{4}-\d{2}-\d{2}$/.test(editDateValue)) return showAppToast("error", "Invalid date format");

        setSaving(true);
        try {
            // Create new availability for new date
            const resCreate = await fetch("/api/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ busId: previewSchedule.busId, date: editDateValue }),
            });
            const createData = await resCreate.json();
            if (!resCreate.ok) throw new Error(createData.error || "Failed to create new schedule date");

            // Remove old date
            const resDel = await fetch(
                `/api/schedule?busId=${encodeURIComponent(previewSchedule.busId)}&date=${encodeURIComponent(
                    previewSchedule.date
                )}`,
                { method: "DELETE" }
            );
            const delData = await resDel.json();
            if (!resDel.ok) throw new Error(delData.error || "Failed to remove old schedule date");

            showAppToast("success", "Schedule date updated");
            setEditModalOpen(false);
            setPreviewSchedule(null);
            fetchSchedules();
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to update schedule");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setBusId("");
        setDate("");
        setStartDate("");
        setEndDate("");
        setSeasonFlag(false);
    };

    const singleDateDisabled = !!startDate || !!endDate;
    const rangeDisabled = !!date;

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
                        Assign buses to a specific date or date range and make them available for
                        booking.
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
            {editModalOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4 py-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-bold">Edit Schedule Date</h3>
                        <p className="mt-3 text-sm text-slate-700">Update the scheduled date for the selected bus.</p>

                        <div className="mt-4">
                            <label className="text-sm text-slate-600">New Date</label>
                            <input
                                type="date"
                                value={editDateValue}
                                onChange={(e) => setEditDateValue(e.target.value)}
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                            />
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setEditModalOpen(false)}
                                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={saveEditedSchedule}
                                disabled={saving}
                                className="rounded-2xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white hover:bg-[#047857] disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {editRangeOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4 py-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-bold">Edit Schedule Range</h3>
                        <p className="mt-3 text-sm text-slate-700">Set a start and end date to add availability for this bus.</p>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-600">Start Date</label>
                                <input
                                    type="date"
                                    value={editRangeStart}
                                    onChange={(e) => setEditRangeStart(e.target.value)}
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">End Date</label>
                                <input
                                    type="date"
                                    value={editRangeEnd}
                                    onChange={(e) => setEditRangeEnd(e.target.value)}
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setEditRangeOpen(false)}
                                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={saveEditedRange}
                                disabled={saving}
                                className="rounded-2xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white hover:bg-[#047857] disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save Range"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
                    value={
                        date
                            ? date
                            : startDate && endDate
                                ? `${startDate} → ${endDate}`
                                : startDate
                                    ? `${startDate} → ?`
                                    : endDate
                                        ? `? → ${endDate}`
                                        : "--"
                    }
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
                            <h2 className="text-xl font-bold text-slate-900">Assign Bus Availability</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Select a bus and either a single date OR a date range.
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
                                            <option key={b.busId || b.id || JSON.stringify(b)} value={b.busId}>
                                                {`${b.busNumber || "--"} — ${b.routeName || "--"} (${String(
                                                    b.startPoint || "--"
                                                )} → ${String(b.endPoint || "--")})`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Single Date */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Single Date
                                </label>

                                <div
                                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${singleDateDisabled
                                        ? "border-slate-100 bg-slate-100"
                                        : "border-slate-200 bg-white"
                                        }`}
                                >
                                    <CalendarDays className="h-5 w-5 text-[#f97316]" />
                                    <input
                                        className="w-full bg-transparent text-slate-900 outline-none disabled:cursor-not-allowed"
                                        type="date"
                                        value={date}
                                        disabled={singleDateDisabled}
                                        onChange={(e) => {
                                            setDate(e.target.value);
                                            if (e.target.value) {
                                                setStartDate("");
                                                setEndDate("");
                                            }
                                        }}
                                    />
                                </div>

                                <div className="mt-2 text-xs text-slate-500">
                                    Use this for one specific day only
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
                                            ? `${selectedBus.startTime || "--:--"} → ${selectedBus.endTime || "--:--"
                                            }`
                                            : "--:-- → --:--"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                            <div className="mb-4">
                                <h3 className="text-base font-bold text-slate-900">Date Range (Optional)</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Select both start date and end date to schedule multiple days.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Start Date */}
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Start Date
                                    </label>

                                    <div
                                        className={`flex h-14 w-full items-center gap-3 rounded-2xl border px-4 transition-all duration-200 ${rangeDisabled
                                            ? "border-slate-100 bg-slate-100"
                                            : "border-slate-200 bg-white focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100"
                                            }`}
                                    >
                                        <CalendarDays className="h-5 w-5 shrink-0 text-[#f97316]" />
                                        <input
                                            className="w-full min-w-0 bg-transparent text-sm font-medium text-slate-900 outline-none disabled:cursor-not-allowed"
                                            type="date"
                                            value={startDate}
                                            disabled={rangeDisabled}
                                            onChange={(e) => {
                                                setStartDate(e.target.value);
                                                if (e.target.value) setDate("");
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* End Date */}
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        End Date
                                    </label>

                                    <div
                                        className={`flex h-14 w-full items-center gap-3 rounded-2xl border px-4 transition-all duration-200 ${rangeDisabled
                                            ? "border-slate-100 bg-slate-100"
                                            : "border-slate-200 bg-white focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100"
                                            }`}
                                    >
                                        <CalendarDays className="h-5 w-5 shrink-0 text-[#f97316]" />
                                        <input
                                            className="w-full min-w-0 bg-transparent text-sm font-medium text-slate-900 outline-none disabled:cursor-not-allowed"
                                            type="date"
                                            value={endDate}
                                            disabled={rangeDisabled}
                                            min={startDate || undefined}
                                            onChange={(e) => {
                                                setEndDate(e.target.value);
                                                if (e.target.value) setDate("");
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Selected Bus Preview Mini */}
                        {selectedBus ? (
                            <div className="mt-6 rounded-3xl border border-orange-100 bg-orange-50/30 p-5">
                                <div className="mb-4">
                                    <h3 className="text-base font-bold text-slate-900">Selected Bus Preview</h3>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <InfoRow
                                        icon={<Route className="h-4 w-4 text-[#f97316]" />}
                                        label="Route"
                                        value={selectedBus.routeName || "--"}
                                    />

                                    <InfoRow
                                        icon={<MapPin className="h-4 w-4 text-[#f97316]" />}
                                        label="Path"
                                        value={`${String(selectedBus.startPoint || "--")} → ${String(
                                            selectedBus.endPoint || "--"
                                        )}`}
                                    />

                                    <InfoRow
                                        icon={<Clock3 className="h-4 w-4 text-[#f97316]" />}
                                        label="Timing"
                                        value={`${selectedBus.startTime || "--:--"} → ${selectedBus.endTime || "--:--"
                                            }`}
                                    />

                                    <InfoRow
                                        icon={<CalendarDays className="h-4 w-4 text-[#f97316]" />}
                                        label="Schedule Selection"
                                        value={
                                            date
                                                ? date
                                                : startDate && endDate
                                                    ? `${startDate} → ${endDate}`
                                                    : startDate
                                                        ? `${startDate} → ?`
                                                        : endDate
                                                            ? `? → ${endDate}`
                                                            : "--"
                                        }
                                    />
                                </div>
                            </div>
                        ) : null}

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
                                onClick={handleReset}
                                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Reset
                            </button>

                            {user?.role === "admin" && busId && date ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleEdit}
                                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDeleteAvailability}
                                        disabled={saving}
                                        className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                    >
                                        Delete
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Right Preview Card */}
                <div className="space-y-6">
                    <div className="rounded-3xl border border-orange-100 bg-orange-50/30 p-5 shadow-sm">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Selected Bus Preview</h3>
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
                                        <p className="text-lg font-bold text-slate-900">{selectedBus.busNumber}</p>
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
                                        value={`${resolvePointName(selectedBus.startPoint, "--")} → ${resolvePointName(
                                            selectedBus.endPoint,
                                            "--"
                                        )}`}
                                    />

                                    <InfoRow
                                        icon={<Clock3 className="h-4 w-4 text-[#f97316]" />}
                                        label="Timing"
                                        value={`${selectedBus.startTime || "--:--"} → ${selectedBus.endTime || "--:--"}`}
                                    />

                                    <InfoRow
                                        icon={<CalendarDays className="h-4 w-4 text-[#f97316]" />}
                                        label="Schedule Date"
                                        value={
                                            date
                                                ? date
                                                : startDate && endDate
                                                    ? `${startDate} → ${endDate}`
                                                    : startDate
                                                        ? `${startDate} → ?`
                                                        : endDate
                                                            ? `? → ${endDate}`
                                                            : "--"
                                        }
                                    />

                                    <div className="flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3">
                                        <span className="text-sm font-medium text-slate-700">Seat Layout</span>
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#f97316] shadow-sm">
                                            {selectedBus.seatLayout} Seats
                                        </span>
                                    </div>

                                    {/* Pickup Points */}
                                    {selectedBus.pickupPoints?.length > 0 && (
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Pickup Points
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedBus.pickupPoints.slice(0, 6).map((p, i) => (
                                                    <span
                                                        key={`${p.name}-${i}`}
                                                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                                                    >
                                                        {p.name}
                                                    </span>
                                                ))}
                                                {selectedBus.pickupPoints.length > 6 && (
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                                                        +{selectedBus.pickupPoints.length - 6} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Drop Points */}
                                    {selectedBus.dropPoints?.length > 0 && (
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Drop Points
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedBus.dropPoints.slice(0, 6).map((p, i) => (
                                                    <span
                                                        key={`${p.name}-${i}`}
                                                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                                                    >
                                                        {p.name}
                                                    </span>
                                                ))}
                                                {selectedBus.dropPoints.length > 6 && (
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                                                        +{selectedBus.dropPoints.length - 6} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-3 pt-2">
                                        <button
                                            onClick={() => handleEditRangeFor(selectedBus.busId, date)}
                                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                        >
                                            Edit Range
                                        </button>

                                        <button
                                            onClick={() => handleDeleteAllFor(selectedBus.busId)}
                                            className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                        >
                                            Delete All
                                        </button>
                                    </div>
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
                    <div className="flex gap-6">
                        <div className="flex-1">
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
                                            <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                                                No schedules found
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedSchedules.map((item) => (
                                            <tr
                                                key={`${item.busId}-${item.date}`}
                                                className="border-b last:border-b-0 transition hover:bg-slate-50 cursor-pointer"
                                                onClick={() => handleEditFor(item.busId, item.date)}
                                            >
                                                <td className="px-3 py-3 font-medium text-slate-800">{item.busNumber}</td>
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
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                            Showing{" "}
                            {filteredSchedules.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1} -{" "}
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