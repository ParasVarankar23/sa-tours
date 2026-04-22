"use client";

import SeatLayout from "@/components/SeatLayout";
import { useAutoRefresh } from "@/context/AutoRefreshContext";
import { useAuth } from "@/hooks/useAuth";
import { showAppToast } from "@/lib/client/toast";
import {
  BUS_TYPES,
  getFare,
  getStopDisplayName,
  getStopNameMarathi,
  isBorliVillageStop,
  isCityStop,
  isDighiVillageStop,
  normalizeStopName,
  ROUTES
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

// Helper: convert a time string like "4:15 PM" or "22:30" to minutes since midnight
// for stable chronological sorting. If the time cannot be parsed, place it at the end.
function getTimeSortValueFromString(t) {
  const normalized = normalizeTimeForInput(t);
  if (!normalized) return Number.MAX_SAFE_INTEGER;
  const [hhStr, mmStr] = normalized.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return Number.MAX_SAFE_INTEGER;
  return hh * 60 + mm;
}

// Helper: given a bus and stop name, return a numeric value used for sorting
// stops by their scheduled time.
function getStopTimeSortValue(bus, stopName) {
  if (!bus || !stopName) return Number.MAX_SAFE_INTEGER;
  const timeStr = getStopTime(bus, stopName);
  if (!timeStr) return Number.MAX_SAFE_INTEGER;
  return getTimeSortValueFromString(timeStr);
}

// Sort a list of stop names by their associated time for a specific bus.
// Stops without a valid time are kept at the end, and ties are broken
// alphabetically by stop name to keep the order stable.
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
    let hh = parseInt(m[1], 10);
    const mm = m[2];
    const ap = m[3].toLowerCase();
    if (ap === "pm" && hh !== 12) hh += 12;
    if (ap === "am" && hh === 12) hh = 0;
    return String(hh).padStart(2, "0") + ":" + mm;
  }
  const m2 = s.match(/^(\d{1,2}):(\d{2})(AM|PM|am|pm)$/);
  if (m2) {
    let hh = parseInt(m2[1], 10);
    const mm = m2[2];
    const ap = m2[3].toLowerCase();
    if (ap === "pm" && hh !== 12) hh += 12;
    if (ap === "am" && hh === 12) hh = 0;
    return String(hh).padStart(2, "0") + ":" + mm;
  }
  return "";
}

function calculateFare(bus, pickup, drop, dateStr) {
  if (!bus || !pickup || !drop) return null;

  let routeKey = null;
  // Debug: show what values we're receiving to help diagnose fare issues
  try {
    // eslint-disable-next-line no-console
    console.debug("calculateFare input:", { pickup, drop, busRouteName: bus?.routeName });
  } catch (e) { }
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

  // Debug: route detection state
  try {
    // eslint-disable-next-line no-console
    console.debug("calculateFare detection", {
      normalizedPickup: normalizeStopName(pickup),
      normalizedDrop: normalizeStopName(drop),
      isBorli: isBorliVillageStop(pickup),
      isDighi: isDighiVillageStop(pickup),
      isCity: isCityStop(drop),
      routeKey,
      baseAmount,
    });
  } catch (e) { }

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

export default function BookingPage() {
  // --- Input sanitizers / validators ---
  const sanitizeNameInput = (v) => {
    if (typeof v !== "string") return "";
    // Remove control characters and digits
    let s = String(v).replace(/\p{C}/gu, "").replace(/\d+/g, "");

    // Allow any Unicode letters (Latin, Devanagari, etc.), marks, spaces, apostrophes and hyphens
    s = s.replace(/[^\p{L}\p{M}\s'\-\.]/gu, "");
    // IMPORTANT: don't trim here — trimming on every keystroke prevents typing a
    // space between words (the trailing space is removed immediately). Trim only
    // on blur/submit so IME and normal typing can include spaces naturally.
    return s.slice(0, 100);
  };

  const sanitizePhoneInput = (v) => {
    if (typeof v !== "string") return "";

    // Normalize Devanagari digits (०-९) to ASCII digits
    const normalizeIndicDigits = (s) =>
      String(s || "").replace(/[\u0966-\u096F]/g, (ch) => String(ch.charCodeAt(0) - 0x0966));

    const normalized = normalizeIndicDigits(v);
    return normalized.replace(/\D+/g, "").slice(0, 10);
  };

  const sanitizeEmailInput = (v) => {
    if (typeof v !== "string") return "";
    return v.trim().slice(0, 254).toLowerCase();
  };

  const sanitizePhoneticInput = (v) => {
    if (typeof v !== "string") return "";
    // allow basic Latin letters, spaces, dots, apostrophes and hyphens
    return String(v).replace(/[^A-Za-z\s'\-\.]/g, "").slice(0, 100).trim();
  };

  // Accept names in Latin, Devanagari (Hindi/Marathi) and other scripts: require at least 2 letters
  const isValidName = (v) => /^[\p{L}\p{M}\s'\-\.]{2,}$/u.test(String(v || "").trim());
  const isValidPhone = (v) => {
    const normalizeIndicDigits = (s) =>
      String(s || "").replace(/[\u0966-\u096F]/g, (ch) => String(ch.charCodeAt(0) - 0x0966));

    const num = normalizeIndicDigits(String(v || "")).replace(/\D+/g, "");
    return /^\d{10}$/.test(num);
  };
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
    nameLocal: "",
    namePhonetic: "",
    phone: "",
    email: "",
    ticket: "",
    voucherCode: "",
    pickup: "",
    pickupTime: "",
    drop: "",
    dropTime: "",
    fareOverride: "",
  });
  const [pickupFilter, setPickupFilter] = useState("");
  const [dropFilter, setDropFilter] = useState("");
  const [bookingFilter, setBookingFilter] = useState("");
  const [voucherInfo, setVoucherInfo] = useState(null);
  const [editingSeat, setEditingSeat] = useState(null);
  const [ticketLookupLoading, setTicketLookupLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(() => async () => { });

  const [computedFare, setComputedFare] = useState(null);

  const [pickupOpen, setPickupOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);

  // Refs used to detect clicks outside of the custom dropdowns
  const pickupDropdownRef = useRef(null);
  const dropDropdownRef = useRef(null);

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockDetails, setBlockDetails] = useState({
    name: "",
    phone: "",
    email: "",
    pickup: "",
    drop: "",
    note: "",
  });

  const visibleBookings = useMemo(() => {
    return Object.entries(bookings || {}).filter(([, b]) => !!b);
  }, [bookings]);

  const [isPhoneComposing, setIsPhoneComposing] = useState(false);
  const [isNameComposing, setIsNameComposing] = useState(false);

  const { user } = useAuth();
  const router = useRouter();
  const { triggerRefresh, subscribeRefresh } = useAutoRefresh();

  // Close pickup/drop dropdowns when clicking anywhere outside them
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!pickupOpen && !dropOpen) return;

      const pickupEl = pickupDropdownRef.current;
      const dropEl = dropDropdownRef.current;

      const isInsidePickup = pickupEl && pickupEl.contains(event.target);
      const isInsideDrop = dropEl && dropEl.contains(event.target);

      if (!isInsidePickup && !isInsideDrop) {
        setPickupOpen(false);
        setDropOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [pickupOpen, dropOpen]);

  // Refresh buses, schedules and booked counts for overview cards
  const refreshOverview = useCallback(async () => {
    try {
      setLoading(true);

      const [bRes, sRes] = await Promise.all([fetch("/api/bus"), fetch("/api/schedule")]);
      const bData = await bRes.json();
      const sData = await sRes.json();

      if (!bRes.ok) throw new Error(bData.error || "Failed to load buses");
      if (!sRes.ok) throw new Error(sData.error || "Failed to load schedules");

      const newBuses = bData.buses || [];
      const newSchedules = sData.schedules || {};

      setBuses(newBuses);
      setSchedules(newSchedules);

      // compute available buses for selected date
      if (!date) {
        setBookedCounts({});
        return;
      }

      const available = newBuses.filter((bus) => {
        const busSched = newSchedules[bus.busId] || {};
        return busSched[date] && busSched[date].available;
      });

      if (!available || available.length === 0) {
        setBookedCounts({});
        return;
      }

      const calls = available.map((b) =>
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
    } catch (err) {
      console.error(err);
      // keep existing counts on error
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    // initial overview load
    (async () => {
      try {
        await refreshOverview();
      } catch (e) {
        // ignore
      }
    })();
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

  // Subscribe to cross-tab refresh events so bookings update automatically
  useEffect(() => {
    let unsub = null;
    try {
      if (typeof subscribeRefresh === "function") {
        unsub = subscribeRefresh(() => {
          try {
            // refresh bookings for selected bus
            fetchBookings();
            // refresh overview counts and bus/schedule data
            refreshOverview().catch(() => { });
          } catch (e) {
            // ignore
          }
        });
      }
    } catch (e) {
      unsub = null;
    }

    return () => {
      try {
        if (typeof unsub === "function") unsub();
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBus, date, subscribeRefresh]);

  // Polling fallback: while a bus/date is selected, poll every 5s to ensure UI stays fresh
  useEffect(() => {
    let id = null;

    if (selectedBus && date) {
      // start immediate fetch then poll
      try {
        fetchBookings();
      } catch (e) {
        // ignore
      }

      id = setInterval(() => {
        try {
          fetchBookings();
        } catch (e) {
          // ignore
        }
      }, 5000);
    }

    return () => {
      if (id) clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBus, date]);

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

  // For the UI dropdowns, show pickup and drop stops in proper
  // chronological order based on their times.
  const sortedPickupOptions = useMemo(
    () => sortStopsByTime(selectedBus, pickupOptions),
    [selectedBus, pickupOptions]
  );

  const sortedDropOptions = useMemo(
    () => sortStopsByTime(selectedBus, dropOptions),
    [selectedBus, dropOptions]
  );

  const filteredPickupOptions = useMemo(() => {
    if (!sortedPickupOptions || !sortedPickupOptions.length) return [];
    const q = String(pickupFilter || "").trim().toLowerCase();
    if (!q) return sortedPickupOptions;
    return sortedPickupOptions.filter((s) => getStopDisplayName(s).toLowerCase().includes(q));
  }, [sortedPickupOptions, pickupFilter]);

  const filteredDropOptions = useMemo(() => {
    if (!sortedDropOptions || !sortedDropOptions.length) return [];
    const q = String(dropFilter || "").trim().toLowerCase();
    if (!q) return sortedDropOptions;
    return sortedDropOptions.filter((s) => getStopDisplayName(s).toLowerCase().includes(q));
  }, [sortedDropOptions, dropFilter]);

  const resetBookingForm = () => {
    setSelectedSeats([]);
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
    setComputedFare(null);
  };

  const openBusModal = (bus) => {
    // Merge any schedule-specific overrides (startTime/endTime/pricing)
    const busForDisplay = { ...(bus || {}) };
    try {
      const busSched = (schedules && bus && schedules[bus.busId]) || {};
      const schedForDate = date && busSched ? busSched[date] : null;
      if (schedForDate) {
        if (schedForDate.startTime) busForDisplay.startTime = schedForDate.startTime;
        if (schedForDate.endTime) busForDisplay.endTime = schedForDate.endTime;
        if (schedForDate.pricingOverride) {
          busForDisplay.pricingRules = {
            ...(busForDisplay.pricingRules || {}),
            ...(schedForDate.pricingOverride || {}),
          };
        }
      }
    } catch (e) {
      // fallback to original bus if anything goes wrong
    }

    setSelectedBus(busForDisplay);
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

    if (
      currentFare === null &&
      (overrideNum === null || !Number.isFinite(overrideNum) || overrideNum <= 0)
    ) {
      return showAppToast("error", "Fare not available for selected pickup and drop");
    }

    try {
      const results = [];
      const finalName = String(bookingForm.name || "").trim();

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
          name: finalName,
          phone: bookingForm.phone,
          email: bookingForm.email,
          voucherCode: bookingForm.voucherCode || null,
          userId: user?.uid || "",
          pickup: bookingForm.pickup,
          pickupTime: bookingForm.pickupTime || "",
          drop: bookingForm.drop,
          dropTime: bookingForm.dropTime || "",
          fare: Number(finalFare),
        };

        // For manual create (not editing), default payment method to offline
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

      try {
        if (typeof triggerRefresh === "function") triggerRefresh();
      } catch (e) {
        // ignore
      }
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

      const finalName = String(bookingForm.name || "").trim();

      const bookingsPayload = seats.map((seatNo) => ({
        busId: selectedBus.busId,
        busNumber: selectedBus.busNumber || "",
        startTime: selectedBus.startTime || "",
        endTime: selectedBus.endTime || "",
        date,
        seatNo,
        name: finalName,
        phone: bookingForm.phone,
        email: bookingForm.email,
        voucherCode: bookingForm.voucherCode || null,
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
            try {
              if (typeof triggerRefresh === "function") triggerRefresh();
            } catch (e) {
              // ignore
            }
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
          name: finalName,
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
      // If admin supplied a voucher code, only apply it to the first seat
      // because vouchers are single-use in the backend. This prevents
      // subsequent booking attempts from failing with "Voucher invalid or already used".
      let voucherConsumed = false;
      const voucherToUse = String(bookingForm.voucherCode || "").trim() || null;

      // If admin provided a voucher code and we're authenticated, pre-redeem it
      // for the first seat so UI shows 'Used' immediately and backend won't race.
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      if (voucherToUse && token && seats && seats.length) {
        try {
          const firstSeat = seats[0];
          const bookingId = `${date}/${selectedBus.busId}/${firstSeat}`;
          const rr = await fetch(`/api/admin/vouchers/redeem`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ code: voucherToUse, bookingId }),
          });
          const rrj = await rr.json().catch(() => ({}));
          if (!rr.ok) {
            // If redeem failed because voucher already used, stop and surface error
            if (rrj && rrj.error) {
              throw new Error(rrj.error);
            }
            throw new Error("Voucher redeem failed");
          }
          // mark voucherConsumed so we don't attach voucher for subsequent seats
          if (voucherInfo && String(voucherInfo.code || "").toUpperCase() === String(voucherToUse || "").toUpperCase()) {
            try {
              setVoucherInfo((p) => ({ ...(p || {}), usedAt: new Date().toISOString() }));
            } catch { }
          }
        } catch (e) {
          console.error("Voucher pre-redeem failed:", e);
          return showAppToast("error", e.message || "Voucher redeem failed");
        }
      }

      const finalName = String(bookingForm.name || "").trim();

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
          name: finalName,
          phone: bookingForm.phone,
          email: bookingForm.email,
          // Only attach voucherCode for the first seat when present
          voucherCode: voucherToUse && !voucherConsumed ? voucherToUse : null,
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

        // store created booking data so we can update UI immediately
        created.push({ seat: seatNo, booking: data, fare: Number(finalFare) });

        // mark voucher consumed after the first successful booking that used it
        if (voucherToUse && !voucherConsumed && data && data.success) {
          voucherConsumed = true;
        }
      }

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
                name: finalName || null,
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

      // Update local bookings state immediately so the UI shows the new bookings
      try {
        setBookings((prev) => {
          const next = { ...(prev || {}) };
          for (const c of created) {
            const key = String(c.seat);
            const server = c.booking || {};
            next[key] = {
              // prefer server-provided fields, but ensure essential display fields are present
              ...(typeof server === 'object' ? server : {}),
              name: String(finalName || server.name || bookingForm.name || "").trim(),
              phone: String(bookingForm.phone || server.phone || "").trim(),
              email: String(bookingForm.email || server.email || "").trim(),
              pickup: String(bookingForm.pickup || (server && server.pickup) || "").trim(),
              pickupTime: String(bookingForm.pickupTime || (server && server.pickupTime) || "").trim(),
              drop: String(bookingForm.drop || (server && server.drop) || "").trim(),
              dropTime: String(bookingForm.dropTime || (server && server.dropTime) || "").trim(),
              fare: Number(c.fare || server.fare || 0),
              payment: (server && server.payment) || "offline",
              status: (server && server.status) || "booked",
              ticket: (server && server.ticket) || null,
            };
          }
          return next;
        });

        // bump booked count for this bus so overview updates instantly
        try {
          setBookedCounts((prev) => {
            const map = { ...(prev || {}) };
            const id = selectedBus?.busId;
            if (!id) return map;
            const cur = map[id] || { booked: 0, blocked: 0 };
            map[id] = { ...cur, booked: Number(cur.booked || 0) + created.length };
            return map;
          });
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore local update failures and fall back to full fetch
      }

      await fetchBookings();
      resetBookingForm();
      try {
        if (typeof triggerRefresh === "function") triggerRefresh();
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error(err);
      showAppToast("error", err.message || "Offline booking failed");
    }
  };

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTargetSeat, setCancelTargetSeat] = useState(null);
  const [cancelProcessing, setCancelProcessing] = useState(false);
  const [cancelResultVoucher, setCancelResultVoucher] = useState(null);

  const handleCancelSeat = (seat) => {
    setCancelTargetSeat(seat);
    setCancelResultVoucher(null);
    setCancelOpen(true);
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
        busId: selectedBus?.busId,
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          return showAppToast("error", "Unauthorized — invalid/expired token");
        }

        if (res.status === 403) {
          return showAppToast("error", "Forbidden — admin access required");
        }

        throw new Error(data.error || "Block failed");
      }

      showAppToast("success", data.message || "Seats blocked for admin");

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

      if (typeof triggerRefresh === "function") {
        triggerRefresh();
      }
    } catch (err) {
      console.error("Block seats error:", err);
      showAppToast("error", err.message || "Block failed");
    }
  };

  // Perform cancel action: 'refund' | 'voucher' | 'void'
  const performCancelAction = async (action) => {
    if (!cancelTargetSeat) return;
    setCancelProcessing(true);
    try {
      const url = `/api/booking?busId=${selectedBus.busId}&date=${date}&seatNo=${cancelTargetSeat}&action=${encodeURIComponent(
        action
      )}`;

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Cancel failed");

      // If server returns a voucher code, show it in the modal
      if (action === "voucher" && data && data.voucherCode) {
        const vcode = String(data.voucherCode || "").trim();
        setCancelResultVoucher(vcode);
        // Populate booking form so admin can reuse the voucher immediately
        setBookingForm((p) => ({ ...p, voucherCode: vcode }));
        showAppToast("success", "Voucher issued");

        // Try to fetch voucher details (read-only) and surface status
        try {
          const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
          const headers = { "Content-Type": "application/json" };
          if (token) headers.Authorization = `Bearer ${token}`;
          const vr = await fetch(`/api/admin/vouchers`, { method: "GET", headers });
          const vct = (vr.headers.get("content-type") || "").toLowerCase();
          if (vct.includes("application/json")) {
            const vdata = await vr.json();
            const list = Array.isArray(vdata.vouchers) ? vdata.vouchers : [];
            const found = list.find((x) => String(x.code || "").toUpperCase() === String(vcode || "").toUpperCase());
            setVoucherInfo(found || null);
            // If we found a voucher while issuing one on cancel, populate pickup/drop and times
            if (found) {
              const rawP = found.pickupTime || found.metadata?.pickupTime || found.metadata?.cancelledBooking?.time || "";
              const rawD = found.dropTime || found.metadata?.dropTime || found.metadata?.cancelledBooking?.time || "";
              const ptime = normalizeTimeForInput(rawP) || rawP || "";
              const dtime = normalizeTimeForInput(rawD) || rawD || "";
              setBookingForm((p) => ({
                ...p,
                pickup: found.pickup || found.metadata?.pickup || p.pickup || "",
                drop: found.drop || found.metadata?.drop || p.drop || "",
                pickupTime: ptime || p.pickupTime || "",
                dropTime: dtime || p.dropTime || "",
              }));
            }
            if (found) {
              if (found.usedAt) {
                showAppToast("info", `Voucher ${found.code} is already used`);
              } else {
                showAppToast("info", `Voucher ${found.code} is present (not redeemed).`);
              }
            } else {
              showAppToast("warning", `Voucher ${vcode} not found`);
            }
          }
        } catch (verr) {
          console.error(verr);
          showAppToast("warning", "Could not fetch voucher status");
        }
      } else {
        showAppToast("success", data.message || "Booking cancelled");
        setCancelOpen(false);
      }

      setEditingSeat(null);
      resetBookingForm();
      await fetchBookings();
      try {
        if (typeof triggerRefresh === "function") triggerRefresh();
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error(err);
      showAppToast("error", err.message || "Cancel failed");
    } finally {
      setCancelProcessing(false);
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
      try {
        if (typeof triggerRefresh === "function") triggerRefresh();
      } catch (e) {
        // ignore
      }
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

  const toAbsolutePublicAssetUrl = (assetPath) => {
    const path = String(assetPath || "").trim();
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    if (typeof globalThis !== "undefined" && globalThis.location?.origin) {
      return `${globalThis.location.origin}${normalizedPath}`;
    }

    return normalizedPath;
  };

  // For printed tickets, show only the Marathi stop name when available.
  const getStopMarathiOnly = (stop) => {
    if (!stop) return "";

    // If we already have the combined display string, strip to the part in brackets.
    if (typeof stop === "string") {
      const s = String(stop).trim();
      const match = s.match(/\(([^)]+)\)\s*$/);
      if (match) return match[1];

      // Fallback: use mapping from fare helpers.
      return getStopNameMarathi(normalizeStopName(s));
    }

    const english = normalizeStopName(stop.name || "");
    const marathi = stop.nameMr || getStopNameMarathi(english);
    return marathi || english;
  };

  const getSeatMapForTemplate = () => {
    const seatMap = {};
    Object.entries(bookings || {}).forEach(([seat, b]) => {
      if (!b) return;
      seatMap[String(seat)] = b;
    });
    return seatMap;
  };


  {/* =========================================================
   15 SEAT - FINAL UPDATED
   BIGGER SEAT WIDTH + RIGHT END ALIGN + JOINED ROWS
========================================================= */}

  const buildTemplateShell15 = ({
    selectedBus,
    date,
    topRowHtml,
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
      font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", "Times New Roman", serif;
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
      min-height: 289mm;
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
      margin-bottom: 4px;
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
      margin-bottom: 6px;
    }

    .bus-number {
      font-size: 15px;
      font-weight: 700;
      text-align: left;
      line-height: 1.1;
    }

    .company {
      font-size: 20px;
      font-weight: 800;
      text-transform: uppercase;
      text-align: center;
      line-height: 1;
    }

    .route {
      font-size: 15px;
      font-weight: 700;
      text-align: right;
      line-height: 1.1;
    }

    .divider {
      border-top: 1px solid #666;
      margin: 3px 0 6px;
    }

    /* =====================================================
       WIDTH SYSTEM (BIGGER SEAT BOX)
       Top Row    = 48 + 48 + 90 = 186mm
       Middle     = 48 + 42 + 96 = 186mm
       Back Row   = 48 * 4 = 192mm
    ===================================================== */

    /* =========================
       TOP ROW (14W, 15, BUS IMAGE RIGHT)
    ========================= */
    .top-row {
      width: 186mm;
      display: grid;
      grid-template-columns: 48mm 48mm 90mm;
      gap: 0;
      align-items: stretch;
      margin-bottom: 4mm;
    }

    .top-seat-wrap {
      width: 56mm;
      display: flex;
      align-items: stretch;
      margin: 0;
      padding: 0;
    }

    .top-bus {
      width: 90mm;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 2mm;
    }

    .top-bus img {
      width: 44mm;
      height: auto;
      object-fit: contain;
      display: block;
    }

    /* =========================
       MIDDLE LAYOUT
       LEFT | GAP | RIGHT
    ========================= */
    .main-layout {
  width: 192mm;
  display: grid;
  grid-template-columns: 48mm 1fr 96mm;
  gap: 0;
  align-items: start;
  margin-bottom: 0;
}

    .left-column {
      width: 48mm;
      display: flex;
      flex-direction: column;
      gap: 0;
      align-items: stretch;
    }

    .left-seat-wrap {
      width: 48mm;
      display: flex;
      align-items: stretch;
      margin: 0;
      padding: 0;
    }

    .middle-gap {
      min-height: 132mm;
    }

    .right-column {
  width: 96mm;
  display: flex;
  flex-direction: column;
  gap: 0;
  align-items: stretch;
  justify-content: flex-start;
  justify-self: end;
}

    .right-row {
      width: 96mm;
      display: grid;
      grid-template-columns: 48mm 48mm;
      gap: 0;
      align-items: stretch;
      margin: 0;
      padding: 0;
    }

    .right-seat-wrap {
      width: 48mm;
      display: flex;
      align-items: stretch;
      margin: 0;
      padding: 0;
    }

    /* =========================
       BACK ROW (FULL JOINED)
    ========================= */
    .back-row {
      width: 192mm;
      display: grid;
      grid-template-columns: repeat(4, 48mm);
      gap: 0;
      align-items: stretch;
      justify-items: stretch;
      margin-top: 0;
      transform: translateY(-1px);
    }

    .back-seat-wrap {
      width: 48mm;
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
      height: 43mm;
      min-height: 43mm;
      border: 1px solid #444;
      padding: 1.2mm 1.4mm 1mm;
      background: #fff;
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
       SEAT TITLE
    ========================= */
    .seat-title {
      font-size: 18px;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 1.1mm;
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
      font-size: 18px;
      font-weight: 700;
      color: #ea580c;
      background: transparent;
      border: none;
      padding: 0;
      line-height: 1;
      flex-shrink: 0;
    }

    /* =========================
       LABEL / VALUE
       Name : Paras
    ========================= */
    .line-row {
      display: flex;
      align-items: center;
      gap: 0.8mm;
      margin: 0.45mm 0;
      min-height: 6mm;
      overflow: hidden;
      white-space: nowrap;
    }

    .label {
      flex: 0 0 auto;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }

    .colon {
      flex: 0 0 auto;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.2;
    }

    .value {
      flex: 1 1 auto;
      min-width: 0;
      display: inline-block;
      min-height: 4.8mm;
      padding: 0 0 0.2mm 0.5mm;
      font-size: 16px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-bottom: 1px solid #444;
    }

    .label,
    .value,
    .seat-title,
    .blocked-tag {
      font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", "Times New Roman", serif;
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
    <button class="primary" onclick="window.close()">Close</button>
  </div>

  <div class="sheet">
    <div class="top-line">
      <div class="left">Date:- ${safeHtml(formatDisplayDate(date) || "")}</div>
      <div class="center">||श्री||</div>
      <div class="right">Time:- ${safeHtml(formatTime(selectedBus?.startTime || "03:00"))}</div>
    </div>

    <div class="title-line">
      <div class="bus-number">${safeHtml(selectedBus?.busNumber || "MH06CP1664")}</div>
      <div class="company">SAI TRAVEL'S</div>
      <div class="route">Route:- ${safeHtml(selectedBus?.routeName || "")}</div>
    </div>

    <div class="divider"></div>

    <!-- TOP ROW -->
    <div class="top-row">
      ${topRowHtml}
      <div class="top-bus">
        <img src="/bus4.png" alt="Bus" />
      </div>
    </div>

    <!-- MIDDLE -->
    <div class="main-layout">
      <div class="left-column">${leftColumnHtml}</div>
      <div class="middle-gap"></div>
      <div class="right-column">${rightColumnHtml}</div>
    </div>

    <!-- BACK ROW -->
    <div class="back-row">
      ${backRowHtml}
    </div>
  </div>
</body>
</html>
  `;
  };

  const renderSeatCardTemplate15 = ({
    seatNo,
    seatMap,
    isWindowSeat = false,
  }) => {
    const data = seatMap[String(seatNo)] || {};
    const isBlocked = data?.status === "blocked";
    const title = `${seatNo}${isWindowSeat ? "W" : ""}`;

    return `
    <div class="seat-box ${isBlocked ? "blocked" : ""}">
      <div class="seat-title">
        <span class="seat-no">${safeHtml(title)}</span>
        <span class="seat-title-right">
          ${isBlocked ? `<span class="blocked-tag">BLOCKED</span>` : ""}
        </span>
      </div>

      <div class="line-row">
        <span class="label">Name</span>
        <span class="colon">:</span>
        <span class="value">${safeHtml(data.name || "")}</span>
      </div>

      <div class="line-row">
        <span class="label">Phone</span>
        <span class="colon">:</span>
        <span class="value">${safeHtml(data.phone || data.mobile || "")}</span>
      </div>

      <div class="line-row">
        <span class="label">Pickup</span>
        <span class="colon">:</span>
        <span class="value">${safeHtml(getStopMarathiOnly(data.pickup) || "")}</span>
      </div>

      <div class="line-row">
        <span class="label">Drop</span>
        <span class="colon">:</span>
        <span class="value">${safeHtml(getStopMarathiOnly(data.drop) || "")}</span>
      </div>
    </div>
  `;
  };

  const buildSeatTemplateHtml15 = () => {
    if (!selectedBus) {
      showAppToast("error", "Please open a bus first");
      return "";
    }

    const seatMap = getSeatMapForTemplate();

    // EXACT 15 SEAT ARRANGEMENT
    const topRow = [14, 15];
    const leftSeats = [3, 6, 9];
    const rightRows = [
      [1, 2],
      [4, 5],
      [7, 8],
    ];
    const backRow = [10, 11, 12, 13];

    const windowSeatSet = new Set([2, 3, 5, 6, 8, 9, 10, 13, 14]);

    const topRowHtml = topRow
      .map(
        (seat) => `
      <div class="top-seat-wrap">
        ${renderSeatCardTemplate15({
          seatNo: seat,
          seatMap,
          isWindowSeat: windowSeatSet.has(seat),
        })}
      </div>
    `
      )
      .join("");

    const leftColumnHtml = leftSeats
      .map(
        (seat) => `
      <div class="left-seat-wrap">
        ${renderSeatCardTemplate15({
          seatNo: seat,
          seatMap,
          isWindowSeat: windowSeatSet.has(seat),
        })}
      </div>
    `
      )
      .join("");

    const rightColumnHtml = rightRows
      .map(
        (row) => `
      <div class="right-row">
        ${row
            .map(
              (seat) => `
            <div class="right-seat-wrap">
              ${renderSeatCardTemplate15({
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
        ${renderSeatCardTemplate15({
          seatNo: seat,
          seatMap,
          isWindowSeat: windowSeatSet.has(seat),
        })}
      </div>
    `
      )
      .join("");

    return buildTemplateShell15({
      selectedBus,
      date,
      topRowHtml,
      leftColumnHtml,
      rightColumnHtml,
      backRowHtml,
    });
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
      /* Prefer fonts that render Devanagari (Marathi) clearly */
      font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", "Times New Roman", serif;
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

    /* Bus side-image shown above the first left-column seat (before seat 3) */
    .bus-diagram {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1mm 0;
    }

    .bus-diagram img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Bus side-image shown above the first left-column seat (before seat 3) */
    .bus-diagram {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1mm 0;
    }

    .bus-diagram img {
      width: 100%;
      height: 100%;
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
      /* Allow Devanagari matras to render fully */
      overflow: visible;
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
      overflow: visible;
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
      font-size: 20px;
      font-weight: 700;
      color: #ea580c;
      background: transparent;
      border: none;
      padding: 0 6px;
      border-radius: 0;
      line-height: 1;
      flex-shrink: 0;
    }

    .ticket-tag {
      display: inline-block;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      background: transparent;
      border: none;
      padding: 0;
      border-radius: 0;
      line-height: 1;
      height: auto;
      max-width: none;
      overflow: visible;
      white-space: nowrap;
      flex-shrink: 0;
    }

    
    .ticket-tag {
      display: inline-block;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      background: transparent;
      border: none;
      padding: 0;
      border-radius: 0;
      line-height: 1;
      height: auto;
      max-width: none;
      overflow: visible;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* =========================
       LABEL / VALUE
       Name:-  Paras
    ========================= */
    .line-row {
      display: flex;
      align-items: flex-start;
      gap: 3mm;
      margin: 0.14mm 0;
      min-height: 2.6mm;
      /* Let tall glyphs and matras show fully */
      overflow: visible;
    }

    .label {
      flex: 0 0 auto;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }

    .value {
      flex: 1 1 auto;
      min-width: 0;
      display: inline-block;
      min-height: 2.4mm;
      padding: 0 0 0.06mm 0;
      font-size: 18px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: visible;
      text-overflow: clip;
    }

    /* Ensure all key text uses a Devanagari-capable font stack */
    .label,
    .value,
    .seat-title,
    .ticket-tag,
    .blocked-tag {
      font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", "Times New Roman", serif;
    }

    .back-row .label {
      font-size: 17px;
    }

    .back-row .value {
      font-size: 17px;
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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button class="primary" onclick="downloadHtmlFile()">Download PDF</button>
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
      try {
        var sheet = document.querySelector(".sheet");
        if (!sheet) {
          window.print();
          return;
        }

        if (typeof html2pdf === "undefined") {
          window.print();
          return;
        }

        var opt = {
          margin: [0, 0, 0, 0],
          filename: "seat-template-${safeHtml(selectedBus?.busNumber || "bus")}-${safeHtml(date || "date")}.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        };

        html2pdf().set(opt).from(sheet).save();
      } catch (e) {
        try {
          console.error(e);
        } catch (_) {}
        window.print();
      }
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
        <span class="value">${safeHtml(getStopMarathiOnly(data.pickup) || "")}</span>
      </div>

      <div class="line-row">
        <span class="label">Drop :</span>
        <span class="value">${safeHtml(getStopMarathiOnly(data.drop) || "")}</span>
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
    <div class="left-seat-wrap left-empty">
      <div class="bus-diagram">
        <img src="/sa3.png" alt="Bus layout" />
      </div>
    </div>
    ${Array.from({ length: Math.max(0, topOffsetRows - 1) })
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
      font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", "Times New Roman", serif;
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

    /* =========================
       BUS IMAGE AREA
    ========================= */
    .bus-diagram {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 0;
    }

    .bus-diagram img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
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
      overflow: visible;
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
      overflow: visible;
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
      font-size: 18px;
      font-weight: 700;
      color: #ea580c;
      background: transparent;
      border: none;
      padding: 0 6px;
      border-radius: 0;
      line-height: 1;
      flex-shrink: 0;
    }

    .ticket-tag {
      display: inline-block;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      background: transparent;
      border: none;
      padding: 0;
      border-radius: 0;
      line-height: 1;
      height: auto;
      max-width: none;
      overflow: visible;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* =========================
       LABEL / VALUE
    ========================= */
    .line-row {
      display: flex;
      align-items: flex-start;
      gap: 1.2mm;
      margin: 0.14mm 0;
      min-height: 2.6mm;
      overflow: visible;
    }

    .label {
      flex: 0 0 14mm;
      width: 14mm;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }

    .value {
      flex: 1 1 auto;
      min-width: 0;
      display: inline-block;
      min-height: 2.4mm;
      padding: 0 0 0.06mm 0.35mm;
      font-size: 18px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: visible;
      text-overflow: clip;
    }

    .label,
    .value,
    .seat-title,
    .ticket-tag,
    .blocked-tag {
      font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", "Times New Roman", serif;
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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button class="primary" onclick="downloadHtmlFile()">Download PDF</button>
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
      try {
        var sheet = document.querySelector(".sheet");
        if (!sheet) {
          window.print();
          return;
        }

        if (typeof html2pdf === "undefined") {
          window.print();
          return;
        }

        var opt = {
          margin: [0, 0, 0, 0],
          filename: "seat-template-${safeHtml(selectedBus?.busNumber || "bus")}-${safeHtml(date || "date")}.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        };

        html2pdf().set(opt).from(sheet).save();
      } catch (e) {
        try {
          console.error(e);
        } catch (_) {}
        window.print();
      }
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
        <span class="value">${safeHtml(getStopMarathiOnly(data.pickup) || "")}</span>
      </div>

      <div class="line-row">
        <span class="label">Drop :</span>
        <span class="value">${safeHtml(getStopMarathiOnly(data.drop) || "")}</span>
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
    const busImageSrc = toAbsolutePublicAssetUrl("/bus2.png");
    const busImageFallbackSrc = toAbsolutePublicAssetUrl("/bus1.png");

    const leftColumnHtml = `
    ${Array.from({ length: Math.max(0, topOffsetRows - 1) })
        .map(() => `<div class="left-seat-wrap left-empty"></div>`)
        .join("")}
    <div class="left-seat-wrap left-empty">
      <div class="bus-diagram">
        <img src="${safeHtml(busImageSrc)}" alt="Bus layout" onerror="this.onerror=null;this.src='${safeHtml(busImageFallbackSrc)}';" />
      </div>
    </div>
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
      font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", "Times New Roman", serif;
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

    /* Bus side-image shown above the first left-column seat (before seat 3) */
    .bus-diagram {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1mm 0;
    }

    .bus-diagram img {
      width: 110%;
      height: 125%;
      object-fit: cover;
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
      height: 26.3mm;
      min-height: 26.3mm;
      border: 1.2px solid #222;
      padding: 0.8mm 1mm 0.55mm;
      background: #fff;
      overflow: visible;
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
      overflow: visible;
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
      font-size: 18px;
      font-weight: 700;
      color: #ea580c;
      background: transparent;
      border: none;
      padding: 0 6px;
      border-radius: 0;
      line-height: 1;
      flex-shrink: 0;
    }

    .ticket-tag {
      display: inline-block;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      background: transparent;
      border: none;
      padding: 0;
      border-radius: 0;
      line-height: 1;
      height: auto;
      max-width: none;
      overflow: visible;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* =========================
       LABEL / VALUE
       Name:- Paras
    ========================= */
    .line-row {
      display: flex;
      align-items: flex-start;
      gap: 0.8mm;
      margin: 0.12mm 0;
      min-height: 2.4mm;
      overflow: visible;
    }

    .back-row .line-row {
      min-height: 2.5mm;
      margin: 0.12mm 0;
    }

    .label {
      flex: 0 0 auto;
      font-size: 17px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }

    .value {
      flex: 1 1 auto;
      min-width: 0;
      display: inline-block;
      min-height: 2.3mm;
      padding: 0 0 0.06mm 0;
      font-size: 17px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: visible;
      text-overflow: clip;
    }

    .back-row .label {
      font-size: 17px;
    }

    .back-row .value {
      font-size: 17px;
      min-height: 2.35mm;
    }

    .label,
    .value,
    .seat-title,
    .ticket-tag,
    .blocked-tag {
      font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", "Times New Roman", serif;
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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button class="primary" onclick="downloadHtmlFile()">Download PDF</button>
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
      try {
        var sheet = document.querySelector(".sheet");
        if (!sheet) {
          window.print();
          return;
        }

        if (typeof html2pdf === "undefined") {
          window.print();
          return;
        }

        var opt = {
          margin: [0, 0, 0, 0],
          filename: "seat-template-${safeHtml(selectedBus?.busNumber || "bus")}-${safeHtml(date || "date")}.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        };

        html2pdf().set(opt).from(sheet).save();
      } catch (e) {
        try {
          console.error(e);
        } catch (_) {}
        window.print();
      }
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
        <span class="value">${safeHtml(getStopMarathiOnly(data.pickup) || "")}</span>
      </div>

      <div class="line-row">
        <span class="label">Drop :</span>
        <span class="value">${safeHtml(getStopMarathiOnly(data.drop) || "")}</span>
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
    <div class="left-seat-wrap left-empty">
      <div class="bus-diagram">
        <img src="/bus3.png" alt="Bus layout" />
      </div>
    </div>
    ${Array.from({ length: Math.max(0, topOffsetRows - 1) })
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


  // Precompute filtered bookings to simplify JSX and avoid IIFE parsing issues
  const filteredVisibleBookings = (() => {
    const q = String(bookingFilter || "").trim().toLowerCase();
    if (!q) return visibleBookings;
    return visibleBookings.filter(([seat, b]) => {
      const s = String(seat || "").toLowerCase();
      const name = String(b.name || "").toLowerCase();
      const phone = String(b.phone || "").toLowerCase();
      const pickup = String(b.pickup || "").toLowerCase();
      const drop = String(b.drop || "").toLowerCase();
      const ticket = String(b.ticket || "").toLowerCase();
      return (
        s.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        pickup.includes(q) ||
        drop.includes(q) ||
        ticket.includes(q)
      );
    });
  })();

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
                        value={`${formatTime(bus.startTime || "--:--")} → ${formatTime(bus.endTime || "--:--")}`}
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
                  )} • ${formatTime(selectedBus.startTime || "--:--")} → ${formatTime(
                    selectedBus.endTime || "--:--"
                  )}`}
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
                  value={`${formatTime(selectedBus.startTime || "--:--")} → ${formatTime(
                    selectedBus.endTime || "--:--"
                  )}`}
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

                <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
                  {/* Booking Form */}
                  <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">Passenger Details</h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Fill passenger info, choose stops, and review fare before booking.
                        </p>
                      </div>

                      <div className="rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-700">
                        {(editingSeat ? [editingSeat] : selectedSeats).length
                          ? `${editingSeat ? 1 : selectedSeats.length} Seat Selected`
                          : "No Seat Selected"}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Ticket Lookup */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Ticket Lookup
                        </label>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <input
                            placeholder="Ticket number (paste to autofill)"
                            value={bookingForm.ticket ?? ""}
                            onChange={(e) =>
                              setBookingForm((p) => ({
                                ...p,
                                ticket: String(e.target.value || "").trim(),
                              }))
                            }
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                            disabled={!editingSeat && selectedSeats.length === 0}
                          />

                          <button
                            onClick={async () => {
                              const code = String(bookingForm.ticket || "").trim();
                              if (!code) return showAppToast("error", "Enter ticket number to lookup");
                              try {
                                setTicketLookupLoading(true);
                                setVoucherInfo(null);
                                const res = await fetch(`/api/booking?ticket=${encodeURIComponent(code)}`);
                                const ct = (res.headers.get("content-type") || "").toLowerCase();
                                if (!ct.includes("application/json")) {
                                  const txt = await res.text();
                                  const short = String(txt || "").slice(0, 200);
                                  throw new Error("Non-JSON response from server: " + (short || res.statusText));
                                }
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || "Ticket not found");
                                const b = data.booking || {};

                                setBookingForm((p) => ({
                                  ...p,
                                  name: b.name || "",
                                  phone: b.phone || "",
                                  email: b.email || "",
                                  pickup: b.pickup || "",
                                  drop: b.drop || "",
                                  voucherCode:
                                    b.voucherCode ||
                                    (b.voucher && (b.voucher.code || b.voucherCode)) ||
                                    p.voucherCode ||
                                    "",
                                }));

                                try {
                                  const rawPt = getStopTime(selectedBus, b.pickup) || b.pickupTime || "";
                                  const rawDt = getStopTime(selectedBus, b.drop) || b.dropTime || "";
                                  const pt = normalizeTimeForInput(rawPt) || rawPt || "";
                                  const dt = normalizeTimeForInput(rawDt) || rawDt || "";
                                  setBookingForm((p) => ({ ...p, pickupTime: pt, dropTime: dt }));
                                } catch { }

                                const vcode = (
                                  b.voucherCode ||
                                  (b.voucher && (b.voucher.code || b.voucherCode)) ||
                                  ""
                                ).trim();

                                if (vcode) {
                                  try {
                                    const token =
                                      typeof window !== "undefined"
                                        ? localStorage.getItem("authToken")
                                        : null;
                                    const headers = { "Content-Type": "application/json" };
                                    if (token) headers.Authorization = `Bearer ${token}`;
                                    const vr = await fetch(`/api/admin/vouchers`, {
                                      method: "GET",
                                      headers,
                                    });
                                    const vct = (vr.headers.get("content-type") || "").toLowerCase();
                                    if (!vct.includes("application/json")) {
                                      throw new Error("Failed to fetch voucher details");
                                    }
                                    const vdata = await vr.json();
                                    const list = Array.isArray(vdata.vouchers) ? vdata.vouchers : [];
                                    const found = list.find(
                                      (x) =>
                                        String(x.code || "").toUpperCase() ===
                                        String(vcode || "").toUpperCase()
                                    );
                                    setVoucherInfo(found || null);
                                    if (found) {
                                      if (found.usedAt) {
                                        showAppToast("info", `Voucher ${found.code} is already used`);
                                      } else {
                                        showAppToast("info", `Voucher ${found.code} is present (not redeemed).`);
                                      }
                                    } else {
                                      showAppToast("warning", `Voucher ${vcode} not found`);
                                    }
                                  } catch (verr) {
                                    console.error(verr);
                                    showAppToast("warning", "Could not fetch voucher status");
                                  }
                                }

                                showAppToast("success", "Ticket details loaded");
                              } catch (err) {
                                console.error(err);
                                showAppToast("error", err.message || "Failed to load ticket");
                              } finally {
                                setTicketLookupLoading(false);
                              }
                            }}
                            disabled={ticketLookupLoading}
                            className="h-12 shrink-0 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                          >
                            {ticketLookupLoading ? "Loading..." : "Load Ticket"}
                          </button>
                        </div>
                      </div>

                      {/* Passenger Inputs */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-slate-700">Passenger Name</label>
                          <input
                            placeholder="Enter passenger name"
                            value={bookingForm.name ?? ""}
                            onCompositionStart={() => setIsNameComposing(true)}
                            onCompositionEnd={(e) => {
                              setIsNameComposing(false);
                              setBookingForm((p) => ({
                                ...p,
                                name: sanitizeNameInput(e.target.value),
                              }));
                            }}
                            onChange={(e) => {
                              const v = e.target.value || "";
                              if (isNameComposing) {
                                setBookingForm((p) => ({ ...p, name: v }));
                              } else {
                                setBookingForm((p) => ({
                                  ...p,
                                  name: sanitizeNameInput(v),
                                }));
                              }
                            }}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                            disabled={!editingSeat && selectedSeats.length === 0}
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">Phone Number</label>
                          <input
                            placeholder="Enter phone number"
                            value={bookingForm.phone ?? ""}
                            onChange={(e) => {
                              const v = e.target.value || "";
                              if (isPhoneComposing) {
                                setBookingForm((p) => ({ ...p, phone: v }));
                              } else {
                                setBookingForm((p) => ({
                                  ...p,
                                  phone: sanitizePhoneInput(v),
                                }));
                              }
                            }}
                            onCompositionStart={() => setIsPhoneComposing(true)}
                            onCompositionEnd={(e) => {
                              setIsPhoneComposing(false);
                              setBookingForm((p) => ({ ...p, phone: e.target.value || "" }));
                            }}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={10}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                            disabled={!editingSeat && selectedSeats.length === 0}
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
                          <input
                            placeholder="Enter email"
                            value={bookingForm.email ?? ""}
                            onChange={(e) =>
                              setBookingForm((p) => ({
                                ...p,
                                email: sanitizeEmailInput(e.target.value),
                              }))
                            }
                            type="email"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                            disabled={!editingSeat && selectedSeats.length === 0}
                          />
                        </div>
                      </div>

                      {/* Voucher */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Voucher Code (Optional)
                        </label>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <input
                            placeholder="Enter voucher code"
                            value={bookingForm.voucherCode ?? ""}
                            onChange={(e) =>
                              setBookingForm((p) => ({
                                ...p,
                                voucherCode: String(e.target.value || "").trim(),
                              }))
                            }
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                            disabled={!editingSeat && selectedSeats.length === 0}
                          />

                          {voucherInfo ? (
                            <div
                              className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold"
                              style={{
                                background: voucherInfo.usedAt ? "#DCFCE7" : "#FFF7ED",
                                color: voucherInfo.usedAt ? "#166534" : "#C2410C",
                                border: "1px solid rgba(0,0,0,0.04)",
                              }}
                            >
                              {voucherInfo.usedAt ? "Used" : "Available"}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Pickup / Drop + Time + Fare */}
                      <div className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <h5 className="text-base font-bold text-slate-900">Route & Fare Details</h5>
                            <p className="text-xs text-slate-500">Select pickup and drop to auto-calculate fare.</p>
                          </div>

                          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-600 shadow-sm">
                            Smart Fare
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Pickup / Drop Dropdowns */}
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Pickup Dropdown */}
                            <div
                              ref={pickupDropdownRef}
                              className="relative stop-dropdown-wrapper"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setPickupOpen((prev) => {
                                    const next = !prev;
                                    if (next) setDropOpen(false);
                                    return next;
                                  });
                                }}
                                className="flex h-14 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-[15px] text-slate-800 shadow-sm transition-all hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                              >
                                <span className={bookingForm.pickup ? "text-slate-900" : "text-slate-400"}>
                                  {bookingForm.pickup
                                    ? `${getStopDisplayName(bookingForm.pickup)} — ${formatTime(getStopTime(selectedBus, bookingForm.pickup)) || "--:--"
                                    }`
                                    : "Select pickup stop"}
                                </span>
                                <span className="text-slate-400">▼</span>
                              </button>

                              {pickupOpen && (
                                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                                  <div className="border-b border-slate-100 p-3">
                                    <input
                                      type="text"
                                      placeholder="Search pickup..."
                                      value={pickupFilter}
                                      onChange={(e) => setPickupFilter(e.target.value)}
                                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400"
                                    />
                                  </div>

                                  <div className="max-h-[220px] overflow-y-auto p-2">
                                    {filteredPickupOptions.length > 0 ? (
                                      filteredPickupOptions.map((stop) => {
                                        const stopTime = getStopTime(selectedBus, stop);

                                        return (
                                          <button
                                            key={stop}
                                            type="button"
                                            onClick={() => {
                                              setBookingForm((prev) => ({
                                                ...prev,
                                                pickup: stop,
                                                pickupTime: stopTime || "",
                                                drop: "",
                                                dropTime: "",
                                              }));
                                              setComputedFare(null);
                                              setPickupFilter("");
                                              setPickupOpen(false);
                                              setDropFilter("");
                                            }}
                                            className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition ${bookingForm.pickup === stop
                                              ? "bg-orange-50 text-orange-600"
                                              : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
                                              }`}
                                          >
                                            <span className="font-medium">{getStopDisplayName(stop)}</span>
                                            <span className="ml-3 shrink-0 text-xs font-semibold text-slate-500">
                                              {formatTime(stopTime) || "--:--"}
                                            </span>
                                          </button>
                                        );
                                      })
                                    ) : (
                                      <div className="px-3 py-4 text-sm text-slate-400">No stops found</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Drop Dropdown */}
                            <div
                              ref={dropDropdownRef}
                              className="relative stop-dropdown-wrapper"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (!bookingForm.pickup) return;
                                  setDropOpen((prev) => {
                                    const next = !prev;
                                    if (next) setPickupOpen(false);
                                    return next;
                                  });
                                }}
                                className="flex h-14 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-[15px] text-slate-800 shadow-sm transition-all hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                              >
                                <span className={bookingForm.drop ? "text-slate-900" : "text-slate-400"}>
                                  {bookingForm.drop
                                    ? `${getStopDisplayName(bookingForm.drop)} — ${formatTime(getStopTime(selectedBus, bookingForm.drop)) || "--:--"
                                    }`
                                    : "Select drop stop"}
                                </span>
                                <span className="text-slate-400">▼</span>
                              </button>

                              {dropOpen && (
                                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                                  <div className="border-b border-slate-100 p-3">
                                    <input
                                      type="text"
                                      placeholder="Search drop..."
                                      value={dropFilter}
                                      onChange={(e) => setDropFilter(e.target.value)}
                                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400"
                                    />
                                  </div>

                                  <div className="max-h-[220px] overflow-y-auto p-2">
                                    {filteredDropOptions.length > 0 ? (
                                      filteredDropOptions.map((stop) => {
                                        const stopTime = getStopTime(selectedBus, stop);

                                        return (
                                          <button
                                            key={stop}
                                            type="button"
                                            onClick={() => {
                                              const fare = calculateFare(
                                                selectedBus,
                                                bookingForm.pickup,
                                                stop,
                                                date
                                              );

                                              setBookingForm((prev) => ({
                                                ...prev,
                                                drop: stop,
                                                dropTime: stopTime || "",
                                              }));

                                              setComputedFare(fare);
                                              setDropFilter("");
                                              setDropOpen(false);
                                            }}
                                            className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition ${bookingForm.drop === stop
                                              ? "bg-orange-50 text-orange-600"
                                              : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
                                              }`}
                                          >
                                            <span className="font-medium">{getStopDisplayName(stop)}</span>
                                            <span className="ml-3 shrink-0 text-xs font-semibold text-slate-500">
                                              {formatTime(stopTime) || "--:--"}
                                            </span>
                                          </button>
                                        );
                                      })
                                    ) : (
                                      <div className="px-3 py-4 text-sm text-slate-400">No stops found</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Time + Fare Cards */}
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Pickup Time
                              </div>
                              <div className="mt-2 text-lg font-bold text-slate-900">
                                {formatTime(bookingForm.pickupTime) || "--:--"}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Drop Time
                              </div>
                              <div className="mt-2 text-lg font-bold text-slate-900">
                                {formatTime(bookingForm.dropTime) || "--:--"}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
                              <div className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                                Fare
                              </div>
                              <div className="mt-2 text-lg font-bold text-orange-600">
                                ₹
                                {String(bookingForm.fareOverride || "").trim()
                                  ? Number(bookingForm.fareOverride)
                                  : computedFare ?? "--"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Selected Seats */}
                      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-sm font-medium text-slate-500">Selected Seat(s):</div>
                        <div className="text-sm font-bold text-slate-900">
                          {(editingSeat ? [editingSeat] : selectedSeats).length
                            ? editingSeat
                              ? editingSeat
                              : selectedSeats.join(", ")
                            : "—"}
                        </div>
                      </div>

                      {/* Fare Summary */}
                      {(editingSeat ? 1 : selectedSeats.length) > 0 && (
                        <div className="rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-orange-50 p-4">
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
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                  <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Fare Per Seat
                                    </div>
                                    <div className="mt-2 text-xl font-bold text-slate-900">
                                      {perSeat && !Number.isNaN(perSeat) ? `₹${perSeat.toFixed(2)}` : "—"}
                                    </div>
                                  </div>

                                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                                      Total Fare
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-orange-600">
                                      {!Number.isNaN(total) ? `₹${total.toFixed(2)}` : "—"}
                                    </div>
                                  </div>

                                  <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Override Fare
                                    </label>
                                    <input
                                      type="text"
                                      step="0.01"
                                      min="0"
                                      value={bookingForm.fareOverride ?? ""}
                                      onChange={(e) =>
                                        setBookingForm((p) => ({
                                          ...p,
                                          fareOverride: e.target.value,
                                        }))
                                      }
                                      className="mt-3 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                    />
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                              Fare not available for selected pickup & drop
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 pt-1">
                        {editingSeat ? (
                          <>
                            <button
                              onClick={handleCreateOrUpdateBooking}
                              className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                            >
                              Update Booking
                            </button>

                            <button
                              onClick={() => handleCancelSeat(editingSeat)}
                              disabled={confirmOpen}
                              className="inline-flex h-12 items-center justify-center rounded-2xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Cancel Booking
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={handleOnlineBooking}
                              className="inline-flex h-12 items-center justify-center rounded-2xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
                            >
                              Online Booking
                            </button>

                            <button
                              onClick={handleOfflineBooking}
                              className="inline-flex h-12 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
                            >
                              Offline Booking
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Existing Bookings */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                    <div className="mb-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">Existing Bookings</h4>
                          <p className="mt-1 text-xs text-slate-500">
                            2 tickets visible first • scroll for more
                          </p>
                        </div>

                        <div className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                          {filteredVisibleBookings.length} Total
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <input
                        placeholder="Search by seat, name, phone, pickup..."
                        value={bookingFilter}
                        onChange={(e) => setBookingFilter(String(e.target.value || ""))}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>

                    <div
                      className="space-y-3 pr-1"
                      style={{
                        maxHeight: 1000,
                        overflowY: "auto",
                        scrollbarWidth: "thin",
                      }}
                    >
                      {filteredVisibleBookings.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                          No bookings for this bus/date.
                        </div>
                      ) : (
                        filteredVisibleBookings.map(([seat, b]) => (
                          <div
                            key={seat}
                            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                {/* Top Row */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-[15px] font-bold text-slate-900">
                                    Seat {seat}
                                  </div>

                                  {b.ticket ? (
                                    <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                      {b.ticket}
                                    </div>
                                  ) : null}

                                  {b.status === "blocked" ? (
                                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-700">
                                      BLOCKED
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                      BOOKED
                                    </span>
                                  )}
                                </div>

                                {/* Passenger */}
                                <div className="mt-2 text-sm font-semibold text-slate-800">
                                  {b.name || "—"}
                                </div>

                                <div className="mt-1 text-xs text-slate-500">{b.phone || "—"}</div>

                                {b.email ? (
                                  <div className="mt-1 truncate text-xs text-slate-500">{b.email}</div>
                                ) : null}

                                {/* Route */}
                                <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600">
                                  <span className="font-semibold text-slate-700">{b.pickup || "-"}</span>
                                  {b.pickupTime ? ` (${formatTime(b.pickupTime)})` : ""} →{" "}
                                  <span className="font-semibold text-slate-700">{b.drop || "-"}</span>
                                  {b.dropTime ? ` (${formatTime(b.dropTime)})` : ""}
                                </div>

                                {/* Fare + Payment */}
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                                  {b.fare !== undefined && b.fare !== null ? (
                                    <div className="font-semibold text-slate-700">
                                      Fare: ₹{Number(b.fare).toFixed(2)}
                                    </div>
                                  ) : null}

                                  {b.paymentMethod ? (
                                    <div className="font-medium text-slate-500">
                                      Payment: {b.paymentMethod}
                                    </div>
                                  ) : null}
                                </div>

                                {/* Block note */}
                                {b.status === "blocked" && b.note ? (
                                  <div className="mt-1 text-[11px] font-medium text-orange-600">
                                    Note: {b.note}
                                  </div>
                                ) : null}
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col items-end gap-2">
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
                                        b.fare !== undefined && b.fare !== null
                                          ? String(b.fare)
                                          : "",
                                    });

                                    const fare = calculateFare(
                                      selectedBus,
                                      b.pickup || "",
                                      b.drop || "",
                                      date
                                    );
                                    setComputedFare(fare);
                                  }}
                                  className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => handleCancelSeat(seat)}
                                  disabled={confirmOpen}
                                  className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 bg-white px-4 text-[11px] font-semibold text-red-600 transition hover:bg-red-50"
                                >
                                  Cancel
                                </button>
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

      {/* Cancel choices modal (refund / voucher / mark cancelled) */}
      {cancelOpen && (
        <CancelChoicesModal
          seat={cancelTargetSeat}
          onClose={() => {
            if (cancelProcessing) return;
            setCancelOpen(false);
            setCancelResultVoucher(null);
          }}
          onAction={performCancelAction}
          processing={cancelProcessing}
          voucherCode={cancelResultVoucher}
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
                  placeholder="Name"
                  value={blockDetails.name}
                  onCompositionStart={() => setIsNameComposing(true)}
                  onCompositionEnd={(e) => {
                    setIsNameComposing(false);
                    setBlockDetails((p) => ({ ...p, name: sanitizeNameInput(e.target.value) }));
                  }}
                  onChange={(e) => {
                    const v = e.target.value || "";
                    if (isNameComposing) setBlockDetails((p) => ({ ...p, name: v }));
                    else setBlockDetails((p) => ({ ...p, name: sanitizeNameInput(v) }));
                  }}
                  className="w-full rounded-lg border px-3 py-2"
                />

                <input
                  placeholder="Phone"
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
                  placeholder="Email"
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
                  <div className="text-lg font-bold text-slate-900">
                    Seat {viewBooking.seat}{" "}
                    {viewBooking.booking?.ticket ? `— ${viewBooking.booking.ticket}` : ""}
                  </div>
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
                    {viewBooking.booking?.pickup || "-"}
                    {viewBooking.booking?.pickupTime
                      ? ` (${viewBooking.booking?.pickupTime})`
                      : ""}{" "}
                    → {viewBooking.booking?.drop || "-"}
                    {viewBooking.booking?.dropTime
                      ? ` (${viewBooking.booking?.dropTime})`
                      : ""}
                  </div>

                  {viewBooking.booking?.status === "blocked" && viewBooking.booking?.note ? (
                    <div className="mt-2 text-sm text-orange-600">
                      Note: {viewBooking.booking?.note}
                    </div>
                  ) : null}

                  {viewBooking.booking?.fare !== undefined &&
                    viewBooking.booking?.fare !== null ? (
                    <div className="mt-2 text-sm font-medium text-slate-700">
                      Fare: ₹{Number(viewBooking.booking.fare).toFixed(2)}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <button
                    onClick={() => setViewBooking(null)}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
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
                            try {
                              if (typeof triggerRefresh === "function") triggerRefresh();
                            } catch (e) {
                              // ignore
                            }
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
                        fareOverride:
                          b.fare !== undefined && b.fare !== null ? String(b.fare) : "",
                      });

                      const fare = calculateFare(selectedBus, b.pickup || "", b.drop || "", date);
                      setComputedFare(fare);

                      setViewBooking(null);
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                  >
                    Edit
                  </button>

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


function CancelChoicesModal({ seat, onClose, onAction, processing, voucherCode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">

        {/* Top Right Close Icon */}
        <button
          onClick={onClose}
          disabled={processing}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <h3 className="text-lg font-bold text-slate-900 pr-10">
          Cancel booking — Seat {seat}
        </h3>

        {!voucherCode ? (
          <>
            <p className="mt-3 text-sm text-slate-600">
              Choose how to handle the cancellation. You can refund to original payment,
              issue a voucher valid for 1 year, or mark as cancelled without refund.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => onAction("refund")}
                disabled={processing}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refund to original method
              </button>

              <button
                onClick={() => onAction("voucher")}
                disabled={processing}
                className="w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Issue voucher (valid 1 year)
              </button>

              <button
                onClick={() => onAction("void")}
                disabled={processing}
                className="w-full rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark cancelled (no refund)
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-slate-600">Voucher issued successfully:</p>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <div className="truncate font-mono text-sm text-slate-800">{voucherCode}</div>
              <button
                onClick={() => {
                  try {
                    navigator.clipboard?.writeText(voucherCode);
                    showAppToast("success", "Voucher copied to clipboard");
                  } catch {
                    // ignore
                  }
                }}
                className="ml-3 rounded-md bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                Copy
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="rounded-full border border-slate-300 p-2 text-slate-500 transition hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
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
