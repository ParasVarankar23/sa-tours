"use client";

import SeatLayout from "@/components/SeatLayout";
import { showAppToast } from "@/lib/client/toast";
import {
    Armchair,
    Building2,
    BusFront,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Filter,
    MapPin,
    Pencil,
    Plus,
    Route,
    Search,
    Trash2,
    X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

const seatLayoutOptions = ["31", "27", "23"];
const ITEMS_PER_PAGE = 10;

const initialForm = {
    busId: "",
    busNumber: "",
    busName: "",
    busType: "",
    routeName: "",
    startPoint: "",
    endPoint: "",
    startTime: "",
    endTime: "",
    seatLayout: "",
    stops: [],
    cabins: [],
    fareRules: [],
};

export default function AdminBusPage() {
    const [busList, setBusList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [seatFilter, setSeatFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showLayoutModal, setShowLayoutModal] = useState(false);
    const [layoutModalBus, setLayoutModalBus] = useState(null);

    const [formData, setFormData] = useState(initialForm);
    const [editData, setEditData] = useState(initialForm);
    const [editOriginalStartTime, setEditOriginalStartTime] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState("");
    const [confirmAction, setConfirmAction] = useState(() => () => { });

    const [editOriginalStops, setEditOriginalStops] = useState([]);
    const [editOriginalEndTime, setEditOriginalEndTime] = useState("");

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

    const fetchBuses = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/bus");
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch buses");
            }

            setBusList(data.buses || []);
        } catch (error) {
            console.error(error);
            showAppToast("error", error.message || "Failed to load buses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBuses();
    }, []);

    const filteredBuses = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();

        return busList.filter((bus) => {
            const matchesSearch =
                `${bus.busNumber || ""} ${bus.busName || ""} ${bus.busType || ""} ${bus.routeName || ""} ${bus.startPoint || ""} ${bus.endPoint || ""}`
                    .toLowerCase()
                    .includes(term);

            const matchesSeat =
                seatFilter === "All" || String(bus.seatLayout) === seatFilter;

            return matchesSearch && matchesSeat;
        });
    }, [busList, searchTerm, seatFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, seatFilter]);

    const totalPages = Math.ceil(filteredBuses.length / ITEMS_PER_PAGE) || 1;

    const paginatedBuses = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredBuses.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredBuses, currentPage]);

    const busStats = useMemo(() => {
        return {
            total: busList.length,
            seats31: busList.filter((b) => String(b.seatLayout) === "31").length,
            seats27: busList.filter((b) => String(b.seatLayout) === "27").length,
            seats23: busList.filter((b) => String(b.seatLayout) === "23").length,
        };
    }, [busList]);

    const buildRoutePoints = (data) => {
        const points = [];

        if (data.startPoint?.trim()) {
            points.push({
                id: "start",
                label: data.startPoint.trim(),
                time: data.startTime || "",
                type: "start",
            });
        }

        (data.stops || []).forEach((stop, index) => {
            if (stop?.stopName?.trim()) {
                points.push({
                    id: `stop-${index}`,
                    label: stop.stopName.trim(),
                    time: stop.time || "",
                    type: "stop",
                });
            }
        });

        if (data.endPoint?.trim()) {
            points.push({
                id: "end",
                label: data.endPoint.trim(),
                time: data.endTime || "",
                type: "end",
            });
        }

        return points;
    };

    const validateBusForm = (data) => {
        if (
            !data.busNumber.trim() ||
            !data.busName.trim() ||
            !data.busType.trim() ||
            !data.routeName.trim() ||
            !data.startPoint.trim() ||
            !data.endPoint.trim() ||
            !data.startTime.trim() ||
            !data.endTime.trim()
        ) {
            return "Please fill all required bus fields";
        }

        if (!seatLayoutOptions.includes(String(data.seatLayout))) {
            return "Please select a valid seat layout";
        }

        if (data.startPoint.trim().toLowerCase() === data.endPoint.trim().toLowerCase()) {
            return "Start point and end point cannot be same";
        }

        const routePoints = buildRoutePoints(data);

        if (routePoints.length < 2) {
            return "Please provide valid route points";
        }

        const pointLabels = routePoints.map((p) => p.label.toLowerCase());
        const hasDuplicateStops = pointLabels.some(
            (label, index) => pointLabels.indexOf(label) !== index
        );

        if (hasDuplicateStops) {
            return "Duplicate route point names are not allowed";
        }

        for (let i = 0; i < routePoints.length; i++) {
            if (!routePoints[i].time) {
                return `Please provide time for ${routePoints[i].label}`;
            }
        }

        const findIndex = (name) =>
            routePoints.findIndex((p) => p.label === String(name || "").trim());

        for (const rule of data.fareRules || []) {
            const from = String(rule.from || "").trim();
            const to = String(rule.to || "").trim();
            const fare = Number(rule.fare);

            if (!from || !to || !rule.fare) {
                return "Please complete all fare rules";
            }

            const fromIndex = findIndex(from);
            const toIndex = findIndex(to);

            if (fromIndex === -1 || toIndex === -1) {
                return `Invalid fare rule: ${from} → ${to}`;
            }

            if (toIndex <= fromIndex) {
                return `Drop must be after pickup for ${from} → ${to}`;
            }

            if (toIndex - fromIndex < 2) {
                return `Nearby stop fare not allowed for ${from} → ${to}`;
            }

            if (!Number.isFinite(fare) || fare <= 0) {
                return `Fare must be greater than 0 for ${from} → ${to}`;
            }
        }

        return null;
    };

    const handleInputChange = (e, isEdit = false) => {
        const { name, value } = e.target;

        if (isEdit) {
            if (name === "startTime") {
                try {
                    const prevBase = editOriginalStartTime || editData.startTime || "";
                    const prevMin = timeToMinutes(prevBase);
                    const newMin = timeToMinutes(value);

                    let updatedStops = Array.isArray(editData.stops) ? [...editData.stops] : [];

                    if (prevMin !== null && newMin !== null) {
                        const delta = newMin - prevMin;

                        updatedStops = updatedStops.map((s) => {
                            const orig = timeToMinutes(s.time || s.stopTime || "");
                            if (orig === null) return { ...s };
                            return { ...s, time: minutesToTime(orig + delta) };
                        });

                        const prevEnd = editOriginalEndTime || editData.endTime || "";
                        const prevEndMin = timeToMinutes(prevEnd);

                        if (prevEndMin !== null) {
                            const newEnd = minutesToTime(prevEndMin + delta);
                            setEditData((prev) => ({ ...prev, endTime: newEnd }));
                            setEditOriginalEndTime(newEnd);
                        }
                    }

                    setEditData((prev) => ({ ...prev, [name]: value, stops: updatedStops }));
                    setEditOriginalStartTime(value);

                    setEditOriginalStops((prev) =>
                        Array.isArray(prev)
                            ? prev.map((s, i) => ({
                                ...(s || {}),
                                time:
                                    (updatedStops[i] && updatedStops[i].time) ||
                                    (s && s.time) ||
                                    "",
                            }))
                            : updatedStops.map((s) => ({ ...(s || {}), time: s.time || "" }))
                    );
                } catch {
                    setEditData((prev) => ({ ...prev, [name]: value }));
                }
                return;
            }

            setEditData((prev) => ({
                ...prev,
                [name]: value,
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleStopChange = (index, field, value, isEdit = false) => {
        if (isEdit) {
            const updatedStops = [...(editData.stops || [])];

            if (field === "time") {
                const origTime =
                    (editOriginalStops &&
                        editOriginalStops[index] &&
                        editOriginalStops[index].time) ||
                    (editData.stops &&
                        editData.stops[index] &&
                        editData.stops[index].time) ||
                    "";

                const origMin = timeToMinutes(origTime);
                const newMin = timeToMinutes(value);

                updatedStops[index] = { ...(updatedStops[index] || {}), time: value };

                if (origMin !== null && newMin !== null) {
                    const delta = newMin - origMin;

                    for (let i = index + 1; i < updatedStops.length; i++) {
                        const s = updatedStops[i] || {};
                        const sMin = timeToMinutes(s.time || s.stopTime || "");
                        if (sMin !== null) {
                            updatedStops[i] = { ...s, time: minutesToTime(sMin + delta) };
                        }
                    }

                    const prevEnd = editOriginalEndTime || editData.endTime || "";
                    const prevEndMin = timeToMinutes(prevEnd);

                    if (prevEndMin !== null) {
                        const newEnd = minutesToTime(prevEndMin + delta);
                        setEditData((prev) => ({ ...prev, endTime: newEnd }));
                        setEditOriginalEndTime(newEnd);
                    }

                    setEditOriginalStops((prev) => {
                        const base = Array.isArray(prev)
                            ? [...prev]
                            : (editData.stops || []).map((s) => ({ ...s }));

                        for (let i = index; i < updatedStops.length; i++) {
                            base[i] = { ...(base[i] || {}), time: updatedStops[i].time || "" };
                        }

                        return base;
                    });
                }
            } else {
                updatedStops[index] = { ...(updatedStops[index] || {}), [field]: value };
            }

            setEditData((prev) => ({
                ...prev,
                stops: updatedStops,
            }));
        } else {
            const updatedStops = [...(formData.stops || [])];
            updatedStops[index] = { ...(updatedStops[index] || {}), [field]: value };

            setFormData((prev) => ({
                ...prev,
                stops: updatedStops,
            }));
        }
    };

    const addStop = (isEdit = false) => {
        if (isEdit) {
            setEditData((prev) => {
                const stops = Array.isArray(prev.stops) ? [...prev.stops] : [];
                if (stops.length < 20) stops.push({ stopName: "", time: "" });
                return { ...prev, stops };
            });
        } else {
            setFormData((prev) => {
                const stops = Array.isArray(prev.stops) ? [...prev.stops] : [];
                if (stops.length < 20) stops.push({ stopName: "", time: "" });
                return { ...prev, stops };
            });
        }
    };

    const removeStop = (index, isEdit = false) => {
        if (isEdit) {
            setEditData((prev) => {
                const stops = Array.isArray(prev.stops) ? [...prev.stops] : [];
                if (index >= 0 && index < stops.length) {
                    stops.splice(index, 1);
                }
                return { ...prev, stops };
            });
        } else {
            setFormData((prev) => {
                const stops = Array.isArray(prev.stops) ? [...prev.stops] : [];
                if (index >= 0 && index < stops.length) {
                    stops.splice(index, 1);
                }
                return { ...prev, stops };
            });
        }
    };

    const handleCabinChange = (index, value, isEdit = false) => {
        if (isEdit) {
            const updatedCabins = [...(editData.cabins || [])];
            updatedCabins[index] = {
                ...(updatedCabins[index] || {}),
                label: value,
            };

            setEditData((prev) => ({
                ...prev,
                cabins: updatedCabins,
            }));
        } else {
            const updatedCabins = [...(formData.cabins || [])];
            updatedCabins[index] = {
                ...(updatedCabins[index] || {}),
                label: value,
            };

            setFormData((prev) => ({
                ...prev,
                cabins: updatedCabins,
            }));
        }
    };

    const addCabin = (isEdit = false) => {
        if (isEdit) {
            setEditData((prev) => {
                const cabins = Array.isArray(prev.cabins) ? [...prev.cabins] : [];
                if (cabins.length < 8) {
                    cabins.push({
                        cabinNo: cabins.length + 1,
                        label: `CB${cabins.length + 1}`,
                    });
                }
                return { ...prev, cabins };
            });
        } else {
            setFormData((prev) => {
                const cabins = Array.isArray(prev.cabins) ? [...prev.cabins] : [];
                if (cabins.length < 8) {
                    cabins.push({
                        cabinNo: cabins.length + 1,
                        label: `CB${cabins.length + 1}`,
                    });
                }
                return { ...prev, cabins };
            });
        }
    };

    const removeCabin = (index, isEdit = false) => {
        if (isEdit) {
            setEditData((prev) => {
                const cabins = Array.isArray(prev.cabins) ? [...prev.cabins] : [];
                if (cabins.length > 1 && index >= 0 && index < cabins.length) cabins.splice(index, 1);
                return { ...prev, cabins };
            });
        } else {
            setFormData((prev) => {
                const cabins = Array.isArray(prev.cabins) ? [...prev.cabins] : [];
                if (cabins.length > 1 && index >= 0 && index < cabins.length) cabins.splice(index, 1);
                return { ...prev, cabins };
            });
        }
    };

    const handleFareRuleChange = (index, field, value, isEdit = false) => {
        if (isEdit) {
            setEditData((prev) => {
                const updatedFareRules = [...(prev.fareRules || [])];
                updatedFareRules[index] = {
                    ...(updatedFareRules[index] || {}),
                    [field]: value,
                };
                return {
                    ...prev,
                    fareRules: updatedFareRules,
                };
            });
        } else {
            setFormData((prev) => {
                const updatedFareRules = [...(prev.fareRules || [])];
                updatedFareRules[index] = {
                    ...(updatedFareRules[index] || {}),
                    [field]: value,
                };
                return {
                    ...prev,
                    fareRules: updatedFareRules,
                };
            });
        }
    };

    const addFareRule = (isEdit = false) => {
        if (isEdit) {
            setEditData((prev) => {
                const fareRules = Array.isArray(prev.fareRules) ? [...prev.fareRules] : [];
                if (fareRules.length < 100) {
                    fareRules.push({
                        from: "",
                        to: "",
                        fare: "",
                    });
                }
                return { ...prev, fareRules };
            });
        } else {
            setFormData((prev) => {
                const fareRules = Array.isArray(prev.fareRules) ? [...prev.fareRules] : [];
                if (fareRules.length < 100) {
                    fareRules.push({
                        from: "",
                        to: "",
                        fare: "",
                    });
                }
                return { ...prev, fareRules };
            });
        }
    };

    const removeFareRule = (index, isEdit = false) => {
        if (isEdit) {
            setEditData((prev) => {
                const fareRules = Array.isArray(prev.fareRules) ? [...prev.fareRules] : [];
                if (index >= 0 && index < fareRules.length) {
                    fareRules.splice(index, 1);
                }
                return { ...prev, fareRules };
            });
        } else {
            setFormData((prev) => {
                const fareRules = Array.isArray(prev.fareRules) ? [...prev.fareRules] : [];
                if (index >= 0 && index < fareRules.length) {
                    fareRules.splice(index, 1);
                }
                return { ...prev, fareRules };
            });
        }
    };

    const handleAddBus = async (e) => {
        e.preventDefault();
        if (saving) return;

        const error = validateBusForm(formData);
        if (error) {
            return showAppToast("error", error);
        }

        setSaving(true);

        try {
            const payload = { ...formData };

            const res = await fetch("/api/bus", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create bus");
            }

            showAppToast("success", "Bus created successfully");
            setShowAddModal(false);
            setFormData(initialForm);
            fetchBuses();
        } catch (error) {
            console.error(error);
            showAppToast("error", error.message || "Failed to create bus");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (bus) => {
        setEditData({
            busId: bus.busId || "",
            busNumber: bus.busNumber || "",
            busName: bus.busName || "",
            busType: bus.busType || "",
            routeName: bus.routeName || "",
            startPoint: bus.startPoint || "",
            endPoint: bus.endPoint || "",
            startTime: bus.startTime || "",
            endTime: bus.endTime || "",
            seatLayout: String(bus.seatLayout || ""),
            stops: Array.isArray(bus.stops) ? bus.stops : [],
            cabins: Array.isArray(bus.cabins) ? bus.cabins : [],
            fareRules: Array.isArray(bus.fareRules) ? bus.fareRules : [],
        });

        setEditOriginalStartTime(bus.startTime || "");
        setEditOriginalStops(
            Array.isArray(bus.stops)
                ? bus.stops.map((s) => ({ ...(s || {}), time: s.time || s.stopTime || "" }))
                : []
        );
        setEditOriginalEndTime(bus.endTime || "");

        setShowEditModal(true);
    };

    const handleUpdateBus = async (e) => {
        e.preventDefault();
        if (saving) return;

        const error = validateBusForm(editData);
        if (error) {
            return showAppToast("error", error);
        }

        setSaving(true);

        try {
            const payload = { ...editData };

            const res = await fetch("/api/bus", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update bus");
            }

            showAppToast("success", "Bus updated successfully");
            setShowEditModal(false);
            fetchBuses();
        } catch (error) {
            console.error(error);
            showAppToast("error", error.message || "Failed to update bus");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBus = async (busId) => {
        openConfirm(`Delete bus ${busId}? This action cannot be undone.`, async () => {
            try {
                setDeletingId(busId);

                const res = await fetch(`/api/bus?busId=${encodeURIComponent(busId)}`, {
                    method: "DELETE",
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to delete bus");
                }

                showAppToast("success", "Bus deleted successfully");
                fetchBuses();
            } catch (error) {
                console.error(error);
                showAppToast("error", error.message || "Failed to delete bus");
            } finally {
                setDeletingId("");
            }
        });
    };

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
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
                        Bus Management
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Create buses, route timings, stops, cabins, seat layouts and pickup/drop fares.
                    </p>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#ea580c]"
                >
                    <Plus className="h-5 w-5" />
                    Add Bus
                </button>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    title="Total Buses"
                    value={busStats.total}
                    icon={<BusFront className="h-6 w-6 text-[#f97316]" />}
                />
                <SummaryCard
                    title="31 Seat Layout"
                    value={busStats.seats31}
                    icon={<Armchair className="h-6 w-6 text-[#f97316]" />}
                />
                <SummaryCard
                    title="27 Seat Layout"
                    value={busStats.seats27}
                    icon={<Armchair className="h-6 w-6 text-[#f97316]" />}
                />
                <SummaryCard
                    title="23 Seat Layout"
                    value={busStats.seats23}
                    icon={<Armchair className="h-6 w-6 text-[#f97316]" />}
                />
            </div>

            {/* Table Section */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Bus List</h2>
                            <p className="text-sm text-slate-500">
                                Showing {paginatedBuses.length} of {filteredBuses.length} result(s)
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-[320px]">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search bus number, route, type..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                                />
                            </div>

                            <div className="relative w-full sm:w-[180px]">
                                <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={seatFilter}
                                    onChange={(e) => setSeatFilter(e.target.value)}
                                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                                >
                                    <option value="All">All Layouts</option>
                                    <option value="31">31 Seats</option>
                                    <option value="27">27 Seats</option>
                                    <option value="23">23 Seats</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Bus
                                </th>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Route
                                </th>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Time
                                </th>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Layout
                                </th>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Fare Rules
                                </th>
                                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                                        Loading buses...
                                    </td>
                                </tr>
                            ) : paginatedBuses.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                                        No buses found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedBuses.map((bus) => (
                                    <tr key={bus.busId} className="transition hover:bg-orange-50/30">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50">
                                                    <BusFront className="h-5 w-5 text-[#f97316]" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {bus.busNumber}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {bus.busName} • {bus.busType}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="text-sm font-medium text-slate-800">
                                                {bus.routeName}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {bus.startPoint} → {bus.endPoint}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="text-sm text-slate-700">
                                                {bus.startTime} → {bus.endTime}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[#f97316]">
                                                <button
                                                    onClick={() => {
                                                        setLayoutModalBus(bus);
                                                        setShowLayoutModal(true);
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    {bus.seatLayout} Seats
                                                </button>
                                            </span>
                                        </td>

                                        <td className="px-5 py-4">
                                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                {bus.fareRules?.length || 0} Rules
                                            </span>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(bus)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#f97316]"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    Edit
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteBus(bus.busId)}
                                                    disabled={deletingId === bus.busId}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    {deletingId === bus.busId ? "Deleting..." : "Delete"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filteredBuses.length > 0 && (
                    <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                            Page {currentPage} of {totalPages}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Prev
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => goToPage(page)}
                                    className={`h-10 w-10 rounded-xl text-sm font-semibold transition ${currentPage === page
                                        ? "bg-[#f97316] text-white"
                                        : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showAddModal && (
                <BusFormModal
                    title="Add Bus"
                    data={formData}
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAddBus}
                    saving={saving}
                    handleInputChange={handleInputChange}
                    handleStopChange={handleStopChange}
                    handleCabinChange={handleCabinChange}
                    handleFareRuleChange={(index, field, value) =>
                        handleFareRuleChange(index, field, value, false)
                    }
                    addStop={() => addStop(false)}
                    removeStop={(i) => removeStop(i, false)}
                    addCabin={() => addCabin(false)}
                    removeCabin={(i) => removeCabin(i, false)}
                    addFareRule={() => addFareRule(false)}
                    removeFareRule={(i) => removeFareRule(i, false)}
                />
            )}

            {showEditModal && (
                <BusFormModal
                    title="Edit Bus"
                    data={editData}
                    onClose={() => setShowEditModal(false)}
                    onSubmit={handleUpdateBus}
                    isEdit={true}
                    saving={saving}
                    handleInputChange={(e) => handleInputChange(e, true)}
                    handleStopChange={(index, field, value) =>
                        handleStopChange(index, field, value, true)
                    }
                    handleCabinChange={(index, value) =>
                        handleCabinChange(index, value, true)
                    }
                    handleFareRuleChange={(index, field, value) =>
                        handleFareRuleChange(index, field, value, true)
                    }
                    addStop={() => addStop(true)}
                    removeStop={(i) => removeStop(i, true)}
                    addCabin={() => addCabin(true)}
                    removeCabin={(i) => removeCabin(i, true)}
                    addFareRule={() => addFareRule(true)}
                    removeFareRule={(i) => removeFareRule(i, true)}
                />
            )}

            {showLayoutModal && layoutModalBus && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-white px-6 py-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{layoutModalBus.busNumber} — Seat Layout</h3>
                                <p className="text-sm text-slate-500">{layoutModalBus.busName} • {layoutModalBus.routeName}</p>
                            </div>

                            <button
                                onClick={() => setShowLayoutModal(false)}
                                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <SeatLayout
                                layout={String(layoutModalBus.seatLayout || "31")}
                                bookedSeats={layoutModalBus.bookedSeats || []}
                                cabins={layoutModalBus.cabins || []}
                                compact={false}
                            />
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
}

/* =========================
   Bus Form Modal
========================= */
function BusFormModal({
    title,
    data,
    onClose,
    onSubmit,
    saving,
    handleInputChange,
    handleStopChange,
    handleCabinChange,
    handleFareRuleChange,
    addStop,
    removeStop,
    addCabin,
    removeCabin,
    addFareRule,
    removeFareRule,
    isEdit = false,
}) {
    const [visibleStops, setVisibleStops] = useState(10);

    const shownStops = (data.stops || []).slice(0, visibleStops);

    const showMore = () => setVisibleStops((v) => Math.min(20, v + 10));
    const showLess = () => setVisibleStops(10);

    const routePoints = useMemo(() => {
        const points = [];

        if (data.startPoint?.trim()) {
            points.push({
                id: "start",
                label: data.startPoint.trim(),
                time: data.startTime || "",
                type: "start",
            });
        }

        (data.stops || []).forEach((stop, index) => {
            if (stop?.stopName?.trim()) {
                points.push({
                    id: `stop-${index}`,
                    label: stop.stopName.trim(),
                    time: stop.time || "",
                    type: "stop",
                });
            }
        });

        if (data.endPoint?.trim()) {
            points.push({
                id: "end",
                label: data.endPoint.trim(),
                time: data.endTime || "",
                type: "end",
            });
        }

        return points;
    }, [
        data.startPoint,
        data.startTime,
        data.stops,
        data.endPoint,
        data.endTime,
    ]);

    const findPointIndex = (stopLabel) => {
        return routePoints.findIndex((p) => p.label === stopLabel);
    };

    const getValidDropOptions = (fromStop) => {
        const fromIndex = findPointIndex(fromStop);
        if (fromIndex === -1) return [];
        return routePoints.filter((_, idx) => idx - fromIndex >= 2);
    };

    const isFareRuleValid = (rule) => {
        if (!rule?.from || !rule?.to) return true;

        const fromIndex = findPointIndex(rule.from);
        const toIndex = findPointIndex(rule.to);

        if (fromIndex === -1 || toIndex === -1) return false;
        if (toIndex <= fromIndex) return false;
        if (toIndex - fromIndex < 2) return false;

        return true;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4">
            <div className="max-h-[95vh] w-full max-w-7xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-white px-6 py-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                        <p className="text-sm text-slate-500">
                            Fill bus details, route stops, cabins and pickup/drop fare rules.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6">
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        {/* Left Form */}
                        <div className="space-y-6 xl:col-span-2">
                            {/* Basic Details */}
                            <div className="rounded-3xl border border-slate-200 p-5">
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-slate-900">
                                        Bus Details
                                    </h4>
                                    <p className="text-sm text-slate-500">
                                        Enter bus number, route, time and seat layout.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <InputField
                                        label="Bus Number"
                                        name="busNumber"
                                        value={data.busNumber}
                                        onChange={handleInputChange}
                                        icon={<BusFront className="h-5 w-5 text-[#f97316]" />}
                                        placeholder="MH06BW7405"
                                    />

                                    <InputField
                                        label="Bus Name"
                                        name="busName"
                                        value={data.busName}
                                        onChange={handleInputChange}
                                        icon={<BusFront className="h-5 w-5 text-[#f97316]" />}
                                        placeholder="SA TRAVEL'S"
                                    />

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            Bus Type
                                        </label>
                                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                            <Building2 className="h-5 w-5 text-[#f97316]" />
                                            <select
                                                name="busType"
                                                value={data.busType}
                                                onChange={handleInputChange}
                                                className="w-full bg-transparent outline-none"
                                            >
                                                <option value="">Select Bus Type</option>
                                                <option value="AC">AC</option>
                                                <option value="Non-AC">Non-AC</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            Seat Layout
                                        </label>
                                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                            <Armchair className="h-5 w-5 text-[#f97316]" />
                                            <select
                                                name="seatLayout"
                                                value={data.seatLayout}
                                                onChange={handleInputChange}
                                                className="w-full bg-transparent outline-none"
                                            >
                                                <option value="">Select Seat Layout</option>
                                                <option value="31">31 Seats</option>
                                                <option value="27">27 Seats</option>
                                                <option value="23">23 Seats</option>
                                            </select>
                                        </div>
                                    </div>

                                    <InputField
                                        label="Route Name"
                                        name="routeName"
                                        value={data.routeName}
                                        onChange={handleInputChange}
                                        icon={<Route className="h-5 w-5 text-[#f97316]" />}
                                        placeholder="Borli - Dongri"
                                    />

                                    <InputField
                                        label="Start Point"
                                        name="startPoint"
                                        value={data.startPoint}
                                        onChange={handleInputChange}
                                        icon={<MapPin className="h-5 w-5 text-[#f97316]" />}
                                        placeholder="Borli"
                                    />

                                    <InputField
                                        label="End Point"
                                        name="endPoint"
                                        value={data.endPoint}
                                        onChange={handleInputChange}
                                        icon={<MapPin className="h-5 w-5 text-[#f97316]" />}
                                        placeholder="Dongri"
                                    />

                                    <InputField
                                        label="Start Time"
                                        name="startTime"
                                        type="time"
                                        value={data.startTime}
                                        onChange={handleInputChange}
                                        icon={<Clock3 className="h-5 w-5 text-[#f97316]" />}
                                    />

                                    <InputField
                                        label="End Time"
                                        name="endTime"
                                        type="time"
                                        value={data.endTime}
                                        onChange={handleInputChange}
                                        icon={<Clock3 className="h-5 w-5 text-[#f97316]" />}
                                    />
                                </div>
                            </div>

                            {/* Route Stops */}
                            <div className="rounded-3xl border border-slate-200 p-5">
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-slate-900">
                                        Route Stops & Timing ({data.stops?.length || 0}/20)
                                    </h4>
                                    <p className="text-sm text-slate-500">
                                        Add up to 20 route stops between start and end point.
                                    </p>
                                </div>

                                {shownStops.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                                        <p className="text-sm font-medium text-slate-700">
                                            No stops added yet
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Click “Add Stop” to add route stops.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                        {shownStops.map((stop, index) => (
                                            <div
                                                key={index}
                                                className="relative rounded-2xl border border-slate-200 p-4"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => removeStop(index)}
                                                    className="absolute right-3 top-3 rounded-md p-1 text-red-600 hover:bg-red-50"
                                                    title="Remove stop"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>

                                                <p className="mb-3 text-sm font-semibold text-slate-700">
                                                    Stop {index + 1}
                                                </p>

                                                <div className="space-y-3">
                                                    <InputField
                                                        label="Stop Name"
                                                        value={stop.stopName}
                                                        onChange={(e) =>
                                                            handleStopChange(index, "stopName", e.target.value)
                                                        }
                                                        icon={<MapPin className="h-5 w-5 text-[#f97316]" />}
                                                        placeholder={`Stop ${index + 1} name`}
                                                    />

                                                    <InputField
                                                        label="Time"
                                                        type="time"
                                                        value={stop.time}
                                                        onChange={(e) =>
                                                            handleStopChange(index, "time", e.target.value)
                                                        }
                                                        icon={<Clock3 className="h-5 w-5 text-[#f97316]" />}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-sm text-slate-500">
                                        Showing {shownStops.length} of {data.stops?.length || 0} stop(s)
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => addStop && addStop()}
                                            disabled={(data.stops?.length || 0) >= 20}
                                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Add Stop
                                        </button>

                                        {(data.stops?.length || 0) > visibleStops && (
                                            <button
                                                type="button"
                                                onClick={showMore}
                                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                Show more stops
                                            </button>
                                        )}

                                        {visibleStops > 10 && (data.stops?.length || 0) > 10 && (
                                            <button
                                                type="button"
                                                onClick={showLess}
                                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                Show less
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Route Preview */}
                            <div className="rounded-3xl border border-slate-200 p-5">
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-slate-900">
                                        Route Points Preview
                                    </h4>
                                    <p className="text-sm text-slate-500">
                                        Start point, intermediate stops and end point with timings.
                                    </p>
                                </div>

                                {routePoints.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                        Add start point / stops / end point to preview route.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {routePoints.map((point, idx) => (
                                            <div
                                                key={point.id}
                                                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-xs font-bold text-[#f97316]">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {point.label}
                                                        </p>
                                                        <p className="text-xs text-slate-500 uppercase">
                                                            {point.type}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
                                                    {point.time || "--:--"}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Cabin Options */}
                            <div className="rounded-3xl border border-slate-200 p-5">
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-slate-900">
                                        Cabin Options ({data.cabins?.length || 0})
                                    </h4>
                                    <p className="text-sm text-slate-500">
                                        Customize cabin labels like CB1, CB2, etc.
                                    </p>
                                </div>

                                {(data.cabins?.length || 0) === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                                        <p className="text-sm font-medium text-slate-700">
                                            No cabins added yet
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Click “Add Cabin” to create cabin labels.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        {(data.cabins || []).map((cabin, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <InputField
                                                        label={`Cabin ${index + 1}`}
                                                        value={cabin.label}
                                                        onChange={(e) =>
                                                            handleCabinChange(index, e.target.value)
                                                        }
                                                        icon={<Building2 className="h-5 w-5 text-[#f97316]" />}
                                                        placeholder={`CB${index + 1}`}
                                                    />
                                                </div>

                                                <div className="mt-6 ml-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCabin(index)}
                                                        className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                                        title="Remove cabin"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={() => addCabin && addCabin()}
                                        disabled={(data.cabins?.length || 0) >= 8}
                                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        Add Cabin
                                    </button>
                                </div>
                            </div>

                            {/* Fare Rules */}
                            <div className="rounded-3xl border border-slate-200 p-5">
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-slate-900">
                                        Pickup / Drop Fare Rules ({data.fareRules?.length || 0})
                                    </h4>
                                    <p className="text-sm text-slate-500">
                                        Add manual fare by pickup and drop point. Nearby stop pairs are blocked automatically.
                                    </p>
                                </div>

                                {(data.fareRules?.length || 0) === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                                        <p className="text-sm font-medium text-slate-700">
                                            No fare rules added yet
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Example: Borli → Dongri = ₹500
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {(data.fareRules || []).map((rule, index) => {
                                            const validDropOptions = rule.from ? getValidDropOptions(rule.from) : [];
                                            const validRule = isFareRuleValid(rule);

                                            return (
                                                <div
                                                    key={index}
                                                    className={`rounded-2xl border p-4 ${validRule
                                                        ? "border-slate-200"
                                                        : "border-red-300 bg-red-50/40"
                                                        }`}
                                                >
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <p className="text-sm font-semibold text-slate-700">
                                                            Fare Rule {index + 1}
                                                        </p>

                                                        <button
                                                            type="button"
                                                            onClick={() => removeFareRule(index)}
                                                            className="rounded-md p-1 text-red-600 hover:bg-red-50"
                                                            title="Remove fare rule"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                                        {/* Pickup */}
                                                        <div>
                                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                                Pickup Point
                                                            </label>
                                                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                                                <MapPin className="h-5 w-5 text-[#f97316]" />
                                                                <select
                                                                    value={rule.from || ""}
                                                                    onChange={(e) => {
                                                                        const selectedFrom = e.target.value;
                                                                        handleFareRuleChange(index, "from", selectedFrom);

                                                                        const nextValidDrops = getValidDropOptions(selectedFrom);
                                                                        if (!nextValidDrops.some((p) => p.label === rule.to)) {
                                                                            handleFareRuleChange(index, "to", "");
                                                                        }
                                                                    }}
                                                                    className="w-full bg-transparent outline-none"
                                                                >
                                                                    <option value="">Select Pickup</option>
                                                                    {routePoints.slice(0, -1).map((point) => (
                                                                        <option key={point.id} value={point.label}>
                                                                            {point.label} ({point.time || "--:--"})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Drop */}
                                                        <div>
                                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                                Drop Point
                                                            </label>
                                                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                                                <MapPin className="h-5 w-5 text-[#f97316]" />
                                                                <select
                                                                    value={rule.to || ""}
                                                                    onChange={(e) =>
                                                                        handleFareRuleChange(index, "to", e.target.value)
                                                                    }
                                                                    className="w-full bg-transparent outline-none"
                                                                    disabled={!rule.from}
                                                                >
                                                                    <option value="">
                                                                        {rule.from ? "Select Drop" : "Select Pickup First"}
                                                                    </option>
                                                                    {validDropOptions.map((point) => (
                                                                        <option key={point.id} value={point.label}>
                                                                            {point.label} ({point.time || "--:--"})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Fare */}
                                                        <InputField
                                                            label="Fare (₹)"
                                                            value={rule.fare || ""}
                                                            onChange={(e) =>
                                                                handleFareRuleChange(index, "fare", e.target.value)
                                                            }
                                                            icon={<BusFront className="h-5 w-5 text-[#f97316]" />}
                                                            placeholder="500"
                                                            type="number"
                                                        />
                                                    </div>

                                                    {!validRule && rule.from && rule.to ? (
                                                        <p className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700">
                                                            Invalid pair: nearby stops or wrong order not allowed.
                                                        </p>
                                                    ) : null}

                                                    {rule.from && rule.to && rule.fare && validRule ? (
                                                        <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-sm font-medium text-slate-700">
                                                            {rule.from} → {rule.to} ={" "}
                                                            <span className="font-bold text-[#f97316]">₹{rule.fare}</span>
                                                        </p>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => addFareRule && addFareRule()}
                                        disabled={(data.fareRules?.length || 0) >= 100}
                                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        Add Fare Rule
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Preview */}
                        <div className="space-y-6">
                            <div className="rounded-3xl border border-orange-100 bg-orange-50/30 p-5">
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-slate-900">
                                        Seat Layout Preview
                                    </h4>
                                    <p className="text-sm text-slate-500">
                                        Left 1 seat • aisle • right 2 seats layout
                                    </p>
                                </div>

                                <SeatVisualizer
                                    seatLayout={data.seatLayout}
                                    busNumber={data.busNumber}
                                    busName={data.busName}
                                    routeName={data.routeName}
                                    startTime={data.startTime}
                                    cabins={data.cabins || []}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ea580c] disabled:opacity-60"
                        >
                            {saving ? "Saving..." : isEdit ? "Update Bus" : "Save Bus"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* =========================
   Better Seat Visualizer
========================= */
function SeatVisualizer({ seatLayout, busNumber, busName, routeName, startTime, cabins }) {
    if (!seatLayout) {
        return (
            <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm text-center">
                <p className="text-sm font-medium text-slate-700">No seat layout selected</p>
                <p className="mt-1 text-xs text-slate-500">
                    Please select a seat layout to preview the bus seating.
                </p>
            </div>
        );
    }

    const layout = useMemo(() => {
        if (seatLayout === "31") {
            return {
                pairRow: [1, 2],
                mainRows: [
                    [3, 4, 5],
                    [6, 7, 8],
                    [9, 10, 11],
                    [12, 13, 14],
                    [15, 16, 17],
                    [18, 19, 20],
                    [21, 22, 23],
                    [24, 25, 26],
                ],
                singleRow: [],
                lastRow: [27, 28, 29, 30, 31],
            };
        }

        if (seatLayout === "27") {
            return {
                pairRow: [1, 2],
                mainRows: [
                    [3, 4, 5],
                    [6, 7, 8],
                    [9, 10, 11],
                    [12, 13, 14],
                    [15, 16, 17],
                    [18, 19, 20],
                ],
                singleRow: [21, 22],
                lastRow: [23, 24, 25, 26, 27],
            };
        }

        return {
            pairRow: [1, 2],
            mainRows: [
                [3, 4, 5],
                [6, 7, 8],
                [9, 10, 11],
                [12, 13, 14],
                [15, 16, 17],
            ],
            singleRow: [18],
            lastRow: [19, 20, 21, 22, 23],
        };
    }, [seatLayout]);

    return (
        <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
            {/* Header */}
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                    <div>
                        <p className="text-slate-500">Bus No.</p>
                        <p className="font-semibold text-slate-900">
                            {busNumber || "--"}
                        </p>
                    </div>

                    <div className="text-left sm:text-center">
                        <p className="text-slate-500">Operator</p>
                        <p className="font-bold tracking-wide text-slate-900">
                            {busName || "--"}
                        </p>
                    </div>

                    <div className="text-left sm:text-right">
                        <p className="text-slate-500">Time</p>
                        <p className="font-semibold text-slate-900">
                            {startTime || "--:--"}
                        </p>
                    </div>
                </div>

                <div className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs text-slate-700">
                    Route:{" "}
                    <span className="font-semibold text-slate-900">
                        {routeName || "--"}
                    </span>
                </div>
            </div>

            {/* Seat body */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-slate-900">
                        {seatLayout} Seat Layout
                    </h5>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-semibold text-[#f97316]">
                        Left 1 • Right 2
                    </span>
                </div>

                {/* First pair row */}
                <div className="mb-3 grid grid-cols-[1fr_28px_1fr_1fr] gap-2">
                    <div />
                    <div className="rounded-lg bg-orange-50/70" />
                    <SeatTicketBox seatNo={layout.pairRow[0]} />
                    <SeatTicketBox seatNo={layout.pairRow[1]} />
                </div>

                {/* Main rows */}
                <div className="space-y-3">
                    {layout.mainRows.map((row, index) => (
                        <div
                            key={index}
                            className="grid grid-cols-[1fr_28px_1fr_1fr] gap-2"
                        >
                            <SeatTicketBox seatNo={row[0]} />
                            <div className="rounded-lg bg-orange-50/70" />
                            <SeatTicketBox seatNo={row[1]} />
                            <SeatTicketBox seatNo={row[2]} />
                        </div>
                    ))}
                </div>

                {/* Single row / partial row */}
                {layout.singleRow?.length > 0 && (
                    <div className="mt-3 space-y-3">
                        {layout.singleRow.length === 1 ? (
                            <div className="grid grid-cols-[1fr_28px_1fr_1fr] gap-2">
                                <SeatTicketBox seatNo={layout.singleRow[0]} />
                                <div className="rounded-lg bg-orange-50/70" />
                                <div />
                                <div />
                            </div>
                        ) : (
                            <div className="grid grid-cols-[1fr_28px_1fr_1fr] gap-2">
                                <SeatTicketBox seatNo={layout.singleRow[0]} />
                                <div className="rounded-lg bg-orange-50/70" />
                                <SeatTicketBox seatNo={layout.singleRow[1]} />
                                <div />
                            </div>
                        )}
                    </div>
                )}

                {/* Last row */}
                <div className="mt-4">
                    <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Back Row
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                        {layout.lastRow.map((seat) => (
                            <SeatTicketBox key={seat} seatNo={seat} />
                        ))}
                    </div>
                </div>

                {/* Cabin */}
                {(() => {
                    const cabinCount = Array.isArray(cabins) && cabins.length > 0 ? cabins.length : 6;
                    const allSeats = [
                        ...(layout.pairRow || []),
                        ...(layout.singleRow || []),
                        ...layout.lastRow,
                        ...layout.mainRows.flat(),
                    ].filter(Boolean);
                    const lastSeat = allSeats.length ? Math.max(...allSeats) : 0;
                    const cabinNumbers = Array.from({ length: cabinCount }, (_, i) => lastSeat + i + 1);

                    return (
                        <div className="mt-5">
                            <div className="mb-2 text-center text-base font-bold tracking-wide text-slate-900">
                                CABIN
                            </div>

                            <div className="space-y-2">
                                <div className="grid grid-cols-6 gap-2">
                                    {cabinNumbers.map((cn) => (
                                        <SeatTicketBox key={cn} seatNo={cn} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}

function SeatTicketBox({ seatNo }) {
    return (
        <div className="min-h-[78px] rounded-xl border border-slate-300 bg-white px-2 py-2 shadow-sm">
            <div className="text-xs font-bold text-slate-900">{seatNo}</div>

            <div className="mt-1 space-y-1 text-[9px] leading-none text-slate-500">
                <div className="flex items-center gap-1">
                    <span>Name:</span>
                    <span className="block h-[1px] flex-1 bg-slate-300" />
                </div>

                <div className="flex items-center gap-1">
                    <span>Pickup:</span>
                    <span className="block h-[1px] flex-1 bg-slate-300" />
                </div>

                <div className="flex items-center gap-1">
                    <span>Drop:</span>
                    <span className="block h-[1px] flex-1 bg-slate-300" />
                </div>

                <div className="flex items-center gap-1">
                    <span>Mobile:</span>
                    <span className="block h-[1px] flex-1 bg-slate-300" />
                </div>

                <div className="flex items-center gap-1">
                    <span>Email:</span>
                    <span className="block h-[1px] flex-1 bg-slate-300" />
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
                    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                </div>
            </div>
        </div>
    );
}

function InputField({
    label,
    name,
    value,
    onChange,
    icon,
    placeholder,
    type = "text",
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                {icon}
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full text-slate-900 outline-none"
                />
            </div>
        </div>
    );
}