"use client";

import {
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  Search,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function AdminPaymentPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc"); // 'desc' = newest first
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const getTimestamp = (p) => {
    const d = p?.createdAt || p?.verifiedAt || (p?.details && p.details.created_at ? new Date(p.details.created_at * 1000).toISOString() : null) || null;
    const t = d ? new Date(d).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  };

  const sortPaymentsArray = (arr, order = "desc") => {
    return (arr || []).slice().sort((a, b) => {
      const ta = getTimestamp(a);
      const tb = getTimestamp(b);
      return order === "desc" ? tb - ta : ta - tb;
    });
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/public/payments?all=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPayments(sortPaymentsArray(data.payments || [], sortOrder));
      }
    } catch (e) {
      console.error("Failed to fetch payments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const getAmount = (p) => {
    const base = p?.details?.amount ? p.details.amount / 100 : p?.amount ? Number(p.amount) : 0;
    const refundTop =
      p?.refund && Number.isFinite(Number(p.refund.amount)) ? Number(p.refund.amount) : 0;
    const refundDetails = p?.details?.refund_amount ? Number(p.details.refund_amount) / 100 : 0;
    const refund = refundTop || refundDetails || 0;
    return Math.max(0, base - refund);
  };

  const getOriginalAmount = (p) => {
    return p?.details?.amount ? p.details.amount / 100 : p?.amount ? Number(p.amount) : 0;
  };

  const getNetAmount = (p) => {
    const base = getOriginalAmount(p);
    const refundTop =
      p?.refund && Number.isFinite(Number(p.refund.amount)) ? Number(p.refund.amount) : 0;
    const refundDetails = p?.details?.refund_amount ? Number(p.details.refund_amount) / 100 : 0;
    const refund = refundTop || refundDetails || 0;
    return Math.max(0, base - refund);
  };

  const getCurrency = (p) => {
    return p?.details?.currency || p?.currency || "INR";
  };

  const getDate = (p) => {
    return p?.createdAt || p?.verifiedAt || null;
  };

  const getUserData = (p) => {
    const meta = p?.metadata || {};
    const user = meta.user || {};
    const firstBooking =
      Array.isArray(meta.bookings) && meta.bookings.length ? meta.bookings[0] : null;

    return {
      name: user?.name || firstBooking?.name || p?.userId || "-",
      phone: user?.phone || firstBooking?.phone || "-",
      email: user?.email || firstBooking?.email || "-",
      pickup: user?.pickup || firstBooking?.pickup || "-",
      pickupTime: user?.pickupTime || firstBooking?.pickupTime || "-",
      pickupDate: firstBooking?.date || meta?.booking?.date || "-",
      drop: user?.drop || firstBooking?.drop || "-",
      dropTime: user?.dropTime || firstBooking?.dropTime || "-",
      dropDate: firstBooking?.date || meta?.booking?.date || "-",
      busNumber:
        firstBooking?.busNumber ||
        meta?.booking?.busNumber ||
        meta?.booking?.busId ||
        "-",
    };
  };

  const passesDateFilter = (p) => {
    if (!dateFilter || dateFilter === "all") return true;
    const d = getDate(p);
    if (!d) return false;

    const pd = new Date(d);
    if (isNaN(pd.getTime())) return false;

    const now = new Date();
    let start = null;

    switch (dateFilter) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(now.getDate() - now.getDay());
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return true;
    }

    return pd >= start && pd <= now;
  };

  const filteredPayments = useMemo(() => {
    const base = (payments || []).filter((p) => passesDateFilter(p));

    if (!search.trim()) return base;

    const q = search.toLowerCase();

    return base.filter((p) => {
      const user = getUserData(p);

      return (
        String(user.name).toLowerCase().includes(q) ||
        String(user.phone).toLowerCase().includes(q) ||
        String(user.email).toLowerCase().includes(q) ||
        String(user.pickup).toLowerCase().includes(q) ||
        String(user.drop).toLowerCase().includes(q) ||
        String(user.busNumber).toLowerCase().includes(q)
      );
    });
  }, [payments, search, dateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredPayments.length, search, dateFilter]);

  const totalPages = Math.max(1, Math.ceil((filteredPayments || []).length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const visiblePayments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return (filteredPayments || []).slice(start, start + PAGE_SIZE);
  }, [filteredPayments, currentPage]);

  const bookingTotal = useMemo(() => {
    return (payments || []).reduce((sum, p) => {
      const base = p?.details?.amount ? p.details.amount / 100 : p?.amount ? Number(p.amount) : 0;
      return sum + (base || 0);
    }, 0);
  }, [payments]);

  const refundedTotal = useMemo(() => {
    return (payments || []).reduce((sum, p) => {
      const refundAmt =
        p?.refund && Number.isFinite(Number(p.refund.amount))
          ? Number(p.refund.amount)
          : p?.details?.refund_amount
            ? Number(p.details.refund_amount) / 100
            : 0;
      return sum + (refundAmt || 0);
    }, 0);
  }, [payments]);

  const totalPaymentsCount = useMemo(() => (payments || []).length, [payments]);

  const cancelledCount = useMemo(() => {
    return (payments || []).filter((p) => {
      const refundAmt =
        p?.refund && Number.isFinite(Number(p.refund.amount))
          ? Number(p.refund.amount)
          : p?.details?.refund_amount
            ? Number(p.details.refund_amount) / 100
            : 0;
      return refundAmt && refundAmt > 0;
    }).length;
  }, [payments]);

  const successfulPaymentsCount = useMemo(() => {
    return Math.max(0, totalPaymentsCount - cancelledCount);
  }, [totalPaymentsCount, cancelledCount]);

  const totalRevenue = useMemo(() => {
    return Math.max(0, bookingTotal - refundedTotal);
  }, [bookingTotal, refundedTotal]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, subText }) => (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900 break-words">{value}</h3>
          {subText ? <p className="mt-1 text-xs text-slate-400">{subText}</p> : null}
        </div>
        <div className={`rounded-2xl p-3 shadow-sm ${colorClass}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );

  const PaymentModal = ({ payment, onClose }) => {
    if (!payment) return null;

    const user = getUserData(payment);
    const amount = getAmount(payment);
    const currency = getCurrency(payment);
    const date = getDate(payment);
    const paymentId = payment?.paymentId || payment?.id || "-";

    const refundAmount =
      payment?.refund && Number.isFinite(Number(payment.refund.amount))
        ? Number(payment.refund.amount)
        : payment?.details?.refund_amount
          ? Number(payment.details.refund_amount) / 100
          : 0;

    const refundStatus = payment?.refund
      ? payment.refund.success
        ? "Processed"
        : payment.refund.attempted
          ? "Failed"
          : "Not attempted"
      : null;

    const refundedAt = payment?.refund?.refundedAt || payment?.refund?.processedAt || null;

    const [manualRefundMode, setManualRefundMode] = useState(false);
    const [manualAmount, setManualAmount] = useState(refundAmount || amount);
    const [manualNote, setManualNote] = useState("");
    const [savingRefund, setSavingRefund] = useState(false);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-orange-50 px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Payment Details</h2>
              <p className="mt-1 text-sm text-slate-500">
                Complete passenger booking & payment information
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[72vh] space-y-6 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Payment ID
                </p>
                <p className="break-all text-sm font-semibold text-slate-900">{paymentId}</p>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-orange-600">
                  Amount (Original / Net)
                </p>
                <p className="text-lg font-bold text-orange-700">
                  ₹{getOriginalAmount(payment).toFixed(2)} / ₹{getNetAmount(payment).toFixed(2)}{" "}
                  {currency.toUpperCase()}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Verified On
                </p>
                <p className="text-sm font-semibold text-slate-900">{formatDate(date)}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Passenger Details</h3>
                  <p className="text-sm text-slate-500">Verified passenger information</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Verified
                </div>
              </div>

              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <User className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{user.name}</p>
                  <p className="text-sm text-slate-500">Passenger Profile</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <Phone className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Phone Number</p>
                    <p className="font-medium text-slate-900">{user.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <Mail className="h-5 w-5 text-slate-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Email Address</p>
                    <p className="break-all font-medium text-slate-900">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-slate-500">Pickup Location</p>
                    <p className="font-medium text-slate-900">{user.pickup}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-xs text-slate-500">Drop Location</p>
                    <p className="font-medium text-slate-900">{user.drop}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Booking Details</h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <CreditCard className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Bus / Vehicle</p>
                    <p className="font-medium text-slate-900">{user.busNumber}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
                      Pickup
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{user.pickupDate}</p>
                  <p className="mt-1 text-sm text-slate-600">{user.pickupTime}</p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                      Drop
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{user.dropDate}</p>
                  <p className="mt-1 text-sm text-slate-600">{user.dropTime}</p>
                </div>
              </div>

              {refundAmount > 0 || refundStatus ? (
                <div className="mt-4 rounded-3xl border border-red-100 bg-red-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-red-700">Refund</p>
                      <p className="mt-1 text-sm text-slate-700">{refundStatus || "Refund info recorded"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-700">₹{(refundAmount || 0).toFixed(2)}</p>
                      {refundedAt ? (
                        <p className="mt-1 text-xs text-slate-500">{formatDate(refundedAt)}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {!refundAmount && !refundStatus ? (
                <div className="mt-4 flex items-center justify-end gap-3">
                  {manualRefundMode ? (
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 text-sm font-medium text-slate-700">Record manual refund</div>
                      <div className="mb-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={manualAmount}
                          onChange={(e) =>
                            setManualAmount(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
                          placeholder="Amount (₹)"
                        />
                      </div>
                      <div className="mb-3">
                        <input
                          type="text"
                          value={manualNote}
                          onChange={(e) => setManualNote(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
                          placeholder="Note (optional)"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setManualRefundMode(false);
                            setManualNote("");
                            setManualAmount(refundAmount || amount);
                          }}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                          disabled={savingRefund}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!manualAmount || Number(manualAmount) <= 0)
                              return alert("Enter a valid refund amount");
                            try {
                              setSavingRefund(true);
                              const token = localStorage.getItem("authToken");
                              const res = await fetch("/api/admin/manual-refund", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  paymentId,
                                  amount: Number(manualAmount),
                                  note: manualNote || null,
                                  success: true,
                                }),
                              });
                              const data = await res.json();
                              if (!res.ok || !data.success) {
                                throw new Error(
                                  data && data.error ? data.error : "Failed to record refund"
                                );
                              }

                              setPayments((prev) => {
                                return (prev || []).map((pp) => {
                                  const matches =
                                    pp &&
                                    (pp.id === payment.id ||
                                      pp.paymentId === payment.id ||
                                      pp.id === payment.paymentId ||
                                      pp.paymentId === payment.paymentId ||
                                      pp.id === data.paymentId ||
                                      pp.paymentId === data.paymentId);
                                  if (matches) {
                                    return { ...pp, refund: data.refund };
                                  }
                                  return pp;
                                });
                              });

                              setSelectedPayment((prev) =>
                                prev ? { ...prev, refund: data.refund } : prev
                              );
                              setManualRefundMode(false);
                              setManualNote("");
                            } catch (e) {
                              console.error("Manual refund error:", e);
                              alert("Failed to record refund: " + (e.message || e));
                            } finally {
                              setSavingRefund(false);
                            }
                          }}
                          className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                          disabled={savingRefund}
                        >
                          {savingRefund ? "Saving..." : "Record Refund"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setManualRefundMode(true)}
                      className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Record Manual Refund
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-emerald-700">Payment Verified Successfully</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        {/* Premium Header */}
        <div className="mb-6 rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 p-6 text-white shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                <Wallet className="h-4 w-4" />
                Admin Panel
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Payment Management
              </h1>
              <p className="mt-2 text-sm text-orange-50 md:text-base">
                View verified payments, passenger details, booking information, and revenue summary.
              </p>
            </div>
          </div>
        </div>

        {/* Stats - 3 cards per row */}
        {!loading && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Total Payments"
              value={totalPaymentsCount}
              icon={CreditCard}
              colorClass="bg-orange-500"
              subText="All verified payment records"
            />

            <StatCard
              title="Gross Booking Amount"
              value={`₹${bookingTotal.toFixed(2)}`}
              icon={IndianRupee}
              colorClass="bg-emerald-500"
              subText="Sum of original payments"
            />

            <StatCard
              title="Net Revenue"
              value={`₹${totalRevenue.toFixed(2)}`}
              icon={Wallet}
              colorClass="bg-emerald-600"
              subText="Gross − refunds"
            />

            <StatCard
              title="Successful Bookings"
              value={successfulPaymentsCount}
              icon={CheckCircle2}
              colorClass="bg-blue-500"
              subText="Payments not refunded"
            />

            <StatCard
              title="Cancelled Bookings"
              value={cancelledCount}
              icon={Clock3}
              colorClass="bg-indigo-500"
              subText="Number of refunded bookings"
            />

            <StatCard
              title="Cancelled Refunds"
              value={`₹${refundedTotal.toFixed(2)}`}
              icon={Clock3}
              colorClass="bg-red-500"
              subText="Total refunded amount"
            />
          </div>
        )}

        {/* Main Table Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* Table Header */}
          <div className="border-b border-slate-200 bg-white p-4 md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 md:text-xl">
                  Payment History
                </h2>
              </div>

              <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center xl:w-auto">
                {/* Search */}
                <div className="relative w-full lg:w-96">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, phone, email, route, bus..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                {/* Filter only */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>

                  <button
                    onClick={() => {
                      const next = sortOrder === 'desc' ? 'asc' : 'desc';
                      setSortOrder(next);
                      setPayments((prev) => sortPaymentsArray(prev, next));
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    {sortOrder === 'desc' ? 'Latest first' : 'Oldest first'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
                <CreditCard className="h-8 w-8 text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Payments Found</h3>
              <p className="mt-1 text-sm text-slate-500">
                No payment records available for the current search or filter.
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE VIEW */}
              <div className="space-y-4 md:hidden p-4">
                {visiblePayments.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
                    No payments found
                  </div>
                ) : (
                  visiblePayments.map((p, idx) => {
                    const currency = getCurrency(p);
                    const date = getDate(p);
                    const user = getUserData(p);

                    return (
                      <div
                        key={p.id || idx}
                        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100">
                            <User className="h-6 w-6 text-orange-600" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-bold text-slate-900 break-words">
                              {user.name}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">Passenger</p>

                            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Verified
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Phone
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-800 break-words">
                              {user.phone || "-"}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Email
                            </p>
                            <p className="mt-1 text-sm text-slate-800 break-all">
                              {user.email || "-"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3">
                          <div className="rounded-2xl bg-orange-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-600">
                              Pickup
                            </p>
                            <div className="mt-1 flex items-start gap-2 text-sm font-medium text-orange-700">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                              <span className="break-words">{user.pickup || "-"}</span>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-emerald-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                              Drop
                            </p>
                            <div className="mt-1 flex items-start gap-2 text-sm font-medium text-emerald-700">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                              <span className="break-words">{user.drop || "-"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Amount
                            </p>
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">
                              <IndianRupee className="h-3.5 w-3.5" />
                              {getOriginalAmount(p).toFixed(2)} {currency.toUpperCase()}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Date
                            </p>
                            <div className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                              <span>{formatDate(date)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5">
                          <button
                            onClick={() => setSelectedPayment(p)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* DESKTOP / TABLET VIEW */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-[1200px] w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
                    <tr className="text-left">
                      <th className="px-4 py-4 font-semibold text-slate-700">Passenger</th>
                      <th className="px-4 py-4 font-semibold text-slate-700">Phone</th>
                      <th className="px-4 py-4 font-semibold text-slate-700">Email</th>
                      <th className="px-4 py-4 font-semibold text-slate-700">Pickup</th>
                      <th className="px-4 py-4 font-semibold text-slate-700">Drop</th>
                      <th className="px-4 py-4 font-semibold text-slate-700">Amount</th>
                      <th className="px-4 py-4 font-semibold text-slate-700">Date</th>
                      <th className="px-4 py-4 font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-4 font-semibold text-slate-700">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visiblePayments.map((p, idx) => {
                      const currency = getCurrency(p);
                      const date = getDate(p);
                      const user = getUserData(p);

                      return (
                        <tr
                          key={p.id || idx}
                          className="border-b border-slate-100 transition hover:bg-orange-50/40"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                                <User className="h-5 w-5 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{user.name}</p>
                                <p className="text-xs text-slate-500">Passenger</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-slate-700">{user.phone}</td>
                          <td className="px-4 py-4 text-slate-700 break-all">{user.email}</td>

                          <td className="px-4 py-4">
                            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                              <MapPin className="h-3.5 w-3.5" />
                              {user.pickup}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                              <MapPin className="h-3.5 w-3.5" />
                              {user.drop}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 flex-nowrap whitespace-nowrap">
                              <IndianRupee className="h-3.5 w-3.5" />
                              {getOriginalAmount(p).toFixed(2)} {currency.toUpperCase()}
                            </div>

                            {(() => {
                              const refundAmt =
                                p?.refund && Number.isFinite(Number(p.refund.amount))
                                  ? Number(p.refund.amount)
                                  : p?.details?.refund_amount
                                    ? Number(p.details.refund_amount) / 100
                                    : 0;

                              if (refundAmt && refundAmt > 0) {
                                return (
                                  <div className="mt-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                      Refunded ₹{refundAmt.toFixed(2)}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-start gap-2 text-slate-700">
                              <Calendar className="mt-0.5 h-4 w-4 text-slate-400" />
                              <span>{formatDate(date)}</span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Verified
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <button
                              onClick={() => setSelectedPayment(p)}
                              className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-slate-600">
                  Showing{" "}
                  <span className="font-semibold text-slate-900">
                    {visiblePayments.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}
                  </span>{" "}
                  -{" "}
                  <span className="font-semibold text-slate-900">
                    {visiblePayments.length
                      ? (currentPage - 1) * PAGE_SIZE + visiblePayments.length
                      : 0}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-orange-600">{filteredPayments.length}</span>{" "}
                  records
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Prev
                  </button>

                  <div className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                    Page {currentPage} of {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedPayment && (
        <PaymentModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
      )}
    </div>
  );
}