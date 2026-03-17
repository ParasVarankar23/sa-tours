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
import { useEffect, useMemo, useState } from "react";

export default function BookingPage() {
  const [date, setDate] = useState("");
  const [buses, setBuses] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookings, setBookings] = useState({});
  const [bookingForm, setBookingForm] = useState({ name: "", phone: "", email: "", pickup: "", pickupTime: "", drop: "", dropTime: "" });
  const [editingSeat, setEditingSeat] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(() => async () => { });

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
      const entries = Object.entries(raw).filter(([k]) => {
        if (!/^[0-9]+$/.test(k)) return false;
        const n = Number(k);
        if (n < 1) {
          console.warn(`Ignoring invalid booking seat key: ${k}`);
          return false;
        }
        return true;
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
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
                  SEAT LAYOUT VIEW
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedBus.busNumber} — {selectedBus.routeName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedBus.startPoint} → {selectedBus.endPoint} • {selectedBus.startTime} → {selectedBus.endTime}
                </p>
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
                            {(selectedBus.stops || []).map((s, i) => (
                              <option key={i} value={s.stopName || s}>{s.stopName || s}</option>
                            ))}
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
                            {(selectedBus.stops || []).map((s, i) => (
                              <option key={i} value={s.stopName || s}>{s.stopName || s}</option>
                            ))}
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
                          className="rounded-xl bg-[#059669] px-4 py-2 text-white"
                        >
                          {editingSeat ? "Update Booking" : "Create Booking"}
                        </button>

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
                          <div key={seat} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                            <div>
                              <div className="font-semibold">Seat {seat}</div>
                              <div className="text-xs text-slate-500">{b.name} • {b.phone} {b.email ? `• ${b.email}` : ""}</div>
                              <div className="text-xs text-slate-400">{b.pickup || "-"}{b.pickupTime ? ` (${b.pickupTime})` : ""} → {b.drop || "-"}{b.dropTime ? ` (${b.dropTime})` : ""}</div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedSeats([seat]);
                                  setEditingSeat(seat);
                                  setBookingForm({ name: b.name || "", phone: b.phone || "", email: b.email || "", pickup: b.pickup || "", pickupTime: b.pickupTime || "", drop: b.drop || "", dropTime: b.dropTime || "" });
                                }}
                                className="rounded-xl border px-3 py-1 text-sm"
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
                                className="rounded-xl border border-red-200 px-3 py-1 text-sm text-red-600"
                              >
                                Cancel
                              </button>
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