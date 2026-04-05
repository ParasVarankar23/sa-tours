"use client";

import SeatLayout from "@/components/SeatLayout";
import { useAutoRefresh } from "@/context/AutoRefreshContext";
import { showAppToast } from "@/lib/client/toast";
import {
  BUS_TYPES,
  getFare,
  getStopDisplayName,
  getStopNameMarathi,
  isBorliVillageStop,
  isCityStop,
  isDighiVillageStop,
  ROUTES,
} from "@/lib/fare";
import {
  BusFront,
  CalendarDays,
  Clock3,
  Eye,
  MapPin,
  Route,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";

/* =========================
  Helpers
========================= */
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

    if (end && !all.some((x) => normalizeKey(x) === normalizeKey(end))) {
      all.push(end);
    }

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

function getStopTime(bus, stopName) {
  if (!bus || !stopName) return "";

  const startName =
    typeof bus.startPoint === "object"
      ? normalizeText(bus.startPoint.name)
      : normalizeText(bus.startPoint);

  const endName =
    typeof bus.endPoint === "object"
      ? normalizeText(bus.endPoint.name)
      : normalizeText(bus.endPoint);

  if (normalizeKey(startName) === normalizeKey(stopName)) {
    return normalizeText(bus.startTime);
  }

  if (normalizeKey(endName) === normalizeKey(stopName)) {
    return normalizeText(bus.endTime);
  }

  if (Array.isArray(bus.pickupPoints)) {
    const foundPickup = bus.pickupPoints.find((p) => {
      const name = typeof p === "string" ? p : p?.name;
      return normalizeKey(name) === normalizeKey(stopName);
    });

    if (foundPickup && typeof foundPickup === "object") {
      return normalizeText(foundPickup.time);
    }
  }

  if (Array.isArray(bus.dropPoints)) {
    const foundDrop = bus.dropPoints.find((p) => {
      const name = typeof p === "string" ? p : p?.name;
      return normalizeKey(name) === normalizeKey(stopName);
    });

    if (foundDrop && typeof foundDrop === "object") {
      return normalizeText(foundDrop.time);
    }
  }

  const found = (bus.stops || []).find((s) => {
    const name = typeof s === "string" ? s : s?.stopName;
    return normalizeKey(name) === normalizeKey(stopName);
  });

  if (!found) return "";
  return typeof found === "string" ? "" : normalizeText(found.time);
}

// Normalize various time strings to a 24-hour HH:MM format for comparison.
function normalizeTimeForInput(t) {
  if (!t) return "";
  const s = String(t || "").trim();
  if (/^\d{2}:\d{2}$/.test(s)) return s; // already HH:MM
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [hh, mm] = s.split(":");
    return hh.padStart(2, "0") + ":" + mm;
  }
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/);
  if (m) {
    let hh = Number(m[1]);
    const mm = m[2];
    const ap = m[3].toLowerCase();
    if (ap === "pm" && hh !== 12) hh += 12;
    if (ap === "am" && hh === 12) hh = 0;
    return String(hh).padStart(2, "0") + ":" + mm;
  }
  const m2 = s.match(/^(\d{1,2}):(\d{2})(AM|PM|am|pm)$/);
  if (m2) {
    let hh = Number(m2[1]);
    const mm = m2[2];
    const ap = m2[3].toLowerCase();
    if (ap === "pm" && hh !== 12) hh += 12;
    if (ap === "am" && hh === 12) hh = 0;
    return String(hh).padStart(2, "0") + ":" + mm;
  }
  return "";
}

// Convert a time string into minutes since midnight for sorting.
function getTimeSortValueFromString(t) {
  const norm = normalizeTimeForInput(t);
  if (!norm) return Number.MAX_SAFE_INTEGER;
  const [hhStr, mmStr] = norm.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return Number.MAX_SAFE_INTEGER;
  return hh * 60 + mm;
}

// For a given bus and stop name, get a numeric time value used for sorting.
function getStopTimeSortValue(bus, stopName) {
  if (!bus || !stopName) return Number.MAX_SAFE_INTEGER;
  const timeStr = getStopTime(bus, stopName);
  if (!timeStr) return Number.MAX_SAFE_INTEGER;
  return getTimeSortValueFromString(timeStr);
}

// Sort list of stops by their scheduled time on this bus.
function sortStopsByTime(bus, stops) {
  if (!Array.isArray(stops) || !stops.length) return Array.isArray(stops) ? stops : [];
  if (!bus) return stops;

  return [...stops].sort((a, b) => {
    const va = getStopTimeSortValue(bus, a);
    const vb = getStopTimeSortValue(bus, b);

    if (va === vb) {
      return normalizeKey(a).localeCompare(normalizeKey(b));
    }

    return va - vb;
  });
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
    const all = buildRouteStops(bus);
    const pickupIndex = all.findIndex((s) => normalizeKey(s) === normalizeKey(pickup));
    if (pickupIndex === -1) return [];

    const pickupOptions = getPickupOptions(bus);
    const pickupSet = new Set(pickupOptions.map((p) => normalizeKey(p)));

    return all.slice(pickupIndex + 1).filter((s) => !pickupSet.has(normalizeKey(s)));
  }

  const stops = buildRouteStops(bus);
  const pickupIndex = stops.findIndex((s) => normalizeKey(s) === normalizeKey(pickup));
  if (pickupIndex === -1) return [];
  return stops.slice(pickupIndex + 1);
}

function ruleAppliesOnDate(rule, dateStr) {
  if (!dateStr) return true;

  const toDateOnly = (s) => String(s || "").slice(0, 10);

  const d = toDateOnly(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;

  if (rule.fareStartDate) {
    const s = toDateOnly(rule.fareStartDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    if (d < s) return false;
  }

  if (rule.fareEndDate) {
    const e = toDateOnly(rule.fareEndDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e)) return false;
    if (d > e) return false;
  }

  return true;
}

function calculateFare(bus, pickup, drop, dateStr) {
  if (!bus || !pickup || !drop) return null;

  let routeKey = null;
  try {
    if (isBorliVillageStop(pickup) && isCityStop(drop)) routeKey = ROUTES.BORLI_TO_DONGRI;
    else if (isDighiVillageStop(pickup) && isCityStop(drop)) routeKey = ROUTES.DIGHI_TO_DONGRI;
    else if (isCityStop(pickup) && isBorliVillageStop(drop)) routeKey = ROUTES.DONGRI_TO_BORLI;
    else if (isCityStop(pickup) && isDighiVillageStop(drop)) routeKey = ROUTES.DONGRI_TO_DIGHI;
  } catch {
    routeKey = null;
  }

  let baseAmount = 0;
  if (routeKey) {
    try {
      const mappedType = (() => {
        if (!bus?.busType) return BUS_TYPES.NON_AC;
        const s = String(bus.busType).trim().toLowerCase();

        if (s === "non-ac" || s === "non ac" || s === "nonac" || s.includes("non")) {
          return BUS_TYPES.NON_AC;
        }

        if (s === "ac" || s === "a/c" || s.includes("ac")) {
          return BUS_TYPES.AC;
        }

        return BUS_TYPES.NON_AC;
      })();

      const base = getFare({
        route: routeKey,
        pickup,
        drop,
        busType: mappedType,
      });

      baseAmount = Number(base?.amount || 0);
    } catch {
      baseAmount = 0;
    }
  }

  const rules = Array.isArray(bus.fareRulesRaw)
    ? bus.fareRulesRaw
    : Array.isArray(bus.fareRules)
      ? bus.fareRules
      : [];

  if (!rules.length) {
    return baseAmount > 0 ? baseAmount : null;
  }

  const pickupOptions = getPickupOptions(bus);
  const allStops = buildRouteStops(bus);
  const pickupSet = new Set(pickupOptions.map((p) => normalizeKey(p)));
  const dropCandidates = allStops.filter((s) => !pickupSet.has(normalizeKey(s)));

  const expanded = [];

  for (let i = 0; i < rules.length; i++) {
    const r = rules[i] || {};

    const from = String(r.from || "").trim();
    const to = String(r.to || "").trim();
    const fareVal = Number(r.fare);
    const fareStartDate = r.fareStartDate || "";
    const fareEndDate = r.fareEndDate || "";

    const applyNextPickups = !!r.applyToAllNextPickupsBeforeDrop;
    const applyPreviousDrops = !!r.applyToAllPreviousDrops;

    if (!from || !to || !Number.isFinite(fareVal) || fareVal <= 0) continue;

    let fromList = [from];
    if (applyNextPickups) {
      const fromIndex = pickupOptions.findIndex((p) => normalizeKey(p) === normalizeKey(from));
      if (fromIndex !== -1) {
        fromList = pickupOptions.slice(fromIndex);
      }
    }

    let toList = [to];
    if (applyPreviousDrops) {
      const toIndex = dropCandidates.findIndex((d) => normalizeKey(d) === normalizeKey(to));
      if (toIndex !== -1) {
        toList = dropCandidates.slice(0, toIndex + 1);
      } else if (dropCandidates.length) {
        toList = dropCandidates;
      }
    }

    for (const fromStop of fromList) {
      for (const toStop of toList) {
        const fromIdx = allStops.findIndex((s) => normalizeKey(s) === normalizeKey(fromStop));
        const toIdx = allStops.findIndex((s) => normalizeKey(s) === normalizeKey(toStop));

        if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx) {
          expanded.push({
            from: fromStop,
            to: toStop,
            fare: fareVal,
            fareStartDate,
            fareEndDate,
            sourceIndex: i,
          });
        }
      }
    }
  }

  const matches = expanded.filter(
    (r) =>
      normalizeKey(r.from) === normalizeKey(pickup) &&
      normalizeKey(r.to) === normalizeKey(drop) &&
      ruleAppliesOnDate(r, dateStr)
  );

  if (!matches.length) {
    return baseAmount > 0 ? baseAmount : null;
  }

  const chosen = matches[matches.length - 1];
  const override = Number(chosen.fare);

  if (Number.isFinite(override) && override > 0) {
    return override;
  }

  return baseAmount > 0 ? baseAmount : null;
}

export default function StaffBookingPage() {
  // --- Input sanitizers / validators ---
  const sanitizeNameInput = (v) => {
    if (typeof v !== "string") return "";
    // remove digits, allow letters in any language (including Marathi), spaces, apostrophes, hyphens; cap length
    return v
      .replace(/\d+/g, "")
      .replace(/[^\p{L}\p{M}\s'\-]/gu, "")
      .slice(0, 100);
  };

  const sanitizePhoneInput = (v) => {
    if (typeof v !== "string") return "";
    return v.replace(/\D+/g, "").slice(0, 10);
  };

  const sanitizeEmailInput = (v) => {
    if (typeof v !== "string") return "";
    return v.trim().slice(0, 254).toLowerCase();
  };

  const isValidName = (v) => /^[\p{L}\p{M}\s'\-]{2,}$/u.test(String(v || "").trim());
  const isValidPhone = (v) => /^\d{10}$/.test(String(v || "").trim());
  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

  const [date, setDate] = useState("");
  const [buses, setBuses] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookedCounts, setBookedCounts] = useState({});
  const [bookings, setBookings] = useState({});
  const [viewBooking, setViewBooking] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    name: "",
    phone: "",
    email: "",
    pickup: "",
    pickupTime: "",
    drop: "",
    dropTime: "",
    fareOverride: "",
  });
  const [editingSeat, setEditingSeat] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(() => async () => { });

  const [computedFare, setComputedFare] = useState(null);

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockDetails, setBlockDetails] = useState({
    name: "",
    phone: "",
    email: "",
    pickup: "",
    drop: "",
    note: "",
  });

  const [pickupSearch, setPickupSearch] = useState("");
  const [dropSearch, setDropSearch] = useState("");
  const [pickupDropdownOpen, setPickupDropdownOpen] = useState(false);
  const [dropDropdownOpen, setDropDropdownOpen] = useState(false);

  // Refs to detect clicks outside custom dropdowns
  const pickupDropdownRef = useRef(null);
  const dropDropdownRef = useRef(null);

  const visibleBookings = useMemo(() => {
    return Object.entries(bookings || {}).filter(([, b]) => !!b);
  }, [bookings]);

  const { user } = useAuth();
  const router = useRouter();
  const { subscribeRefresh, triggerRefresh } = useAutoRefresh();

  // Close pickup/drop dropdowns when clicking outside their containers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!pickupDropdownOpen && !dropDropdownOpen) return;

      const pickupEl = pickupDropdownRef.current;
      const dropEl = dropDropdownRef.current;

      const isInsidePickup = pickupEl && pickupEl.contains(event.target);
      const isInsideDrop = dropEl && dropEl.contains(event.target);

      if (!isInsidePickup && !isInsideDrop) {
        setPickupDropdownOpen(false);
        setDropDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [pickupDropdownOpen, dropDropdownOpen]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [bRes, sRes] = await Promise.all([fetch("/api/bus"), fetch("/api/schedule")]);

        const bData = await bRes.json();
        const sData = await sRes.json();

        if (!bRes.ok) throw new Error(bData.error || "Failed to load buses");
        if (!sRes.ok) throw new Error(sData.error || "Failed to load schedules");

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

      const raw = data.bookings || {};
      const entries = Object.entries(raw).filter(([k, v]) => {
        if (!/^[0-9]+$/.test(k) && !/^CB[0-9]+$/i.test(k)) return false;
        if (/^[0-9]+$/.test(k) && Number(k) < 1) return false;
        if (!v || typeof v !== "object") return false;

        const hasMeaningful = Boolean(
          (v.name && String(v.name).trim()) ||
          (v.phone && String(v.phone).trim()) ||
          (v.email && String(v.email).trim()) ||
          (v.pickup && String(v.pickup).trim()) ||
          (v.drop && String(v.drop).trim()) ||
          v.status ||
          v.payment ||
          v.fare ||
          v.note
        );

        return hasMeaningful;
      });

      const safe = Object.fromEntries(entries);
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

  useEffect(() => {
    if (typeof subscribeRefresh !== "function") return;
    const unsub = subscribeRefresh(() => {
      fetchBookings();
    });

    return () => {
      try {
        if (typeof unsub === "function") unsub();
      } catch (e) { }
    };
  }, [subscribeRefresh]);

  useEffect(() => {
    if (!selectedBus || !bookingForm.pickup || !bookingForm.drop) {
      setComputedFare(null);
      return;
    }

    const fare = calculateFare(selectedBus, bookingForm.pickup, bookingForm.drop, date);
    setComputedFare(fare);
  }, [selectedBus, bookingForm.pickup, bookingForm.drop, date]);

  const availableBuses = useMemo(() => {
    if (!date) return [];

    return buses.filter((bus) => {
      const busSched = schedules[bus.busId] || {};
      return busSched[date] && busSched[date].available;
    });
  }, [date, buses, schedules]);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        if (!date || !availableBuses || availableBuses.length === 0) {
          setBookedCounts({});
          return;
        }

        const calls = availableBuses.map((b) =>
          fetch(`/api/booking?busId=${encodeURIComponent(b.busId)}&date=${encodeURIComponent(date)}`)
            .then((r) => r.json())
            .then((d) => {
              const raw = d.bookings || {};
              let booked = 0;
              let blocked = 0;

              for (const key of Object.keys(raw)) {
                if (!/^[0-9]+$/.test(key) && !/^CB[0-9]+$/i.test(key)) continue;

                const rec = raw[key] || {};
                if (rec && rec.status === "blocked") {
                  blocked++;
                } else {
                  const hasMeaningful = Boolean(
                    (rec.name && String(rec.name).trim()) ||
                    (rec.phone && String(rec.phone).trim()) ||
                    (rec.email && String(rec.email).trim()) ||
                    rec.status ||
                    rec.payment ||
                    rec.fare
                  );
                  if (hasMeaningful) booked++;
                }
              }

              return { busId: b.busId, booked, blocked };
            })
            .catch(() => ({ busId: b.busId, booked: 0, blocked: 0 }))
        );

        const results = await Promise.all(calls);
        const map = {};
        for (const r of results) {
          map[r.busId] = {
            booked: Number(r.booked) || 0,
            blocked: Number(r.blocked) || 0,
          };
        }

        setBookedCounts(map);
      } catch {
        setBookedCounts({});
      }
    };

    loadCounts();
  }, [availableBuses, date]);

  const pickupOptions = useMemo(() => getPickupOptions(selectedBus), [selectedBus]);

  const dropOptions = useMemo(
    () => getDropOptions(selectedBus, bookingForm.pickup),
    [selectedBus, bookingForm.pickup]
  );

  // For UI, show stops ordered by their times
  const sortedPickupOptions = useMemo(
    () => sortStopsByTime(selectedBus, pickupOptions),
    [selectedBus, pickupOptions]
  );

  const sortedDropOptions = useMemo(
    () => sortStopsByTime(selectedBus, dropOptions),
    [selectedBus, dropOptions]
  );

  const filteredPickupOptions = useMemo(() => {
    if (!pickupSearch) return sortedPickupOptions;

    const q = pickupSearch.toLowerCase();
    return sortedPickupOptions.filter((stop) =>
      getStopDisplayName(stop).toLowerCase().includes(q)
    );
  }, [sortedPickupOptions, pickupSearch]);

  const filteredDropOptions = useMemo(() => {
    if (!dropSearch) return sortedDropOptions;

    const q = dropSearch.toLowerCase();
    return sortedDropOptions.filter((stop) =>
      getStopDisplayName(stop).toLowerCase().includes(q)
    );
  }, [sortedDropOptions, dropSearch]);

  const resetBookingForm = () => {
    setSelectedSeats([]);
    setEditingSeat(null);
    setPickupSearch("");
    setDropSearch("");
    setPickupDropdownOpen(false);
    setDropDropdownOpen(false);
    setBookingForm({
      name: "",
      phone: "",
      email: "",
      pickup: "",
      pickupTime: "",
      drop: "",
      dropTime: "",
      fareOverride: "",
    });
    setComputedFare(null);
  };

  const openBusModal = (bus) => {
    setSelectedBus(bus);
    resetBookingForm();
  };

  const closeBusModal = () => {
    setSelectedBus(null);
    resetBookingForm();
    setViewBooking(null);
  };

  const handleCreateOrUpdateBooking = async () => {
    const seatsToProcess = editingSeat ? [editingSeat] : selectedSeats;

    if (!seatsToProcess.length) {
      return showAppToast("error", "Select at least one seat first");
    }

    if (!bookingForm.name || !bookingForm.phone) {
      return showAppToast("error", "Provide name and phone");
    }

    if (!isValidName(bookingForm.name)) {
      return showAppToast("error", "Enter a valid name (letters and spaces only)");
    }

    if (!isValidPhone(bookingForm.phone)) {
      return showAppToast("error", "Enter a valid 10-digit phone number");
    }

    if (bookingForm.email && !isValidEmail(bookingForm.email)) {
      return showAppToast("error", "Enter a valid email address");
    }

    if (!bookingForm.pickup || !bookingForm.drop) {
      return showAppToast("error", "Select pickup and drop");
    }

    const currentFare = calculateFare(selectedBus, bookingForm.pickup, bookingForm.drop, date);
    const overrideVal = String(bookingForm.fareOverride || "").trim();
    const overrideNum = overrideVal === "" ? null : Number(overrideVal);

    if (currentFare === null && (overrideNum === null || !Number.isFinite(overrideNum) || overrideNum <= 0)) {
      return showAppToast("error", "Fare not available for selected pickup and drop");
    }

    try {
      const results = [];

      for (const seatNo of seatsToProcess) {
        const finalFare =
          overrideNum !== null && Number.isFinite(overrideNum) && overrideNum > 0
            ? overrideNum
            : Number(currentFare ?? computedFare);

        const payload = {
          busId: selectedBus.busId,
          busNumber: selectedBus.busNumber || "",
          startTime: selectedBus.startTime || "",
          endTime: selectedBus.endTime || "",
          date,
          seatNo,
          name: bookingForm.name,
          phone: bookingForm.phone,
          email: bookingForm.email,
          userId: user?.uid || "",
          pickup: bookingForm.pickup,
          pickupTime: bookingForm.pickupTime || "",
          drop: bookingForm.drop,
          dropTime: bookingForm.dropTime || "",
          fare: Number(finalFare),
        };
        // If creating a booking from staff portal (not editing), mark as offline by default
        if (!editingSeat) {
          payload.paymentMethod = "offline";
        }

        const method = editingSeat ? "PUT" : "POST";

        const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch("/api/booking", {
          method,
          headers,
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        results.push({ seat: seatNo, ok: res.ok, data });

        if (!res.ok) break;
      }

      const failed = results.find((r) => !r.ok);
      if (failed) throw new Error(failed.data.error || `Failed for seat ${failed.seat}`);

      showAppToast("success", editingSeat ? "Booking updated" : "Seats booked successfully");
      await fetchBookings();
      resetBookingForm();
    } catch (err) {
      console.error(err);
      showAppToast("error", err.message || "Booking failed");
    }
  };

  const handleOnlineBooking = async () => {
    const seats = selectedSeats;

    if (!seats.length) {
      return showAppToast("error", "Select at least one seat to book");
    }

    if (!bookingForm.name || !bookingForm.phone) {
      return showAppToast("error", "Provide name and phone");
    }

    if (!isValidName(bookingForm.name)) {
      return showAppToast("error", "Enter a valid name (letters and spaces only)");
    }

    if (!isValidPhone(bookingForm.phone)) {
      return showAppToast("error", "Enter a valid 10-digit phone number");
    }

    if (bookingForm.email && !isValidEmail(bookingForm.email)) {
      return showAppToast("error", "Enter a valid email address");
    }

    if (!bookingForm.pickup || !bookingForm.drop) {
      return showAppToast("error", "Select pickup and drop");
    }

    const currentFare = calculateFare(selectedBus, bookingForm.pickup, bookingForm.drop, date);
    const overrideVal = String(bookingForm.fareOverride || "").trim();
    const overrideNum = overrideVal === "" ? null : Number(overrideVal);

    if (currentFare === null && (overrideNum === null || !Number.isFinite(overrideNum) || overrideNum <= 0)) {
      return showAppToast("error", "Fare not available for selected pickup and drop");
    }

    try {
      const finalFareForBooking =
        overrideNum !== null && Number.isFinite(overrideNum) && overrideNum > 0
          ? overrideNum
          : Number(currentFare ?? computedFare);

      const bookingsPayload = seats.map((seatNo) => ({
        busId: selectedBus.busId,
        busNumber: selectedBus.busNumber || "",
        startTime: selectedBus.startTime || "",
        endTime: selectedBus.endTime || "",
        date,
        seatNo,
        name: bookingForm.name,
        phone: bookingForm.phone,
        email: bookingForm.email,
        pickup: bookingForm.pickup,
        pickupTime: bookingForm.pickupTime || "",
        drop: bookingForm.drop,
        dropTime: bookingForm.dropTime || "",
        fare: Number(finalFareForBooking),
      }));

      const totalAmount = bookingsPayload.reduce((sum, item) => sum + (Number(item.fare) || 0), 0);

      if (!totalAmount || totalAmount <= 0) {
        return showAppToast("error", "Invalid fare amount");
      }

      const orderRes = await fetch("/api/public/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalAmount, currency: "INR" }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create payment order");

      const order = orderData.order;
      const publicKey = orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

      if (!publicKey) {
        return showAppToast("error", "Razorpay public key missing");
      }

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

      const options = {
        key: publicKey,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "SA Tours",
        description: "Bus Booking Payment",
        order_id: order.id,
        handler: async function (resp) {
          try {
            const verifyRes = await fetch("/api/public/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId: resp.razorpay_payment_id,
                orderId: resp.razorpay_order_id,
                signature: resp.razorpay_signature,
                amount: totalAmount,
                currency: "INR",
                metadata: { bookings: bookingsPayload },
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed");
            }

            const paymentRecord = verifyData.payment || {};
            const paymentId =
              paymentRecord.id || paymentRecord.paymentId || resp.razorpay_payment_id;

            for (const payload of bookingsPayload) {
              const withPayment = {
                ...payload,
                payment: paymentId,
                paymentMethod: "razorpay",
              };

              const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
              const headers = { "Content-Type": "application/json" };
              if (token) headers.Authorization = `Bearer ${token}`;

              const bRes = await fetch("/api/booking", {
                method: "POST",
                headers,
                body: JSON.stringify(withPayment),
              });

              const bData = await bRes.json();
              if (!bRes.ok) {
                throw new Error(bData.error || "Failed to create booking after payment");
              }
            }

            showAppToast("success", "Payment successful and booking created");
            await fetchBookings();
            resetBookingForm();
          } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Payment succeeded but booking failed");
          }
        },
        modal: {
          ondismiss: function () {
            showAppToast("info", "Payment cancelled");
          },
        },
        prefill: {
          name: bookingForm.name,
          email: bookingForm.email,
          contact: bookingForm.phone,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      showAppToast("error", err.message || "Online booking failed");
    }
  };

  const handleOfflineBooking = async () => {
    const seats = selectedSeats;

    if (!seats.length) {
      return showAppToast("error", "Select at least one seat to book");
    }

    if (!bookingForm.name || !bookingForm.phone) {
      return showAppToast("error", "Provide name and phone");
    }

    if (!isValidName(bookingForm.name)) {
      return showAppToast("error", "Enter a valid name (letters and spaces only)");
    }

    if (!isValidPhone(bookingForm.phone)) {
      return showAppToast("error", "Enter a valid 10-digit phone number");
    }

    if (bookingForm.email && !isValidEmail(bookingForm.email)) {
      return showAppToast("error", "Enter a valid email address");
    }

    if (!bookingForm.pickup || !bookingForm.drop) {
      return showAppToast("error", "Select pickup and drop");
    }

    const currentFare = calculateFare(selectedBus, bookingForm.pickup, bookingForm.drop, date);
    const overrideVal = String(bookingForm.fareOverride || "").trim();
    const overrideNum = overrideVal === "" ? null : Number(overrideVal);

    if (currentFare === null && (overrideNum === null || !Number.isFinite(overrideNum) || overrideNum <= 0)) {
      return showAppToast("error", "Fare not available for selected pickup and drop");
    }

    try {
      const created = [];

      for (const seatNo of seats) {
        const finalFare =
          overrideNum !== null && Number.isFinite(overrideNum) && overrideNum > 0
            ? overrideNum
            : Number(currentFare ?? computedFare);

        const payload = {
          busId: selectedBus.busId,
          busNumber: selectedBus.busNumber || "",
          startTime: selectedBus.startTime || "",
          endTime: selectedBus.endTime || "",
          date,
          seatNo,
          name: bookingForm.name,
          phone: bookingForm.phone,
          email: bookingForm.email,
          pickup: bookingForm.pickup,
          pickupTime: bookingForm.pickupTime || "",
          drop: bookingForm.drop,
          dropTime: bookingForm.dropTime || "",
          fare: Number(finalFare),
          paymentMethod: "offline",
        };

        const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch("/api/booking", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create booking");

        created.push({ seat: seatNo });
      }

      const token = localStorage.getItem("authToken");

      if (token) {
        for (const c of created) {
          const amountForRecord =
            overrideNum !== null && Number.isFinite(overrideNum) && overrideNum > 0
              ? Number(overrideNum)
              : Number(currentFare ?? computedFare);

          const payload = {
            amount: Number(amountForRecord) || 0,
            currency: "INR",
            userId: null,
            metadata: {
              booking: {
                date,
                busId: selectedBus.busId,
                seatNo: c.seat,
              },
              user: {
                name: bookingForm.name || null,
                phone: bookingForm.phone || null,
                email: bookingForm.email || null,
                pickup: bookingForm.pickup || null,
                pickupTime: bookingForm.pickupTime || null,
                drop: bookingForm.drop || null,
                dropTime: bookingForm.dropTime || null,
                busNumber: selectedBus.busNumber || null,
              },
            },
            note: "Cash collected by admin",
          };

          try {
            await fetch("/api/admin/offline-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            });
          } catch {
            // silent
          }
        }
      }

      showAppToast("success", "Offline booking created");
      await fetchBookings();
      resetBookingForm();
    } catch (err) {
      console.error(err);
      showAppToast("error", err.message || "Offline booking failed");
    }
  };

  const handleCancelSeat = (seat) => {
    setConfirmMessage(
      `Are you sure you want to cancel booking for seat ${seat}? This will delete the booking record and notify the passenger via email.`
    );

    setConfirmAction(() => async () => {
      try {
        const res = await fetch(
          `/api/booking?busId=${selectedBus.busId}&date=${date}&seatNo=${seat}`,
          { method: "DELETE" }
        );

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Cancel failed");

        showAppToast("success", data.message || "Booking cancelled");
        setEditingSeat(null);
        resetBookingForm();
        await fetchBookings();
      } catch (err) {
        console.error(err);
        showAppToast("error", err.message || "Cancel failed");
        throw err;
      }
    });

    setConfirmOpen(true);
  };

  const handleBlockSeats = async () => {
    try {
      const seats = editingSeat ? [editingSeat] : selectedSeats;

      if (!seats.length) {
        return showAppToast("error", "Select seats to block");
      }

      const token = localStorage.getItem("authToken");
      if (!token) {
        return showAppToast("error", "Unauthorized — please login as admin");
      }

      // Validate block details
      if (blockDetails.name && !isValidName(blockDetails.name)) {
        return showAppToast("error", "Enter a valid name (letters and spaces only)");
      }

      if (blockDetails.phone && !isValidPhone(blockDetails.phone)) {
        return showAppToast("error", "Enter a valid 10-digit phone number");
      }

      if (blockDetails.email && !isValidEmail(blockDetails.email)) {
        return showAppToast("error", "Enter a valid email address");
      }

      const payload = {
        busId: selectedBus.busId,
        date,
        seats,
        action: "block",
        note: blockDetails.note || null,
        details: {
          name: blockDetails.name || null,
          phone: blockDetails.phone || null,
          email: blockDetails.email || null,
          pickup: blockDetails.pickup || null,
          drop: blockDetails.drop || null,
        },
      };

      const res = await fetch("/api/admin/block-seats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          return showAppToast("error", "Unauthorized — invalid/expired token");
        }
        if (res.status === 403) {
          return showAppToast("error", "Forbidden — admin access required");
        }
        throw new Error(data.error || "Block failed");
      }

      showAppToast("success", "Seats blocked for admin");
      setBlockModalOpen(false);
      setBlockDetails({
        name: "",
        phone: "",
        email: "",
        pickup: "",
        drop: "",
        note: "",
      });
      resetBookingForm();
      await fetchBookings();
    } catch (err) {
      console.error(err);
      showAppToast("error", err.message || "Block failed");
    }
  };

  const handleUnblockSeats = async () => {
    try {
      const seats = editingSeat ? [editingSeat] : selectedSeats;

      if (!seats.length) {
        return showAppToast("error", "Select seats to unblock");
      }

      const token = localStorage.getItem("authToken");
      if (!token) {
        return showAppToast("error", "Unauthorized — please login as admin");
      }

      const res = await fetch("/api/admin/block-seats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          busId: selectedBus.busId,
          date,
          seats,
          action: "unblock",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          return showAppToast("error", "Unauthorized — invalid/expired token");
        }
        if (res.status === 403) {
          return showAppToast("error", "Forbidden — admin access required");
        }
        throw new Error(data.error || "Unblock failed");
      }

      showAppToast("success", "Seats unblocked");
      resetBookingForm();
      await fetchBookings();
    } catch (err) {
      console.error(err);
      showAppToast("error", err.message || "Unblock failed");
    }
  };

  const formatDisplayDate = (value) => {
    if (!value) return "__ / __ / ____";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleDateString("en-GB");
    } catch {
      return value;
    }
  };

  const formatTime = (value) => {
    if (!value && value !== 0) return "";
    try {
      let s = String(value || "").trim();
      if (!s) return "";
      s = s.replace(/\s+/g, " ").toLowerCase();

      // Keep placeholders like --:-- untouched
      if (/^-{2,}:?-{2,}$/.test(s)) return s;

      // detect am/pm
      const ampmMatch = s.match(/\b(am|pm)\b/);
      let isPM = false;
      if (ampmMatch) {
        isPM = ampmMatch[1] === "pm";
        s = s.replace(/\b(am|pm)\b/, "").trim();
      }

      const parts = s.split(":").map((p) => Number(p));
      if (!parts.length || !Number.isFinite(parts[0])) return value;

      let hh = parts[0];
      const mm = parts.length > 1 && Number.isFinite(parts[1]) ? parts[1] : 0;

      if (ampmMatch) {
        if (hh === 12) hh = isPM ? 12 : 0;
        else if (isPM) hh = (hh % 12) + 12;
      }

      // normalize
      hh = Number(hh) || 0;
      const minutes = Number.isFinite(Number(mm)) ? Number(mm) : 0;

      const outH = hh % 12 === 0 ? 12 : hh % 12;
      const outM = String(minutes).padStart(2, "0");
      const suffix = hh >= 12 ? "PM" : "AM";

      return `${outH}:${outM} ${suffix}`;
    } catch {
      return value;
    }
  };

  const safeHtml = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const getSeatMapForTemplate = () => {
    const seatMap = {};
    Object.entries(bookings || {}).forEach(([seat, b]) => {
      if (!b) return;
      seatMap[String(seat)] = b;
    });
    return seatMap;
  };

  /* =========================================================
     23 SEAT
  ========================================================= */

  const buildTemplateShell23 = ({
    selectedBus,
    date,
    leftColumnHtml,
    rightColumnHtml,
    backRowHtml,
  }) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Seat Template - ${safeHtml(selectedBus?.busNumber || "Bus")}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 4mm;
    }

    html, body {
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: "Times New Roman", serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-size: 12px;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 999;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 8px;
      background: #fff;
      border-bottom: 1px solid #ddd;
      margin-bottom: 8px;
    }

    .toolbar button {
      border: 1px solid #ddd;
      background: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
    }

    .toolbar .primary {
      background: #f97316;
      color: #fff;
      border-color: #f97316;
    }

    .sheet {
      width: 202mm;
      height: 289mm;
      margin: 0 auto;
      border: 1.2px solid #444;
      padding: 3.5mm;
      background: #fff;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .top-line {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      margin-bottom: 3px;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.1;
    }

    .top-line .left { text-align: left; }
    .top-line .center { text-align: center; }
    .top-line .right { text-align: right; }

    .title-line {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }

    .bus-number {
      font-size: 14px;
      font-weight: 700;
      text-align: left;
      line-height: 1.1;
    }

    .company {
      font-size: 18px;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      line-height: 1;
    }

    .route {
      font-size: 14px;
      font-weight: 700;
      text-align: right;
      line-height: 1.1;
    }

    .divider {
      border-top: 1px solid #666;
      margin: 3px 0 5px;
    }

    /* =========================
       MAIN LAYOUT
    ========================= */
    .main-layout {
      display: grid;
      grid-template-columns: 55mm 1fr 110mm;
      align-items: start;
      gap: 0;
      height: 210mm;
      max-height: 210mm;
      overflow: hidden;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .left-column {
      width: 55mm;
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow: hidden;
      align-items: stretch;
    }

    .center-gap {
      width: auto;
      min-height: 1px;
    }

    .right-column {
      width: 110mm;
      display: flex;
      flex-direction: column;
      gap: 0;
      align-items: stretch;
      justify-content: flex-start;
      overflow: hidden;
    }

    .left-seat-wrap {
      width: 55mm;
      margin: 0;
      padding: 0;
      display: flex;
      align-items: stretch;
    }

    .left-seat-wrap.left-empty {
      height: 30mm;
      min-height: 30mm;
      border: none;
      background: transparent;
    }

    .right-row {
      width: 110mm;
      display: grid;
      gap: 0;
      margin: 0;
      padding: 0;
      align-items: stretch;
      justify-items: stretch;
    }

    .right-count-1 {
      grid-template-columns: 55mm;
      justify-content: end;
    }

    .right-count-2 {
      grid-template-columns: repeat(2, 55mm);
    }

    .right-seat-wrap {
      width: 55mm;
      display: flex;
      align-items: stretch;
      margin: 0;
      padding: 0;
    }

    /* =========================
       BACK ROW
    ========================= */
    .back-row {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0;
      margin-top: -1px;
      align-items: stretch;
      justify-items: stretch;
      border-top: none;
      height: 50mm;
      max-height: 50mm;
      overflow: visible;
    }

    .back-seat-wrap {
      width: 100%;
      min-width: 0;
      display: flex;
      align-items: stretch;
      margin: 0;
      padding: 0;
    }

    /* =========================
       SEAT BOX
    ========================= */
    .seat-box {
      width: 100%;
      height: 30mm;
      min-height: 30mm;
      border: 1px solid #444;
      padding: 0.8mm 1mm 0.5mm;
      background: #fff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .back-row .seat-box {
      height: 34m;
      min-height: 34mm;
      border: 1px solid #444;
      padding: 0.8mm 1mm 0.6mm;
      margin: 0;
      overflow: hidden;
    }

    .seat-box.blocked {
      background: #fff7ed;
      border-color: #ea580c;
    }

    /* =========================
       HEADER
       seat no left / badge right
    ========================= */
    .seat-title {
      font-size: 18px;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 0.45mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1mm;
      white-space: nowrap;
      overflow: hidden;
    }

    .seat-no {
      display: inline-block;
      flex: 0 0 auto;
      white-space: nowrap;
    }

    .seat-title-right {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.6mm;
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
    }

    .blocked-tag {
      font-size: 16px;
      border: 1px solid #ea580c;
      color: #ea580c;
      padding: 0 3px;
      border-radius: 0;
      line-height: 1;
      flex-shrink: 0;
    }

    .ticket-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      font-weight: 700;
      border: none;
      color: #0f172a;
      background: transparent;
      padding: 0.2mm 0.8mm;
      border-radius: 0;
      line-height: 1;
      height: 3.2mm;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-shrink: 1;
    }

    /* =========================
       LABEL / VALUE
       Name:-  Paras
    ========================= */
    .line-row {
      display: flex;
      align-items: center;
      gap: 3mm;
      margin: 0.14mm 0;
      min-height: 2.4mm;
      overflow: hidden;
    }

    .label {
      flex: 0 0 auto;
      font-size: 18px;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }

    .value {
      flex: 1 1 auto;
      min-width: 0;
      display: inline-block;
      min-height: 2.2mm;
      padding: 0 0 0.06mm 0;
      font-size: 18px;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-bottom: none;
    }

    .value-no-border {
      border-bottom: none;
    }

    .marathi-text {
      font-family: "Noto Sans Devanagari", "Noto Serif Devanagari", "Mangal", "Nirmala UI", "Kohinoor Devanagari", system-ui, sans-serif;
    }

    .back-row .label {
      font-size: 17px;
    }

    .back-row .value {
      font-size: 17px;
      border-bottom: none;
    }

    @media print {
      html, body {
        width: auto;
        min-height: auto;
        overflow: hidden;
      }

      .toolbar {
        display: none !important;
      }

      .sheet {
        border: none;
        margin: 0 auto;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button class="primary" onclick="downloadHtmlFile()">Download HTML</button>
  </div>

  <div class="sheet">
    <div class="top-line">
      <div class="left">Date:- ${safeHtml(formatDisplayDate(date) || "")}</div>
      <div class="center">||श्री||</div>
      <div class="right">Time:- ${safeHtml(formatTime(selectedBus?.startTime || "04:00"))}</div>
    </div>

    <div class="title-line">
      <div class="bus-number">${safeHtml(selectedBus?.busNumber || "MH06BW7405")}</div>
      <div class="company">SA TRAVEL'S</div>
      <div class="route">Route:- ${safeHtml(selectedBus?.routeName || "")}</div>
    </div>

    <div class="divider"></div>

    <div class="main-layout">
      <div class="left-column">${leftColumnHtml}</div>
      <div class="center-gap"></div>
      <div class="right-column">${rightColumnHtml}</div>
    </div>

    <div class="back-row">
      ${backRowHtml}
    </div>
  </div>

  <script>
    function downloadHtmlFile() {
      const html = document.documentElement.outerHTML;
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seat-template-${safeHtml(selectedBus?.busNumber || "bus")}-${safeHtml(date || "date")}.html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>
  `;
  };


  const renderSeatCardTemplate23 = ({
    seatNo,
    seatMap,
    isWindowSeat = false,
  }) => {
    const data = seatMap[String(seatNo)] || {};
    const pickupDisplay = data.pickup ? getStopNameMarathi(data.pickup) : "";
    const dropDisplay = data.drop ? getStopNameMarathi(data.drop) : "";
    const isBlocked = data?.status === "blocked";
    const title = `${seatNo}${isWindowSeat ? "W" : ""}`;

    return `
    <div class="seat-box ${isBlocked ? "blocked" : ""}">
      <div class="seat-title">
        ${safeHtml(title)}
        ${isBlocked ? `<span class="blocked-tag">BLOCKED</span>` : ""}
      </div>

      <div class="line-row">
        <span class="label">Name :</span>
        <span class="value">${safeHtml(data.name || "")}</span>
      </div>

      <div class="line-row">
        <span class="label">Phone :</span>
        <span class="value">${safeHtml(data.phone || data.mobile || "")}</span>
      </div>

      <div class="line-row">
        <span class="label">Pickup :</span>
        <span class="value value-no-border marathi-text">${safeHtml(pickupDisplay)}</span>
      </div>

      <div class="line-row">
        <span class="label">Drop :</span>
        <span class="value value-no-border marathi-text">${safeHtml(dropDisplay)}</span>
      </div>
    </div>
  `;
  };

  const buildSeatTemplateHtml23 = () => {
    if (!selectedBus) {
      showAppToast("error", "Please open a bus first");
      return "";
    }

    const seatMap = getSeatMapForTemplate();

    const leftSeats = [3, 6, 9, 12, 15, 18];
    const rightRows = [
      [1, 2],
      [4, 5],
      [7, 8],
      [10, 11],
      [13, 14],
      [16, 17],
    ];
    const backRow = [19, 20, 21, 22, 23];
    const topOffsetRows = 1;

    const windowSeatSet = new Set([
      2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 19, 23,
    ]);

    const leftVisibleCount = topOffsetRows + leftSeats.length;
    const rightVisibleCount = rightRows.length;
    const leftBottomSpacerCount = Math.max(0, rightVisibleCount - leftVisibleCount);

    const leftColumnHtml = `
    ${Array.from({ length: topOffsetRows })
        .map(() => `<div class="left-seat-wrap left-empty"></div>`)
        .join("")}
    ${leftSeats
        .map(
          (seat) => `
        <div class="left-seat-wrap">
          ${renderSeatCardTemplate23({
            seatNo: seat,
            seatMap,
            isWindowSeat: windowSeatSet.has(seat),
          })}
        </div>
      `
        )
        .join("")}
    ${Array.from({ length: leftBottomSpacerCount })
        .map(() => `<div class="left-seat-wrap left-empty"></div>`)
        .join("")}
  `;

    const rightColumnHtml = rightRows
      .map(
        (row) => `
      <div class="right-row right-count-${row.length}">
        ${row
            .map(
              (seat) => `
          <div class="right-seat-wrap">
            ${renderSeatCardTemplate23({
                seatNo: seat,
                seatMap,
                isWindowSeat: windowSeatSet.has(seat),
              })}
          </div>
        `
            )
            .join("")}
      </div>
    `
      )
      .join("");

    // ✅ IMPORTANT: NO outer .back-row here
    const backRowHtml = backRow
      .map(
        (seat) => `
      <div class="back-seat-wrap">
        ${renderSeatCardTemplate23({
          seatNo: seat,
          seatMap,
          isWindowSeat: windowSeatSet.has(seat),
        })}
      </div>
    `
      )
      .join("");

    return buildTemplateShell23({
      selectedBus,
      date,
      leftColumnHtml,
      rightColumnHtml,
      backRowHtml,
    });
  };


  /* =========================================================
   15 SEAT TEMPLATE (uses same shell as 23-seat)
========================================================= */

  const buildSeatTemplateHtml15 = () => {
    if (!selectedBus) {
      showAppToast("error", "Please open a bus first");
      return "";
    }

    const seatMap = getSeatMapForTemplate();

    const leftSeats = [3, 6, 9, 12];
    const rightRows = [
      [1, 2],
      [4, 5],
      [7, 8],
      [10, 11],
    ];
    const backRow = [13, 14, 15];
    const topOffsetRows = 1;

    const windowSeatSet = new Set([
      2, 3, 5, 6, 8, 9, 11, 12, 13, 15,
    ]);

    const leftVisibleCount = topOffsetRows + leftSeats.length;
    const rightVisibleCount = rightRows.length;
    const leftBottomSpacerCount = Math.max(0, rightVisibleCount - leftVisibleCount);

    const leftColumnHtml = `
    ${Array.from({ length: topOffsetRows })
        .map(() => `<div class="left-seat-wrap left-empty"></div>`)
        .join("")}
    ${leftSeats
        .map(
          (seat) => `
        <div class="left-seat-wrap">
          ${renderSeatCardTemplate23({
            seatNo: seat,
            seatMap,
            isWindowSeat: windowSeatSet.has(seat),
          })}
        </div>
      `
        )
        .join("")}
    ${Array.from({ length: leftBottomSpacerCount })
        .map(() => `<div class="left-seat-wrap left-empty"></div>`)
        .join("")}
  `;

    const rightColumnHtml = rightRows
      .map(
        (row) => `
      <div class="right-row right-count-${row.length}">
        ${row
            .map(
              (seat) => `
          <div class="right-seat-wrap">
            ${renderSeatCardTemplate23({
                seatNo: seat,
                seatMap,
                isWindowSeat: windowSeatSet.has(seat),
              })}
          </div>
        `
            )
            .join("")}
      </div>
    `
      )
      .join("");

    const backRowHtml = backRow
      .map(
        (seat) => `
      <div class="back-seat-wrap">
        ${renderSeatCardTemplate23({
          seatNo: seat,
          seatMap,
          isWindowSeat: windowSeatSet.has(seat),
        })}
      </div>
    `
      )
      .join("");

    return buildTemplateShell23({
      selectedBus,
      date,
      leftColumnHtml,
      rightColumnHtml,
      backRowHtml,
    });
  };


  /* =========================================================
   27 SEAT - FINAL FIXED
========================================================= */

  const buildTemplateShell27 = ({
    selectedBus,
    date,
    leftColumnHtml,
    rightColumnHtml,
    backRowHtml,
  }) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Seat Template - ${safeHtml(selectedBus?.busNumber || "Bus")}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 4mm;
    }

    html, body {
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: "Times New Roman", serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-size: 12px;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 999;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 8px;
      background: #fff;
      border-bottom: 1px solid #ddd;
      margin-bottom: 8px;
    }

    .toolbar button {
      border: 1px solid #ddd;
      background: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
    }

    .toolbar .primary {
      background: #f97316;
      color: #fff;
      border-color: #f97316;
    }

    .sheet {
      width: 202mm;
      height: 289mm;
      margin: 0 auto;
      border: 1.2px solid #444;
      padding: 3.5mm;
      background: #fff;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .top-line {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      margin-bottom: 3px;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.1;
    }

    .top-line .left { text-align: left; }
    .top-line .center { text-align: center; }
    .top-line .right { text-align: right; }

    .title-line {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }

    .bus-number {
      font-size: 13px;
      font-weight: 700;
      text-align: left;
      line-height: 1.1;
    }

    .company {
      font-size: 18px;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      line-height: 1;
    }

    .route {
      font-size: 13px;
      font-weight: 700;
      text-align: right;
      line-height: 1.1;
    }

    .divider {
      border-top: 1px solid #666;
      margin: 3px 0 5px;
    }

    /* =========================
       MAIN LAYOUT
    ========================= */
    .main-layout {
      display: grid;
      grid-template-columns: 55mm 1fr 110mm;
      align-items: start;
      gap: 0;
      height: 223.85mm;
      max-height: 223.85mm;
      overflow: hidden;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .left-column {
      width: 55mm;
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow: hidden;
      align-items: stretch;
    }

    .center-gap {
      width: auto;
      min-height: 1px;
    }

    .right-column {
      width: 110mm;
      display: flex;
      flex-direction: column;
      gap: 0;
      align-items: stretch;
      justify-content: flex-start;
      overflow: hidden;
    }

    .left-seat-wrap {
      width: 55mm;
      margin: 0;
      padding: 0;
      display: flex;
      align-items: stretch;
    }

    .left-seat-wrap.left-empty {
      height: 28mm;
      min-height: 28mm;
      border: none;
      background: transparent;
    }

    .right-row {
      width: 110mm;
      display: grid;
      gap: 0;
      margin: 0;
      padding: 0;
      align-items: stretch;
      justify-items: stretch;
    }

    .right-count-1 {
      grid-template-columns: 55mm;
      justify-content: end;
    }

    .right-count-2 {
      grid-template-columns: repeat(2, 55mm);
    }

    .right-seat-wrap {
      width: 55mm;
      display: flex;
      align-items: stretch;
      margin: 0;
      padding: 0;
    }

    /* =========================
       BACK ROW
    ========================= */
    .back-row {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0;
      margin-top: 2mm;
      align-items: stretch;
      justify-items: stretch;
      border-top: none;
      height: 36mm;
      max-height: 36mm;
      overflow: visible;
    }

    .back-seat-wrap {
      width: 100%;
      min-width: 0;
      display: flex;
      align-items: stretch;
      margin: 0;
      padding: 0;
    }

    /* =========================
       SEAT BOX
    ========================= */
    .seat-box {
      width: 100%;
      height: 28mm;
      min-height: 28mm;
      border: 1px solid #444;
      padding: 0.8mm 1mm 0.5mm;
      background: #fff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .back-row .seat-box {
      height: 36mm;
      min-height: 36mm;
      border: 1px solid #444;
      padding: 0.9mm 1mm 0.6mm;
      margin: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .seat-box.blocked {
      background: #fff7ed;
      border-color: #ea580c;
    }

    /* =========================
       HEADER
    ========================= */
    .seat-title {
      font-size: 18px;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 0.4mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1mm;
      white-space: nowrap;
      overflow: hidden;
    }

    .seat-no {
      display: inline-block;
      flex: 0 0 auto;
      white-space: nowrap;
    }

    .seat-title-right {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.6mm;
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
    }

    .blocked-tag {
      font-size: 7px;
      border: 1px solid #ea580c;
      color: #ea580c;
      padding: 0 3px;
      border-radius: 0;
      line-height: 1;
      flex-shrink: 0;
    }

    .ticket-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      border: none;
      color: #0f172a;
      background: transparent;
      padding: 0.2mm 0.8mm;
      border-radius: 0;
      line-height: 1;
      height: 5mm;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-shrink: 1;
    }

    /* =========================
       LABEL / VALUE
    ========================= */
    .line-row {
      display: flex;
      align-items: center;
      gap: 1.2mm;
      margin: 0.14mm 0;
      min-height: 2.4mm;
      overflow: hidden;
    }

    .label {
      flex: 0 0 14mm;
      width: 14mm;
      font-size: 18px;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }

    .value {
      flex: 1 1 auto;
      min-width: 0;
      display: inline-block;
      min-height: 2.2mm;
      padding: 0 0 0.06mm 0.35mm;
      font-size: 18px;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-bottom: none;
    }

    .value-no-border {
      border-bottom: none;
    }

    .marathi-text {
      font-family: "Noto Sans Devanagari", "Noto Serif Devanagari", "Mangal", "Nirmala UI", "Kohinoor Devanagari", system-ui, sans-serif;
    }

    @media print {
      html, body {
        width: auto;
        min-height: auto;
        overflow: hidden;
      }

      .toolbar {
        display: none !important;
      }

      .sheet {
        border: none;
        margin: 0 auto;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button class="primary" onclick="downloadHtmlFile()">Download HTML</button>
  </div>

  <div class="sheet">
    <div class="top-line">
      <div class="left">Date:- ${safeHtml(formatDisplayDate(date) || "")}</div>
      <div class="center">||श्री||</div>
      <div class="right">Time:- ${safeHtml(formatTime(selectedBus?.startTime || "04:00"))}</div>
    </div>

    <div class="title-line">
      <div class="bus-number">${safeHtml(selectedBus?.busNumber || "MH06BW7405")}</div>
      <div class="company">SA TRAVEL'S</div>
      <div class="route">Route:- ${safeHtml(selectedBus?.routeName || "")}</div>
    </div>

    <div class="divider"></div>

    <div class="main-layout">
      <div class="left-column">${leftColumnHtml}</div>
      <div class="center-gap"></div>
      <div class="right-column">${rightColumnHtml}</div>
    </div>

    <div class="back-row">
      ${backRowHtml}
    </div>
  </div>

  <script>
    function downloadHtmlFile() {
      const html = document.documentElement.outerHTML;
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seat-template-${safeHtml(selectedBus?.busNumber || "bus")}-${safeHtml(date || "date")}.html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>
  `;
  };

  const renderSeatCardTemplate27 = ({
    seatNo,
    seatMap,
    isWindowSeat = false,
  }) => {
    const data = seatMap[String(seatNo)] || {};
    const pickupDisplay = data.pickup ? getStopNameMarathi(data.pickup) : "";
    const dropDisplay = data.drop ? getStopNameMarathi(data.drop) : "";
    const isBlocked = data?.status === "blocked";
    const title = `${seatNo}${isWindowSeat ? "W" : ""}`;

    return `
    <div class="seat-box ${isBlocked ? "blocked" : ""}">
      <div class="seat-title">
        <span class="seat-no">${safeHtml(title)}</span>
        <span class="seat-title-right">
          ${isBlocked ? `<span class="blocked-tag">BLOCKED</span>` : ""}
          ${data.ticket ? `<span class="ticket-tag">${safeHtml(String(data.ticket))}</span>` : ""}
        </span>
      </div>

      <div class="line-row">
        <span class="label">Name :</span>
        <span class="value">${safeHtml(data.name || "")}</span>
      </div>

      <div class="line-row">
        <span class="label">Phone :</span>
        <span class="value">${safeHtml(data.phone || data.mobile || "")}</span>
      </div>

      <div class="line-row">
        <span class="label">Pickup</span>
        <span class="colon">:</span>
        <span class="value value-no-border marathi-text">${safeHtml(pickupDisplay)}</span>
      </div>

      <div class="line-row">
        <span class="label">Drop :</span>
        <span class="value value-no-border marathi-text">${safeHtml(dropDisplay)}</span>
      </div>
    </div>
  `;
  };

  const buildSeatTemplateHtml27 = () => {
    if (!selectedBus) {
      showAppToast("error", "Please open a bus first");
      return "";
    }

    const seatMap = getSeatMapForTemplate();

    const leftSeats = [3, 6, 9, 12, 15, 18];
    const rightRows = [
      [1, 2],
      [4, 5],
      [7, 8],
      [10, 11],
      [13, 14],
      [16, 17],
      [19, 20],
      [21, 22],
    ];
    const backRow = [23, 24, 25, 26, 27];
    const topOffsetRows = 2;

    const windowSeatSet = new Set([
      2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 22, 23, 27,
    ]);

    const leftVisibleCount = topOffsetRows + leftSeats.length;
    const rightVisibleCount = rightRows.length;
    const leftBottomSpacerCount = Math.max(0, rightVisibleCount - leftVisibleCount);

    const leftColumnHtml = `
    ${Array.from({ length: topOffsetRows })
        .map(() => `<div class="left-seat-wrap left-empty"></div>`)
        .join("")}
    ${leftSeats
        .map(
          (seat) => `
        <div class="left-seat-wrap">
          ${renderSeatCardTemplate27({
            seatNo: seat,
            seatMap,
            isWindowSeat: windowSeatSet.has(seat),
          })}
        </div>
      `
        )
        .join("")}
    ${Array.from({ length: leftBottomSpacerCount })
        .map(() => `<div class="left-seat-wrap left-empty"></div>`)
        .join("")}
  `;

    const rightColumnHtml = rightRows
      .map(
        (row) => `
      <div class="right-row right-count-${row.length}">
        ${row
            .map(
              (seat) => `
          <div class="right-seat-wrap">
            ${renderSeatCardTemplate27({
                seatNo: seat,
                seatMap,
                isWindowSeat: windowSeatSet.has(seat),
              })}
          </div>
        `
            )
            .join("")}
      </div>
    `
      )
      .join("");

    // IMPORTANT: NO nested .back-row here
    const backRowHtml = backRow
      .map(
        (seat) => `
      <div class="back-seat-wrap">
        ${renderSeatCardTemplate27({
          seatNo: seat,
          seatMap,
          isWindowSeat: windowSeatSet.has(seat),
        })}
      </div>
    `
      )
      .join("");

    return buildTemplateShell27({
      selectedBus,
      date,
      leftColumnHtml,
      rightColumnHtml,
      backRowHtml,
    });
  };

  /* =========================================================
       SPECIAL HTML SHELL FOR 31 SEAT (BIGGER FONT + STRETCH)
    ========================================================= */
  const buildTemplateShell31 = ({
    selectedBus,
    date,
    leftColumnHtml,
    rightColumnHtml,
    backRowHtml,
  }) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Seat Template - ${safeHtml(selectedBus?.busNumber || "Bus")}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 3mm;
    }

    html, body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: "Times New Roman", serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-size: 12px;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 999;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 8px;
      background: #fff;
      border-bottom: 1px solid #ddd;
      margin-bottom: 6px;
    }

    .toolbar button {
      border: 1px solid #ddd;
      background: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
    }

    .toolbar .primary {
      background: #f97316;
      color: #fff;
      border-color: #f97316;
    }

    .sheet {
  width: 203mm;
  height: 289mm;
  margin: 0 auto;
  border: 1.4px solid #222;
  padding: 2.5mm 3mm 3.5mm;
  background: #fff;
  overflow: hidden;
  page-break-inside: avoid;
  break-inside: avoid;
}

    .top-line {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      margin-bottom: 2px;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.05;
    }

    .top-line .left { text-align: left; }
    .top-line .center { text-align: center; }
    .top-line .right { text-align: right; }

    .title-line {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 4px;
      margin-bottom: 3px;
    }

    .bus-number {
      font-size: 13px;
      font-weight: 700;
      text-align: left;
      line-height: 1.05;
    }

    .company {
      font-size: 19px;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      line-height: 1;
    }

    .route {
      font-size: 13px;
      font-weight: 700;
      text-align: right;
      line-height: 1.05;
    }

    .divider {
      border-top: 1.2px solid #333;
      margin: 2px 0 4px;
    }

    /* =========================
       MAIN 31 LAYOUT
    ========================= */
    .main-layout {
      display: grid;
      grid-template-columns: 48mm 1fr 104mm;
      align-items: start;
      gap: 0;
      height: 238mm;
      max-height: 238mm;
      overflow: hidden;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .left-column {
      width: 48mm;
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow: hidden;
      align-items: stretch;
    }

    .center-gap {
      width: auto;
      min-height: 1px;
    }

    .right-column {
      width: 104mm;
      display: flex;
      flex-direction: column;
      gap: 0;
      align-items: stretch;
      justify-content: flex-start;
      overflow: hidden;
    }

    .left-seat-wrap {
      width: 48mm;
      margin: 0;
      padding: 0;
      display: flex;
      align-items: stretch;
    }

    .left-seat-wrap.left-empty {
      height: 25.5mm;
      min-height: 25.5mm;
      border: none;
      background: transparent;
    }

    .right-row {
      width: 104mm;
      display: grid;
      gap: 0;
      margin: 0;
      padding: 0;
      align-items: stretch;
      justify-items: stretch;
    }

    .right-count-1 {
      grid-template-columns: 52mm;
      justify-content: end;
    }

    .right-count-2 {
      grid-template-columns: repeat(2, 52mm);
    }

    .right-seat-wrap {
      width: 52mm;
      display: flex;
      align-items: stretch;
      margin: 0;
      padding: 0;
    }

    /* =========================
       BACK ROW - CONNECTED
    ========================= */
    .back-row {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0;
  margin-top: -1.2px;
  padding-top: 0;
  height: 34mm;
  max-height: 34mm;
  overflow: visible;
  page-break-inside: avoid;
  break-inside: avoid;
  align-items: stretch;
  justify-items: stretch;
  border-top: none;
}
  .back-row .seat-box {
  height: 34mm;
  min-height: 34mm;
  border: 1.2px solid #222;
  padding: 0.8mm 1mm 0.55mm;
  margin: 0;
  overflow: visible;
}

    .back-seat-wrap {
      width: 100%;
      min-width: 0;
      display: flex;
      align-items: stretch;
      margin: 0;
      padding: 0;
    }

    /* =========================
       SEAT BOX
    ========================= */
    .seat-box {
      width: 100%;
      height: 26.5mm;
      min-height: 26.5mm;
      border: 1.2px solid #222;
      padding: 0.8mm 1mm 0.55mm;
      background: #fff;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .back-row .seat-box {
      height: 28mm;
      min-height: 28mm;
      padding: 0.8mm 1mm 0.55mm;
      border: 1.2px solid #222;
      margin: 0;
    }

    .seat-box.blocked {
      background: #fff7ed;
      border-color: #ea580c;
    }

    /* =========================
       HEADER: LEFT seat no / RIGHT badge
    ========================= */
    .seat-title {
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 0.45mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1mm;
      white-space: nowrap;
    }

    .back-row .seat-title {
      font-size: 16px;
      margin-bottom: 0.5mm;
    }

    .seat-no {
      display: inline-block;
      flex: 0 0 auto;
      white-space: nowrap;
    }

    .seat-title-right {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.6mm;
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
    }

    .blocked-tag {
      font-size: 7px;
      border: 1px solid #ea580c;
      color: #ea580c;
      padding: 0 2px;
      border-radius: 0;
      line-height: 1;
      flex-shrink: 0;
    }

    .ticket-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      border: none;
      color: #0f172a;
      background: transparent;
      padding: 0.25mm 0.9mm;
      border-radius: 0;
      line-height: 1;
      height: 3.4mm;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-shrink: 1;
    }

    /* =========================
       LABEL / VALUE
       Name:- Paras
    ========================= */
    .line-row {
      display: flex;
      align-items: center;
      gap: 0.8mm;
      margin: 0.12mm 0;
      min-height: 2.2mm;
      overflow: hidden;
    }

    .back-row .line-row {
      min-height: 2.35mm;
      margin: 0.12mm 0;
    }

    .label {
      flex: 0 0 auto;
      font-size: 17px;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }

    .value {
      flex: 1 1 auto;
      min-width: 0;
      display: inline-block;
      min-height: 2.1mm;
      padding: 0 0 0.06mm 0;
      font-size: 17px;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-bottom: none;
    }

    .back-row .label {
      font-size: 17px;
    }

    .back-row .value {
      font-size: 17px;
      min-height: 2.15mm;
      border-bottom: none;
    }

    .value-no-border {
      border-bottom: none;
    }

    .marathi-text {
      font-family: "Noto Sans Devanagari", "Noto Serif Devanagari", "Mangal", "Nirmala UI", "Kohinoor Devanagari", system-ui, sans-serif;
    }

    @media print {
      html, body {
        width: auto;
        height: auto;
        overflow: hidden;
      }

      .toolbar {
        display: none !important;
      }

      .sheet {
        border: none;
        margin: 0 auto;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button class="primary" onclick="downloadHtmlFile()">Download HTML</button>
  </div>

  <div class="sheet">
    <div class="top-line">
      <div class="left">Date:- ${safeHtml(formatDisplayDate(date) || "")}</div>
      <div class="center">||श्री||</div>
      <div class="right">Time:- ${safeHtml(formatTime(selectedBus?.startTime || "04:00"))}</div>
    </div>

    <div class="title-line">
      <div class="bus-number">${safeHtml(selectedBus?.busNumber || "MH06BW9252")}</div>
      <div class="company">SA TRAVEL'S</div>
      <div class="route">Route:- ${safeHtml(selectedBus?.routeName || "")}</div>
    </div>

    <div class="divider"></div>

    <div class="main-layout">
      <div class="left-column">
        ${leftColumnHtml}
      </div>

      <div class="center-gap"></div>

      <div class="right-column">
        ${rightColumnHtml}
      </div>
    </div>

    <div class="back-row">
      ${backRowHtml}
    </div>
  </div>

  <script>
    function downloadHtmlFile() {
      const html = document.documentElement.outerHTML;
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seat-template-${safeHtml(selectedBus?.busNumber || "bus")}-${safeHtml(date || "date")}.html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>
  `;
  };

  const renderSeatCardTemplate31 = ({
    seatNo,
    seatMap,
    isWindowSeat = false,
  }) => {
    const data = seatMap[String(seatNo)] || {};
    const pickupDisplay = data.pickup ? getStopNameMarathi(data.pickup) : "";
    const dropDisplay = data.drop ? getStopNameMarathi(data.drop) : "";
    const isBlocked = data?.status === "blocked";
    const title = `${seatNo}${isWindowSeat ? "W" : ""}`;

    return `
    <div class="seat-box ${isBlocked ? "blocked" : ""}">
      <div class="seat-title">
        <span class="seat-no">${safeHtml(title)}</span>
        <span class="seat-title-right">
          ${isBlocked ? `<span class="blocked-tag">BLOCKED</span>` : ""}
          ${data.ticket
        ? `<span class="ticket-tag">${safeHtml(String(data.ticket))}</span>`
        : ""
      }
        </span>
      </div>

      <div class="line-row">
        <span class="label">Name :</span>
        <span class="value">${safeHtml(data.name || "")}</span>
      </div>

      <div class="line-row">
        <span class="label">Phone :</span>
        <span class="value">${safeHtml(data.phone || data.mobile || "")}</span>
      </div>

      <div class="line-row">
        <span class="label">Pickup :</span>
        <span class="value value-no-border marathi-text">${safeHtml(pickupDisplay)}</span>
      </div>

      <div class="line-row">
        <span class="label">Drop :</span>
        <span class="value value-no-border marathi-text">${safeHtml(dropDisplay)}</span>
      </div>
    </div>
  `;
  };

  const buildSeatTemplateHtml31 = () => {
    if (!selectedBus) {
      showAppToast("error", "Please open a bus first");
      return "";
    }

    const seatMap = getSeatMapForTemplate();

    const leftSeats = [3, 6, 9, 12, 15, 18, 21, 24];
    const rightRows = [
      [1, 2],
      [4, 5],
      [7, 8],
      [10, 11],
      [13, 14],
      [16, 17],
      [19, 20],
      [22, 23],
      [25, 26],
    ];
    const backRow = [27, 28, 29, 30, 31];

    const topOffsetRows = 1;

    const windowSeatSet = new Set([
      2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24, 26, 27, 31,
    ]);

    const leftVisibleCount = topOffsetRows + leftSeats.length;
    const rightVisibleCount = rightRows.length;
    const leftBottomSpacerCount = Math.max(0, rightVisibleCount - leftVisibleCount);

    const leftColumnHtml = `
    ${Array.from({ length: topOffsetRows })
        .map(() => `<div class="left-seat-wrap left-empty"></div>`)
        .join("")}
    ${leftSeats
        .map(
          (seat) => `
        <div class="left-seat-wrap">
          ${renderSeatCardTemplate31({
            seatNo: seat,
            seatMap,
            isWindowSeat: windowSeatSet.has(seat),
          })}
        </div>
      `
        )
        .join("")}
    ${Array.from({ length: leftBottomSpacerCount })
        .map(() => `<div class="left-seat-wrap left-empty"></div>`)
        .join("")}
  `;

    const rightColumnHtml = rightRows
      .map(
        (row) => `
      <div class="right-row right-count-${row.length}">
        ${row
            .map(
              (seat) => `
          <div class="right-seat-wrap">
            ${renderSeatCardTemplate31({
                seatNo: seat,
                seatMap,
                isWindowSeat: windowSeatSet.has(seat),
              })}
          </div>
        `
            )
            .join("")}
      </div>
    `
      )
      .join("");

    const backRowHtml = backRow
      .map(
        (seat) => `
      <div class="back-seat-wrap">
        ${renderSeatCardTemplate31({
          seatNo: seat,
          seatMap,
          isWindowSeat: windowSeatSet.has(seat),
        })}
      </div>
    `
      )
      .join("");

    return buildTemplateShell31({
      selectedBus,
      date,
      leftColumnHtml,
      rightColumnHtml,
      backRowHtml,
    });
  };


  /* =========================================================
     FINAL TEMPLATE SELECTOR
  ========================================================= */
  const buildSeatTemplateHtml = () => {
    if (!selectedBus) {
      showAppToast("error", "Please open a bus first");
      return "";
    }

    const totalSeats = Number(
      selectedBus?.seatLayout || selectedBus?.seatCount || 0
    );

    if (totalSeats === 15) return buildSeatTemplateHtml15();
    if (totalSeats === 23) return buildSeatTemplateHtml23();
    if (totalSeats === 27) return buildSeatTemplateHtml27();
    if (totalSeats === 31) return buildSeatTemplateHtml31();

    return buildSeatTemplateHtml27();
  };

  /* =========================================================
     PREVIEW / PRINT
  ========================================================= */
  const handlePrintSeatTemplate = () => {
    const html = buildSeatTemplateHtml();
    if (!html) return;

    const previewWindow = window.open("", "_blank", "width=1400,height=1000");
    if (!previewWindow) {
      showAppToast("error", "Popup blocked. Please allow popups.");
      return;
    }

    previewWindow.document.open();
    previewWindow.document.write(html);
    previewWindow.document.close();

    return previewWindow;
  };

  /* =========================================================
     DOWNLOAD TEMPLATE AS PDF (PRINT -> SAVE AS PDF)
  ========================================================= */
  const handleDownloadSeatTemplate = () => {
    const html = buildSeatTemplateHtml();
    if (!html) return;

    const previewWindow = window.open("", "_blank", "width=1400,height=1000");
    if (!previewWindow) {
      showAppToast("error", "Popup blocked. Please allow popups.");
      return;
    }

    previewWindow.document.open();
    previewWindow.document.write(html);
    previewWindow.document.close();

    previewWindow.onload = () => {
      setTimeout(() => {
        previewWindow.focus();
        previewWindow.print();

        const totalSeats = Number(
          selectedBus?.seatLayout || selectedBus?.seatCount || 0
        );

        showAppToast(
          "success",
          `${totalSeats || "Seat"} template opened. Choose "Save as PDF" in print dialog.`
        );
      }, 500);
    };
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
            SA TOURS BOOKING
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Select Bus & View Seats</h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose a date to see available buses, then open the seat layout.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-[#f97316]" />
          <span className="text-sm font-semibold text-slate-700">Live Availability View</span>
        </div>
      </div>

      {/* Top Controls */}
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
          <label className="mb-3 block text-sm font-semibold text-slate-700">Select Travel Date</label>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <CalendarDays className="h-5 w-5 text-[#f97316]" />
            <input
              type="date"
              className="w-full bg-transparent text-slate-900 outline-none"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedBus(null);
                resetBookingForm();
              }}
            />
          </div>
        </div>
      </div>

      {/* Bus List */}
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Available Buses</h2>
          <p className="mt-1 text-sm text-slate-500">
            {date
              ? `Showing ${availableBuses.length} available bus(es) for ${date}`
              : "Select a date to view available buses"}
          </p>
        </div>

        <div className="p-4 md:p-5">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">Loading buses and schedules...</p>
            </div>
          ) : !date ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">Please select a date first</p>
            </div>
          ) : availableBuses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">No buses available for this date</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {availableBuses.map((bus) => {
                const totalSeats =
                  (Number(bus.seatLayout) || Number(bus.seatCount) || 0) +
                  (Array.isArray(bus.cabins) ? bus.cabins.length : 0);

                const booked = bookedCounts[bus.busId]?.booked ?? 0;
                const blocked = bookedCounts[bus.busId]?.blocked ?? 0;
                const cabins = Array.isArray(bus.cabins) ? bus.cabins.length : 0;
                const available = Math.max(totalSeats - booked - blocked, 0);

                return (
                  <div
                    key={bus.busId}
                    className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-orange-200 hover:shadow-md md:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          {/* Bus Icon */}
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 sm:h-14 sm:w-14">
                            <BusFront className="h-6 w-6 text-[#f97316] sm:h-7 sm:w-7" />
                          </div>

                          {/* Right Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                              {/* Bus Info */}
                              <div className="min-w-0 flex-1">
                                <h3 className="break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                                  {bus.busNumber}
                                </h3>

                                <p className="mt-1 text-sm text-slate-500 sm:text-base break-words">
                                  {bus.busName} • {bus.busType}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[#f97316] sm:text-sm">
                                    {String(bus.seatLayout || "")} Seats
                                  </span>

                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 sm:text-sm">
                                    {bus.busType}
                                  </span>
                                </div>
                              </div>

                              {/* View Seats Button */}
                              <div className="w-full lg:w-auto">
                                <button
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-[#ea580c] sm:px-5 lg:w-auto"
                                  onClick={() => openBusModal(bus)}
                                >
                                  <Eye className="h-4 w-4" />
                                  View Seats
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                          <MiniStat label="Total" value={totalSeats} bg="bg-orange-50" text="text-orange-600" />
                          <MiniStat label="Booked" value={booked} bg="bg-slate-100" text="text-slate-700" />
                          <MiniStat label="Blocked" value={blocked} bg="bg-amber-50" text="text-amber-700" />
                          <MiniStat label="Cabins" value={cabins} bg="bg-indigo-50" text="text-indigo-700" />
                          <MiniStat
                            label="Available"
                            value={available}
                            bg="bg-green-50"
                            text="text-green-700"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <CompactInfoCard
                        icon={<Route className="h-4 w-4 text-[#f97316]" />}
                        label="Route"
                        value={bus.routeName || "--"}
                      />
                      <CompactInfoCard
                        icon={<MapPin className="h-4 w-4 text-[#f97316]" />}
                        label="Path"
                        value={`${resolvePointValue(bus.startPoint, "--")} → ${resolvePointValue(
                          bus.endPoint,
                          "--"
                        )}`}
                      />
                      <CompactInfoCard
                        icon={<Clock3 className="h-4 w-4 text-[#f97316]" />}
                        label="Timing"
                        value={`${bus.startTime || "--:--"} → ${bus.endTime || "--:--"}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Seat Layout Modal */}
      {selectedBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 rounded-t-3xl border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="relative pr-12">
                {/* Close Button - Fixed Top Right */}
                <button
                  onClick={closeBusModal}
                  className="absolute right-0 top-0 rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>

                {/* Header Content */}
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] sm:tracking-[0.25em] text-[#f97316]">
                  SEAT LAYOUT VIEW
                </p>

                <h2 className="mt-2 text-xl sm:text-2xl font-bold leading-tight text-slate-900">
                  <span className="block sm:inline">{selectedBus.busNumber}</span>
                  <span className="hidden sm:inline"> — </span>
                  <span className="block sm:inline break-words">{selectedBus.routeName}</span>
                </h2>

                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-500 break-words">
                  {`${resolvePointValue(selectedBus.startPoint, "--")} → ${resolvePointValue(
                    selectedBus.endPoint,
                    "--"
                  )} • ${selectedBus.startTime || "--:--"} → ${selectedBus.endTime || "--:--"}`}
                </p>
              </div>

              {/* Buttons */}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                <button
                  onClick={handlePrintSeatTemplate}
                  className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Print Template
                </button>

                <button
                  onClick={handleDownloadSeatTemplate}
                  className="w-full sm:w-auto rounded-2xl bg-[#f97316] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ea580c]"
                >
                  Download PDF
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
                <SummaryCard
                  title="Bus Number"
                  value={selectedBus.busNumber || "--"}
                  icon={<BusFront className="h-6 w-6 text-[#f97316]" />}
                />
                <SummaryCard
                  title="Seat Layout"
                  value={`${selectedBus.seatLayout || "--"} Seats`}
                  icon={<Route className="h-6 w-6 text-[#f97316]" />}
                />
                <SummaryCard
                  title="Date"
                  value={date || "--"}
                  icon={<CalendarDays className="h-6 w-6 text-[#f97316]" />}
                />
                <SummaryCard
                  title="Time"
                  value={`${selectedBus.startTime || "--:--"} → ${selectedBus.endTime || "--:--"}`}
                  icon={<Clock3 className="h-6 w-6 text-[#f97316]" />}
                />
              </div>

              <div className="rounded-3xl border border-orange-100 bg-orange-50/30 p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Bus Seat Layout</h3>
                  <p className="text-sm text-slate-500">
                    View the complete seat structure for the selected bus.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <SeatLayout
                    layout={String(selectedBus.seatLayout || "31")}
                    cabins={selectedBus.cabins || []}
                    bookedSeats={Object.keys(bookings || {}).map((k) => k)}
                    bookedMap={bookings}
                    onViewBooking={(seat, booking) => setViewBooking({ seat, booking })}
                    selectedSeats={selectedSeats}
                    onSelect={(s) => {
                      setEditingSeat(null);
                      setBookingForm({
                        name: "",
                        phone: "",
                        email: "",
                        pickup: "",
                        pickupTime: "",
                        drop: "",
                        dropTime: "",
                        fareOverride: "",
                      });

                      setSelectedSeats((prev) => {
                        const id = String(s);
                        if (prev.includes(id)) return prev.filter((x) => x !== id);
                        return [...prev, id];
                      });
                    }}
                  />

                  {user && (user.role === "admin" || user.role === "owner") && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          const seats = editingSeat ? [editingSeat] : selectedSeats;
                          if (!seats.length) {
                            return showAppToast("error", "Select seats to block");
                          }
                          setBlockDetails({
                            name: "",
                            phone: "",
                            email: "",
                            pickup: "",
                            drop: "",
                            note: "",
                          });
                          setBlockModalOpen(true);
                        }}
                        className="rounded-xl bg-yellow-500 px-3 py-2 text-sm text-white"
                      >
                        Block Selected Seats
                      </button>

                      <button
                        onClick={handleUnblockSeats}
                        className="rounded-xl border px-3 py-2 text-sm"
                      >
                        Unblock Selected Seats
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Booking Form */}
                  <div className="md:col-span-2 rounded-2xl border p-4">
                    <h4 className="mb-2 font-semibold">Passenger Details</h4>

                    <div className="space-y-3">
                      <input
                        placeholder="Name"
                        value={bookingForm.name ?? ""}
                        onChange={(e) =>
                          setBookingForm((p) => ({ ...p, name: sanitizeNameInput(e.target.value) }))
                        }
                        className="w-full rounded-lg border px-3 py-2"
                        disabled={!editingSeat && selectedSeats.length === 0}
                      />

                      <input
                        placeholder="Phone number"
                        value={bookingForm.phone ?? ""}
                        onChange={(e) =>
                          setBookingForm((p) => ({ ...p, phone: sanitizePhoneInput(e.target.value) }))
                        }
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        className="w-full rounded-lg border px-3 py-2"
                        disabled={!editingSeat && selectedSeats.length === 0}
                      />

                      <input
                        placeholder="Email"
                        value={bookingForm.email ?? ""}
                        onChange={(e) =>
                          setBookingForm((p) => ({ ...p, email: sanitizeEmailInput(e.target.value) }))
                        }
                        type="email"
                        className="w-full rounded-lg border px-3 py-2"
                        disabled={!editingSeat && selectedSeats.length === 0}
                      />

                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {/* Pickup */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">
                            Pickup Stop
                          </label>

                          <div className="space-y-2">
                            <div
                              ref={pickupDropdownRef}
                              className="relative"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editingSeat && selectedSeats.length === 0) return;
                                  setPickupDropdownOpen((open) => !open);
                                }}
                                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 hover:border-orange-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                                disabled={!editingSeat && selectedSeats.length === 0}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <MapPin className="h-4 w-4 text-[#f97316] shrink-0" />
                                  <span className="truncate">
                                    {bookingForm.pickup
                                      ? getStopDisplayName(bookingForm.pickup)
                                      : "Select pickup"}
                                  </span>
                                </span>
                                <span className="ml-2 text-xs text-slate-400">▼</span>
                              </button>

                              {pickupDropdownOpen && !(!editingSeat && selectedSeats.length === 0) && (
                                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl">
                                  <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
                                    <MapPin className="h-4 w-4 text-[#f97316]" />
                                    <input
                                      type="text"
                                      placeholder="Search pickup (English/Marathi)"
                                      value={pickupSearch}
                                      onChange={(e) => setPickupSearch(e.target.value)}
                                      className="w-full bg-transparent text-xs sm:text-sm text-slate-900 outline-none placeholder:text-slate-400"
                                      autoFocus
                                    />
                                  </div>

                                  <div className="max-h-56 overflow-y-auto py-1">
                                    {filteredPickupOptions.length === 0 ? (
                                      <div className="px-3 py-2 text-xs text-slate-400">
                                        No stops found
                                      </div>
                                    ) : (
                                      filteredPickupOptions.map((stop, i) => {
                                        const label = getStopDisplayName(stop);
                                        return (
                                          <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                              const time = getStopTime(selectedBus, stop);

                                              setBookingForm((p) => ({
                                                ...p,
                                                pickup: stop,
                                                pickupTime: time,
                                                drop: "",
                                                dropTime: "",
                                              }));

                                              setPickupDropdownOpen(false);
                                              setPickupSearch("");
                                              setDropSearch("");
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs sm:text-sm text-slate-800 hover:bg-orange-50"
                                          >
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-50 text-[10px] font-semibold text-[#f97316]">
                                              {i + 1}
                                            </span>
                                            <span className="truncate">{label}</span>
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <input
                            type="time"
                            value={bookingForm.pickupTime ?? ""}
                            onChange={(e) =>
                              setBookingForm((p) => ({
                                ...p,
                                pickupTime: e.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                            disabled={!editingSeat && selectedSeats.length === 0}
                          />
                        </div>

                        {/* Drop */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">
                            Drop Stop
                          </label>

                          <div className="space-y-2">
                            <div
                              ref={dropDropdownRef}
                              className="relative"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if ((!editingSeat && selectedSeats.length === 0) || !bookingForm.pickup) return;
                                  setDropDropdownOpen((open) => !open);
                                }}
                                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 hover:border-orange-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                                disabled={(!editingSeat && selectedSeats.length === 0) || !bookingForm.pickup}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <MapPin className="h-4 w-4 text-[#f97316] shrink-0" />
                                  <span className="truncate">
                                    {bookingForm.drop
                                      ? getStopDisplayName(bookingForm.drop)
                                      : "Select drop"}
                                  </span>
                                </span>
                                <span className="ml-2 text-xs text-slate-400">▼</span>
                              </button>

                              {dropDropdownOpen && !((!editingSeat && selectedSeats.length === 0) || !bookingForm.pickup) && (
                                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl">
                                  <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
                                    <MapPin className="h-4 w-4 text-[#f97316]" />
                                    <input
                                      type="text"
                                      placeholder="Search drop (English/Marathi)"
                                      value={dropSearch}
                                      onChange={(e) => setDropSearch(e.target.value)}
                                      className="w-full bg-transparent text-xs sm:text-sm text-slate-900 outline-none placeholder:text-slate-400"
                                      autoFocus
                                    />
                                  </div>

                                  <div className="max-h-56 overflow-y-auto py-1">
                                    {filteredDropOptions.length === 0 ? (
                                      <div className="px-3 py-2 text-xs text-slate-400">
                                        No stops found
                                      </div>
                                    ) : (
                                      filteredDropOptions.map((stop, i) => {
                                        const label = getStopDisplayName(stop);
                                        const fare = calculateFare(selectedBus, bookingForm.pickup, stop, date);

                                        return (
                                          <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                              const time = getStopTime(selectedBus, stop);

                                              setBookingForm((p) => ({
                                                ...p,
                                                drop: stop,
                                                dropTime: time,
                                              }));

                                              setDropDropdownOpen(false);
                                            }}
                                            className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs sm:text-sm text-slate-800 hover:bg-orange-50"
                                          >
                                            <span className="flex items-center gap-2 min-w-0">
                                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-50 text-[10px] font-semibold text-[#f97316]">
                                                {i + 1}
                                              </span>
                                              <span className="truncate">{label}</span>
                                            </span>
                                            <span className="shrink-0 text-[11px] font-medium text-slate-500">
                                              {fare !== null ? `₹${fare}` : "Fare N/A"}
                                            </span>
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <input
                            type="time"
                            value={bookingForm.dropTime ?? ""}
                            onChange={(e) =>
                              setBookingForm((p) => ({
                                ...p,
                                dropTime: e.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                            disabled={!editingSeat && selectedSeats.length === 0}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-sm text-slate-500">Selected Seat(s):</div>
                        <div className="font-semibold">
                          {(editingSeat ? [editingSeat] : selectedSeats).length
                            ? editingSeat
                              ? editingSeat
                              : selectedSeats.join(", ")
                            : "—"}
                        </div>
                      </div>

                      {(editingSeat ? 1 : selectedSeats.length) > 0 && (
                        <div className="mt-2 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
                          {computedFare !== null || bookingForm.fareOverride ? (
                            (() => {
                              const perSeat =
                                bookingForm.fareOverride &&
                                  String(bookingForm.fareOverride).trim() !== ""
                                  ? Number(bookingForm.fareOverride)
                                  : Number(computedFare);

                              const seatsCount = editingSeat ? 1 : selectedSeats.length;
                              const total = Number(perSeat) * seatsCount;

                              return (
                                <div className="flex flex-wrap items-center gap-6">
                                  <div className="text-sm text-slate-600">
                                    Fare per seat:{" "}
                                    <span className="font-semibold">
                                      {perSeat && !Number.isNaN(perSeat)
                                        ? `₹${perSeat.toFixed(2)}`
                                        : "—"}
                                    </span>
                                  </div>

                                  <div className="text-sm text-slate-700">
                                    Total:{" "}
                                    <span className="text-lg font-bold">
                                      {!Number.isNaN(total) ? `₹${total.toFixed(2)}` : "—"}
                                    </span>
                                  </div>

                                  <div className="ml-2">
                                    <label className="block text-xs text-slate-500">Override fare</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={bookingForm.fareOverride ?? ""}
                                      onChange={(e) =>
                                        setBookingForm((p) => ({
                                          ...p,
                                          fareOverride: e.target.value,
                                        }))
                                      }
                                      className="mt-1 w-40 rounded-lg border px-3 py-2 text-sm"
                                    />
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-sm font-medium text-red-600">
                              Fare not available for selected pickup & drop
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {editingSeat ? (
                          <>
                            <button
                              onClick={handleCreateOrUpdateBooking}
                              className="rounded-xl bg-[#059669] px-4 py-2 text-white"
                            >
                              Update Booking
                            </button>

                            {user && (user.role === "admin" || user.role === "owner") ? (
                              <button
                                onClick={() => handleCancelSeat(editingSeat)}
                                disabled={confirmOpen}
                                className="rounded-xl border border-red-200 px-4 py-2 text-red-600"
                              >
                                Cancel Booking
                              </button>
                            ) : (
                              <button
                                disabled
                                title="Cancel booking: admin only"
                                className="rounded-xl border border-red-200 px-4 py-2 text-red-300 bg-red-50 cursor-not-allowed"
                              >
                                Cancel Booking (admin only)
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={handleOnlineBooking}
                              className="rounded-xl bg-[#0ea5a4] px-4 py-2 text-white"
                            >
                              Online Booking
                            </button>

                            <button
                              onClick={handleOfflineBooking}
                              className="rounded-xl border px-4 py-2 text-sm"
                            >
                              Offline Booking (Cash)
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Existing Bookings */}
                  <div className="rounded-2xl border p-4">
                    <h4 className="mb-2 font-semibold">Existing Bookings</h4>

                    <div className="space-y-2">
                      {visibleBookings.length === 0 ? (
                        <div className="text-sm text-slate-500">No bookings for this bus/date.</div>
                      ) : (
                        visibleBookings.map(([seat, b]) => (
                          <div
                            key={seat}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-lg font-bold text-slate-900">
                                  <span>Seat {seat}</span>
                                  {b.status === "blocked" ? (
                                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                                      BLOCKED
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                      BOOKED
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1 text-sm text-slate-700">
                                  {b.name || "—"} <span className="mx-2 text-slate-400">•</span>{" "}
                                  {b.phone || "—"}
                                </div>

                                {b.email ? (
                                  <div className="mt-1 text-sm text-slate-500">{b.email}</div>
                                ) : null}

                                <div className="mt-2 text-sm text-slate-400">
                                  {b.pickup ? getStopDisplayName(b.pickup) : "-"}
                                  {b.pickupTime ? ` (${b.pickupTime})` : ""} → {b.drop ? getStopDisplayName(b.drop) : "-"}
                                  {b.dropTime ? ` (${b.dropTime})` : ""}
                                </div>

                                {b.status === "blocked" && b.note ? (
                                  <div className="mt-1 text-xs text-orange-600">Note: {b.note}</div>
                                ) : null}

                                {b.fare !== undefined && b.fare !== null ? (
                                  <div className="mt-1 text-sm font-medium text-slate-700">
                                    Fare: ₹{Number(b.fare).toFixed(2)}
                                  </div>
                                ) : null}

                                {b.paymentMethod ? (
                                  <div className="mt-1 text-xs text-slate-500">
                                    Payment: {b.paymentMethod}
                                  </div>
                                ) : null}
                              </div>

                              <div className="flex flex-col items-end gap-3">
                                <button
                                  onClick={() => {
                                    setSelectedSeats([seat]);
                                    setEditingSeat(seat);
                                    setBookingForm({
                                      name: b.name || "",
                                      phone: b.phone || "",
                                      email: b.email || "",
                                      pickup: b.pickup || "",
                                      pickupTime: b.pickupTime || "",
                                      drop: b.drop || "",
                                      dropTime: b.dropTime || "",
                                      fareOverride:
                                        b.fare !== undefined && b.fare !== null ? String(b.fare) : "",
                                    });

                                    const fare = calculateFare(
                                      selectedBus,
                                      b.pickup || "",
                                      b.drop || "",
                                      date
                                    );
                                    setComputedFare(fare);
                                  }}
                                  className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                                >
                                  Edit
                                </button>

                                {user && (user.role === "admin" || user.role === "owner") ? (
                                  <button
                                    onClick={() => handleCancelSeat(seat)}
                                    disabled={confirmOpen}
                                    className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600"
                                  >
                                    Cancel
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    title="Cancel booking: admin only"
                                    className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-300 bg-red-50 cursor-not-allowed"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmOpen && (
        <ConfirmModal
          message={confirmMessage}
          loading={confirmLoading}
          onCancel={() => {
            if (confirmLoading) return;
            setConfirmOpen(false);
          }}
          onConfirm={async () => {
            if (confirmLoading) return;
            setConfirmLoading(true);
            try {
              await confirmAction();
            } catch {
              // already handled
            } finally {
              setConfirmLoading(false);
              setConfirmOpen(false);
            }
          }}
        />
      )}

      {/* Block Seats Modal */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
              <h3 className="mb-3 text-lg font-bold">Block Seat(s) — Add details</h3>

              <div className="space-y-3">
                <input
                  placeholder="Name / नाव"
                  value={blockDetails.name}
                  onChange={(e) =>
                    setBlockDetails((p) => ({ ...p, name: sanitizeNameInput(e.target.value) }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />

                <input
                  placeholder="Phone / फोन"
                  value={blockDetails.phone}
                  onChange={(e) =>
                    setBlockDetails((p) => ({ ...p, phone: sanitizePhoneInput(e.target.value) }))
                  }
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  className="w-full rounded-lg border px-3 py-2"
                />

                <input
                  placeholder="Email / ई-मेल आयडी"
                  value={blockDetails.email}
                  onChange={(e) =>
                    setBlockDetails((p) => ({ ...p, email: sanitizeEmailInput(e.target.value) }))
                  }
                  type="email"
                  className="w-full rounded-lg border px-3 py-2"
                />

                <input
                  placeholder="Pickup Stop"
                  value={blockDetails.pickup}
                  onChange={(e) => setBlockDetails((p) => ({ ...p, pickup: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                />

                <input
                  placeholder="Drop Stop"
                  value={blockDetails.drop}
                  onChange={(e) => setBlockDetails((p) => ({ ...p, drop: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                />

                <textarea
                  placeholder="Note (optional)"
                  value={blockDetails.note}
                  onChange={(e) => setBlockDetails((p) => ({ ...p, note: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setBlockModalOpen(false)}
                  className="rounded-2xl border px-4 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={handleBlockSeats}
                  className="rounded-2xl bg-yellow-500 px-4 py-2 text-sm text-white"
                >
                  Confirm Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Booking Modal */}
      {viewBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg font-bold text-slate-900">Seat {viewBooking.seat}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-700">
                    {viewBooking.booking?.name || "—"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {viewBooking.booking?.phone || "—"}
                    {viewBooking.booking?.email ? (
                      <>
                        <span className="mx-2 text-slate-300">•</span>
                        {viewBooking.booking?.email}
                      </>
                    ) : null}
                  </div>
                  <div className="mt-2 text-sm text-slate-700">Ticket: <span className="font-semibold">{viewBooking.booking?.ticket || "—"}</span></div>

                  {viewBooking.booking?.status === "blocked" ? (
                    <div className="mt-2 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                      BLOCKED SEAT
                    </div>
                  ) : (
                    <div className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      BOOKED SEAT
                    </div>
                  )}

                  <div className="mt-3 text-sm text-slate-400">
                    {viewBooking.booking?.pickup
                      ? getStopDisplayName(viewBooking.booking?.pickup)
                      : "-"}
                    {viewBooking.booking?.pickupTime ? ` (${viewBooking.booking?.pickupTime})` : ""} →{" "}
                    {viewBooking.booking?.drop
                      ? getStopDisplayName(viewBooking.booking?.drop)
                      : "-"}
                    {viewBooking.booking?.dropTime ? ` (${viewBooking.booking?.dropTime})` : ""}
                  </div>

                  {viewBooking.booking?.status === "blocked" && viewBooking.booking?.note ? (
                    <div className="mt-2 text-sm text-orange-600">Note: {viewBooking.booking?.note}</div>
                  ) : null}

                  {viewBooking.booking?.fare !== undefined && viewBooking.booking?.fare !== null ? (
                    <div className="mt-2 text-sm font-medium text-slate-700">
                      Fare: ₹{Number(viewBooking.booking.fare).toFixed(2)}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <button
                    onClick={() => setViewBooking(null)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                  >
                    Close
                  </button>

                  {viewBooking.booking?.status === "blocked" &&
                    user &&
                    (user.role === "admin" || user.role === "owner") && (
                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem("authToken");
                            if (!token) {
                              return showAppToast("error", "Unauthorized — please login as admin");
                            }

                            const seat = String(viewBooking.seat);

                            const res = await fetch("/api/admin/block-seats", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                busId: selectedBus.busId,
                                date,
                                seats: [seat],
                                action: "unblock",
                              }),
                            });

                            const data = await res.json();

                            if (!res.ok) {
                              throw new Error(data.error || "Unblock failed");
                            }

                            showAppToast("success", `Seat ${seat} unblocked`);
                            setViewBooking(null);
                            await fetchBookings();
                          } catch (err) {
                            console.error(err);
                            showAppToast("error", err.message || "Unblock failed");
                          }
                        }}
                        className="rounded-full bg-yellow-500 px-4 py-2 text-sm text-white"
                      >
                        Unblock Seat
                      </button>
                    )}

                  <button
                    onClick={() => {
                      const s = String(viewBooking.seat);
                      const b = viewBooking.booking || {};

                      setSelectedSeats([s]);
                      setEditingSeat(s);
                      setBookingForm({
                        name: b.name || "",
                        phone: b.phone || "",
                        email: b.email || "",
                        pickup: b.pickup || "",
                        pickupTime: b.pickupTime || "",
                        drop: b.drop || "",
                        dropTime: b.dropTime || "",
                        fareOverride: b.fare !== undefined && b.fare !== null ? String(b.fare) : "",
                      });

                      const fare = calculateFare(selectedBus, b.pickup || "", b.drop || "", date);
                      setComputedFare(fare);

                      setViewBooking(null);
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                  >
                    Edit
                  </button>

                  {user && (user.role === "admin" || user.role === "owner") ? (
                    <button
                      onClick={() => {
                        const s = String(viewBooking.seat);
                        setViewBooking(null);
                        handleCancelSeat(s);
                      }}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600"
                      disabled={confirmOpen}
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      disabled
                      title="Cancel booking: admin only"
                      className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-300 bg-red-50 cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
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
          <h3 className="break-words text-lg font-bold text-slate-900">{value}</h3>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onCancel, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">Confirm action</h3>
        <p className="mt-3 text-sm text-slate-600">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            ) : null}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, bg, text }) {
  return (
    <div className={`rounded-2xl px-3 py-3 ${bg}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${text}`}>{value}</p>
    </div>
  );
}

function CompactInfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2">
        {icon}
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      </div>
      <p className="text-base font-semibold text-slate-900 md:text-lg">{value}</p>
    </div>
  );
}