"use client";

import SeatLayout from "@/components/SeatLayout";
import { showAppToast } from "@/lib/client/toast";
import pickupUtils from "@/lib/pickupDropUtils";
import { calculateFare } from "@/lib/pricing";
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

export default function BookingPage() {
  const [date, setDate] = useState("");
  const [buses, setBuses] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookings, setBookings] = useState({});
  const [viewBooking, setViewBooking] = useState(null);
  const [bookingForm, setBookingForm] = useState({ name: "", phone: "", email: "", pickup: "", pickupTime: "", drop: "", dropTime: "" });
  const [editingSeat, setEditingSeat] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(() => async () => { });
  const { user } = useAuth();
  const router = useRouter();
  const [computedFare, setComputedFare] = useState(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockDetails, setBlockDetails] = useState({ name: "", phone: "", email: "", note: "" });

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [bRes, sRes] = await Promise.all([
          fetch("/api/bus"),
          fetch("/api/schedule"),
        ]);

        const bData = await bRes.json();
        const sData = await sRes.json();

        if (!bRes.ok) {
          throw new Error(bData.error || "Failed to load buses");
        }

        if (!sRes.ok) {
          throw new Error(sData.error || "Failed to load schedules");
        }

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
      // sanitize bookings: ensure each seat entry is an object and ignore invalid seat keys (e.g. "0")
      const raw = data.bookings || {};
      const entries = Object.entries(raw).filter(([k, v]) => {
        if (!/^[0-9]+$/.test(k)) return false;
        const n = Number(k);
        if (n < 1) {
          console.warn(`Ignoring invalid booking seat key: ${k}`);
          return false;
        }
        if (!v || typeof v !== "object") return false;

        // Ignore empty booking nodes that have no meaningful data
        const hasMeaningful = Boolean(
          (v.name && String(v.name).trim()) ||
          (v.phone && String(v.phone).trim()) ||
          (v.email && String(v.email).trim()) ||
          v.status ||
          v.blockedInfo ||
          v.payment ||
          v.fare
        );
        return hasMeaningful;
      });
      const safe = Object.fromEntries(
        entries.map(([k, v]) => [k, v && typeof v === "object" ? v : {}])
      );
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
    try {
      const busForPricing = { ...(selectedBus || {}) };
      const sched = (schedules && schedules[selectedBus.busId] && schedules[selectedBus.busId][date]) || null;
      if (sched && sched.pricingOverride) {
        busForPricing.pricingRules = { ...(selectedBus.pricingRules || {}), ...(sched.pricingOverride || {}) };
      }
      const season = !!(sched && sched.season);
      const res = calculateFare({ bus: busForPricing, fromStop: bookingForm.pickup, toStop: bookingForm.drop, busType: selectedBus.busType || "AC", season });
      setComputedFare(res && res.fare ? res.fare : 0);
    } catch (e) {
      setComputedFare(null);
    }
  }, [bookingForm.pickup, bookingForm.drop, selectedBus, date, schedules]);

  // helper: get schedule terminals for selected bus/date
  const scheduleTerminals = useMemo(() => {
    if (!selectedBus || !date) return null;
    const sched = (schedules && schedules[selectedBus.busId] && schedules[selectedBus.busId][date]) || null;
    return (sched && sched.pricingOverride && sched.pricingOverride.terminals) || null;
  }, [selectedBus, date, schedules]);

  const bookingConfig = useMemo(() => {
    return pickupUtils.getEffectiveBookingConfig(schedules, selectedBus, date || "");
  }, [schedules, selectedBus, date]);

  const availableBuses = useMemo(() => {
    if (!date) return [];

    // schedules format: { busId: { 'YYYY-MM-DD': { available: true } } }
    return buses.filter((bus) => {
      const busSched = schedules[bus.busId] || {};
      return busSched[date] && busSched[date].available;
    });
  }, [date, buses, schedules]);

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
                setSelectedSeats([]);
                setEditingSeat(null);
                setBookingForm({ name: "", phone: "", email: "", pickup: "", pickupTime: "", drop: "", dropTime: "" });
              }}
            />
          </div>
        </div>
      </div>

      {/* Bus List */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Available Buses
          </h2>
          <p className="text-sm text-slate-500">
            {date
              ? `Showing ${availableBuses.length} available bus(es) for ${date}`
              : "Select a date to view available buses"}
          </p>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                Loading buses and schedules...
              </p>
            </div>
          ) : !date ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                Please select a date first
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Available buses will appear here after selecting a travel date.
              </p>
            </div>
          ) : availableBuses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                No buses available for this date
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Try another date or ask admin to schedule buses.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {availableBuses.map((bus) => (
                <div
                  key={bus.busId}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex-1">
                      {/* Top Bus Info */}
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                            <BusFront className="h-7 w-7 text-[#f97316]" />
                          </div>

                          <div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {bus.busNumber}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {bus.busName} • {bus.busType}
                            </p>
                          </div>
                        </div>

                        <div className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-xs font-semibold text-[#f97316]">
                          {bus.seatLayout} Seats
                        </div>
                      </div>

                      {/* Route Info */}
                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <InfoCard
                          icon={<Route className="h-4 w-4 text-[#f97316]" />}
                          label="Route"
                          value={bus.routeName || "--"}
                        />
                        <InfoCard
                          icon={<MapPin className="h-4 w-4 text-[#f97316]" />}
                          label="Path"
                          value={`${bus.startPoint || "--"} → ${bus.endPoint || "--"}`}
                        />
                        <InfoCard
                          icon={<Clock3 className="h-4 w-4 text-[#f97316]" />}
                          label="Timing"
                          value={`${bus.startTime || "--:--"} → ${bus.endTime || "--:--"}`}
                        />
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex xl:justify-end">
                      <button
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#ea580c]"
                        onClick={() => { setSelectedBus(bus); setSelectedSeats([]); setEditingSeat(null); setBookingForm({ name: "", phone: "", email: "", pickup: "", pickupTime: "", drop: "", dropTime: "" }); }}
                      >
                        <Eye className="h-5 w-5" />
                        View Seats
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
                  SEAT LAYOUT VIEW
                </p>
                <div>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {selectedBus.busNumber} — {selectedBus.routeName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedBus.startPoint} → {selectedBus.endPoint} • {selectedBus.startTime} → {selectedBus.endTime}
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => {
                      // navigate to schedule admin for quick fare edits
                      router.push(`/admin/schedule?busId=${encodeURIComponent(selectedBus.busId)}&date=${encodeURIComponent(date)}`);
                    }}
                    className="ml-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Manage Route / Edit Fare
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setSelectedBus(null); setSelectedSeats([]); setEditingSeat(null); setBookingForm({ name: "", phone: "", email: "", pickup: "", pickupTime: "", drop: "", dropTime: "" }); }}
                className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-6 w-6" />
              </button>
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
                  value={`${selectedBus.startTime || "--:--"} → ${selectedBus.endTime || "--:--"}`}
                  icon={<Clock3 className="h-6 w-6 text-[#f97316]" />}
                />
              </div>

              <div className="rounded-3xl border border-orange-100 bg-orange-50/30 p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    Bus Seat Layout
                  </h3>
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
                      // toggle seat in selectedSeats
                      setEditingSeat(null);
                      setBookingForm({ name: "", phone: "", email: "", pickup: "", pickupTime: "", drop: "", dropTime: "" });
                      setSelectedSeats((prev) => {
                        const id = String(s);
                        if (prev.includes(id)) return prev.filter((x) => x !== id);
                        return [...prev, id];
                      });
                    }}
                  />
                  {/* Admin controls: block/unblock seats and mark offline payment */}
                  {user && (user.role === "admin" || user.role === "owner") && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          const seats = editingSeat ? [editingSeat] : selectedSeats;
                          if (!seats || seats.length === 0) return showAppToast("error", "Select seats to block");
                          setBlockDetails({ name: "", phone: "", email: "", note: "" });
                          setBlockModalOpen(true);
                        }}
                        className="rounded-xl bg-yellow-500 px-3 py-2 text-white text-sm"
                      >
                        Block Selected Seats
                      </button>

                      <button
                        onClick={async () => {
                          const seats = editingSeat ? [editingSeat] : selectedSeats;
                          if (!seats || seats.length === 0) return showAppToast("error", "Select seats to unblock");
                          try {
                            const token = localStorage.getItem('authToken');
                            if (!token) return showAppToast('error', 'Unauthorized — please login as admin');

                            const res = await fetch(`/api/admin/block-seats`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ busId: selectedBus.busId, date, seats, action: "unblock" }),
                            });
                            const data = await res.json();
                            if (!res.ok) {
                              if (res.status === 401) return showAppToast('error', 'Unauthorized — invalid/expired token. Please login again.');
                              if (res.status === 403) return showAppToast('error', 'Forbidden — admin access required');
                              throw new Error(data.error || "Unblock failed");
                            }
                            showAppToast("success", "Seats unblocked");
                            await fetchBookings();
                            setSelectedSeats([]);
                          } catch (e) {
                            console.error(e);
                            showAppToast("error", e.message || "Unblock failed");
                          }
                        }}
                        className="rounded-xl border px-3 py-2 text-sm"
                      >
                        Unblock Selected Seats
                      </button>

                      {/* Removed unused 'Mark Selected as Paid (Offline)' button per request */}
                    </div>
                  )}
                </div>

                {/* Booking form & existing bookings */}
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
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

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <select
                            value={bookingForm.pickup ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              // auto-fill pickupTime from selectedBus stops if available
                              let time = "";
                              try {
                                const stops = selectedBus?.stops || [];
                                const found = stops.find((s) => (s && (s.stopName || s)) === val || s === val || (s.stopName && s.stopName === val));
                                if (found) time = found.time || found.stopTime || "";
                              } catch (err) {
                                // ignore
                              }
                              setBookingForm((p) => ({ ...p, pickup: val, pickupTime: time }));
                            }}
                            className="w-full rounded-lg border px-3 py-2"
                            disabled={!editingSeat && selectedSeats.length === 0}
                          >
                            <option value="">Select pickup</option>
                            {(() => {
                              const picks = pickupUtils.getPickupOptions(selectedBus?.stops || [], bookingConfig || {});
                              return picks.map((name, i) => (
                                <option key={i} value={name}>{name}</option>
                              ));
                            })()}
                          </select>

                          <input
                            type="time"
                            value={bookingForm.pickupTime ?? ""}
                            onChange={(e) => setBookingForm((p) => ({ ...p, pickupTime: e.target.value }))}
                            className="w-full mt-2 rounded-lg border px-3 py-2"
                            disabled={!editingSeat && selectedSeats.length === 0}
                            placeholder="Pickup time"
                          />
                        </div>

                        <div>
                          <select
                            value={bookingForm.drop ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              let time = "";
                              try {
                                const stops = selectedBus?.stops || [];
                                const found = stops.find((s) => (s && (s.stopName || s)) === val || s === val || (s.stopName && s.stopName === val));
                                if (found) time = found.time || found.stopTime || "";
                              } catch (err) {
                                // ignore
                              }
                              setBookingForm((p) => ({ ...p, drop: val, dropTime: time }));
                            }}
                            className="w-full rounded-lg border px-3 py-2"
                            disabled={!editingSeat && selectedSeats.length === 0}
                          >
                            <option value="">Select drop</option>
                            {(() => {
                              const groups = pickupUtils.getDropGroups(selectedBus?.stops || [], bookingForm.pickup, bookingConfig || {});
                              if (!groups || groups.length === 0) return null;
                              return groups.map((g, gi) => (
                                <optgroup key={gi} label={g.label}>
                                  {g.options.map((opt) => (
                                    <option key={`${gi}-${opt.index}`} value={opt.name}>{opt.name}</option>
                                  ))}
                                </optgroup>
                              ));
                            })()}
                          </select>

                          <input
                            type="time"
                            value={bookingForm.dropTime ?? ""}
                            onChange={(e) => setBookingForm((p) => ({ ...p, dropTime: e.target.value }))}
                            className="w-full mt-2 rounded-lg border px-3 py-2"
                            disabled={!editingSeat && selectedSeats.length === 0}
                            placeholder="Drop time"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-sm text-slate-500">Selected Seat(s):</div>
                        <div className="font-semibold">{(editingSeat ? [editingSeat] : selectedSeats).length ? (editingSeat ? editingSeat : selectedSeats.join(", ")) : "—"}</div>
                      </div>

                      {/* Fare summary: show per-seat fare and total when pickup/drop selected */}
                      {(computedFare !== null && (Number(computedFare) || 0) >= 0) && ((editingSeat ? 1 : selectedSeats.length) > 0) && (
                        <div className="mt-2 flex items-center gap-6">
                          <div className="text-sm text-slate-600">Fare <span className="font-semibold">₹{(Number(computedFare) || 0).toFixed(2)}</span></div>
                          <div className="text-sm text-slate-700">Total: <span className="text-lg font-bold">₹{((Number(computedFare) || 0) * (editingSeat ? 1 : selectedSeats.length)).toFixed(2)}</span></div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            // create or update booking for multiple seats
                            const seatsToProcess = editingSeat ? [editingSeat] : selectedSeats;
                            if (!seatsToProcess || seatsToProcess.length === 0) return showAppToast("error", "Select at least one seat first");
                            if (!bookingForm.name || !bookingForm.phone) return showAppToast("error", "Provide name and phone");

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
                                };
                                if (computedFare !== null) payload.fare = Number(computedFare) || 0;

                                const method = editingSeat ? "PUT" : "POST";
                                const res = await fetch("/api/booking", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                                const data = await res.json();
                                results.push({ seat: seatNo, ok: res.ok, data });
                                if (!res.ok) break;
                              }

                              const firstFail = results.find((r) => !r.ok);
                              if (firstFail) throw new Error(firstFail.data.error || `Failed for seat ${firstFail.seat}`);

                              showAppToast("success", editingSeat ? "Booking updated" : "Seats booked");
                              // refresh bookings
                              await fetchBookings();
                              setSelectedSeats([]);
                              setBookingForm({ name: "", phone: "", email: "", pickup: "", pickupTime: "", drop: "", dropTime: "" });
                            } catch (err) {
                              console.error(err);
                              showAppToast("error", err.message || "Booking failed");
                            }
                          }}
                          className={editingSeat ? "rounded-xl bg-[#059669] px-4 py-2 text-white" : "hidden"}
                        >
                          {editingSeat ? "Update Booking" : "Create Booking"}
                        </button>

                        {/* When not editing, show Online and Offline booking actions */}
                        {!editingSeat && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={async () => {
                                // Online booking via Razorpay (admin)
                                const seats = selectedSeats;
                                if (!seats || seats.length === 0) return showAppToast('error', 'Select at least one seat to book');
                                if (!bookingForm.name || !bookingForm.phone) return showAppToast('error', 'Provide name and phone');

                                try {
                                  const bookingsPayload = seats.map((seatNo) => {
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
                                    };
                                    if (computedFare !== null) payload.fare = Number(computedFare) || 0;
                                    return payload;
                                  });

                                  const totalAmount = bookingsPayload.reduce((s, b) => s + (Number(b.fare) || 0), 0);
                                  if (!totalAmount || totalAmount <= 0) return showAppToast('error', 'Invalid fare amount');

                                  const orderRes = await fetch('/api/public/create-razorpay-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: totalAmount, currency: 'INR' }) });
                                  const orderData = await orderRes.json();
                                  if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create payment order');
                                  const order = orderData.order;
                                  const publicKey = orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
                                  if (!publicKey) {
                                    console.error('Razorpay public key missing from create-order response', orderData);
                                    showAppToast('error', 'Payment initialization failed: missing Razorpay key. Set NEXT_PUBLIC_RAZORPAY_KEY_ID or configure server to return it.');
                                    return;
                                  }

                                  const loaded = await new Promise((resolve) => {
                                    if (typeof window === 'undefined') return resolve(false);
                                    if (window.Razorpay) return resolve(true);
                                    const s = document.createElement('script');
                                    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
                                    s.onload = () => resolve(true);
                                    s.onerror = () => resolve(false);
                                    document.body.appendChild(s);
                                  });
                                  if (!loaded) throw new Error('Failed to load payment gateway');

                                  const options = {
                                    key: publicKey,
                                    amount: order.amount,
                                    currency: order.currency || 'INR',
                                    name: 'SA Tours',
                                    description: 'Booking payment',
                                    order_id: order.id,
                                    handler: async function (resp) {
                                      try {
                                        const vRes = await fetch('/api/public/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: resp.razorpay_payment_id, orderId: resp.razorpay_order_id, signature: resp.razorpay_signature, amount: totalAmount, currency: 'INR' }) });
                                        const vData = await vRes.json();
                                        if (!vRes.ok) throw new Error(vData.error || 'Payment verification failed');
                                        const paymentRecord = vData.payment || {};
                                        const paymentId = paymentRecord.id || paymentRecord.paymentId || resp.razorpay_payment_id;

                                        // create bookings attaching payment
                                        const results = [];
                                        for (const payload of bookingsPayload) {
                                          const withPayment = { ...payload, payment: paymentId, paymentMethod: 'razorpay' };
                                          const bRes = await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withPayment) });
                                          const bData = await bRes.json();
                                          results.push({ ok: bRes.ok, data: bData });
                                        }
                                        const failed = results.find((r) => !r.ok);
                                        if (failed) throw new Error(failed.data?.error || 'Failed to create booking after payment');

                                        showAppToast('success', 'Payment successful and bookings created');
                                        await fetchBookings();
                                        setSelectedSeats([]);
                                        setBookingForm({ name: '', phone: '', email: '', pickup: '', pickupTime: '', drop: '', dropTime: '' });
                                      } catch (err) {
                                        console.error(err);
                                        showAppToast('error', err.message || 'Payment succeeded but booking failed');
                                      }
                                    },
                                    modal: { ondismiss: function () { showAppToast('info', 'Payment cancelled'); } }
                                  };

                                  const rzp = new window.Razorpay(options);
                                  rzp.open();
                                } catch (err) {
                                  console.error(err);
                                  showAppToast('error', err.message || 'Online booking failed');
                                }
                              }}
                              className="rounded-xl bg-[#0ea5a4] px-4 py-2 text-white"
                            >
                              Online Booking
                            </button>

                            <button
                              onClick={async () => {
                                // Offline (cash) booking: create bookings then record offline payment
                                const seats = selectedSeats;
                                if (!seats || seats.length === 0) return showAppToast('error', 'Select at least one seat to book');
                                if (!bookingForm.name || !bookingForm.phone) return showAppToast('error', 'Provide name and phone');
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
                                    };
                                    if (computedFare !== null) payload.fare = Number(computedFare) || 0;

                                    const res = await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.error || 'Failed to create booking');
                                    created.push({ seat: seatNo, booking: data.booking || null });
                                  }

                                  // Now create offline payment and attach for each created booking
                                  const token = localStorage.getItem('authToken');
                                  for (const c of created) {
                                    const bookingMeta = { booking: { date, busId: selectedBus.busId, seatNo: c.seat } };
                                    const payload = { amount: Number(computedFare) || 0, currency: 'INR', userId: null, metadata: bookingMeta, note: 'Cash collected by admin' };
                                    const pRes = await fetch('/api/admin/offline-payment', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
                                    const pData = await pRes.json();
                                    if (!pRes.ok) console.warn('offline payment attach failed', pData);
                                  }

                                  showAppToast('success', 'Offline bookings created');
                                  await fetchBookings();
                                  setSelectedSeats([]);
                                  setBookingForm({ name: '', phone: '', email: '', pickup: '', pickupTime: '', drop: '', dropTime: '' });
                                } catch (err) {
                                  console.error(err);
                                  showAppToast('error', err.message || 'Offline booking failed');
                                }
                              }}
                              className="rounded-xl border px-4 py-2 text-sm"
                            >
                              Offline Booking (Cash)
                            </button>
                          </div>
                        )}

                        {editingSeat && (
                          <button
                            onClick={() => {
                              // open confirm modal and set the action
                              const seat = editingSeat;
                              setConfirmMessage(`Are you sure you want to cancel booking for seat ${seat}? This will delete the booking record and notify the passenger via email.`);
                              setConfirmTarget(seat);
                              setConfirmAction(() => async () => {
                                try {
                                  const res = await fetch(`/api/booking?busId=${selectedBus.busId}&date=${date}&seatNo=${seat}`, { method: "DELETE" });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.error || "Cancel failed");
                                  showAppToast("success", data.message || "Booking cancelled and notification sent");
                                  setSelectedSeats([]);
                                  setBookingForm({ name: "", phone: "", email: "", pickup: "", pickupTime: "", drop: "", dropTime: "" });
                                  setEditingSeat(null);
                                  await fetchBookings();
                                } catch (err) {
                                  console.error(err);
                                  showAppToast("error", err.message || "Cancel failed");
                                  throw err;
                                }
                              });
                              setConfirmOpen(true);
                            }}
                            disabled={confirmOpen}
                            className="rounded-xl border border-red-200 px-4 py-2 text-red-600"
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4">
                    <h4 className="mb-2 font-semibold">Existing Bookings</h4>
                    <div className="space-y-2">
                      {Object.keys(bookings || {}).length === 0 ? (
                        <div className="text-sm text-slate-500">No bookings for this bus/date.</div>
                      ) : (
                        Object.entries(bookings).map(([seat, b]) => (
                          <div key={seat} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-lg font-bold text-slate-900">Seat {seat}</div>
                                <div className="mt-1 text-sm text-slate-700">{b.name || "—"} <span className="mx-2 text-slate-400">•</span> {b.phone || "—"}</div>
                                {b.email ? <div className="mt-1 text-sm text-slate-500">{b.email}</div> : null}
                                <div className="mt-2 text-sm text-slate-400">{b.pickup || "-"}{b.pickupTime ? ` (${b.pickupTime})` : ""} → {b.drop || "-"}{b.dropTime ? ` (${b.dropTime})` : ""}</div>
                              </div>

                              <div className="flex flex-col items-end gap-3">
                                <button
                                  onClick={() => {
                                    setSelectedSeats([seat]);
                                    setEditingSeat(seat);
                                    setBookingForm({ name: b.name || "", phone: b.phone || "", email: b.email || "", pickup: b.pickup || "", pickupTime: b.pickupTime || "", drop: b.drop || "", dropTime: b.dropTime || "" });
                                  }}
                                  className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    const s = seat;
                                    setConfirmMessage(`Are you sure you want to cancel booking for seat ${s}? This will delete the booking record and notify the passenger via email.`);
                                    setConfirmTarget(s);
                                    setConfirmAction(() => async () => {
                                      try {
                                        const res = await fetch(`/api/booking?busId=${selectedBus.busId}&date=${date}&seatNo=${s}`, { method: "DELETE" });
                                        const data = await res.json();
                                        if (!res.ok) throw new Error(data.error || "Cancel failed");
                                        showAppToast("success", data.message || "Booking cancelled and notification sent");
                                        await fetchBookings();
                                      } catch (err) {
                                        console.error(err);
                                        showAppToast("error", err.message || "Cancel failed");
                                        throw err;
                                      }
                                    });
                                    setConfirmOpen(true);
                                  }}
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
      {/* Confirm modal for cancel actions */}
      {confirmOpen && (
        <ConfirmModal
          message={confirmMessage}
          loading={confirmLoading}
          onCancel={() => {
            if (confirmLoading) return;
            setConfirmOpen(false);
            setConfirmTarget(null);
          }}
          onConfirm={async () => {
            if (confirmLoading) return;
            setConfirmLoading(true);
            try {
              await confirmAction();
            } catch (e) {
              // confirmAction already handled toasts/logs
            } finally {
              setConfirmLoading(false);
              setConfirmOpen(false);
              setConfirmTarget(null);
            }
          }}
        />
      )}

      {/* Block seats modal (admin) */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
              <h3 className="text-lg font-bold mb-3">Block Seat(s) — Add details</h3>
              <div className="space-y-3">
                <input placeholder="Name" value={blockDetails.name} onChange={(e) => setBlockDetails((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border px-3 py-2" />
                <input placeholder="Phone" value={blockDetails.phone} onChange={(e) => setBlockDetails((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-lg border px-3 py-2" />
                <input placeholder="Email" value={blockDetails.email} onChange={(e) => setBlockDetails((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border px-3 py-2" />
                <textarea placeholder="Note (optional)" value={blockDetails.note} onChange={(e) => setBlockDetails((p) => ({ ...p, note: e.target.value }))} className="w-full rounded-lg border px-3 py-2" rows={3} />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setBlockModalOpen(false)} className="rounded-2xl border px-4 py-2 text-sm">Cancel</button>
                <button
                  onClick={async () => {
                    try {
                      const seats = editingSeat ? [editingSeat] : selectedSeats;
                      if (!seats || seats.length === 0) return showAppToast('error', 'Select seats to block');
                      const token = localStorage.getItem('authToken');
                      if (!token) return showAppToast('error', 'Unauthorized — please login as admin');

                      const res = await fetch('/api/admin/block-seats', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ busId: selectedBus.busId, date, seats, action: 'block', note: blockDetails.note || null, details: { name: blockDetails.name || null, phone: blockDetails.phone || null, email: blockDetails.email || null } }) });
                      const data = await res.json();
                      if (!res.ok) {
                        if (res.status === 401) return showAppToast('error', 'Unauthorized — invalid/expired token. Please login again.');
                        if (res.status === 403) return showAppToast('error', 'Forbidden — admin access required');
                        throw new Error(data.error || 'Block failed');
                      }
                      showAppToast('success', 'Seats blocked for admin');
                      setBlockModalOpen(false);
                      setSelectedSeats([]);
                      await fetchBookings();
                    } catch (err) {
                      console.error(err);
                      showAppToast('error', err.message || 'Block failed');
                    }
                  }}
                  className="rounded-2xl bg-yellow-500 px-4 py-2 text-sm text-white"
                >
                  Confirm Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View booked seat modal (admin) */}
      {viewBooking && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg font-bold text-slate-900">Seat {viewBooking.seat}</div>
                  <div className="mt-2 text-sm text-slate-700 font-semibold">{viewBooking.booking?.name || "—"}</div>
                  <div className="mt-1 text-sm text-slate-500">{viewBooking.booking?.phone || viewBooking.booking?.phoneNumber || "—"} {viewBooking.booking?.email ? <span className="mx-2 text-slate-300">•</span> : null} {viewBooking.booking?.email ? <span className="text-sm text-slate-500">{viewBooking.booking?.email}</span> : null}</div>
                  <div className="mt-3 text-sm text-slate-400">{viewBooking.booking?.pickup || "-"}{viewBooking.booking?.pickupTime ? ` (${viewBooking.booking?.pickupTime})` : ""} → {viewBooking.booking?.drop || "-"}{viewBooking.booking?.dropTime ? ` (${viewBooking.booking?.dropTime})` : ""}</div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <button
                    onClick={() => setViewBooking(null)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                  >
                    Close
                  </button>

                  {viewBooking.booking && viewBooking.booking.status === "blocked" && (user && (user.role === "admin" || user.role === "owner")) && (
                    <button
                      onClick={async () => {
                        const s = String(viewBooking.seat);
                        try {
                          const token = localStorage.getItem('authToken');
                          if (!token) return showAppToast('error', 'Unauthorized — please login as admin');

                          const res = await fetch(`/api/admin/block-seats`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ busId: selectedBus.busId, date, seats: [s], action: 'unblock' }),
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            if (res.status === 401) return showAppToast('error', 'Unauthorized — invalid/expired token. Please login again.');
                            if (res.status === 403) return showAppToast('error', 'Forbidden — admin access required');
                            throw new Error(data.error || 'Unblock failed');
                          }
                          showAppToast('success', `Seat ${s} unblocked`);
                          setViewBooking(null);
                          await fetchBookings();
                        } catch (err) {
                          console.error(err);
                          showAppToast('error', err.message || 'Unblock failed');
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
                      setSelectedSeats([s]);
                      setEditingSeat(s);
                      const b = viewBooking.booking || {};
                      setBookingForm({ name: b.name || "", phone: b.phone || "", email: b.email || "", pickup: b.pickup || "", pickupTime: b.pickupTime || "", drop: b.drop || "", dropTime: b.dropTime || "" });
                      setViewBooking(null);
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => {
                      const s = String(viewBooking.seat);
                      setConfirmMessage(`Are you sure you want to cancel booking for seat ${s}? This will delete the booking record and notify the passenger via email.`);
                      setConfirmTarget(s);
                      setConfirmAction(() => async () => {
                        try {
                          const res = await fetch(`/api/booking?busId=${selectedBus.busId}&date=${date}&seatNo=${s}`, { method: "DELETE" });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "Cancel failed");
                          showAppToast("success", data.message || "Booking cancelled and notification sent");
                          await fetchBookings();
                        } catch (err) {
                          console.error(err);
                          showAppToast("error", err.message || "Cancel failed");
                          throw err;
                        }
                      });
                      setConfirmOpen(true);
                      setViewBooking(null);
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
          <h3 className="text-lg font-bold text-slate-900 break-words">
            {value}
          </h3>
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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
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
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : null}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}