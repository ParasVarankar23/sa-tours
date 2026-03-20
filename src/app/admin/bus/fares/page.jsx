"use client";

import { showAppToast } from "@/lib/client/toast";
import { BUS_TYPES, getFare, isBorliVillageStop, isCityStop, isDighiVillageStop, normalizeStopName, ROUTES } from "@/lib/fare";
import {
    Bus,
    CalendarDays,
    ChevronRight,
    CircleAlert,
    IndianRupee,
    MapPin,
    Route,
    Ticket,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
            ? bus.pickupPoints
                .map((p) => normalizeText(typeof p === "string" ? p : p?.name))
                .filter(Boolean)
            : [];
        const drops = Array.isArray(bus.dropPoints)
            ? bus.dropPoints
                .map((p) => normalizeText(typeof p === "string" ? p : p?.name))
                .filter(Boolean)
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
        if (end && !all.some((x) => normalizeKey(x) === normalizeKey(end)))
            all.push(end);

        return all;
    }

    const middleStops = Array.isArray(bus.stops)
        ? bus.stops
            .map((s) => (typeof s === "string" ? s : s?.stopName))
            .filter(Boolean)
            .map((s) => normalizeText(s))
        : [];

    return [resolve(bus.startPoint), ...middleStops, resolve(bus.endPoint)].filter(
        Boolean
    );
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

function getDropOptions(bus, pickup) {
    if (!bus || !pickup) return [];

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
        for (const p of pickups)
            if (!all.some((x) => normalizeKey(x) === normalizeKey(p))) all.push(p);
        for (const d of drops)
            if (!all.some((x) => normalizeKey(x) === normalizeKey(d))) all.push(d);
        if (end && !all.some((x) => normalizeKey(x) === normalizeKey(end)))
            all.push(end);

        const pickupIndex = all.findIndex((s) => normalizeKey(s) === normalizeKey(pickup));
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
    const pickupIndex = stops.findIndex((s) => normalizeKey(s) === normalizeKey(pickup));
    if (pickupIndex === -1) return [];
    return stops.slice(pickupIndex + 1);
}

function expandFareRules(bus) {
    const rules = Array.isArray(bus.fareRulesRaw)
        ? bus.fareRulesRaw
        : Array.isArray(bus.fareRules)
            ? bus.fareRules
            : [];
    const pickupOptions = getPickupOptions(bus);

    const expanded = [];
    for (let i = 0; i < rules.length; i++) {
        const r = rules[i] || {};
        const from = String(r.from || "").trim();
        const to = String(r.to || "").trim();
        const fare = r.fare;
        const fareStartDate = r.fareStartDate || "";
        const fareEndDate = r.fareEndDate || "";
        const apply = !!r.applyToAllNextPickupsBeforeDrop;

        if (!from && !to && (fare === undefined || fare === "")) continue;

        if (apply) {
            const fromIndex = pickupOptions.findIndex(
                (p) => normalizeKey(p) === normalizeKey(from)
            );
            const endIndex = pickupOptions.length;
            const startIdx = fromIndex === -1 ? 0 : fromIndex;
            for (let j = startIdx; j < endIndex; j++) {
                expanded.push({
                    from: pickupOptions[j],
                    to,
                    fare,
                    fareStartDate,
                    fareEndDate,
                    sourceIndex: i,
                });
            }
        } else {
            expanded.push({ from, to, fare, fareStartDate, fareEndDate, sourceIndex: i });
        }
    }

    return expanded;
}

function ruleAppliesOnDate(rule, dateStr) {
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
}

function normalizeBusTypeLocal(raw) {
    if (!raw) return BUS_TYPES.NON_AC;
    const s = String(raw || "").trim().toLowerCase();
    if (s === "non-ac" || s === "non ac" || s === "nonac" || s.includes("non")) return BUS_TYPES.NON_AC;
    if (s === "ac" || s === "a/c" || s.includes("ac")) return BUS_TYPES.AC;
    return BUS_TYPES.NON_AC;
}

function getEffectiveFare(bus, from, to, dateStr) {
    const rules = Array.isArray(bus.fareRulesRaw)
        ? bus.fareRulesRaw
        : Array.isArray(bus.fareRules)
            ? bus.fareRules
            : [];
    const expanded = expandFareRules(bus);

    const matches = expanded.filter(
        (r) =>
            normalizeKey(r.from) === normalizeKey(from) &&
            normalizeKey(r.to) === normalizeKey(to) &&
            ruleAppliesOnDate(r, dateStr)
    );

    // Debug info
    // eslint-disable-next-line no-console
    console.debug("[FareDebug] expandedMatches", { busId: bus?.busId, from, to, dateStr, expandedCount: expanded.length, matchesCount: matches.length });

    if (matches && matches.length > 0) {
        const chosen = matches[matches.length - 1];
        const fare = Number(chosen.fare);
        if (Number.isFinite(fare) && fare > 0) {
            const sourceRule = rules[chosen.sourceIndex] || null;
            return {
                fare,
                source: {
                    sourceIndex: chosen.sourceIndex,
                    appliedFrom: chosen.from,
                    original: sourceRule,
                },
            };
        }
    }

    // No matching raw rule found — try to derive base fare from fare.js using route detection
    try {
        // prefer using normalized from/to first
        const pickupNorm = normalizeStopName(from);
        const dropNorm = normalizeStopName(to);

        let routeKey = null;
        if (isBorliVillageStop(pickupNorm) && isCityStop(dropNorm)) routeKey = ROUTES.BORLI_TO_DONGRI;
        else if (isDighiVillageStop(pickupNorm) && isCityStop(dropNorm)) routeKey = ROUTES.DIGHI_TO_DONGRI;
        else if (isCityStop(pickupNorm) && isBorliVillageStop(dropNorm)) routeKey = ROUTES.DONGRI_TO_BORLI;
        else if (isCityStop(pickupNorm) && isDighiVillageStop(dropNorm)) routeKey = ROUTES.DONGRI_TO_DIGHI;

        if (routeKey) {
            const mappedType = normalizeBusTypeLocal(bus?.busType);
            const base = getFare({ route: routeKey, pickup: from, drop: to, busType: mappedType });
            // eslint-disable-next-line no-console
            console.debug("[FareDebug] baseFareResult", { busId: bus?.busId, from, to, routeKey, base });

            if (base && Number.isFinite(Number(base.amount)) && Number(base.amount) > 0) {
                return { fare: Number(base.amount), source: { sourceIndex: null, appliedFrom: null, original: null, base: true } };
            }
        } else {
            // eslint-disable-next-line no-console
            console.debug("[FareDebug] route detection failed for pair", { busId: bus?.busId, from, to });
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[FareDebug] base fare lookup failed", e);
    }

    return { fare: null, source: null };
}

export default function AdminFareViewPage() {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBusId, setSelectedBusId] = useState("");
    const [date, setDate] = useState("");
    const [validatedResults, setValidatedResults] = useState({});
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRuleIndex, setEditingRuleIndex] = useState(null);
    const [editForm, setEditForm] = useState({ from: "", to: "", fare: "", fareStartDate: "", fareEndDate: "", applyToAllNextPickupsBeforeDrop: false });

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/bus");
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to load buses");
                setBuses(data.buses || []);
            } catch (e) {
                console.error(e);
                showAppToast("error", e.message || "Failed to load buses");
            } finally {
                setLoading(false);
            }
        };

        load();

        try {
            if (typeof window !== "undefined") {
                const params = new URLSearchParams(window.location.search || "");
                const q = params.get("busId");
                if (q) setSelectedBusId(q);
            }
        } catch (e) { }
    }, []);

    const selectedBus = useMemo(
        () => buses.find((b) => String(b.busId) === String(selectedBusId)) || null,
        [buses, selectedBusId]
    );

    const pickupOptions = useMemo(() => getPickupOptions(selectedBus), [selectedBus]);

    const pairs = useMemo(() => {
        if (!selectedBus) return [];
        const out = [];
        for (const p of pickupOptions) {
            const drops = getDropOptions(selectedBus, p);
            for (const d of drops) {
                const res = getEffectiveFare(selectedBus, p, d, date);
                out.push({ from: p, to: d, fare: res.fare, source: res.source });
            }
        }
        return out;
    }, [selectedBus, pickupOptions, date]);

    const rawRules = useMemo(
        () =>
            Array.isArray(selectedBus?.fareRulesRaw)
                ? selectedBus.fareRulesRaw
                : selectedBus?.fareRules || [],
        [selectedBus]
    );

    function validateRawRule(rule) {
        if (!selectedBus) return { ok: false, expected: null, error: "No bus selected" };
        try {
            // derive route constant from rule from/to or from selectedBus start/end
            const pickupNorm = normalizeStopName(rule.from || "");
            const dropNorm = normalizeStopName(rule.to || "");

            let routeKey = null;
            if (isBorliVillageStop(pickupNorm) && isCityStop(dropNorm)) routeKey = ROUTES.BORLI_TO_DONGRI;
            else if (isDighiVillageStop(pickupNorm) && isCityStop(dropNorm)) routeKey = ROUTES.DIGHI_TO_DONGRI;
            else if (isCityStop(pickupNorm) && isBorliVillageStop(dropNorm)) routeKey = ROUTES.DONGRI_TO_BORLI;
            else if (isCityStop(pickupNorm) && isDighiVillageStop(dropNorm)) routeKey = ROUTES.DONGRI_TO_DIGHI;

            if (!routeKey && selectedBus) {
                const s = normalizeStopName(selectedBus.startPoint || selectedBus.start || "");
                const e = normalizeStopName(selectedBus.endPoint || selectedBus.end || "");
                if (isBorliVillageStop(s) && isCityStop(e)) routeKey = ROUTES.BORLI_TO_DONGRI;
                else if (isDighiVillageStop(s) && isCityStop(e)) routeKey = ROUTES.DIGHI_TO_DONGRI;
                else if (isCityStop(s) && isBorliVillageStop(e)) routeKey = ROUTES.DONGRI_TO_BORLI;
                else if (isCityStop(s) && isDighiVillageStop(e)) routeKey = ROUTES.DONGRI_TO_DIGHI;
            }

            // eslint-disable-next-line no-console
            console.debug("[FareDebug] validateRawRule", { busId: selectedBus?.busId, ruleFrom: rule.from, ruleTo: rule.to, routeKey });

            if (!routeKey) return { ok: false, expected: null, error: "Unable to determine route for validation" };

            const res = getFare({ route: routeKey, pickup: rule.from, drop: rule.to, busType: normalizeBusTypeLocal(selectedBus?.busType) });
            const expected = Number(res?.amount || 0);
            const configured = Number(rule?.fare || 0);
            const ok = Number.isFinite(expected) && expected > 0 && expected === configured;
            return { ok, expected: expected || null, error: null };
        } catch (e) {
            return { ok: false, expected: null, error: e.message || "Validation failed" };
        }
    }

    async function handleValidateClick(rule, idx) {
        const result = validateRawRule(rule);
        setValidatedResults((s) => ({ ...(s || {}), [idx]: result }));
    }

    async function handleDeleteRule(idx) {
        if (!selectedBus) return showAppToast("error", "No bus selected");
        const ok = window.confirm("Delete this fare rule? This action cannot be undone.");
        if (!ok) return;

        const updatedRules = Array.isArray(selectedBus.fareRulesRaw)
            ? selectedBus.fareRulesRaw.slice()
            : Array.isArray(selectedBus.fareRules)
                ? selectedBus.fareRules.slice()
                : [];

        if (idx < 0 || idx >= updatedRules.length) return showAppToast("error", "Invalid rule index");

        updatedRules.splice(idx, 1);

        const payload = {
            busId: selectedBus.busId,
            busNumber: selectedBus.busNumber || "",
            busName: selectedBus.busName || "",
            busType: selectedBus.busType || "",
            routeName: selectedBus.routeName || "",
            startPoint: selectedBus.startPoint || selectedBus.start || { name: selectedBus.startPoint?.name || selectedBus.start || "", time: selectedBus.startTime || "" },
            startTime: selectedBus.startTime || "",
            endPoint: selectedBus.endPoint || selectedBus.end || { name: selectedBus.endPoint?.name || selectedBus.end || "", time: selectedBus.endTime || "" },
            endTime: selectedBus.endTime || "",
            seatLayout: String(selectedBus.seatLayout || ""),
            pickupPoints: Array.isArray(selectedBus.pickupPoints) ? selectedBus.pickupPoints : [],
            dropPoints: Array.isArray(selectedBus.dropPoints) ? selectedBus.dropPoints : [],
            cabins: Array.isArray(selectedBus.cabins) ? selectedBus.cabins : [],
            fareRules: updatedRules,
            fareRulesRaw: updatedRules,
        };

        try {
            setLoading(true);
            const res = await fetch("/api/bus", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete rule");
            showAppToast("success", "Rule deleted");

            // refresh list
            const listRes = await fetch("/api/bus");
            const listData = await listRes.json();
            if (listRes.ok) setBuses(listData.buses || []);
            try {
                if (typeof window !== "undefined" && 'BroadcastChannel' in window) {
                    try {
                        const ch = new BroadcastChannel('sa-tours-buses');
                        ch.postMessage({ type: 'bus-updated', busId: selectedBus?.busId || null });
                        ch.close();
                    } catch (e) {
                        // ignore
                    }
                }
            } catch (e) { }
        } catch (e) {
            console.error(e);
            showAppToast("error", e.message || "Failed to delete rule");
        } finally {
            setLoading(false);
        }
    }

    function openEditRule(idx) {
        const r = rawRules[idx] || {};
        setEditingRuleIndex(idx);
        setEditForm({
            from: r.from || "",
            to: r.to || "",
            fare: r.fare || "",
            fareStartDate: r.fareStartDate || "",
            fareEndDate: r.fareEndDate || "",
            applyToAllNextPickupsBeforeDrop: !!r.applyToAllNextPickupsBeforeDrop,
        });
        setShowEditModal(true);
    }

    async function handleSaveEditedRule() {
        if (!selectedBus) return showAppToast("error", "No bus selected");
        const idx = editingRuleIndex;
        const updatedRules = Array.isArray(selectedBus.fareRulesRaw)
            ? selectedBus.fareRulesRaw.slice()
            : Array.isArray(selectedBus.fareRules)
                ? selectedBus.fareRules.slice()
                : [];

        updatedRules[idx] = {
            from: String(editForm.from || "").trim(),
            to: String(editForm.to || "").trim(),
            fare: editForm.fare,
            fareStartDate: editForm.fareStartDate || "",
            fareEndDate: editForm.fareEndDate || "",
            applyToAllNextPickupsBeforeDrop: !!editForm.applyToAllNextPickupsBeforeDrop,
        };

        // build payload using selectedBus core fields to satisfy server validation
        const payload = {
            busId: selectedBus.busId,
            busNumber: selectedBus.busNumber || "",
            busName: selectedBus.busName || "",
            busType: selectedBus.busType || "",
            routeName: selectedBus.routeName || "",
            startPoint: selectedBus.startPoint || selectedBus.start || { name: selectedBus.startPoint?.name || selectedBus.start || "", time: selectedBus.startTime || "" },
            startTime: selectedBus.startTime || "",
            endPoint: selectedBus.endPoint || selectedBus.end || { name: selectedBus.endPoint?.name || selectedBus.end || "", time: selectedBus.endTime || "" },
            endTime: selectedBus.endTime || "",
            seatLayout: String(selectedBus.seatLayout || ""),
            pickupPoints: Array.isArray(selectedBus.pickupPoints) ? selectedBus.pickupPoints : [],
            dropPoints: Array.isArray(selectedBus.dropPoints) ? selectedBus.dropPoints : [],
            cabins: Array.isArray(selectedBus.cabins) ? selectedBus.cabins : [],
            fareRules: updatedRules,
            fareRulesRaw: updatedRules,
        };

        try {
            setLoading(true);
            const res = await fetch("/api/bus", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save rule");
            showAppToast("success", "Rule updated");
            // refresh list
            const listRes = await fetch("/api/bus");
            const listData = await listRes.json();
            if (listRes.ok) setBuses(listData.buses || []);
        } catch (e) {
            console.error(e);
            showAppToast("error", e.message || "Failed to save rule");
        } finally {
            setShowEditModal(false);
            setEditingRuleIndex(null);
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* Header */}
                {/* Header */}
                <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
                        {/* Left Side */}
                        <div className="lg:col-span-5 xl:col-span-5">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700">
                                <Ticket className="h-3.5 w-3.5" />
                                Fare Management
                            </div>

                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                                Bus Fare Viewer
                            </h1>

                            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                                View all pickup-to-drop fare combinations with applied rule source and date validity in one clean place.
                            </p>
                        </div>

                        {/* Right Side Filters */}
                        <div className="lg:col-span-7 xl:col-span-7">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Bus Select Card */}
                                <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4">
                                    <label className="mb-3 block text-sm font-semibold text-slate-700">
                                        Select Bus
                                    </label>

                                    <div className="relative">
                                        <Bus className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                                        <select
                                            value={selectedBusId}
                                            onChange={(e) => setSelectedBusId(e.target.value)}
                                            className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                        >
                                            <option value="">-- Choose Bus --</option>
                                            {buses.map((b) => (
                                                <option key={b.busId || b.busNumber} value={b.busId}>
                                                    {`${b.busNumber || ""}${b.routeName ? ` - ${b.routeName}` : ""}`}
                                                </option>
                                            ))}
                                        </select>

                                        <svg
                                            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                </div>

                                {/* Date Card */}
                                <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4">
                                    <label className="mb-3 block text-sm font-semibold text-slate-700">
                                        Fare Date
                                    </label>

                                    <div className="relative">
                                        <CalendarDays className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />

                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <div className="flex items-center gap-3 text-slate-600">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-orange-500" />
                            <span className="text-sm font-medium">Loading buses...</span>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !selectedBus && (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                            <Bus className="h-7 w-7" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Select a bus to view fares</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Choose a bus from the dropdown above to see all available pickup and drop fare combinations.
                        </p>
                    </div>
                )}

                {!loading && selectedBus && (
                    <>
                        {/* Bus Summary */}
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                        <Bus className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Bus Details
                                        </p>
                                        <h3 className="text-base font-bold text-slate-900">
                                            {selectedBus.busNumber || "N/A"}
                                        </h3>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600">
                                    {selectedBus.busName || "Unnamed Bus"}
                                </p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                        <Route className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Total Fare Pairs
                                        </p>
                                        <h3 className="text-base font-bold text-slate-900">{pairs.length}</h3>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600">
                                    Pickup to drop combinations generated
                                </p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Raw Rules
                                        </p>
                                        <h3 className="text-base font-bold text-slate-900">{rawRules.length}</h3>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600">Configured fare rules for this bus</p>
                            </div>
                        </div>

                        {/* Fare Cards */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Effective Fare Pairs</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Final fares after applying matching rules and date filters.
                                    </p>
                                </div>
                            </div>

                            {pairs.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                                        <CircleAlert className="h-5 w-5" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-700">
                                        No pickup/drop pairs found for this bus.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                    {pairs.map((p, idx) => (
                                        <div
                                            key={`${p.from}-${p.to}-${idx}`}
                                            className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 transition hover:border-orange-200 hover:bg-white hover:shadow-sm"
                                        >
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                                                        <span className="rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                                                            {p.from}
                                                        </span>
                                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                                        <span className="rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                                                            {p.to}
                                                        </span>
                                                    </div>

                                                    <div className="mt-4 flex items-center gap-2">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                                                            <IndianRupee className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                Fare
                                                            </p>
                                                            {p.fare === null ? (
                                                                <p className="text-sm font-semibold text-slate-400">No fare available</p>
                                                            ) : (
                                                                <p className="text-lg font-bold text-slate-900">₹{p.fare}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div
                                                    className={`inline-flex rounded-2xl px-3 py-2 text-xs font-semibold ${p.fare === null
                                                        ? "bg-slate-100 text-slate-500"
                                                        : "bg-orange-50 text-orange-700 ring-1 ring-orange-100"
                                                        }`}
                                                >
                                                    {p.fare === null ? "Not Matched" : "Rule Applied"}
                                                </div>
                                            </div>

                                            {p.source ? (
                                                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                                                    <div className="mb-2 text-sm font-semibold text-slate-800">
                                                        Applied Rule
                                                    </div>

                                                    <div className="text-sm text-slate-700">
                                                        {p.source.original ? (
                                                            <>
                                                                <span className="font-semibold">{p.source.original.from}</span>
                                                                <span className="mx-2 text-slate-400">→</span>
                                                                <span className="font-semibold">{p.source.original.to}</span>
                                                                <span className="ml-2 font-bold text-orange-600">
                                                                    = ₹{p.source.original.fare}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span>Derived from rule #{p.source.sourceIndex}</span>
                                                        )}
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                                            Valid: {p.source.original?.fareStartDate || "(any)"}
                                                        </span>
                                                        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                                            To: {p.source.original?.fareEndDate || "(any)"}
                                                        </span>

                                                        {p.source.original?.applyToAllNextPickupsBeforeDrop && (
                                                            <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-700">
                                                                Applies to next pickups
                                                            </span>
                                                        )}

                                                        {p.source.appliedFrom &&
                                                            p.source.original &&
                                                            p.source.appliedFrom !== p.source.original.from && (
                                                                <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                                                                    Applied from: {p.source.appliedFrom}
                                                                </span>
                                                            )}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Raw Fare Rules */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5">
                                <h2 className="text-xl font-bold text-slate-900">Raw Fare Rules</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Original configured rules before expansion and override resolution.
                                </p>
                            </div>

                            {rawRules.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                    <p className="text-sm font-medium text-slate-600">No raw fare rules found.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    {rawRules.map((r, i) => (
                                        <div
                                            key={i}
                                            className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 transition hover:bg-white hover:shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                                                        <span className="rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                                                            {r.from || "-"}
                                                        </span>
                                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                                        <span className="rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                                                            {r.to || "-"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700 ring-1 ring-orange-100">
                                                    {r.fare ? `₹${r.fare}` : "-"}
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                                    Start: {r.fareStartDate || "(any)"}
                                                </span>
                                                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                                    End: {r.fareEndDate || "(any)"}
                                                </span>

                                                {r.applyToAllNextPickupsBeforeDrop && (
                                                    <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-700">
                                                        Applies to next pickups
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-4 flex items-center gap-2">
                                                <button
                                                    onClick={() => handleValidateClick(r, i)}
                                                    className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                                >
                                                    Validate
                                                </button>

                                                <button
                                                    onClick={() => openEditRule(i)}
                                                    className="rounded-2xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteRule(i)}
                                                    className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                                >
                                                    Delete
                                                </button>

                                                {validatedResults && validatedResults[i] ? (
                                                    <div className="ml-auto text-xs font-medium">
                                                        {validatedResults[i].error ? (
                                                            <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">Error</span>
                                                        ) : validatedResults[i].ok ? (
                                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Matches ₹{validatedResults[i].expected}</span>
                                                        ) : (
                                                            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Mismatch (expected ₹{validatedResults[i].expected || '—'})</span>
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            {/* Edit modal */}
            <EditRuleModal
                open={showEditModal}
                form={editForm}
                setForm={setEditForm}
                onCancel={() => { setShowEditModal(false); setEditingRuleIndex(null); }}
                onSave={handleSaveEditedRule}
                saving={loading}
            />
        </div>
    );
}

// Edit modal (simple)
function EditRuleModal({ open, form, setForm, onCancel, onSave, saving }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-bold">Edit Fare Rule</h3>

                <div className="mb-3">
                    <label className="text-xs font-semibold text-slate-600">From</label>
                    <input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </div>

                <div className="mb-3">
                    <label className="text-xs font-semibold text-slate-600">To</label>
                    <input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </div>

                <div className="mb-3">
                    <label className="text-xs font-semibold text-slate-600">Fare (₹)</label>
                    <input type="number" value={form.fare} onChange={(e) => setForm({ ...form, fare: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </div>

                <div className="mb-3 grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-600">Start Date</label>
                        <input type="date" value={form.fareStartDate} onChange={(e) => setForm({ ...form, fareStartDate: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600">End Date</label>
                        <input type="date" value={form.fareEndDate} onChange={(e) => setForm({ ...form, fareEndDate: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                    </div>
                </div>

                <div className="mb-4 flex items-center gap-2">
                    <input id="applyNext" type="checkbox" checked={!!form.applyToAllNextPickupsBeforeDrop} onChange={(e) => setForm({ ...form, applyToAllNextPickupsBeforeDrop: e.target.checked })} />
                    <label htmlFor="applyNext" className="text-sm text-slate-700">Apply to all next pickups before drop</label>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                    <button onClick={onCancel} className="rounded-2xl border px-4 py-2 text-sm">Cancel</button>
                    <button onClick={onSave} disabled={saving} className="rounded-2xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white">{saving ? 'Saving...' : 'Save'}</button>
                </div>
            </div>
        </div>
    );
}