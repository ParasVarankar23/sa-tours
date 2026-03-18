"use client";

import SeatLayout from "@/components/SeatLayout";
import { showAppToast } from "@/lib/client/toast";
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

function buildRouteStops(bus) {
  if (!bus) return [];

  const middleStops = Array.isArray(bus.stops)
    ? bus.stops
      .map((s) => (typeof s === "string" ? s : s?.stopName))
      .filter(Boolean)
      .map((s) => normalizeText(s))
    : [];

  return [
    normalizeText(bus.startPoint),
    ...middleStops,
    normalizeText(bus.endPoint),
  ].filter(Boolean);
}

function getStopTime(bus, stopName) {
  if (!bus || !stopName) return "";

  if (normalizeKey(bus.startPoint) === normalizeKey(stopName)) {
    return normalizeText(bus.startTime);
  }

  if (normalizeKey(bus.endPoint) === normalizeKey(stopName)) {
    return normalizeText(bus.endTime);
  }

  const found = (bus.stops || []).find((s) => {
    const name = typeof s === "string" ? s : s?.stopName;
    return normalizeKey(name) === normalizeKey(stopName);
  });

  if (!found) return "";
  return typeof found === "string" ? "" : normalizeText(found.time);
}

function getPickupOptions(bus) {
  const stops = buildRouteStops(bus);
  if (stops.length <= 1) return [];
  return stops.slice(0, stops.length - 1);
}

function getDropOptions(bus, pickup) {
  const stops = buildRouteStops(bus);
  if (!pickup) return [];

  const pickupIndex = stops.findIndex((s) => normalizeKey(s) === normalizeKey(pickup));
  if (pickupIndex === -1) return [];

  return stops.slice(pickupIndex + 1);
}

function calculateFare(bus, pickup, drop) {
  if (!bus || !pickup || !drop) return null;

  const rules = Array.isArray(bus.fareRules) ? bus.fareRules : [];

  const exact = rules.find(
    (r) =>
      normalizeKey(r?.from) === normalizeKey(pickup) &&
      normalizeKey(r?.to) === normalizeKey(drop)
  );

  if (!exact) return null;

  const fare = Number(exact.fare);
  if (!Number.isFinite(fare) || fare <= 0) return null;

  return fare;
}

export default function BookingPage() {
  const [date, setDate] = useState("");
  const [buses, setBuses] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookedCounts, setBookedCounts] = useState({}); // { busId: { booked: number, blocked: number } }
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
    note: "",
  });

  const visibleBookings = useMemo(() => {
    return Object.entries(bookings || {}).filter(([, b]) => {
      if (!b) return false;
      // hide blocked seats from the Existing Bookings list
      if (b.status === "blocked") return false;
      return true;
    });
  }, [bookings]);

  const { user } = useAuth();
  const router = useRouter();

  /* =========================
     Fetch buses + schedules
  ========================= */
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

  /* =========================
     Fetch bookings for selected bus/date
  ========================= */
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
        if (!/^[0-9]+$/.test(k)) return false;
        if (Number(k) < 1) return false;
        if (!v || typeof v !== "object") return false;

        const hasMeaningful = Boolean(
          (v.name && String(v.name).trim()) ||
          (v.phone && String(v.phone).trim()) ||
          (v.email && String(v.email).trim()) ||
          v.status ||
          v.payment ||
          v.fare
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

  /* =========================
     Fare Calculation
  ========================= */
  useEffect(() => {
    if (!selectedBus || !bookingForm.pickup || !bookingForm.drop) {
      setComputedFare(null);
      return;
    }

    const fare = calculateFare(selectedBus, bookingForm.pickup, bookingForm.drop);
    setComputedFare(fare);
  }, [selectedBus, bookingForm.pickup, bookingForm.drop]);

  /* =========================
     Available buses for date
  ========================= */
  const availableBuses = useMemo(() => {
    if (!date) return [];

    return buses.filter((bus) => {
      const busSched = schedules[bus.busId] || {};
      return busSched[date] && busSched[date].available;
    });
  }, [date, buses, schedules]);

  // fetch booked counts for available buses on the selected date
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

              // Only count numeric seat keys (1,2,3...) and ignore any metadata keys
              for (const key of Object.keys(raw)) {
                if (!/^[0-9]+$/.test(key)) continue;
                if (Number(key) < 1) continue;

                const rec = raw[key] || {};
                if (rec && rec.status === "blocked") {
                  blocked++;
                } else {
                  // count only meaningful booking records (same filter used in fetchBookings)
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
        for (const r of results) map[r.busId] = { booked: Number(r.booked) || 0, blocked: Number(r.blocked) || 0 };
        setBookedCounts(map);
      } catch (e) {
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

  /* =========================
     Handlers
  ========================= */
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

    if (computedFare === null) {
      return showAppToast("error", "Fare not available for selected pickup and drop");
    }

    try {
      const results = [];

      for (const seatNo of seatsToProcess) {
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
          fare: Number(computedFare),
        };

        const method = editingSeat ? "PUT" : "POST";

        const res = await fetch("/api/booking", {
          method,
          headers: { "Content-Type": "application/json" },
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

    if (computedFare === null) {
      return showAppToast("error", "Fare not available for selected pickup and drop");
    }

    try {
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
        fare: Number(computedFare),
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
              paymentRecord.id ||
              paymentRecord.paymentId ||
              resp.razorpay_payment_id;

            for (const payload of bookingsPayload) {
              const withPayment = {
                ...payload,
                payment: paymentId,
                paymentMethod: "razorpay",
              };

              const bRes = await fetch("/api/booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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

    if (computedFare === null) {
      return showAppToast("error", "Fare not available for selected pickup and drop");
    }

    try {
      const created = [];

      for (const seatNo of seats) {
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
          fare: Number(computedFare),
        };

        const res = await fetch("/api/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create booking");

        created.push({ seat: seatNo });
      }

      const token = localStorage.getItem("authToken");

      if (token) {
        for (const c of created) {
          const payload = {
            amount: Number(computedFare) || 0,
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
          } catch (e) {
            console.warn("offline payment record failed", e);
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
          action: "block",
          note: blockDetails.note || null,
          details: {
            name: blockDetails.name || null,
            phone: blockDetails.phone || null,
            email: blockDetails.email || null,
          },
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
        throw new Error(data.error || "Block failed");
      }

      showAppToast("success", "Seats blocked for admin");
      setBlockModalOpen(false);
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

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
            SA TOURS BOOKING
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Select Bus & View Seats
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose a date to see available buses, then open the seat layout.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-[#f97316]" />
          <span className="text-sm font-semibold text-slate-700">
            Live Availability View
          </span>
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
          <label className="mb-3 block text-sm font-semibold text-slate-700">
            Select Travel Date
          </label>

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
        {/* Header */}
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Available Buses</h2>
          <p className="mt-1 text-sm text-slate-500">
            {date
              ? `Showing ${availableBuses.length} available bus(es) for ${date}`
              : "Select a date to view available buses"}
          </p>
        </div>

        {/* Content */}
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
                    className="rounded-[24px] border border-slate-200 bg-white p-4 md:p-5 shadow-sm transition-all duration-200 hover:border-orange-200 hover:shadow-md"
                  >
                    {/* Top Row */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      {/* Left */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                            <BusFront className="h-7 w-7 text-[#f97316]" />
                          </div>

                          {/* Main Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <h3 className="truncate text-2xl font-bold tracking-tight text-slate-900">
                                  {bus.busNumber}
                                </h3>
                                <p className="mt-1 text-sm md:text-base text-slate-500">
                                  {bus.busName} • {bus.busType}
                                </p>

                                {/* Small Tags */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[#f97316]">
                                    {String(bus.seatLayout || "")} Seats
                                  </span>
                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {bus.busType}
                                  </span>
                                </div>
                              </div>

                              {/* Button */}
                              <div className="w-full lg:w-auto">
                                <button
                                  className="inline-flex w-full lg:w-auto items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-[#ea580c]"
                                  onClick={() => openBusModal(bus)}
                                >
                                  <Eye className="h-4 w-4" />
                                  View Seats
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Compact Stats */}
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                          <MiniStat label="Total" value={totalSeats} bg="bg-orange-50" text="text-orange-600" />
                          <MiniStat label="Booked" value={booked} bg="bg-slate-100" text="text-slate-700" />
                          <MiniStat label="Blocked" value={blocked} bg="bg-amber-50" text="text-amber-700" />
                          <MiniStat label="Cabins" value={cabins} bg="bg-indigo-50" text="text-indigo-700" />
                          <MiniStat label="Available" value={available} bg="bg-green-50" text="text-green-700" />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <CompactInfoCard
                        icon={<Route className="h-4 w-4 text-[#f97316]" />}
                        label="Route"
                        value={bus.routeName || "--"}
                      />
                      <CompactInfoCard
                        icon={<MapPin className="h-4 w-4 text-[#f97316]" />}
                        label="Path"
                        value={`${bus.startPoint || "--"} → ${bus.endPoint || "--"}`}
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
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
                  SEAT LAYOUT VIEW
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedBus.busNumber} — {selectedBus.routeName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedBus.startPoint} → {selectedBus.endPoint} •{" "}
                  {selectedBus.startTime} → {selectedBus.endTime}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {user?.role === "admin" && (
                  <button
                    onClick={() =>
                      router.push(
                        `/admin/schedule?busId=${encodeURIComponent(
                          selectedBus.busId
                        )}&date=${encodeURIComponent(date)}`
                      )
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Manage Route / Edit Fare
                  </button>
                )}

                <button
                  onClick={closeBusModal}
                  className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
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
                  value={`${selectedBus.startTime || "--:--"} → ${selectedBus.endTime || "--:--"
                    }`}
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
                      });

                      setSelectedSeats((prev) => {
                        const id = String(s);
                        if (prev.includes(id)) return prev.filter((x) => x !== id);
                        return [...prev, id];
                      });
                    }}
                  />

                  {/* Admin controls */}
                  {user && (user.role === "admin" || user.role === "owner") && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          const seats = editingSeat ? [editingSeat] : selectedSeats;
                          if (!seats.length) {
                            return showAppToast("error", "Select seats to block");
                          }
                          setBlockDetails({ name: "", phone: "", email: "", note: "" });
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

                {/* Booking Form + Existing Bookings */}
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Booking Form */}
                  <div className="md:col-span-2 rounded-2xl border p-4">
                    <h4 className="mb-2 font-semibold">Passenger Details</h4>

                    <div className="space-y-3">
                      <input
                        placeholder="Name"
                        value={bookingForm.name ?? ""}
                        onChange={(e) =>
                          setBookingForm((p) => ({ ...p, name: e.target.value }))
                        }
                        className="w-full rounded-lg border px-3 py-2"
                        disabled={!editingSeat && selectedSeats.length === 0}
                      />

                      <input
                        placeholder="Phone number"
                        value={bookingForm.phone ?? ""}
                        onChange={(e) =>
                          setBookingForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="w-full rounded-lg border px-3 py-2"
                        disabled={!editingSeat && selectedSeats.length === 0}
                      />

                      <input
                        placeholder="Email"
                        value={bookingForm.email ?? ""}
                        onChange={(e) =>
                          setBookingForm((p) => ({ ...p, email: e.target.value }))
                        }
                        className="w-full rounded-lg border px-3 py-2"
                        disabled={!editingSeat && selectedSeats.length === 0}
                      />

                      <div className="grid grid-cols-2 gap-2">
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
                            disabled={
                              (!editingSeat && selectedSeats.length === 0) || !bookingForm.pickup
                            }
                          >
                            <option value="">Select drop</option>
                            {dropOptions.map((stop, i) => {
                              const fare = calculateFare(
                                selectedBus,
                                bookingForm.pickup,
                                stop
                              );
                              return (
                                <option key={i} value={stop}>
                                  {fare !== null
                                    ? `${stop} — ₹${fare}`
                                    : `${stop} — Fare N/A`}
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

                      {/* Fare Summary */}
                      {(editingSeat ? 1 : selectedSeats.length) > 0 && (
                        <div className="mt-2 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
                          {computedFare !== null ? (
                            <div className="flex flex-wrap items-center gap-6">
                              <div className="text-sm text-slate-600">
                                Fare per seat:{" "}
                                <span className="font-semibold">
                                  ₹{Number(computedFare).toFixed(2)}
                                </span>
                              </div>
                              <div className="text-sm text-slate-700">
                                Total:{" "}
                                <span className="text-lg font-bold">
                                  ₹
                                  {(
                                    Number(computedFare) *
                                    (editingSeat ? 1 : selectedSeats.length)
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm font-medium text-red-600">
                              Fare not available for selected pickup & drop
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
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
                        <div className="text-sm text-slate-500">
                          No bookings for this bus/date.
                        </div>
                      ) : (
                        visibleBookings.map(([seat, b]) => (
                          <div key={seat} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-lg font-bold text-slate-900">
                                  Seat {seat}
                                </div>
                                <div className="mt-1 text-sm text-slate-700">
                                  {b.name || "—"}{" "}
                                  <span className="mx-2 text-slate-400">•</span>{" "}
                                  {b.phone || "—"}
                                </div>

                                {b.email ? (
                                  <div className="mt-1 text-sm text-slate-500">
                                    {b.email}
                                  </div>
                                ) : null}

                                <div className="mt-2 text-sm text-slate-400">
                                  {b.pickup || "-"}
                                  {b.pickupTime ? ` (${b.pickupTime})` : ""} → {b.drop || "-"}
                                  {b.dropTime ? ` (${b.dropTime})` : ""}
                                </div>

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
                                    });

                                    const fare = calculateFare(
                                      selectedBus,
                                      b.pickup || "",
                                      b.drop || ""
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
            } catch (e) {
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
                  onChange={(e) =>
                    setBlockDetails((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />

                <input
                  placeholder="Phone"
                  value={blockDetails.phone}
                  onChange={(e) =>
                    setBlockDetails((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />

                <input
                  placeholder="Email"
                  value={blockDetails.email}
                  onChange={(e) =>
                    setBlockDetails((p) => ({ ...p, email: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />

                <textarea
                  placeholder="Note (optional)"
                  value={blockDetails.note}
                  onChange={(e) =>
                    setBlockDetails((p) => ({ ...p, note: e.target.value }))
                  }
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
                    Seat {viewBooking.seat}
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
                              return showAppToast(
                                "error",
                                "Unauthorized — please login as admin"
                              );
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
                      });

                      const fare = calculateFare(selectedBus, b.pickup || "", b.drop || "");
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

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>
      <p className="text-sm font-medium text-slate-800">{value}</p>
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
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold ${text}`}>{value}</p>
    </div>
  );
}

function CompactInfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2">
        {icon}
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
      </div>
      <p className="text-base md:text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}