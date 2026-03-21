"use client";

import { showAppToast } from "@/lib/client/toast";
import {
    BUS_TYPES,
    getFare,
    isBorliVillageStop,
    isCityStop,
    isDighiVillageStop,
    normalizeStopName,
    ROUTES,
} from "@/lib/fare";
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

/* =========================
   Helpers
========================= */

function normalizeText(v) {
    return String(v || "").trim();
}

function normalizeKey(v) {
    return normalizeText(v).toLowerCase();
}

function resolvePointName(point) {
    if (!point) return "";
    if (typeof point === "string") return normalizeText(point);
    if (typeof point === "object") return normalizeText(point.name);
    return "";
}

function resolvePointObject(point, fallbackTime = "") {
    if (!point) return { name: "", time: fallbackTime || "" };
    if (typeof point === "string") return { name: normalizeText(point), time: fallbackTime || "" };
    return {
        name: normalizeText(point.name),
        time: normalizeText(point.time || fallbackTime || ""),
    };
}

function formatDateLabel(dateStr) {
    if (!dateStr) return "(any)";
    try {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-GB");
    } catch {
        return dateStr;
    }
}

function isDateWithinRange(targetDate, startDate, endDate) {
    if (!targetDate) return true;

    try {
        const t = new Date(targetDate);
        if (Number.isNaN(t.getTime())) return false;

        const targetOnly = new Date(t.getFullYear(), t.getMonth(), t.getDate());

        if (startDate) {
            const s = new Date(startDate);
            if (Number.isNaN(s.getTime())) return false;
            const sOnly = new Date(s.getFullYear(), s.getMonth(), s.getDate());
            if (targetOnly < sOnly) return false;
        }

        if (endDate) {
            const e = new Date(endDate);
            if (Number.isNaN(e.getTime())) return false;
            const eOnly = new Date(e.getFullYear(), e.getMonth(), e.getDate());
            if (targetOnly > eOnly) return false;
        }

        return true;
    } catch {
        return false;
    }
}

function ruleIntersectsRange(rule, rangeFrom, rangeTo) {
    if (!rangeFrom && !rangeTo) return true;

    try {
        const ruleStart = rule?.fareStartDate ? new Date(rule.fareStartDate) : null;
        const ruleEnd = rule?.fareEndDate ? new Date(rule.fareEndDate) : null;
        const from = rangeFrom ? new Date(rangeFrom) : null;
        const to = rangeTo ? new Date(rangeTo) : null;

        const normalize = (d) =>
            d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;

        const rs = normalize(ruleStart);
        const re = normalize(ruleEnd);
        const rf = normalize(from);
        const rt = normalize(to);

        const effectiveRuleStart = rs || new Date(1900, 0, 1);
        const effectiveRuleEnd = re || new Date(2999, 11, 31);
        const effectiveRangeStart = rf || new Date(1900, 0, 1);
        const effectiveRangeEnd = rt || new Date(2999, 11, 31);

        return (
            effectiveRuleStart <= effectiveRangeEnd &&
            effectiveRuleEnd >= effectiveRangeStart
        );
    } catch {
        return false;
    }
}

function buildRouteStops(bus) {
    if (!bus) return [];

    const start = resolvePointName(bus.startPoint);
    const pickups = Array.isArray(bus.pickupPoints)
        ? bus.pickupPoints.map((p) => resolvePointName(p)).filter(Boolean)
        : [];
    const drops = Array.isArray(bus.dropPoints)
        ? bus.dropPoints.map((p) => resolvePointName(p)).filter(Boolean)
        : [];
    const end = resolvePointName(bus.endPoint);

    const all = [];
    if (start) all.push(start);

    for (const p of pickups) {
        if (!all.some((x) => normalizeKey(x) === normalizeKey(p))) {
            all.push(p);
        }
    }

    for (const d of drops) {
        if (!all.some((x) => normalizeKey(x) === normalizeKey(d))) {
            all.push(d);
        }
    }

    if (end && !all.some((x) => normalizeKey(x) === normalizeKey(end))) {
        all.push(end);
    }

    return all;
}

function getPickupOptions(bus) {
    if (!bus) return [];

    const start = resolvePointName(bus.startPoint);
    const pickups = Array.isArray(bus.pickupPoints)
        ? bus.pickupPoints.map((p) => resolvePointName(p)).filter(Boolean)
        : [];

    const out = [];
    if (start) out.push(start);

    for (const p of pickups) {
        if (!out.some((x) => normalizeKey(x) === normalizeKey(p))) {
            out.push(p);
        }
    }

    return out;
}

function getDropOptions(bus, pickup) {
    if (!bus || !pickup) return [];

    const start = resolvePointName(bus.startPoint);
    const pickups = Array.isArray(bus.pickupPoints)
        ? bus.pickupPoints.map((p) => resolvePointName(p)).filter(Boolean)
        : [];
    const drops = Array.isArray(bus.dropPoints)
        ? bus.dropPoints.map((p) => resolvePointName(p)).filter(Boolean)
        : [];
    const end = resolvePointName(bus.endPoint);

    const routeStops = [];
    if (start) routeStops.push(start);

    for (const p of pickups) {
        if (!routeStops.some((x) => normalizeKey(x) === normalizeKey(p))) {
            routeStops.push(p);
        }
    }

    for (const d of drops) {
        if (!routeStops.some((x) => normalizeKey(x) === normalizeKey(d))) {
            routeStops.push(d);
        }
    }

    if (end && !routeStops.some((x) => normalizeKey(x) === normalizeKey(end))) {
        routeStops.push(end);
    }

    const pickupIndex = routeStops.findIndex((s) => normalizeKey(s) === normalizeKey(pickup));
    if (pickupIndex === -1) return [];

    const validDropNames = [...drops];
    if (end) validDropNames.push(end);

    const validDropSet = new Set(validDropNames.map((x) => normalizeKey(x)));

    return routeStops
        .slice(pickupIndex + 1)
        .filter((stop) => validDropSet.has(normalizeKey(stop)));
}

/* =========================
   Fare Rule Expansion
========================= */

function expandFareRules(bus) {
    const rules = Array.isArray(bus?.fareRulesRaw)
        ? bus.fareRulesRaw
        : Array.isArray(bus?.fareRules)
            ? bus.fareRules
            : [];

    if (!bus) return [];

    const start = resolvePointName(bus.startPoint);
    const pickups = Array.isArray(bus.pickupPoints)
        ? bus.pickupPoints.map((p) => resolvePointName(p)).filter(Boolean)
        : [];
    const drops = Array.isArray(bus.dropPoints)
        ? bus.dropPoints.map((p) => resolvePointName(p)).filter(Boolean)
        : [];
    const end = resolvePointName(bus.endPoint);

    const pickupOptions = [];
    if (start) pickupOptions.push(start);

    for (const p of pickups) {
        if (!pickupOptions.some((x) => normalizeKey(x) === normalizeKey(p))) {
            pickupOptions.push(p);
        }
    }

    const dropOptions = [];
    for (const d of drops) {
        if (!dropOptions.some((x) => normalizeKey(x) === normalizeKey(d))) {
            dropOptions.push(d);
        }
    }

    if (end && !dropOptions.some((x) => normalizeKey(x) === normalizeKey(end))) {
        dropOptions.push(end);
    }

    const expanded = [];

    for (let i = 0; i < rules.length; i++) {
        const r = rules[i] || {};
        const from = normalizeText(r.from);
        const to = normalizeText(r.to);
        const fare = Number(r.fare);
        const fareStartDate = normalizeText(r.fareStartDate);
        const fareEndDate = normalizeText(r.fareEndDate);

        const applyNextPickups = Boolean(
            r.applyToAllNextPickupsBeforeDrop ?? r.applyToAllPreviousPickups
        );

        const applyPreviousDrops = Boolean(
            r.applyToAllPreviousDrops ?? r.applyToAllNextDropsAfterPickup
        );

        if (!from || !to || !Number.isFinite(fare) || fare <= 0) continue;

        const fromIndex = pickupOptions.findIndex((p) => normalizeKey(p) === normalizeKey(from));
        const toIndex = dropOptions.findIndex((p) => normalizeKey(p) === normalizeKey(to));

        if (fromIndex === -1 || toIndex === -1) continue;

        const pickupStart = fromIndex;
        const pickupEnd = applyNextPickups ? pickupOptions.length - 1 : fromIndex;

        const dropStart = applyPreviousDrops ? 0 : toIndex;
        const dropEnd = toIndex;

        const seen = new Set();

        for (let pi = pickupStart; pi <= pickupEnd; pi++) {
            for (let di = dropStart; di <= dropEnd; di++) {
                const ef = pickupOptions[pi];
                const et = dropOptions[di];

                const key = `${normalizeKey(ef)}|${normalizeKey(et)}`;
                if (seen.has(key)) continue;
                seen.add(key);

                expanded.push({
                    from: ef,
                    to: et,
                    fare,
                    fareStartDate,
                    fareEndDate,
                    sourceIndex: i,
                    originalRule: r,
                });
            }
        }
    }

    return expanded;
}

/* =========================
   Date Matching
========================= */

function ruleAppliesOnSingleDate(rule, singleDate) {
    if (!singleDate) return true;
    return isDateWithinRange(singleDate, rule.fareStartDate, rule.fareEndDate);
}

function ruleAppliesForRange(rule, rangeFrom, rangeTo) {
    if (!rangeFrom && !rangeTo) return true;
    return ruleIntersectsRange(rule, rangeFrom, rangeTo);
}

function ruleMatchesDateFilter(rule, dateMode, singleDate, rangeFrom, rangeTo) {
    if (dateMode === "single") {
        return ruleAppliesOnSingleDate(rule, singleDate);
    }
    return ruleAppliesForRange(rule, rangeFrom, rangeTo);
}

/* =========================
   Fare / Validation
========================= */

function normalizeBusTypeLocal(raw) {
    if (!raw) return BUS_TYPES.NON_AC;

    const s = String(raw || "").trim().toLowerCase();

    if (s === "non-ac" || s === "non ac" || s === "nonac" || s.includes("non")) {
        return BUS_TYPES.NON_AC;
    }

    if (s === "ac" || s === "a/c" || s.includes("ac")) {
        return BUS_TYPES.AC;
    }

    return BUS_TYPES.NON_AC;
}

function detectRouteKey(bus, from, to) {
    try {
        const pickupNorm = normalizeStopName(from);
        const dropNorm = normalizeStopName(to);

        if (isBorliVillageStop(pickupNorm) && isCityStop(dropNorm)) {
            return ROUTES.BORLI_TO_DONGRI;
        }
        if (isDighiVillageStop(pickupNorm) && isCityStop(dropNorm)) {
            return ROUTES.DIGHI_TO_DONGRI;
        }
        if (isCityStop(pickupNorm) && isBorliVillageStop(dropNorm)) {
            return ROUTES.DONGRI_TO_BORLI;
        }
        if (isCityStop(pickupNorm) && isDighiVillageStop(dropNorm)) {
            return ROUTES.DONGRI_TO_DIGHI;
        }

        const s = normalizeStopName(resolvePointName(bus?.startPoint));
        const e = normalizeStopName(resolvePointName(bus?.endPoint));

        if (isBorliVillageStop(s) && isCityStop(e)) return ROUTES.BORLI_TO_DONGRI;
        if (isDighiVillageStop(s) && isCityStop(e)) return ROUTES.DIGHI_TO_DONGRI;
        if (isCityStop(s) && isBorliVillageStop(e)) return ROUTES.DONGRI_TO_BORLI;
        if (isCityStop(s) && isDighiVillageStop(e)) return ROUTES.DONGRI_TO_DIGHI;

        return null;
    } catch {
        return null;
    }
}

function getEffectiveFare(bus, from, to, dateMode, singleDate, rangeFrom, rangeTo) {
    const rules = Array.isArray(bus?.fareRulesRaw)
        ? bus.fareRulesRaw
        : Array.isArray(bus?.fareRules)
            ? bus.fareRules
            : [];

    const expanded = expandFareRules(bus);

    const matches = expanded.filter(
        (r) =>
            normalizeKey(r.from) === normalizeKey(from) &&
            normalizeKey(r.to) === normalizeKey(to) &&
            ruleMatchesDateFilter(r, dateMode, singleDate, rangeFrom, rangeTo)
    );

    if (matches.length > 0) {
        const chosen = matches[matches.length - 1];
        const fare = Number(chosen.fare);

        if (Number.isFinite(fare) && fare > 0) {
            const sourceRule = rules[chosen.sourceIndex] || chosen.originalRule || null;

            return {
                fare,
                source: {
                    sourceIndex: chosen.sourceIndex,
                    appliedFrom: chosen.from,
                    appliedTo: chosen.to,
                    original: sourceRule,
                },
            };
        }
    }

    try {
        const routeKey = detectRouteKey(bus, from, to);

        if (routeKey) {
            const mappedType = normalizeBusTypeLocal(bus?.busType);
            const base = getFare({
                route: routeKey,
                pickup: from,
                drop: to,
                busType: mappedType,
            });

            if (base && Number.isFinite(Number(base.amount)) && Number(base.amount) > 0) {
                return {
                    fare: Number(base.amount),
                    source: {
                        sourceIndex: null,
                        appliedFrom: null,
                        appliedTo: null,
                        original: null,
                        base: true,
                    },
                };
            }
        }
    } catch (e) {
        console.error("[FareDebug] base fare lookup failed", e);
    }

    return { fare: null, source: null };
}

/* =========================
   Main Page
========================= */

export default function AdminFareViewPage() {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBusId, setSelectedBusId] = useState("");

    const [dateMode, setDateMode] = useState("single"); // single | range
    const [singleDate, setSingleDate] = useState("");
    const [rangeFrom, setRangeFrom] = useState("");
    const [rangeTo, setRangeTo] = useState("");

    const [validatedResults, setValidatedResults] = useState({});
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRuleIndex, setEditingRuleIndex] = useState(null);

    const [editForm, setEditForm] = useState({
        from: "",
        to: "",
        fare: "",
        fareStartDate: "",
        fareEndDate: "",
        applyToAllNextPickupsBeforeDrop: false,
        applyToAllPreviousDrops: false,
    });

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/bus");
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load buses");
                }

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
        } catch { }
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
                const res = getEffectiveFare(
                    selectedBus,
                    p,
                    d,
                    dateMode,
                    singleDate,
                    rangeFrom,
                    rangeTo
                );

                const routeStops = buildRouteStops(selectedBus);

                let nextPickup = null;
                const pickupNames = Array.isArray(selectedBus.pickupPoints)
                    ? selectedBus.pickupPoints.map((x) => resolvePointName(x)).filter(Boolean)
                    : [];

                const dropNames = Array.isArray(selectedBus.dropPoints)
                    ? selectedBus.dropPoints.map((x) => resolvePointName(x)).filter(Boolean)
                    : [];

                const pIdx = routeStops.findIndex((s) => normalizeKey(s) === normalizeKey(p));
                if (pIdx !== -1) {
                    for (let i = pIdx + 1; i < routeStops.length; i++) {
                        const stop = routeStops[i];
                        if (pickupNames.some((x) => normalizeKey(x) === normalizeKey(stop))) {
                            nextPickup = stop;
                            break;
                        }
                    }
                }

                let prevDrop = null;
                const dIdx = routeStops.findIndex((s) => normalizeKey(s) === normalizeKey(d));
                if (dIdx !== -1) {
                    for (let i = dIdx - 1; i >= 0; i--) {
                        const stop = routeStops[i];
                        if (dropNames.some((x) => normalizeKey(x) === normalizeKey(stop))) {
                            prevDrop = stop;
                            break;
                        }
                    }
                }

                out.push({
                    from: p,
                    to: d,
                    fare: res.fare,
                    source: res.source,
                    nextPickup,
                    prevDrop,
                });
            }
        }

        return out;
    }, [selectedBus, pickupOptions, dateMode, singleDate, rangeFrom, rangeTo]);

    const rawRules = useMemo(() => {
        if (Array.isArray(selectedBus?.fareRulesRaw)) return selectedBus.fareRulesRaw;
        if (Array.isArray(selectedBus?.fareRules)) return selectedBus.fareRules;
        return [];
    }, [selectedBus]);

    function validateRawRule(rule) {
        if (!selectedBus) {
            return { ok: false, expected: null, error: "No bus selected" };
        }

        try {
            const expanded = expandFareRules(selectedBus).filter(
                (r) =>
                    r.sourceIndex !== undefined &&
                    rawRules[r.sourceIndex] === rule &&
                    ruleMatchesDateFilter(r, dateMode, singleDate, rangeFrom, rangeTo)
            );

            if (expanded.length === 0) {
                return {
                    ok: false,
                    expected: null,
                    error:
                        dateMode === "single"
                            ? "Rule not active on selected date"
                            : "Rule not active in selected range",
                };
            }

            const expectedPairs = expanded.map((r) => ({
                from: r.from,
                to: r.to,
                expected: Number(r.fare || 0),
                configured: Number(rule?.fare || 0),
            }));

            const allOk = expectedPairs.every(
                (p) => Number.isFinite(p.expected) && p.expected > 0 && p.expected === p.configured
            );

            return {
                ok: allOk,
                expected: Number(rule?.fare || 0),
                error: null,
                expectedPairs,
            };
        } catch (e) {
            return { ok: false, expected: null, error: e.message || "Validation failed" };
        }
    }

    function handleValidateClick(rule, idx) {
        const result = validateRawRule(rule);
        setValidatedResults((s) => ({
            ...(s || {}),
            [idx]: result,
        }));
    }

    async function refreshBuses(keepBusId = selectedBus?.busId) {
        const listRes = await fetch("/api/bus");
        const listData = await listRes.json();

        if (!listRes.ok) {
            throw new Error(listData.error || "Failed to refresh buses");
        }

        setBuses(listData.buses || []);

        if (keepBusId) {
            setSelectedBusId(String(keepBusId));
        }
    }

    async function handleDeleteRule(idx) {
        if (!selectedBus) {
            return showAppToast("error", "No bus selected");
        }

        const ok = window.confirm("Delete this fare rule? This action cannot be undone.");
        if (!ok) return;

        const updatedRules = Array.isArray(selectedBus.fareRulesRaw)
            ? selectedBus.fareRulesRaw.slice()
            : Array.isArray(selectedBus.fareRules)
                ? selectedBus.fareRules.slice()
                : [];

        if (idx < 0 || idx >= updatedRules.length) {
            return showAppToast("error", "Invalid rule index");
        }

        updatedRules.splice(idx, 1);

        const payload = {
            busId: selectedBus.busId,
            busNumber: selectedBus.busNumber || "",
            busName: selectedBus.busName || "",
            busType: selectedBus.busType || "",
            routeName: selectedBus.routeName || "",
            startPoint: resolvePointObject(selectedBus.startPoint, selectedBus.startTime || ""),
            startTime: selectedBus.startTime || "",
            endPoint: resolvePointObject(selectedBus.endPoint, selectedBus.endTime || ""),
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

            if (!res.ok) {
                throw new Error(data.error || "Failed to delete rule");
            }

            showAppToast("success", "Rule deleted");
            await refreshBuses(selectedBus.busId);

            try {
                if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                    const ch = new BroadcastChannel("sa-tours-buses");
                    ch.postMessage({ type: "bus-updated", busId: selectedBus.busId || null });
                    ch.close();
                }
            } catch { }
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
            applyToAllNextPickupsBeforeDrop: !!(
                r.applyToAllNextPickupsBeforeDrop ?? r.applyToAllPreviousPickups
            ),
            applyToAllPreviousDrops: !!(
                r.applyToAllPreviousDrops ?? r.applyToAllNextDropsAfterPickup
            ),
        });

        setShowEditModal(true);
    }

    async function handleSaveEditedRule() {
        if (!selectedBus) {
            return showAppToast("error", "No bus selected");
        }

        const idx = editingRuleIndex;

        const updatedRules = Array.isArray(selectedBus.fareRulesRaw)
            ? selectedBus.fareRulesRaw.slice()
            : Array.isArray(selectedBus.fareRules)
                ? selectedBus.fareRules.slice()
                : [];

        updatedRules[idx] = {
            from: normalizeText(editForm.from),
            to: normalizeText(editForm.to),
            fare: editForm.fare,
            fareStartDate: editForm.fareStartDate || "",
            fareEndDate: editForm.fareEndDate || "",
            applyToAllNextPickupsBeforeDrop: !!editForm.applyToAllNextPickupsBeforeDrop,
            applyToAllPreviousDrops: !!editForm.applyToAllPreviousDrops,
        };

        const payload = {
            busId: selectedBus.busId,
            busNumber: selectedBus.busNumber || "",
            busName: selectedBus.busName || "",
            busType: selectedBus.busType || "",
            routeName: selectedBus.routeName || "",
            startPoint: resolvePointObject(selectedBus.startPoint, selectedBus.startTime || ""),
            startTime: selectedBus.startTime || "",
            endPoint: resolvePointObject(selectedBus.endPoint, selectedBus.endTime || ""),
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

            if (!res.ok) {
                throw new Error(data.error || "Failed to save rule");
            }

            showAppToast("success", "Rule updated");
            await refreshBuses(selectedBus.busId);
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
                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
                        {/* Left Content */}
                        <div className="lg:col-span-5 xl:col-span-5">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-700 sm:text-xs">
                                <Ticket className="h-3.5 w-3.5" />
                                Fare Management
                            </div>

                            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl lg:text-2xl">
                                Bus Fare Viewer
                            </h1>

                            <p className="mt-2 max-w-md text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                                View all pickup-to-drop fare combinations with selected date or range.
                            </p>
                        </div>

                        {/* Right Controls */}
                        <div className="lg:col-span-7 xl:col-span-7">
                            <div className="space-y-3">
                                {/* FIRST ROW - Select Bus */}
                                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                                    <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                                        Select Bus
                                    </label>

                                    <div className="relative">
                                        <Bus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4 sm:h-5 sm:w-5" />

                                        <select
                                            value={selectedBusId}
                                            onChange={(e) => setSelectedBusId(e.target.value)}
                                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:h-12 sm:pl-12 sm:pr-12"
                                        >
                                            <option value="">-- Choose Bus --</option>
                                            {buses.map((b) => (
                                                <option key={b.busId || b.busNumber} value={b.busId}>
                                                    {`${b.busNumber || ""}${b.routeName ? ` - ${b.routeName}` : ""}`}
                                                </option>
                                            ))}
                                        </select>

                                        <svg
                                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:right-4"
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

                                {/* SECOND ROW - Filter Mode + Date */}
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {/* Filter Mode */}
                                    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                                        <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                                            Date Options
                                        </label>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDateMode("single")}
                                                className={`h-11 rounded-2xl border px-2 text-xs font-semibold transition sm:h-12 sm:text-sm ${dateMode === "single"
                                                        ? "border-orange-300 bg-orange-50 text-orange-700"
                                                        : "border-slate-200 bg-white text-slate-600"
                                                    }`}
                                            >
                                                Single Date
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setDateMode("range")}
                                                className={`h-11 rounded-2xl border px-2 text-xs font-semibold transition sm:h-12 sm:text-sm ${dateMode === "range"
                                                        ? "border-orange-300 bg-orange-50 text-orange-700"
                                                        : "border-slate-200 bg-white text-slate-600"
                                                    }`}
                                            >
                                                Date Range
                                            </button>
                                        </div>
                                    </div>

                                    {/* Date Input */}
                                    {dateMode === "single" ? (
                                        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                                            <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                                                Selected Date
                                            </label>

                                            <div className="relative">
                                                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4 sm:h-5 sm:w-5" />

                                                <input
                                                    type="date"
                                                    value={singleDate}
                                                    onChange={(e) => setSingleDate(e.target.value)}
                                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:h-12 sm:pl-12 sm:pr-4"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                                            <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                                                Date Range
                                            </label>

                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="relative">
                                                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4 sm:h-5 sm:w-5" />
                                                    <input
                                                        type="date"
                                                        value={rangeFrom}
                                                        onChange={(e) => setRangeFrom(e.target.value)}
                                                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:h-12 sm:pl-12 sm:pr-4"
                                                    />
                                                </div>

                                                <div className="relative">
                                                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4 sm:h-5 sm:w-5" />
                                                    <input
                                                        type="date"
                                                        value={rangeTo}
                                                        onChange={(e) => setRangeTo(e.target.value)}
                                                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:h-12 sm:pl-12 sm:pr-4"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <div className="flex items-center gap-3 text-slate-600">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-orange-500" />
                            <span className="text-sm font-medium">Loading buses...</span>
                        </div>
                    </div>
                )}

                {!loading && !selectedBus && (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                            <Bus className="h-7 w-7" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Select a bus to view fares</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Choose a bus and date filter to see all effective fares.
                        </p>
                    </div>
                )}

                {!loading && selectedBus && (
                    <>
                        {/* Summary */}
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
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
                                <p className="text-sm text-slate-600">Configured fare rules</p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                        <CalendarDays className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Active Filter
                                        </p>
                                        <h3 className="text-base font-bold text-slate-900">
                                            {dateMode === "single" ? "Single Date" : "Date Range"}
                                        </h3>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600">
                                    {dateMode === "single"
                                        ? singleDate
                                            ? formatDateLabel(singleDate)
                                            : "All dates"
                                        : `${rangeFrom ? formatDateLabel(rangeFrom) : "Any"} → ${rangeTo ? formatDateLabel(rangeTo) : "Any"
                                        }`}
                                </p>
                            </div>
                        </div>

                        {/* Effective Fare Pairs */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5">
                                <h2 className="text-xl font-bold text-slate-900">Effective Fare Pairs</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Date-wise fares based on selected date or range.
                                </p>
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
                                    {pairs.map((p, idx) => {
                                        const statusClass = !p.source
                                            ? "bg-slate-100 text-slate-500"
                                            : p.source.original
                                                ? "bg-orange-50 text-orange-700 ring-1 ring-orange-100"
                                                : p.source.base
                                                    ? "bg-slate-50 text-slate-700"
                                                    : "bg-orange-50 text-orange-700 ring-1 ring-orange-100";

                                        const statusLabel = !p.source
                                            ? "Not Matched"
                                            : p.source.original
                                                ? "Rule Applied"
                                                : p.source.base
                                                    ? "Base Fare"
                                                    : "Derived";

                                        return (
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
                                                                    <p className="text-sm font-semibold text-slate-400">
                                                                        No fare available
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-lg font-bold text-slate-900">
                                                                        ₹{p.fare}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={`inline-flex rounded-2xl px-3 py-2 text-xs font-semibold ${statusClass}`}>
                                                        {statusLabel}
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                    {dateMode === "single" ? (
                                                        <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                                                            {singleDate ? `Date: ${formatDateLabel(singleDate)}` : "All dates"}
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                                                            Range: {rangeFrom ? formatDateLabel(rangeFrom) : "Any"} →{" "}
                                                            {rangeTo ? formatDateLabel(rangeTo) : "Any"}
                                                        </span>
                                                    )}

                                                    {p.nextPickup && (
                                                        <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                                                            Next pickup: {p.nextPickup}
                                                        </span>
                                                    )}

                                                    {p.prevDrop && (
                                                        <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                                                            Previous drop: {p.prevDrop}
                                                        </span>
                                                    )}
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
                                                            ) : p.source.base ? (
                                                                <span>Derived from base fare (route lookup)</span>
                                                            ) : (
                                                                <span>Derived from rule #{p.source.sourceIndex ?? "—"}</span>
                                                            )}
                                                        </div>

                                                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                                                Start: {formatDateLabel(p.source.original?.fareStartDate)}
                                                            </span>
                                                            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                                                End: {formatDateLabel(p.source.original?.fareEndDate)}
                                                            </span>

                                                            {p.source.original?.applyToAllNextPickupsBeforeDrop && (
                                                                <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-700">
                                                                    Applies to next pickups
                                                                </span>
                                                            )}

                                                            {p.source.original?.applyToAllPreviousDrops && (
                                                                <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                                                                    Applies to previous drops
                                                                </span>
                                                            )}

                                                            {p.source.appliedFrom &&
                                                                p.source.original &&
                                                                p.source.appliedFrom !== p.source.original.from && (
                                                                    <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                                                                        Applied from: {p.source.appliedFrom}
                                                                    </span>
                                                                )}

                                                            {p.source.appliedTo &&
                                                                p.source.original &&
                                                                p.source.appliedTo !== p.source.original.to && (
                                                                    <span className="rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-700">
                                                                        Applied to: {p.source.appliedTo}
                                                                    </span>
                                                                )}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Raw Fare Rules */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5">
                                <h2 className="text-xl font-bold text-slate-900">Raw Fare Rules</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Validate rule by selected date or date range.
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
                                                    Start: {formatDateLabel(r.fareStartDate)}
                                                </span>
                                                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                                    End: {formatDateLabel(r.fareEndDate)}
                                                </span>

                                                {r.applyToAllNextPickupsBeforeDrop && (
                                                    <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-700">
                                                        Applies to next pickups
                                                    </span>
                                                )}

                                                {r.applyToAllPreviousDrops && (
                                                    <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                                                        Applies to previous drops
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

                                                {validatedResults?.[i] ? (
                                                    <div className="ml-auto text-xs font-medium">
                                                        {validatedResults[i].error ? (
                                                            <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                                                                {validatedResults[i].error}
                                                            </span>
                                                        ) : validatedResults[i].ok ? (
                                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                                                                Active ₹{validatedResults[i].expected}
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                                                                Mismatch
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>

                                            {validatedResults?.[i]?.expectedPairs?.length ? (
                                                <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                                                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orange-700">
                                                        Active Generated Pairs
                                                    </p>

                                                    <div className="space-y-2">
                                                        {validatedResults[i].expectedPairs.map((pair, idx) => (
                                                            <div
                                                                key={`${pair.from}-${pair.to}-${idx}`}
                                                                className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-sm"
                                                            >
                                                                <span className="font-medium text-slate-700">
                                                                    {pair.from} → {pair.to}
                                                                </span>
                                                                <span className="font-bold text-orange-600">
                                                                    ₹{pair.expected}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <EditRuleModal
                open={showEditModal}
                form={editForm}
                setForm={setEditForm}
                onCancel={() => {
                    setShowEditModal(false);
                    setEditingRuleIndex(null);
                }}
                onSave={handleSaveEditedRule}
                saving={loading}
            />
        </div>
    );
}

/* =========================
   Edit Rule Modal
========================= */

function EditRuleModal({ open, form, setForm, onCancel, onSave, saving }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
                <h3 className="mb-5 text-lg font-bold text-slate-900">Edit Fare Rule</h3>

                <div className="mb-3">
                    <label className="text-xs font-semibold text-slate-600">From</label>
                    <input
                        value={form.from}
                        onChange={(e) => setForm({ ...form, from: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                </div>

                <div className="mb-3">
                    <label className="text-xs font-semibold text-slate-600">To</label>
                    <input
                        value={form.to}
                        onChange={(e) => setForm({ ...form, to: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                </div>

                <div className="mb-3">
                    <label className="text-xs font-semibold text-slate-600">Fare (₹)</label>
                    <input
                        type="number"
                        value={form.fare}
                        onChange={(e) => setForm({ ...form, fare: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                </div>

                <div className="mb-3 grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-600">Start Date</label>
                        <input
                            type="date"
                            value={form.fareStartDate}
                            onChange={(e) => setForm({ ...form, fareStartDate: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-600">End Date</label>
                        <input
                            type="date"
                            value={form.fareEndDate}
                            onChange={(e) => setForm({ ...form, fareEndDate: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                    </div>
                </div>

                <div className="mb-3 flex items-center gap-2">
                    <input
                        id="applyNext"
                        type="checkbox"
                        checked={!!form.applyToAllNextPickupsBeforeDrop}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                applyToAllNextPickupsBeforeDrop: e.target.checked,
                            })
                        }
                    />
                    <label htmlFor="applyNext" className="text-sm text-slate-700">
                        Apply to all next pickups before drop
                    </label>
                </div>

                <div className="mb-4 flex items-center gap-2">
                    <input
                        id="applyPrevDrops"
                        type="checkbox"
                        checked={!!form.applyToAllPreviousDrops}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                applyToAllPreviousDrops: e.target.checked,
                            })
                        }
                    />
                    <label htmlFor="applyPrevDrops" className="text-sm text-slate-700">
                        Apply to all previous drops
                    </label>
                </div>

                <div className="mt-5 flex items-center justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="rounded-2xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}