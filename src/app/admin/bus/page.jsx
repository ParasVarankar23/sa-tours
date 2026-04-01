"use client";

import SeatLayout from "@/components/SeatLayout";
import { showAppToast } from "@/lib/client/toast";
import { BUS_TYPES, getFare, isBorliVillageStop, isCityStop, isDighiVillageStop, normalizeStopName, ROUTES } from "@/lib/fare";
import {
    Armchair,
    Building2,
    BusFront,
    CalendarDays,
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
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const seatLayoutOptions = ["31", "27", "23"];
const ITEMS_PER_PAGE = 10;

const initialForm = {
    busId: "",
    busNumber: "",
    busName: "",
    busType: "",
    routeName: "",
    startPoint: "",
    startTime: "",
    endPoint: "",
    endTime: "",
    seatLayout: "",
    pickupPoints: [],
    dropPoints: [],
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
    const [rulesModalOpen, setRulesModalOpen] = useState(false);
    const [rulesModalBus, setRulesModalBus] = useState(null);

    const [formData, setFormData] = useState(initialForm);
    const [editData, setEditData] = useState(initialForm);

    const normalizeKey = (s) => String(s || "").trim().toLowerCase();

    function computeBaseFareForBus(bus) {
        if (!bus) return null;
        const resolve = (p) => {
            if (!p) return "";
            if (typeof p === "object") return String(p.name || "").trim();
            return String(p || "").trim();
        };

        // prefer explicit start/end, fallback to first pickup / last drop
        let pickup = resolve(bus.startPoint || bus.start);
        let drop = resolve(bus.endPoint || bus.end);
        if (!pickup && Array.isArray(bus.pickupPoints) && bus.pickupPoints.length) pickup = resolve(bus.pickupPoints[0]);
        if (!drop && Array.isArray(bus.dropPoints) && bus.dropPoints.length) drop = resolve(bus.dropPoints[bus.dropPoints.length - 1]);

        // try route detection
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

        // fallback parse routeName like "Borli - Dongri"
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
            // eslint-disable-next-line no-console
            console.debug("[computeBaseFareForBus]", { busId: bus.busId, pickup, drop, routeKey, rawBusType: bus.busType, mappedType });
            const base = getFare({ route: routeKey, pickup, drop, busType: mappedType });
            // eslint-disable-next-line no-console
            console.debug("[computeBaseFareForBus] getFare", base);
            const amt = Number(base?.amount || 0);
            return amt > 0 ? amt : null;
        } catch (e) {
            return null;
        }
    }

    function normalizeBusType(raw) {
        if (!raw) return BUS_TYPES.NON_AC;
        const s = String(raw || "").trim().toLowerCase();
        // detect explicit non-ac forms first to avoid matching the substring "ac" inside "non-ac"
        if (s === "non-ac" || s === "non ac" || s === "nonac" || s.includes("non")) return BUS_TYPES.NON_AC;
        if (s === "ac" || s === "a/c" || s.includes("ac")) return BUS_TYPES.AC;
        return BUS_TYPES.NON_AC;
    }

    function inspectBus(bus) {
        try {
            console.groupCollapsed("[InspectBus]", bus?.busId || "(no-id)");
            console.debug("raw bus:", bus);

            const resolve = (p) => {
                if (!p) return "";
                if (typeof p === "object") return String(p.name || "").trim();
                return String(p || "").trim();
            };

            const start = resolve(bus.startPoint || bus.start);
            const end = resolve(bus.endPoint || bus.end);
            const firstPickup = (Array.isArray(bus.pickupPoints) && bus.pickupPoints[0]) ? resolve(bus.pickupPoints[0]) : "";
            const lastDrop = (Array.isArray(bus.dropPoints) && bus.dropPoints.length) ? resolve(bus.dropPoints[bus.dropPoints.length - 1]) : "";

            console.debug({ start, end, firstPickup, lastDrop });

            const mappedType = normalizeBusType(bus.busType);
            console.debug("busType raw => mapped", { raw: bus.busType, mapped: mappedType });

            // route detection attempts
            const sNorm = normalizeStopName(start || firstPickup);
            const eNorm = normalizeStopName(end || lastDrop);
            let routeKey = null;
            if (isBorliVillageStop(sNorm) && isCityStop(eNorm)) routeKey = ROUTES.BORLI_TO_DONGRI;
            else if (isDighiVillageStop(sNorm) && isCityStop(eNorm)) routeKey = ROUTES.DIGHI_TO_DONGRI;
            else if (isCityStop(sNorm) && isBorliVillageStop(eNorm)) routeKey = ROUTES.DONGRI_TO_BORLI;
            else if (isCityStop(sNorm) && isDighiVillageStop(eNorm)) routeKey = ROUTES.DONGRI_TO_DIGHI;

            console.debug("route detection", { sNorm, eNorm, routeKey, routeName: bus.routeName });

            if (!routeKey && bus.routeName) {
                try {
                    const parts = String(bus.routeName || "").split("-").map((x) => x.trim());
                    if (parts.length === 2) {
                        const a = normalizeStopName(parts[0]);
                        const b = normalizeStopName(parts[1]);
                        const tryKey = (() => {
                            if (isBorliVillageStop(a) && isCityStop(b)) return ROUTES.BORLI_TO_DONGRI;
                            if (isDighiVillageStop(a) && isCityStop(b)) return ROUTES.DIGHI_TO_DONGRI;
                            if (isCityStop(a) && isBorliVillageStop(b)) return ROUTES.DONGRI_TO_BORLI;
                            if (isCityStop(a) && isDighiVillageStop(b)) return ROUTES.DONGRI_TO_DIGHI;
                            return null;
                        })();
                        if (tryKey) routeKey = tryKey;
                    }
                } catch (e) {
                    // ignore
                }
            }

            console.debug("final routeKey", routeKey);

            if (routeKey) {
                try {
                    const base = getFare({ route: routeKey, pickup: start || firstPickup, drop: end || lastDrop, busType: mappedType });
                    console.debug("getFare result:", base);
                } catch (e) {
                    console.error("getFare failed", e);
                }
            }

            console.groupEnd();
        } catch (e) {
            console.error("inspectBus error", e);
        }
    }

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState("");
    const [confirmAction, setConfirmAction] = useState(() => () => { });

    const router = useRouter();

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
            const pickupNames = Array.isArray(bus.pickupPoints)
                ? bus.pickupPoints.map((p) => p.name).join(" ")
                : "";

            const dropNames = Array.isArray(bus.dropPoints)
                ? bus.dropPoints.map((p) => p.name).join(" ")
                : "";

            const matchesSearch = `${bus.busNumber || ""} ${bus.busName || ""} ${bus.busType || ""} ${bus.routeName || ""} ${pickupNames} ${dropNames}`
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

    const validateBusForm = (data) => {
        const resolvePointString = (p) => {
            if (!p) return "";
            if (typeof p === "object") return String(p.name || "").trim();
            return String(p || "").trim();
        };

        if (
            !data.busNumber.trim() ||
            !data.busName.trim() ||
            !data.busType.trim() ||
            !data.routeName.trim() ||
            !resolvePointString(data.startPoint) ||
            !resolvePointString(data.endPoint) ||
            !data.startTime.trim() ||
            !data.endTime.trim()
        ) {
            return "Please fill all required bus fields";
        }

        if (!seatLayoutOptions.includes(String(data.seatLayout))) {
            return "Please select a valid seat layout";
        }

        const pickupPoints = Array.isArray(data.pickupPoints) ? data.pickupPoints : [];
        const dropPoints = Array.isArray(data.dropPoints) ? data.dropPoints : [];

        const validPickups = pickupPoints.filter((p) => p?.name?.trim());
        const validDrops = dropPoints.filter((p) => p?.name?.trim());

        // include startPoint as first pickup option and endPoint as last drop option for validation
        const pickupOptions = [];
        const startStr = resolvePointString(data.startPoint);
        if (startStr) pickupOptions.push({ name: startStr, time: data.startTime || "" });
        pickupOptions.push(...validPickups);

        const dropOptions = [];
        dropOptions.push(...validDrops);
        const endStr = resolvePointString(data.endPoint);
        if (endStr) dropOptions.push({ name: endStr, time: data.endTime || "" });

        if (validPickups.length === 0) {
            return "At least one pickup point is required";
        }

        if (validDrops.length === 0) {
            return "At least one drop point is required";
        }

        const pickupRawNames = validPickups.map((p) => String(p.name || "").trim());
        const pickupLower = pickupRawNames.map((n) => n.toLowerCase());
        const duplicatePickupNames = pickupRawNames.filter((n, i) => pickupLower.indexOf(n.toLowerCase()) !== i);
        if (duplicatePickupNames.length > 0) {
            const uniq = [...new Set(duplicatePickupNames.map((n) => n.trim()))];
            return `Duplicate pickup point names are not allowed: ${uniq.join(", ")}`;
        }

        const dropRawNames = validDrops.map((p) => String(p.name || "").trim());
        const dropLower = dropRawNames.map((n) => n.toLowerCase());
        const duplicateDropNames = dropRawNames.filter((n, i) => dropLower.indexOf(n.toLowerCase()) !== i);
        if (duplicateDropNames.length > 0) {
            const uniq = [...new Set(duplicateDropNames.map((n) => n.trim()))];
            return `Duplicate drop point names are not allowed: ${uniq.join(", ")}`;
        }

        const sStart = resolvePointString(data.startPoint).toLowerCase();
        const sEnd = resolvePointString(data.endPoint).toLowerCase();
        if (sStart && sEnd && sStart === sEnd) {
            return "Start point and End point cannot be the same";
        }

        for (const p of validPickups) {
            if (!p.time?.trim()) {
                return `Please provide time for pickup point: ${p.name}`;
            }
        }

        for (const p of validDrops) {
            if (!p.time?.trim()) {
                return `Please provide time for drop point: ${p.name}`;
            }
        }

        const fareRules = Array.isArray(data.fareRules) ? data.fareRules : [];

        const expandedRules = [];

        for (let ruleIndex = 0; ruleIndex < fareRules.length; ruleIndex++) {
            const rule = fareRules[ruleIndex];
            const from = String(rule?.from || "").trim();
            const to = String(rule?.to || "").trim();
            const fare = Number(rule?.fare);
            const fareStartDate = String(rule?.fareStartDate || "").trim();
            const fareEndDate = String(rule?.fareEndDate || "").trim();
            const applyToAllNextPickupsBeforeDrop = !!rule?.applyToAllNextPickupsBeforeDrop;
            const applyToAllPreviousDrops = !!rule?.applyToAllPreviousDrops;

            const isEmptyRow =
                !from &&
                !to &&
                (rule?.fare === "" || rule?.fare === undefined || rule?.fare === null) &&
                !fareStartDate &&
                !fareEndDate;

            if (isEmptyRow) continue;

            if (!from || !to || !rule?.fare) {
                return `Please complete all fare rules (rule ${ruleIndex + 1})`;
            }

            if (!Number.isFinite(fare) || fare <= 0) {
                return `Fare must be greater than 0 for rule ${ruleIndex + 1}`;
            }

            const fromIndex = pickupOptions.findIndex(
                (p) => p.name.trim().toLowerCase() === from.toLowerCase()
            );
            const toIndex = dropOptions.findIndex(
                (p) => p.name.trim().toLowerCase() === to.toLowerCase()
            );

            if (fromIndex === -1) {
                return `Invalid pickup point in fare rule ${ruleIndex + 1}`;
            }

            if (toIndex === -1) {
                return `Invalid drop point in fare rule ${ruleIndex + 1}`;
            }

            if (fareStartDate && fareEndDate) {
                const start = new Date(fareStartDate);
                const end = new Date(fareEndDate);

                if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                    return `Invalid fare dates in rule ${ruleIndex + 1}`;
                }

                if (end < start) {
                    return `Fare end date must be after start date in rule ${ruleIndex + 1}`;
                }
            }

            // generate full combinations when flags request ranges; dedupe per rule
            const pickupStart = fromIndex;
            const pickupEnd = applyToAllNextPickupsBeforeDrop ? pickupOptions.length - 1 : fromIndex;
            const dropStart = applyToAllPreviousDrops ? 0 : toIndex;
            const dropEnd = toIndex;

            const seenForRule = new Set();

            for (let i = pickupStart; i <= pickupEnd; i++) {
                for (let j = dropStart; j <= dropEnd; j++) {
                    const ef = pickupOptions[i].name;
                    const et = dropOptions[j].name;
                    const key = `${ef.toLowerCase()}|${et.toLowerCase()}`;
                    if (seenForRule.has(key)) continue;
                    seenForRule.add(key);
                    expandedRules.push({
                        from: ef,
                        to: et,
                        fareStartDate,
                        fareEndDate,
                        sourceRuleIndex: ruleIndex,
                    });
                }
            }
        }

        for (let i = 0; i < expandedRules.length; i++) {
            for (let j = i + 1; j < expandedRules.length; j++) {
                const a = expandedRules[i];
                const b = expandedRules[j];

                const samePair =
                    a.from.toLowerCase() === b.from.toLowerCase() &&
                    a.to.toLowerCase() === b.to.toLowerCase();

                if (!samePair) continue;

                const aStart = a.fareStartDate
                    ? new Date(a.fareStartDate).setHours(0, 0, 0, 0)
                    : -Infinity;
                const aEnd = a.fareEndDate
                    ? new Date(a.fareEndDate).setHours(0, 0, 0, 0)
                    : Infinity;
                const bStart = b.fareStartDate
                    ? new Date(b.fareStartDate).setHours(0, 0, 0, 0)
                    : -Infinity;
                const bEnd = b.fareEndDate
                    ? new Date(b.fareEndDate).setHours(0, 0, 0, 0)
                    : Infinity;

                const overlap = aStart <= bEnd && bStart <= aEnd;

                if (overlap) {
                    if (a.sourceRuleIndex !== b.sourceRuleIndex) {
                        continue; // later override allowed
                    }

                    return `Overlapping fare dates found for ${a.from} → ${a.to}`;
                }
            }
        }

        return null;
    };

    const handleInputChange = (e, isEdit = false) => {
        const { name, value } = e.target;

        const applyStartSync = (prevObj, newVal) => {
            const updated = { ...prevObj, [name]: newVal };
            const newStart = String(newVal || "").trim();
            const prevStart = String(prevObj.startPoint || prevObj.start || "").trim();

            if (name === "startPoint") {
                const pickups = Array.isArray(prevObj.pickupPoints) ? [...prevObj.pickupPoints] : [];
                if (pickups.length > 0) {
                    const firstName = String(pickups[0]?.name || pickups[0] || "").trim();
                    if (normalizeKey(firstName) === normalizeKey(prevStart) || firstName === "") {
                        pickups[0] = { ...(pickups[0] || {}), name: newStart, time: prevObj.startTime || prevObj.startTime || "" };
                    } else {
                        // remove any other pickup that matches newStart to avoid duplicates
                        const idx = pickups.findIndex((p) => normalizeKey(p?.name || "") === normalizeKey(newStart));
                        if (idx > -1) pickups.splice(idx, 1);
                    }
                    updated.pickupPoints = pickups;
                }
            }

            if (name === "endPoint") {
                const drops = Array.isArray(prevObj.dropPoints) ? [...prevObj.dropPoints] : [];
                const prevEnd = String(prevObj.endPoint || prevObj.end || "").trim();
                if (drops.length > 0) {
                    const last = drops[drops.length - 1];
                    const lastName = String(last?.name || last || "").trim();
                    if (normalizeKey(lastName) === normalizeKey(prevEnd) || lastName === "") {
                        drops[drops.length - 1] = { ...(last || {}), name: String(newVal || "").trim(), time: prevObj.endTime || prevObj.endTime || "" };
                    } else {
                        const idx = drops.findIndex((p) => normalizeKey(p?.name || "") === normalizeKey(String(newVal || "")));
                        if (idx > -1) drops.splice(idx, 1);
                    }
                    updated.dropPoints = drops;
                }
            }

            return updated;
        };

        if (isEdit) {
            setEditData((prev) => applyStartSync(prev, value));
        } else {
            setFormData((prev) => applyStartSync(prev, value));
        }
    };

    const handlePointChange = (section, index, field, value, isEdit = false) => {
        const normalize = (s) => String(s || "").trim().toLowerCase();

        // Prevent duplicate names when editing pickup/drop names
        if (field === "name" && (section === "pickupPoints" || section === "dropPoints")) {
            const newName = normalize(value);
            if (newName) {
                if (isEdit) {
                    const other = (editData[section] || []).filter((_, i) => i !== index).map((p) => normalize(p?.name));
                    const startName = normalize(editData.startPoint || editData.start || "");
                    const endName = normalize(editData.endPoint || editData.end || "");
                    if (other.includes(newName) || (section === "pickupPoints" ? startName === newName : endName === newName)) {
                        showAppToast("error", `Duplicate ${section === "pickupPoints" ? "pickup" : "drop"} point name not allowed`);
                        return;
                    }
                } else {
                    const other = (formData[section] || []).filter((_, i) => i !== index).map((p) => normalize(p?.name));
                    const startName = normalize(formData.startPoint || formData.start || "");
                    const endName = normalize(formData.endPoint || formData.end || "");
                    if (other.includes(newName) || (section === "pickupPoints" ? startName === newName : endName === newName)) {
                        showAppToast("error", `Duplicate ${section === "pickupPoints" ? "pickup" : "drop"} point name not allowed`);
                        return;
                    }
                }
            }
        }

        if (isEdit) {
            setEditData((prev) => {
                const updated = Array.isArray(prev[section]) ? [...prev[section]] : [];
                updated[index] = { ...(updated[index] || {}), [field]: value };
                return { ...prev, [section]: updated };
            });
        } else {
            setFormData((prev) => {
                const updated = Array.isArray(prev[section]) ? [...prev[section]] : [];
                updated[index] = { ...(updated[index] || {}), [field]: value };
                return { ...prev, [section]: updated };
            });
        }
    };

    const addPoint = (section, isEdit = false) => {
        if (isEdit) {
            setEditData((prev) => {
                const updated = Array.isArray(prev[section]) ? [...prev[section]] : [];
                if (updated.length < 50) {
                    updated.push({ name: "", time: "" });
                }
                return { ...prev, [section]: updated };
            });
        } else {
            setFormData((prev) => {
                const updated = Array.isArray(prev[section]) ? [...prev[section]] : [];
                if (updated.length < 50) {
                    updated.push({ name: "", time: "" });
                }
                return { ...prev, [section]: updated };
            });
        }
    };

    const removePoint = (section, index, isEdit = false) => {
        if (isEdit) {
            setEditData((prev) => {
                const updated = Array.isArray(prev[section]) ? [...prev[section]] : [];
                if (index >= 0 && index < updated.length) {
                    updated.splice(index, 1);
                }
                return { ...prev, [section]: updated };
            });
        } else {
            setFormData((prev) => {
                const updated = Array.isArray(prev[section]) ? [...prev[section]] : [];
                if (index >= 0 && index < updated.length) {
                    updated.splice(index, 1);
                }
                return { ...prev, [section]: updated };
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

                if (field === "from") {
                    const rule = updatedFareRules[index];
                    const validDrops = Array.isArray(prev.dropPoints) ? prev.dropPoints.slice() : [];
                    const resolvePointString = (p) => {
                        if (!p) return "";
                        if (typeof p === "object") return String(p.name || "").trim();
                        return String(p || "").trim();
                    };
                    const endStr = resolvePointString(prev.endPoint);
                    if (endStr) validDrops.push({ name: endStr, time: prev.endTime || "" });
                    if (rule?.to && !validDrops.some((p) => p.name === rule.to)) {
                        updatedFareRules[index].to = "";
                    }
                }

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

                if (field === "from") {
                    const rule = updatedFareRules[index];
                    const validDrops = Array.isArray(prev.dropPoints) ? prev.dropPoints.slice() : [];
                    const resolvePointString = (p) => {
                        if (!p) return "";
                        if (typeof p === "object") return String(p.name || "").trim();
                        return String(p || "").trim();
                    };
                    const endStr = resolvePointString(prev.endPoint);
                    if (endStr) validDrops.push({ name: endStr, time: prev.endTime || "" });
                    if (rule?.to && !validDrops.some((p) => p.name === rule.to)) {
                        updatedFareRules[index].to = "";
                    }
                }

                return {
                    ...prev,
                    fareRules: updatedFareRules,
                };
            });
        }
    };

    const addFareRule = (isEdit = false) => {
        const newRule = {
            from: "",
            to: "",
            fare: "",
            fareStartDate: "",
            fareEndDate: "",
            applyToAllNextPickupsBeforeDrop: false,
            applyToAllPreviousDrops: false,
        };

        if (isEdit) {
            setEditData((prev) => {
                const fareRules = Array.isArray(prev.fareRules) ? [...prev.fareRules] : [];
                if (fareRules.length < 100) {
                    fareRules.push(newRule);
                }
                return { ...prev, fareRules };
            });
        } else {
            setFormData((prev) => {
                const fareRules = Array.isArray(prev.fareRules) ? [...prev.fareRules] : [];
                if (fareRules.length < 100) {
                    fareRules.push(newRule);
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

        // sanitize and dedupe before validating to give clearer UX on Add
        const dedupeByName = (arr) => {
            const seen = new Set();
            const out = [];
            for (const p of Array.isArray(arr) ? arr : []) {
                const name = String(p?.name || "").trim();
                const time = String(p?.time || "").trim();
                if (!name) continue;
                const k = normalizeKey(name);
                if (seen.has(k)) continue;
                seen.add(k);
                out.push({ name, time });
            }
            return out;
        };

        const sanitizedForm = {
            ...formData,
            pickupPoints: dedupeByName(formData.pickupPoints),
            dropPoints: dedupeByName(formData.dropPoints),
            startPoint: String(formData.startPoint || "").trim(),
            endPoint: String(formData.endPoint || "").trim(),
        };

        const error = validateBusForm(sanitizedForm);
        if (error) {
            return showAppToast("error", error);
        }

        setSaving(true);

        try {
            const payload = { ...sanitizedForm };
            // synthesize startPoint/endPoint objects for server compatibility using sanitizedForm
            const synthesizedStart = { name: (typeof sanitizedForm.startPoint === "object" ? String(sanitizedForm.startPoint.name || "") : String(sanitizedForm.startPoint || "")).trim(), time: sanitizedForm.startTime || "" };
            const synthesizedEnd = { name: (typeof sanitizedForm.endPoint === "object" ? String(sanitizedForm.endPoint.name || "") : String(sanitizedForm.endPoint || "")).trim(), time: sanitizedForm.endTime || "" };
            payload.startPoint = synthesizedStart;
            payload.endPoint = synthesizedEnd;
            // ensure pickupPoints includes startPoint as first element and dropPoints includes endPoint as last element
            const rawPickups = Array.isArray(sanitizedForm.pickupPoints) ? sanitizedForm.pickupPoints.slice() : [];
            const rawDrops = Array.isArray(sanitizedForm.dropPoints) ? sanitizedForm.dropPoints.slice() : [];
            const cleanedPickups = rawPickups
                .map((p) => ({ name: String(p?.name || "").trim(), time: String(p?.time || "").trim() }))
                .filter((p) => p.name);
            const cleanedDrops = rawDrops
                .map((p) => ({ name: String(p?.name || "").trim(), time: String(p?.time || "").trim() }))
                .filter((p) => p.name);
            // dedupe by normalized name
            const dedupeByName = (arr) => {
                const seen = new Set();
                return arr.filter((p) => {
                    const k = String(p.name || "").trim().toLowerCase();
                    if (!k) return false;
                    if (seen.has(k)) return false;
                    seen.add(k);
                    return true;
                });
            };

            const dedupedPickups = dedupeByName(cleanedPickups);
            const dedupedDrops = dedupeByName(cleanedDrops);
            const finalPickups = [];
            if (synthesizedStart.name) finalPickups.push(synthesizedStart);
            finalPickups.push(...dedupedPickups.slice(0, 50 - (finalPickups.length)));
            const finalDrops = [];
            finalDrops.push(...dedupedDrops.slice(0, 50));
            if (synthesizedEnd.name && finalDrops.length < 50) finalDrops.push(synthesizedEnd);
            payload.pickupPoints = finalPickups;
            payload.dropPoints = finalDrops;

            // debug: log payload to help diagnose fare-rule mapping issues
            // eslint-disable-next-line no-console
            console.log("[AdminBus] create payload:", payload);

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
        const resolvePointToString = (p) => {
            if (!p) return "";
            if (typeof p === "object") return String(p.name || "").trim();
            return String(p || "").trim();
        };

        setEditData({
            busId: bus.busId || "",
            busNumber: bus.busNumber || "",
            busName: bus.busName || "",
            busType: bus.busType || "",
            routeName: bus.routeName || "",
            startPoint: resolvePointToString(bus.startPoint || bus.start),
            startTime: bus.startTime || "",
            endPoint: resolvePointToString(bus.endPoint || bus.end),
            endTime: bus.endTime || "",
            seatLayout: String(bus.seatLayout || ""),
            pickupPoints: Array.isArray(bus.pickupPoints) ? bus.pickupPoints : [],
            dropPoints: Array.isArray(bus.dropPoints) ? bus.dropPoints : [],
            cabins: Array.isArray(bus.cabins) ? bus.cabins : [],
            fareRules: Array.isArray(bus.fareRulesRaw)
                ? bus.fareRulesRaw.map((rule) => ({
                    from: rule.from || "",
                    to: rule.to || "",
                    fare: rule.fare || "",
                    fareStartDate: rule.fareStartDate || "",
                    fareEndDate: rule.fareEndDate || "",
                    applyToAllNextPickupsBeforeDrop: !!rule.applyToAllNextPickupsBeforeDrop,
                    applyToAllPreviousDrops: !!rule.applyToAllPreviousDrops,
                }))
                : [],
        });

        setShowEditModal(true);
    };

    const handleUpdateBus = async (e) => {
        e.preventDefault();
        if (saving) return;

        // sanitize and dedupe pickup/drop names before validating
        const dedupeByName = (arr) => {
            const seen = new Set();
            const out = [];
            for (const p of Array.isArray(arr) ? arr : []) {
                const name = String(p?.name || "").trim();
                const time = String(p?.time || "").trim();
                if (!name) continue;
                const k = normalizeKey(name);
                if (seen.has(k)) continue;
                seen.add(k);
                out.push({ name, time });
            }
            return out;
        };

        const sanitizedEdit = {
            ...editData,
            pickupPoints: dedupeByName(editData.pickupPoints),
            dropPoints: dedupeByName(editData.dropPoints),
            startPoint: String(editData.startPoint || "").trim(),
            endPoint: String(editData.endPoint || "").trim(),
        };

        const error = validateBusForm(sanitizedEdit);
        if (error) {
            return showAppToast("error", error);
        }

        setSaving(true);

        try {
            const payload = { ...sanitizedEdit };
            // synthesize startPoint/endPoint objects for server compatibility using sanitizedEdit
            const synthesizedStartE = { name: (typeof sanitizedEdit.startPoint === "object" ? String(sanitizedEdit.startPoint.name || "") : String(sanitizedEdit.startPoint || "")).trim(), time: sanitizedEdit.startTime || "" };
            const synthesizedEndE = { name: (typeof sanitizedEdit.endPoint === "object" ? String(sanitizedEdit.endPoint.name || "") : String(sanitizedEdit.endPoint || "")).trim(), time: sanitizedEdit.endTime || "" };
            payload.startPoint = synthesizedStartE;
            payload.endPoint = synthesizedEndE;

            // debug: log update payload to help diagnose fare-rule mapping issues
            // eslint-disable-next-line no-console
            console.log("[AdminBus] update payload:", payload);
            // ensure pickupPoints includes startPoint as first element and dropPoints includes endPoint as last element
            const rawPickupsE = Array.isArray(sanitizedEdit.pickupPoints) ? sanitizedEdit.pickupPoints.slice() : [];
            const rawDropsE = Array.isArray(sanitizedEdit.dropPoints) ? sanitizedEdit.dropPoints.slice() : [];
            const cleanedPickupsE = rawPickupsE
                .map((p) => ({ name: String(p?.name || "").trim(), time: String(p?.time || "").trim() }))
                .filter((p) => p.name);
            const cleanedDropsE = rawDropsE
                .map((p) => ({ name: String(p?.name || "").trim(), time: String(p?.time || "").trim() }))
                .filter((p) => p.name);
            const dedupeByNameE = (arr) => {
                const seen = new Set();
                return arr.filter((p) => {
                    const k = String(p.name || "").trim().toLowerCase();
                    if (!k) return false;
                    if (seen.has(k)) return false;
                    seen.add(k);
                    return true;
                });
            };

            const dedupedPickupsE = dedupeByNameE(cleanedPickupsE);
            const dedupedDropsE = dedupeByNameE(cleanedDropsE);
            const finalPickupsE = [];
            if (synthesizedStartE.name) finalPickupsE.push(synthesizedStartE);
            finalPickupsE.push(...dedupedPickupsE.slice(0, 50 - (finalPickupsE.length)));
            const finalDropsE = [];
            finalDropsE.push(...dedupedDropsE.slice(0, 50));
            if (synthesizedEndE.name && finalDropsE.length < 50) finalDropsE.push(synthesizedEndE);
            payload.pickupPoints = finalPickupsE;
            payload.dropPoints = finalDropsE;

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
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
                        SA TOURS DASHBOARD
                    </p>
                    <h1 className="mt-1 text-3xl font-bold text-slate-900">Bus Management</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Create buses, pickup points, drop points, cabins, seat layouts and fare rules.
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
                                    placeholder="Search bus number, route, pickup, drop..."
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

                <>
                    {/* =========================
      MOBILE VIEW ONLY
      (Desktop unchanged)
     ========================= */}
                    <div className="space-y-4 p-4 md:hidden">
                        {loading ? (
                            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
                                Loading buses...
                            </div>
                        ) : paginatedBuses.length === 0 ? (
                            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
                                No buses found.
                            </div>
                        ) : (
                            paginatedBuses.map((bus) => (
                                <div
                                    key={bus.busId}
                                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                                >
                                    {/* Top Section */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
                                                <BusFront className="h-6 w-6 text-[#f97316]" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-xl font-bold tracking-tight text-slate-900 leading-tight break-words">
                                                    {bus.busNumber}
                                                </h3>

                                                <p className="mt-1 text-sm text-slate-500 leading-relaxed break-words">
                                                    {bus.busName} • {bus.busType}
                                                </p>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setLayoutModalBus(bus);
                                                            setShowLayoutModal(true);
                                                        }}
                                                        className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[#f97316]"
                                                    >
                                                        {bus.seatLayout} Seats
                                                    </button>

                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                        {bus.busType}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Route + Time */}
                                    <div className="mt-5 grid grid-cols-1 gap-3">
                                        <div className="rounded-2xl bg-slate-50 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                Route
                                            </p>
                                            <p className="mt-2 text-base font-semibold text-slate-900 break-words">
                                                {bus.routeName}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                Time
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-slate-800">
                                                {bus.startTime} → {bus.endTime}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Pickup / Drop */}
                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <div className="rounded-2xl bg-slate-50 p-4 text-center">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                Pickup
                                            </p>
                                            <p className="mt-2 text-lg font-bold text-slate-900">
                                                {bus.pickupPoints?.length || 0}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 p-4 text-center">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                Drop
                                            </p>
                                            <p className="mt-2 text-lg font-bold text-slate-900">
                                                {bus.dropPoints?.length || 0}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Fare Rules */}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <button
                                            onClick={() => {
                                                setRulesModalBus(bus);
                                                setRulesModalOpen(true);
                                            }}
                                            className="inline-flex rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                        >
                                            {(bus.fareRulesRaw?.length || bus.fareRules?.length || 0)} Rules
                                        </button>

                                        {(bus.fareRulesRaw?.some((r) => r.fareStartDate || r.fareEndDate) ||
                                            bus.fareRules?.some((r) => r.fareStartDate || r.fareEndDate)) && (
                                                <span className="inline-flex rounded-full bg-orange-100 px-3 py-2 text-xs font-semibold text-[#f97316]">
                                                    Date Based
                                                </span>
                                            )}

                                        {(() => {
                                            const bf = computeBaseFareForBus(bus);
                                            return (
                                                <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                                                    Base: {bf ? `₹${bf}` : "N/A"}
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-5 grid grid-cols-1 gap-3">
                                        <button
                                            onClick={() => openEditModal(bus)}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#f97316]"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Edit
                                        </button>

                                        <button
                                            onClick={() => {
                                                router.push(`/admin/bus/fares?busId=${encodeURIComponent(bus.busId)}`);
                                            }}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                        >
                                            View fares
                                        </button>

                                        <button
                                            onClick={() => handleDeleteBus(bus.busId)}
                                            disabled={deletingId === bus.busId}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            {deletingId === bus.busId ? "Deleting..." : "Delete"}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* =========================
      DESKTOP / TABLET VIEW
      (UNCHANGED - your original table)
     ========================= */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Bus
                                    </th>
                                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Route
                                    </th>
                                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Time
                                    </th>
                                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Pickup / Drop
                                    </th>
                                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Layout
                                    </th>
                                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                                        <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                                            Loading buses...
                                        </td>
                                    </tr>
                                ) : paginatedBuses.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
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
                                                        <p className="font-semibold text-slate-900">{bus.busNumber}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {bus.busName} • {bus.busType}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="text-sm font-medium text-slate-800">{bus.routeName}</p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="text-sm text-slate-700">
                                                    {bus.startTime} → {bus.endTime}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap items-center gap-3 flex-nowrap whitespace-nowrap">
                                                    <p className="text-xs text-slate-600">
                                                        Pickup: <span className="font-semibold">{bus.pickupPoints?.length || 0}</span>
                                                    </p>
                                                    <p className="text-xs text-slate-600">
                                                        Drop: <span className="font-semibold">{bus.dropPoints?.length || 0}</span>
                                                    </p>
                                                </div>
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
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setRulesModalBus(bus);
                                                            setRulesModalOpen(true);
                                                        }}
                                                        className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                                    >
                                                        {(bus.fareRulesRaw?.length || bus.fareRules?.length || 0)} Rules
                                                    </button>

                                                    {(bus.fareRulesRaw?.some((r) => r.fareStartDate || r.fareEndDate) ||
                                                        bus.fareRules?.some((r) => r.fareStartDate || r.fareEndDate)) && (
                                                            <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[#f97316]">
                                                                Date Based
                                                            </span>
                                                        )}

                                                    {(() => {
                                                        const bf = computeBaseFareForBus(bus);
                                                        return (
                                                            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                                                Base: {bf ? `₹${bf}` : "N/A"}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
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
                                                        onClick={() => {
                                                            router.push(`/admin/bus/fares?busId=${encodeURIComponent(bus.busId)}`);
                                                        }}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                                    >
                                                        View fares
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
                </>

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
                    handlePointChange={handlePointChange}
                    handleCabinChange={handleCabinChange}
                    handleFareRuleChange={(index, field, value) =>
                        handleFareRuleChange(index, field, value, false)
                    }
                    addPoint={addPoint}
                    removePoint={removePoint}
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
                    handlePointChange={(section, index, field, value) =>
                        handlePointChange(section, index, field, value, true)
                    }
                    handleCabinChange={(index, value) =>
                        handleCabinChange(index, value, true)
                    }
                    handleFareRuleChange={(index, field, value) =>
                        handleFareRuleChange(index, field, value, true)
                    }
                    addPoint={(section) => addPoint(section, true)}
                    removePoint={(section, i) => removePoint(section, i, true)}
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
                                <h3 className="text-xl font-bold text-slate-900">
                                    {layoutModalBus.busNumber} — Seat Layout
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {layoutModalBus.busName} • {layoutModalBus.routeName}
                                </p>
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

            {rulesModalOpen && rulesModalBus && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4">
                    <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Fare Rules — {rulesModalBus.busNumber}</h3>
                                <p className="text-sm text-slate-500">{rulesModalBus.busName} • {rulesModalBus.routeName}</p>
                            </div>

                            <button
                                onClick={() => {
                                    setRulesModalOpen(false);
                                    setRulesModalBus(null);
                                }}
                                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3">
                            {(() => {
                                const rules = Array.isArray(rulesModalBus.fareRulesRaw)
                                    ? rulesModalBus.fareRulesRaw
                                    : Array.isArray(rulesModalBus.fareRules)
                                        ? rulesModalBus.fareRules
                                        : [];

                                if (!rules || rules.length === 0) {
                                    return <div className="text-sm text-slate-500">No fare rules defined for this bus.</div>;
                                }

                                return rules.map((r, i) => (
                                    <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold text-slate-900">{r.name || `Rule ${i + 1}`}</div>
                                            {r.baseFare !== undefined || r.fare !== undefined ? (
                                                <div className="text-sm font-semibold text-green-700">{r.baseFare || r.fare ? `₹${r.baseFare || r.fare}` : null}</div>
                                            ) : null}
                                        </div>

                                        {r.fareStartDate || r.fareEndDate ? (
                                            <div className="mt-1 text-xs text-slate-500">{r.fareStartDate || ""}{r.fareStartDate && r.fareEndDate ? " — " : ""}{r.fareEndDate || ""}</div>
                                        ) : null}

                                        {r.note ? <div className="mt-2 text-sm text-slate-700">{r.note}</div> : null}
                                    </div>
                                ));
                            })()}
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
        </div>
    );
}

function BusFormModal({
    title,
    data,
    onClose,
    onSubmit,
    saving,
    handleInputChange,
    handlePointChange,
    handleCabinChange,
    handleFareRuleChange,
    addPoint,
    removePoint,
    addCabin,
    removeCabin,
    addFareRule,
    removeFareRule,
    isEdit = false,
}) {
    const [visiblePickups, setVisiblePickups] = useState(10);
    const [visibleDrops, setVisibleDrops] = useState(10);
    const [expandedFarePreview, setExpandedFarePreview] = useState({});

    const shownPickups = (data.pickupPoints || []).slice(0, visiblePickups);
    const shownDrops = (data.dropPoints || []).slice(0, visibleDrops);

    const validPickupPoints = useMemo(() => {
        return (data.pickupPoints || []).filter((p) => p?.name?.trim());
    }, [data.pickupPoints]);

    const validDropPoints = useMemo(() => {
        return (data.dropPoints || []).filter((p) => p?.name?.trim());
    }, [data.dropPoints]);
    const pickupOptions = useMemo(() => {
        const resolvePoint = (p) => {
            if (!p) return "";
            if (typeof p === "object") return String(p.name || "").trim();
            return String(p || "").trim();
        };

        const list = [];
        const startVal = resolvePoint(data.startPoint);
        if (startVal) list.push({ name: startVal, time: data.startTime || "" });
        list.push(...(validPickupPoints || []));
        const seen = new Set();
        return list.filter((p) => {
            const key = String(p?.name || "").trim().toLowerCase();
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [data.startPoint, data.startTime, validPickupPoints]);

    const dropOptions = useMemo(() => {
        const resolvePoint = (p) => {
            if (!p) return "";
            if (typeof p === "object") return String(p.name || "").trim();
            return String(p || "").trim();
        };

        const list = [];
        list.push(...(validDropPoints || []));
        const endVal = resolvePoint(data.endPoint);
        if (endVal) list.push({ name: endVal, time: data.endTime || "" });

        const seen = new Set();
        return list.filter((p) => {
            const key = String(p?.name || "").trim().toLowerCase();
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [data.endPoint, data.endTime, validDropPoints]);

    const previewPickupList = useMemo(() => {
        const resolvePoint = (p) => {
            if (!p) return "";
            if (typeof p === "object") return String(p.name || "").trim();
            return String(p || "").trim();
        };

        const list = [];
        const startVal = resolvePoint(data.startPoint);
        if (startVal) {
            list.push({ name: startVal, time: data.startTime || "" });
        }
        list.push(...(validPickupPoints || []));
        const seen = new Set();
        return list.filter((p) => {
            const key = String(p?.name || "").trim().toLowerCase();
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [data.startPoint, data.startTime, validPickupPoints]);

    const previewDropList = useMemo(() => {
        const resolvePoint = (p) => {
            if (!p) return "";
            if (typeof p === "object") return String(p.name || "").trim();
            return String(p || "").trim();
        };

        const list = [];
        list.push(...(validDropPoints || []));
        const endVal = resolvePoint(data.endPoint);
        if (endVal) {
            list.push({ name: endVal, time: data.endTime || "" });
        }
        const seen = new Set();
        return list.filter((p) => {
            const key = String(p?.name || "").trim().toLowerCase();
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [data.endPoint, data.endTime, validDropPoints]);

    const getExpandedFarePreview = (rule) => {
        if (!rule?.from || !rule?.to || !rule?.fare) return [];

        const fromIndex = pickupOptions.findIndex((p) => p.name === rule.from);
        const toIndex = dropOptions.findIndex((p) => p.name === rule.to);

        if (fromIndex === -1 || toIndex === -1) return [];

        const previewList = [];
        const seen = new Set();

        const pickupStart = fromIndex;
        const pickupEnd = rule.applyToAllNextPickupsBeforeDrop ? pickupOptions.length - 1 : fromIndex;
        const dropStart = rule.applyToAllPreviousDrops ? 0 : toIndex;
        const dropEnd = toIndex;

        for (let i = pickupStart; i <= pickupEnd; i++) {
            for (let j = dropStart; j <= dropEnd; j++) {
                const ef = pickupOptions[i].name;
                const et = dropOptions[j].name;
                const key = `${ef.toLowerCase()}|${et.toLowerCase()}`;
                if (seen.has(key)) continue;
                seen.add(key);
                previewList.push({ from: ef, to: et, fare: rule.fare });
            }
        }

        return previewList;
    };

    const normalizeKeyLocal = (s) => String(s || "").trim().toLowerCase();

    const datesOverlap = (startA, endA, startB, endB) => {
        const toDay = (d) => {
            if (!d) return null;
            const t = new Date(d);
            if (Number.isNaN(t.getTime())) return null;
            return t.setHours(0, 0, 0, 0);
        };

        const aStart = toDay(startA) ?? -Infinity;
        const aEnd = toDay(endA) ?? Infinity;
        const bStart = toDay(startB) ?? -Infinity;
        const bEnd = toDay(endB) ?? Infinity;

        return aStart <= bEnd && bStart <= aEnd;
    };

    const getVisibleFarePreviewForRule = (ruleIndex) => {
        const rules = Array.isArray(data.fareRules) ? data.fareRules : [];
        const rule = rules[ruleIndex];
        if (!rule) return [];

        const basePairs = getExpandedFarePreview(rule) || [];
        if (!basePairs.length) return [];

        const filtered = basePairs.filter((pair) => {
            const pairFrom = normalizeKeyLocal(pair.from);
            const pairTo = normalizeKeyLocal(pair.to);

            for (let j = ruleIndex + 1; j < rules.length; j++) {
                const later = rules[j];
                if (!later) continue;

                const laterPairs = getExpandedFarePreview(later) || [];

                const matchesLater = laterPairs.some(
                    (lp) =>
                        normalizeKeyLocal(lp.from) === pairFrom &&
                        normalizeKeyLocal(lp.to) === pairTo
                );

                if (!matchesLater) continue;

                if (
                    datesOverlap(
                        rule.fareStartDate || "",
                        rule.fareEndDate || "",
                        later.fareStartDate || "",
                        later.fareEndDate || ""
                    )
                ) {
                    return false;
                }
            }

            return true;
        });

        return filtered;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4">
            <div className="max-h-[95vh] w-full max-w-7xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-white px-6 py-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                        <p className="text-sm text-slate-500">
                            Fill bus details, pickup points, drop points, cabins and fare rules.
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
                        <div className="space-y-6 xl:col-span-2">
                            <div className="rounded-3xl border border-slate-200 p-5">
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-slate-900">Bus Details</h4>
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
                                        label="Start Time"
                                        name="startTime"
                                        type="time"
                                        value={data.startTime}
                                        onChange={handleInputChange}
                                        icon={<Clock3 className="h-5 w-5 text-[#f97316]" />}
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
                                        label="End Time"
                                        name="endTime"
                                        type="time"
                                        value={data.endTime}
                                        onChange={handleInputChange}
                                        icon={<Clock3 className="h-5 w-5 text-[#f97316]" />}
                                    />
                                </div>
                            </div>

                            <PointSection
                                title={`Pickup Points (${data.pickupPoints?.length || 0}/20)`}
                                description="Add up to 20 pickup points."
                                points={shownPickups}
                                totalCount={data.pickupPoints?.length || 0}
                                visibleCount={visiblePickups}
                                setVisibleCount={setVisiblePickups}
                                onAdd={() => addPoint("pickupPoints")}
                                onRemove={(i) => removePoint("pickupPoints", i)}
                                onChange={(index, field, value) =>
                                    handlePointChange("pickupPoints", index, field, value)
                                }
                                pointLabel="Pickup Point"
                            />

                            <PointSection
                                title={`Drop Points (${data.dropPoints?.length || 0}/20)`}
                                description="Add up to 20 drop points."
                                points={shownDrops}
                                totalCount={data.dropPoints?.length || 0}
                                visibleCount={visibleDrops}
                                setVisibleCount={setVisibleDrops}
                                onAdd={() => addPoint("dropPoints")}
                                onRemove={(i) => removePoint("dropPoints", i)}
                                onChange={(index, field, value) =>
                                    handlePointChange("dropPoints", index, field, value)
                                }
                                pointLabel="Drop Point"
                            />

                            <div className="rounded-3xl border border-slate-200 p-5">
                                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <h4 className="text-lg font-semibold text-slate-900">Pickup Preview</h4>
                                        <p className="text-sm text-slate-500">Booking pickup list (start shown first)</p>
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-semibold text-slate-900">Drop Preview</h4>
                                        <p className="text-sm text-slate-500">Booking drop list (end shown last)</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <PreviewList
                                        points={previewPickupList}
                                        emptyText="No pickup points added yet"
                                        badgeColor="bg-green-100 text-green-700"
                                        badgeText="Pickup"
                                    />

                                    <PreviewList
                                        points={previewDropList}
                                        emptyText="No drop points added yet"
                                        badgeColor="bg-red-100 text-red-700"
                                        badgeText="Drop"
                                    />
                                </div>
                            </div>

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
                                        <p className="text-sm font-medium text-slate-700">No cabins added yet</p>
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
                                                        onChange={(e) => handleCabinChange(index, e.target.value)}
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

                            <div className="rounded-3xl border border-slate-200 p-5">
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-slate-900">
                                        Pickup → Drop Fare Rules ({data.fareRules?.length || 0})
                                    </h4>
                                    <p className="text-sm text-slate-500">
                                        Create fare rules from pickup point to drop point.
                                    </p>
                                </div>

                                {(data.fareRules?.length || 0) === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                                        <p className="text-sm font-medium text-slate-700">No fare rules added yet</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Example: Borli → Dongri = ₹500
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {(data.fareRules || []).map((rule, index) => {
                                            const previewPairs = getVisibleFarePreviewForRule(index);
                                            const isExpanded = !!expandedFarePreview[index];

                                            return (
                                                <div key={index} className="rounded-2xl border border-slate-200 p-4">
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

                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                                        <div>
                                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                                Pickup Point
                                                            </label>
                                                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                                                <MapPin className="h-5 w-5 text-[#f97316]" />
                                                                <select
                                                                    value={rule.from || ""}
                                                                    onChange={(e) =>
                                                                        handleFareRuleChange(index, "from", e.target.value)
                                                                    }
                                                                    className="w-full bg-transparent outline-none"
                                                                >
                                                                    <option value="">Select Pickup</option>
                                                                    {pickupOptions.map((point, idx) => (
                                                                        <option key={`${point.name}-${idx}`} value={point.name}>
                                                                            {point.name} ({point.time || "--:--"})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

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
                                                                >
                                                                    <option value="">Select Drop</option>
                                                                    {dropOptions.map((point, idx) => (
                                                                        <option key={`${point.name}-${idx}`} value={point.name}>
                                                                            {point.name} ({point.time || "--:--"})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

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

                                                        <div>
                                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                                Fare Start Date
                                                            </label>
                                                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                                                <CalendarDays className="h-5 w-5 text-[#f97316]" />
                                                                <input
                                                                    type="date"
                                                                    value={rule.fareStartDate || ""}
                                                                    onChange={(e) =>
                                                                        handleFareRuleChange(index, "fareStartDate", e.target.value)
                                                                    }
                                                                    className="w-full bg-transparent outline-none"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                                Fare End Date
                                                            </label>
                                                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                                                <CalendarDays className="h-5 w-5 text-[#f97316]" />
                                                                <input
                                                                    type="date"
                                                                    value={rule.fareEndDate || ""}
                                                                    onChange={(e) =>
                                                                        handleFareRuleChange(index, "fareEndDate", e.target.value)
                                                                    }
                                                                    className="w-full bg-transparent outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
                                                        <label className="flex cursor-pointer items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!rule.applyToAllNextPickupsBeforeDrop}
                                                                onChange={(e) =>
                                                                    handleFareRuleChange(
                                                                        index,
                                                                        "applyToAllNextPickupsBeforeDrop",
                                                                        e.target.checked
                                                                    )
                                                                }
                                                                className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-800">
                                                                    Apply same fare from selected pickup and all next pickup points
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    Example: If pickup is Mendadi and drop is Dongri, same fare applies to Mendadi and all next pickup points for Dongri.
                                                                </p>
                                                            </div>
                                                        </label>
                                                    </div>

                                                    <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
                                                        <label className="flex cursor-pointer items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!rule.applyToAllPreviousDrops}
                                                                onChange={(e) =>
                                                                    handleFareRuleChange(
                                                                        index,
                                                                        "applyToAllPreviousDrops",
                                                                        e.target.checked
                                                                    )
                                                                }
                                                                className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-800">
                                                                    Apply same fare to selected drop and all previous drop points
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    Example: If pickup is Borli and drop is Panvel, same fare applies to Panvel and all earlier drop points (previous stops before Panvel).
                                                                </p>
                                                            </div>
                                                        </label>
                                                    </div>

                                                    {rule.from && rule.to && rule.fare ? (
                                                        <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4">
                                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                                <div>
                                                                    {rule.applyToAllNextPickupsBeforeDrop ? (
                                                                        <div className="text-sm font-semibold text-slate-800">
                                                                            <span className="font-bold text-[#f97316]">
                                                                                {previewPairs.length}
                                                                            </span>{" "}
                                                                            pickup point{previewPairs.length > 1 ? "s" : ""} →{" "}
                                                                            <span className="font-bold text-slate-900">{rule.to}</span> ={" "}
                                                                            <span className="font-bold text-[#f97316]">₹{rule.fare}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-sm font-semibold text-slate-800">
                                                                            {rule.from} → {rule.to} ={" "}
                                                                            <span className="font-bold text-[#f97316]">₹{rule.fare}</span>
                                                                        </div>
                                                                    )}

                                                                    {(rule.fareStartDate || rule.fareEndDate) && (
                                                                        <div className="mt-1 text-xs text-slate-500">
                                                                            Valid: {rule.fareStartDate || "Any time"} →{" "}
                                                                            {rule.fareEndDate || "No end date"}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {rule.applyToAllNextPickupsBeforeDrop && previewPairs.length > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setExpandedFarePreview((prev) => ({
                                                                                ...prev,
                                                                                [index]: !prev[index],
                                                                            }))
                                                                        }
                                                                        className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-xs font-semibold text-[#f97316] hover:bg-orange-100"
                                                                    >
                                                                        {isExpanded ? "Hide Details" : "View Details"}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {rule.applyToAllNextPickupsBeforeDrop && (
                                                                <div className="mt-2 text-xs font-medium text-[#f97316]">
                                                                    Same fare will be applied from selected pickup and all next pickup points.
                                                                </div>
                                                            )}

                                                            {rule.applyToAllNextPickupsBeforeDrop && isExpanded && previewPairs.length > 0 && (
                                                                <div className="mt-4 rounded-2xl border border-orange-200 bg-white p-4">
                                                                    <p className="mb-3 text-sm font-semibold text-slate-900">
                                                                        Generated Fare Pairs
                                                                    </p>

                                                                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                                                                        {previewPairs.map((pair, pairIndex) => (
                                                                            <div
                                                                                key={`${pair.from}-${pair.to}-${pairIndex}`}
                                                                                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                                                                            >
                                                                                <span className="font-medium text-slate-700">
                                                                                    {pair.from} → {pair.to}
                                                                                </span>
                                                                                <span className="font-bold text-[#f97316]">
                                                                                    ₹{pair.fare}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
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

function PointSection({
    title,
    description,
    points,
    totalCount,
    visibleCount,
    setVisibleCount,
    onAdd,
    onRemove,
    onChange,
    pointLabel,
}) {
    const showMore = () => setVisibleCount((v) => Math.min(20, v + 10));
    const showLess = () => setVisibleCount(10);

    return (
        <div className="rounded-3xl border border-slate-200 p-5">
            <div className="mb-4">
                <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
                <p className="text-sm text-slate-500">{description}</p>
            </div>

            {points.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-700">No points added yet</p>
                    <p className="mt-1 text-xs text-slate-500">
                        Click “Add {pointLabel}” to add route points.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {points.map((point, index) => (
                        <div key={index} className="relative rounded-2xl border border-slate-200 p-4">
                            <button
                                type="button"
                                onClick={() => onRemove(index)}
                                className="absolute right-3 top-3 rounded-md p-1 text-red-600 hover:bg-red-50"
                                title="Remove point"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>

                            <p className="mb-3 text-sm font-semibold text-slate-700">
                                {pointLabel} {index + 1}
                            </p>

                            <div className="space-y-3">
                                <InputField
                                    label={`${pointLabel} Name`}
                                    value={point.name}
                                    onChange={(e) => onChange(index, "name", e.target.value)}
                                    icon={<MapPin className="h-5 w-5 text-[#f97316]" />}
                                    placeholder={`${pointLabel} ${index + 1}`}
                                />

                                <InputField
                                    label="Time"
                                    type="time"
                                    value={point.time}
                                    onChange={(e) => onChange(index, "time", e.target.value)}
                                    icon={<Clock3 className="h-5 w-5 text-[#f97316]" />}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-500">
                    Showing {points.length} of {totalCount} point(s)
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={onAdd}
                        disabled={totalCount >= 20}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Add {pointLabel}
                    </button>

                    {totalCount > visibleCount && (
                        <button
                            type="button"
                            onClick={showMore}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Show more
                        </button>
                    )}

                    {visibleCount > 10 && totalCount > 10 && (
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
    );
}

function PreviewList({ points, emptyText, badgeColor, badgeText }) {
    if (!points.length) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {emptyText}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {points.map((point, idx) => (
                <div
                    key={`${point.name}-${idx}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-xs font-bold text-[#f97316]">
                            {idx + 1}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{point.name}</p>
                            <span
                                className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${badgeColor}`}
                            >
                                {badgeText}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
                        {point.time || "--:--"}
                    </div>
                </div>
            ))}
        </div>
    );
}

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
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                    <div>
                        <p className="text-slate-500">Bus No.</p>
                        <p className="font-semibold text-slate-900">{busNumber || "--"}</p>
                    </div>

                    <div className="text-left sm:text-center">
                        <p className="text-slate-500">Operator</p>
                        <p className="font-bold tracking-wide text-slate-900">{busName || "--"}</p>
                    </div>

                    <div className="text-left sm:text-right">
                        <p className="text-slate-500">Time</p>
                        <p className="font-semibold text-slate-900">{startTime || "--:--"}</p>
                    </div>
                </div>

                <div className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs text-slate-700">
                    Route: <span className="font-semibold text-slate-900">{routeName || "--"}</span>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-slate-900">{seatLayout} Seat Layout</h5>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-semibold text-[#f97316]">
                        Left 1 • Right 2
                    </span>
                </div>

                <div className="mb-3 grid grid-cols-[1fr_28px_1fr_1fr] gap-2">
                    <div />
                    <div className="rounded-lg bg-orange-50/70" />
                    <SeatTicketBox seatNo={layout.pairRow[0]} />
                    <SeatTicketBox seatNo={layout.pairRow[1]} />
                </div>

                <div className="space-y-3">
                    {layout.mainRows.map((row, index) => (
                        <div key={index} className="grid grid-cols-[1fr_28px_1fr_1fr] gap-2">
                            <SeatTicketBox seatNo={row[0]} />
                            <div className="rounded-lg bg-orange-50/70" />
                            <SeatTicketBox seatNo={row[1]} />
                            <SeatTicketBox seatNo={row[2]} />
                        </div>
                    ))}
                </div>

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
            <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                {icon}
                <input
                    type={type}
                    name={name}
                    value={String(value || "")}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full text-slate-900 outline-none"
                />
            </div>
        </div>
    );
}