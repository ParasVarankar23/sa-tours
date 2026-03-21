"use client";

import SeatLayout from "@/components/SeatLayout";
import { showAppToast } from "@/lib/client/toast";
import {
  BUS_TYPES,
  getFare,
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
import { useEffect, useMemo, useState } from "react";
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

export default function BookingPage() {
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

  const visibleBookings = useMemo(() => {
    return Object.entries(bookings || {}).filter(([, b]) => !!b);
  }, [bookings]);

  const { user } = useAuth();
  const router = useRouter();

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

  /* =========================
     Seat Template (Print / Download)
  ========================= */
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

  const buildSeatTemplateHtml = () => {
    if (!selectedBus) {
      showAppToast("error", "Please open a bus first");
      return "";
    }

    const safe = (v) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const totalSeats = Number(selectedBus?.seatLayout || selectedBus?.seatCount || 31) || 31;
    // don't assume 5 cabins by default — use 0 when none provided
    const cabinCount = Array.isArray(selectedBus?.cabins) ? selectedBus.cabins.length : 0;

    const seatMap = {};
    Object.entries(bookings || {}).forEach(([seat, b]) => {
      if (!b) return;
      seatMap[String(seat)] = b;
    });

    const renderSeatCard = (seatNo) => {
      const data = seatMap[String(seatNo)] || {};
      const isBlocked = data?.status === "blocked";

      // prefer explicit fare fields, fall back to booking fare
      const amount = data?.amount ?? data?.fare ?? "";

      return `
          <div class="seat-box ${isBlocked ? "blocked" : ""}">
            <div class="seat-title">
              ${safe(seatNo)}W ${isBlocked ? '<span class="blocked-tag">BLOCKED</span>' : ""}
            </div>
            <div class="line-row"><span class="label">Name:-</span><span class="value">${safe(data.name || "")}</span></div>
            <div class="line-row"><span class="label">Email:-</span><span class="value">${safe(data.email || "")}</span></div>
            <div class="line-row"><span class="label">Phone:-</span><span class="value">${safe(data.phone || "")}</span></div>
            <div class="line-row"><span class="label">Pickup:-</span><span class="value">${safe(data.pickup || "")}</span></div>
            <div class="line-row"><span class="label">Drop:-</span><span class="value">${safe(data.drop || "")}</span></div>
            <div class="line-row"><span class="label">Amount:-</span><span class="value">${safe(amount)}</span></div>
          </div>
        `;
    };

    // layout: top part in 3 columns, last 5 seats in bottom row
    const allSeatNumbers = Array.from({ length: totalSeats }, (_, i) => i + 1);
    const topSeats = allSeatNumbers.slice(0, Math.max(totalSeats - 5, 0));
    const bottomSeats = allSeatNumbers.slice(Math.max(totalSeats - 5, 0));

    const leftColumnSeats = [];
    const middleColumnSeats = [];
    const rightColumnSeats = [];

    for (let i = 0; i < topSeats.length; i++) {
      if (i % 3 === 0) middleColumnSeats.push(topSeats[i]);
      else if (i % 3 === 1) rightColumnSeats.push(topSeats[i]);
      else leftColumnSeats.push(topSeats[i]);
    }

    const maxRows = Math.max(
      leftColumnSeats.length,
      middleColumnSeats.length,
      rightColumnSeats.length
    );

    let gridRows = "";
    for (let i = 0; i < maxRows; i++) {
      const leftHtml = leftColumnSeats[i]
        ? renderSeatCard(leftColumnSeats[i])
        : `<div class="seat-placeholder"></div>`;

      const midHtml = middleColumnSeats[i]
        ? renderSeatCard(middleColumnSeats[i])
        : `<div class="seat-placeholder"></div>`;

      const rightHtml = rightColumnSeats[i]
        ? renderSeatCard(rightColumnSeats[i])
        : `<div class="seat-placeholder"></div>`;

      gridRows += `
        <div class="grid-row">
          <div class="col">${leftHtml}</div>
          <div class="col">${midHtml}</div>
          <div class="col">${rightHtml}</div>
        </div>
      `;
    }

    const bottomRowHtml = bottomSeats
      .map((seat) => `<div class="bottom-col">${renderSeatCard(seat)}</div>`)
      .join("");

    const cabinRows = Array.from({ length: cabinCount }, (_, i) => {
      const cabinSeat = selectedBus?.cabins?.[i]?.seatNo || `CB${i + 1}`;
      const data = seatMap[String(cabinSeat)] || {};
      const isBlocked = data?.status === "blocked";
      const amount = data?.amount ?? data?.fare ?? "";

      return `
          <tr class="${isBlocked ? "blocked-row" : ""}">
            <td>${safe(cabinSeat)}</td>
            <td>${safe(data.name || "")}</td>
            <td>${safe(data.email || "")}</td>
            <td>${safe(data.phone || "")}</td>
            <td>${safe(data.pickup || "")}</td>
            <td>${safe(data.drop || "")}</td>
            <td>${safe(amount)}</td>
            <td>${isBlocked ? "Blocked" : data?.name ? "Booked" : ""}</td>
          </tr>
        `;
    }).join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Seat Template - ${safe(selectedBus.busNumber || "Bus")}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      margin: 0;
      font-family: "Times New Roman", serif;
      color: #111;
      background: #fff;
      font-size: 10px;
      padding: 8px;
    }

    .sheet {
      width: 100%;
      border: 1px solid #888;
      padding: 8px;
    }

    .actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .btn {
      border: 1px solid #111;
      background: #fff;
      padding: 8px 14px;
      cursor: pointer;
      font-weight: 700;
      border-radius: 6px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .header-mid {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .bus-left {
      width: 150px;
      font-size: 13px;
      font-weight: 700;
    }

    .bus-center {
      flex: 1;
      text-align: center;
    }

    .bus-center .company {
      font-size: 20px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .bus-right {
      width: 220px;
      font-size: 12px;
      font-weight: 700;
      text-align: left;
    }

    .divider {
      border-top: 1px solid #999;
      margin: 6px 0 8px;
    }

    .grid-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      margin-bottom: 6px;
      align-items: start;
    }

    .col {
      min-height: 120px;
    }

    .seat-box {
      border: 1px solid #777;
      min-height: 120px;
      padding: 4px;
      width: 100%;
      background: #fff;
    }

    .seat-box.blocked {
      background: #fff7ed;
      border-color: #ea580c;
    }

    .seat-title {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .blocked-tag {
      font-size: 9px;
      border: 1px solid #ea580c;
      color: #ea580c;
      padding: 1px 4px;
      border-radius: 10px;
      font-weight: 700;
    }

    .line-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 2px 0;
      min-height: 15px;
    }

    .label {
      min-width: 40px;
      white-space: nowrap;
      font-size: 9px;
      font-weight: 700;
    }

    .line {
      flex: 1;
      border-bottom: 1px solid #777;
      min-height: 10px;
    }

    .value {
      flex: 1;
      border-bottom: 1px solid #777;
      min-height: 12px;
      font-size: 9px;
      padding-left: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .seat-placeholder {
      min-height: 120px;
    }

    .bottom-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      margin-top: 8px;
      margin-bottom: 10px;
    }

    .bottom-col .seat-box {
      min-height: 105px;
    }

    .cabin-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      margin: 8px 0 4px;
      text-transform: uppercase;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th, td {
      border: 1px solid #777;
      padding: 4px;
      font-size: 9px;
      text-align: left;
      word-wrap: break-word;
    }

    th {
      background: #f8fafc;
    }

    .blocked-row td {
      background: #fff7ed;
    }

    @media print {
      .actions {
        display: none;
      }
      body {
        padding: 0;
      }
      .sheet {
        border: none;
      }
    }
  </style>
</head>
<body>

  <div class="sheet">
    <div class="header-top">
      <div>Date:- ${safe(formatDisplayDate(date))}</div>
      <div>||श्री||</div>
      <div>Time:- ${safe(selectedBus.startTime || "--:--")}</div>
    </div>

    <div class="header-mid">
      <div class="bus-left">${safe(selectedBus.busNumber || "BUS NO")}</div>
      <div class="bus-center">
        <div class="company">SA TRAVEL'S</div>
      </div>
      <div class="bus-right">
        <div>Route:- ${safe(selectedBus.routeName || "")}</div>
      </div>
    </div>

    <div class="divider"></div>

    ${gridRows}

    <div class="bottom-row">
      ${bottomRowHtml}
    </div>

    <div class="cabin-title">CABIN</div>

    <table>
      <thead>
        <tr>
          <th style="width: 10%;">Seat</th>
          <th style="width: 16%;">Name</th>
          <th style="width: 18%;">Email</th>
          <th style="width: 12%;">Phone</th>
          <th style="width: 14%;">Pickup</th>
          <th style="width: 14%;">Drop</th>
          <th style="width: 10%;">Amount</th>

        </tr>
      </thead>
      <tbody>
        ${cabinRows}
      </tbody>
    </table>
  </div>
</body>
</html>
    `;
  };

  const handlePrintSeatTemplate = () => {
    const html = buildSeatTemplateHtml();
    if (!html) return;

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      showAppToast("error", "Popup blocked. Please allow popups.");
      return;
    }

    let printHtml = html.replace(
      "</style>",
      `
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    body {
      margin: 0;
      background: #fff;
    }
    .sheet {
      width: 100%;
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      box-sizing: border-box;
    }
    </style>`
    );


    // Append a small script in the preview window that captures the .sheet element
    // using html2canvas + jsPDF inside the preview's browser context.
    const previewScript = `
      (function () {
        function loadScript(src) {
          return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(new Error('Failed to load ' + src)); };
            document.head.appendChild(s);
          });
        }

        async function generatePdf() {
          try {
            var sheet = document.querySelector('.sheet');
            if (!sheet) return alert('Template not found');

            if (document.fonts && document.fonts.ready) await document.fonts.ready;
            await new Promise(function (r) { setTimeout(r, 120); });

            // Load UMD builds into the preview window if not already present
            if (!window.html2canvas) {
              await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            }
            if (!window.jspdf && !window.jsPDF) {
              await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }

            var html2c = window.html2canvas;
            var jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (window.jsPDF || null);
            if (!html2c || !jsPDFCtor) throw new Error('Required libraries not available');

            var scale = 2;
            var canvas = await html2c(sheet, { scale: scale, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 });

            var imgData = canvas.toDataURL('image/jpeg', 0.98);
            var A4_WIDTH_MM = 210;
            var A4_HEIGHT_MM = 297;
            var margin = 8;

            var pdf = new jsPDFCtor({ unit: 'mm', format: 'a4', orientation: 'portrait' });

            var pdfWidth = A4_WIDTH_MM - margin * 2;
            var pdfHeight = A4_HEIGHT_MM - margin * 2;

            var canvasWidth = canvas.width;
            var canvasHeight = canvas.height;
            var imgWidthMm = pdfWidth;
            var imgHeightMm = (canvasHeight * imgWidthMm) / canvasWidth;

            if (imgHeightMm <= pdfHeight) {
              pdf.addImage(imgData, 'JPEG', margin, margin, imgWidthMm, imgHeightMm);
            } else {
              var pxPerMm = canvasWidth / imgWidthMm;
              var pageHeightPx = Math.floor(pdfHeight * pxPerMm);
              var remaining = canvasHeight;
              var position = 0;
              var tmpCanvas = document.createElement('canvas');
              var tmpCtx = tmpCanvas.getContext('2d');

              while (remaining > 0) {
                var slice = Math.min(pageHeightPx, remaining);
                tmpCanvas.width = canvasWidth;
                tmpCanvas.height = slice;
                tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
                tmpCtx.drawImage(canvas, 0, position, canvasWidth, slice, 0, 0, canvasWidth, slice);

                var sliceData = tmpCanvas.toDataURL('image/jpeg', 0.98);
                var sliceHeightMm = (slice * imgWidthMm) / canvasWidth;

                if (position > 0) pdf.addPage();
                pdf.addImage(sliceData, 'JPEG', margin, margin, imgWidthMm, sliceHeightMm);

                position += slice;
                remaining -= slice;
              }
            }

            var filename = 'seat-template-' + encodeURIComponent(document.title || 'bus') + '.pdf';
            pdf.save(filename);
          } catch (err) {
            console.error(err);
            alert('Failed to generate PDF: ' + (err && err.message ? err.message : String(err)));
          }
        }

            // expose the generator so parent window can call it
            window.generateSeatPdf = generatePdf;

            document.addEventListener('DOMContentLoaded', function () {
              var btn = document.getElementById('download-pdf');
              if (btn) btn.addEventListener('click', generatePdf);
            });
      })();
    `;

    printHtml = printHtml.replace('</body>', `<script>${previewScript}</script></body>`);

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    return printWindow;
  };

  const handleDownloadSeatTemplate = async () => {
    try {
      // Prefer generating PDF from the preview window (ensures exact parity).
      try {
        const previewWin = handlePrintSeatTemplate();
        if (previewWin) {
          let attempts = 0;
          const callGenerator = () => {
            try {
              if (previewWin.generateSeatPdf) {
                previewWin.generateSeatPdf();
                return;
              }
            } catch (e) {
              // ignore
            }
            attempts++;
            if (attempts < 30) setTimeout(callGenerator, 200);
            else showAppToast('error', 'Preview PDF generator not available');
          };
          setTimeout(callGenerator, 300);
          return;
        }
      } catch (e) {
        // continue to fallback method below
      }

      const html = buildSeatTemplateHtml();
      if (!html) return;

      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;

      // remove action buttons from PDF
      const actions = wrapper.querySelector(".actions");
      if (actions) actions.remove();

      const sheet = wrapper.querySelector(".sheet");
      if (!sheet) {
        showAppToast("error", "Template content not found");
        return;
      }

      // create a hidden-but-in-viewport container for clean PDF render
      // (placing it offscreen or with negative z-index can cause html2canvas to capture a blank page)
      const pdfContainer = document.createElement("div");
      pdfContainer.style.position = "fixed";
      pdfContainer.style.left = "0";
      pdfContainer.style.top = "0";
      pdfContainer.style.width = "794px"; // A4 width approx at 96dpi
      pdfContainer.style.background = "#ffffff";
      pdfContainer.style.padding = "0";
      pdfContainer.style.zIndex = "99999";
      // keep it visually hidden but renderable by html2canvas
      pdfContainer.style.opacity = "0.01";
      pdfContainer.style.pointerEvents = "none";

      // prefer using the built HTML's own styles so preview and PDF match
      const headStyle = wrapper.querySelector("head > style, style");
      if (headStyle) {
        pdfContainer.appendChild(headStyle.cloneNode(true));
      } else {
        const style = document.createElement("style");
        style.innerHTML = `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Times New Roman", serif;
      background: #fff;
      color: #111;
    }
    .sheet {
      width: 210mm;
      min-height: 297mm;
      padding: 5mm;
      background: #fff;
      color: #111;
      font-family: "Times New Roman", serif;
    }
    .line-row {
      display: flex;
      align-items: center;
    }
    .value {
      line-height: 1.35;
      padding-bottom: 1px;
    }
  `;
        pdfContainer.appendChild(style);
      }
      pdfContainer.appendChild(sheet.cloneNode(true));
      document.body.appendChild(pdfContainer);

      // allow browser to paint so html2canvas captures layout
      await new Promise((r) => setTimeout(r, 80));

      // briefly make it fully visible for capture (still offscreen to user)
      pdfContainer.style.opacity = "1";
      pdfContainer.style.pointerEvents = "none";
      await new Promise((r) => setTimeout(r, 80));

      const element = pdfContainer;

      const opt = {
        margin: [5, 5, 5, 5],
        filename: `seat-template-${selectedBus?.busNumber || "bus"}-${date || "date"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
        },
      };

      // Use html2canvas + jsPDF directly to avoid blank PDFs from html2pdf
      const [html2canvasModule, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import(/* webpackChunkName: 'jspdf' */ "jspdf"),
      ]);
      const html2canvas = html2canvasModule?.default || html2canvasModule;
      const { jsPDF } = jsPdfModule;

      const canvas = await html2canvas(element, {
        scale: opt.html2canvas.scale || 2,
        useCORS: true,
        backgroundColor: opt.html2canvas.backgroundColor || "#ffffff",
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      // A4 sizes in mm
      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      const marginTop = (opt.margin && opt.margin[0]) || 5;
      const marginRight = (opt.margin && opt.margin[1]) || 5;
      const marginBottom = (opt.margin && opt.margin[2]) || 5;
      const marginLeft = (opt.margin && opt.margin[3]) || 5;

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

      const pdfWidth = A4_WIDTH_MM - marginLeft - marginRight;
      const pdfHeight = A4_HEIGHT_MM - marginTop - marginBottom;

      // convert canvas px -> mm at ratio
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgWidthMm = pdfWidth;
      const imgHeightMm = (canvasHeight * imgWidthMm) / canvasWidth;

      // If image fits on one page
      if (imgHeightMm <= pdfHeight) {
        pdf.addImage(imgData, "JPEG", marginLeft, marginTop, imgWidthMm, imgHeightMm);
      } else {
        // split into pages
        const pxPerMm = canvasWidth / imgWidthMm;
        const pageHeightPx = Math.floor(pdfHeight * pxPerMm);
        let remainingHeightPx = canvasHeight;
        let positionY = 0;
        const tmpCanvas = document.createElement("canvas");
        const tmpCtx = tmpCanvas.getContext("2d");

        while (remainingHeightPx > 0) {
          const sliceHeightPx = Math.min(pageHeightPx, remainingHeightPx);
          tmpCanvas.width = canvasWidth;
          tmpCanvas.height = sliceHeightPx;
          tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
          tmpCtx.drawImage(canvas, 0, positionY, canvasWidth, sliceHeightPx, 0, 0, canvasWidth, sliceHeightPx);

          const sliceData = tmpCanvas.toDataURL("image/jpeg", 0.98);
          const sliceHeightMm = (sliceHeightPx * imgWidthMm) / canvasWidth;

          if (positionY > 0) pdf.addPage();
          pdf.addImage(sliceData, "JPEG", marginLeft, marginTop, imgWidthMm, sliceHeightMm);

          positionY += sliceHeightPx;
          remainingHeightPx -= sliceHeightPx;
        }
      }

      pdf.save(opt.filename);

      document.body.removeChild(pdfContainer);
      showAppToast("success", "Seat template PDF downloaded");
    } catch (error) {
      console.error(error);
      showAppToast("error", "Failed to download PDF");
    }
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
                        <div className="flex items-start gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                            <BusFront className="h-7 w-7 text-[#f97316]" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <h3 className="truncate text-2xl font-bold tracking-tight text-slate-900">
                                  {bus.busNumber}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 md:text-base">
                                  {bus.busName} • {bus.busType}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[#f97316]">
                                    {String(bus.seatLayout || "")} Seats
                                  </span>
                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {bus.busType}
                                  </span>
                                </div>
                              </div>

                              <div className="w-full lg:w-auto">
                                <button
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-[#ea580c] lg:w-auto"
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
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
                  SEAT LAYOUT VIEW
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedBus.busNumber} — {selectedBus.routeName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {`${resolvePointValue(selectedBus.startPoint, "--")} → ${resolvePointValue(
                    selectedBus.endPoint,
                    "--"
                  )} • ${selectedBus.startTime || "--:--"} → ${selectedBus.endTime || "--:--"}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePrintSeatTemplate}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Print Template
                </button>

                <button
                  onClick={handleDownloadSeatTemplate}
                  className="rounded-2xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ea580c]"
                >
                  Download PDF
                </button>

                <button
                  onClick={closeBusModal}
                  className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100"
                >
                  <X className="h-6 w-6" />
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
                        onChange={(e) => setBookingForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2"
                        disabled={!editingSeat && selectedSeats.length === 0}
                      />

                      <input
                        placeholder="Phone number"
                        value={bookingForm.phone ?? ""}
                        onChange={(e) => setBookingForm((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2"
                        disabled={!editingSeat && selectedSeats.length === 0}
                      />

                      <input
                        placeholder="Email"
                        value={bookingForm.email ?? ""}
                        onChange={(e) => setBookingForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2"
                        disabled={!editingSeat && selectedSeats.length === 0}
                      />

                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {/* Pickup */}
                        <div>
                          <select
                            value={bookingForm.pickup ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const time = getStopTime(selectedBus, val);

                              setBookingForm((p) => ({
                                ...p,
                                pickup: val,
                                pickupTime: time,
                                drop: "",
                                dropTime: "",
                              }));
                            }}
                            className="w-full rounded-lg border px-3 py-2"
                            disabled={!editingSeat && selectedSeats.length === 0}
                          >
                            <option value="">Select pickup</option>
                            {pickupOptions.map((stop, i) => (
                              <option key={i} value={stop}>
                                {stop}
                              </option>
                            ))}
                          </select>

                          <input
                            type="time"
                            value={bookingForm.pickupTime ?? ""}
                            onChange={(e) =>
                              setBookingForm((p) => ({
                                ...p,
                                pickupTime: e.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded-lg border px-3 py-2"
                            disabled={!editingSeat && selectedSeats.length === 0}
                          />
                        </div>

                        {/* Drop */}
                        <div>
                          <select
                            value={bookingForm.drop ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const time = getStopTime(selectedBus, val);

                              setBookingForm((p) => ({
                                ...p,
                                drop: val,
                                dropTime: time,
                              }));
                            }}
                            className="w-full rounded-lg border px-3 py-2"
                            disabled={(!editingSeat && selectedSeats.length === 0) || !bookingForm.pickup}
                          >
                            <option value="">Select drop</option>
                            {dropOptions.map((stop, i) => {
                              const fare = calculateFare(selectedBus, bookingForm.pickup, stop, date);

                              return (
                                <option key={i} value={stop}>
                                  {fare !== null ? `${stop} — ₹${fare}` : `${stop} — Fare N/A`}
                                </option>
                              );
                            })}
                          </select>

                          <input
                            type="time"
                            value={bookingForm.dropTime ?? ""}
                            onChange={(e) =>
                              setBookingForm((p) => ({
                                ...p,
                                dropTime: e.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded-lg border px-3 py-2"
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

                            <button
                              onClick={() => handleCancelSeat(editingSeat)}
                              disabled={confirmOpen}
                              className="rounded-xl border border-red-200 px-4 py-2 text-red-600"
                            >
                              Cancel Booking
                            </button>
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
                                  {b.pickup || "-"}
                                  {b.pickupTime ? ` (${b.pickupTime})` : ""} → {b.drop || "-"}
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

                                <button
                                  onClick={() => handleCancelSeat(seat)}
                                  disabled={confirmOpen}
                                  className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600"
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
                  onChange={(e) => setBlockDetails((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                />

                <input
                  placeholder="Phone"
                  value={blockDetails.phone}
                  onChange={(e) => setBlockDetails((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                />

                <input
                  placeholder="Email"
                  value={blockDetails.email}
                  onChange={(e) => setBlockDetails((p) => ({ ...p, email: e.target.value }))}
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
                    {viewBooking.booking?.pickupTime ? ` (${viewBooking.booking?.pickupTime})` : ""} →{" "}
                    {viewBooking.booking?.drop || "-"}
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