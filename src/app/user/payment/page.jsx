"use client";

import { useAutoRefresh } from "@/context/AutoRefreshContext";
import {
    CalendarDays,
    CheckCircle2,
    CreditCard,
    Eye,
    IndianRupee,
    RefreshCw,
    Search,
    ShieldCheck,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";

export default function PaymentPage() {
    const { user, loading } = useAuth();
    const [payments, setPayments] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedPayment, setSelectedPayment] = useState(null);

    const { subscribeRefresh } = useAutoRefresh();

    const fetchPayments = async () => {
        if (!user?.uid) return;
        setFetching(true);
        try {
            const res = await fetch(
                `/api/public/payments?userId=${encodeURIComponent(user.uid)}`
            );
            const data = await res.json();
            if (res.ok && data.success) {
                setPayments(data.payments || []);
            } else {
                setPayments([]);
            }
        } catch (e) {
            console.error("Failed to fetch payments:", e);
            setPayments([]);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (!user || loading) return;
        fetchPayments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, loading]);

    useEffect(() => {
        if (typeof subscribeRefresh !== "function") return;
        const unsub = subscribeRefresh(() => {
            fetchPayments();
        });

        return () => {
            try {
                if (typeof unsub === "function") unsub();
            } catch (e) { }
        };
    }, [subscribeRefresh, user]);

    const normalizedPayments = useMemo(() => {
        return (payments || []).map((p) => {
            const amount =
                p?.details?.amount != null
                    ? Number(p.details.amount) / 100
                    : Number(p?.amount || 0);

            const currency = p?.details?.currency || p?.currency || "INR";

            const createdAt = p?.verifiedAt
                ? new Date(p.verifiedAt)
                : p?.details?.created_at
                    ? new Date(p.details.created_at * 1000)
                    : null;

            const metadata = p?.metadata || {};
            const bookings = Array.isArray(metadata?.bookings) ? metadata.bookings : [];
            const firstBooking = bookings[0] || {};

            const passengerName =
                firstBooking?.name ||
                metadata?.name ||
                p?.name ||
                "Passenger";

            const phone =
                firstBooking?.phone ||
                metadata?.phone ||
                p?.phone ||
                "—";

            const email =
                firstBooking?.email ||
                metadata?.email ||
                p?.email ||
                user?.email ||
                "—";

            const pickup = firstBooking?.pickup || metadata?.pickup || "—";
            const drop = firstBooking?.drop || metadata?.drop || "—";
            const seatNo = firstBooking?.seatNo || "—";
            const busNumber = firstBooking?.busNumber || metadata?.busNumber || "—";
            const paymentId = p?.paymentId || p?.id || "—";
            const orderId = p?.orderId || p?.details?.order_id || "—";

            return {
                ...p,
                amount,
                currency,
                createdAt,
                passengerName,
                phone,
                email,
                pickup,
                drop,
                seatNo,
                busNumber,
                paymentId,
                orderId,
                bookings,
            };
        });
    }, [payments, user]);

    const filteredPayments = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return normalizedPayments;

        return normalizedPayments.filter((p) => {
            const haystack = [
                p.paymentId,
                p.orderId,
                p.passengerName,
                p.phone,
                p.email,
                p.pickup,
                p.drop,
                p.busNumber,
                p.seatNo,
            ]
                .join(" ")
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [normalizedPayments, search]);

    const totalPayments = filteredPayments.length;
    const totalRevenue = filteredPayments.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
    );
    const latestPayment = filteredPayments.length
        ? [...filteredPayments].sort(
            (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
        )[0]
        : null;

    const formatCurrency = (amount, currency = "INR") => {
        return `${currency === "INR" ? "₹" : ""}${Number(amount || 0).toFixed(2)}${currency !== "INR" ? ` ${currency}` : ""
            }`;
    };

    const formatDate = (date) => {
        if (!date) return "—";
        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    return (
        <div className="w-full bg-[#f8fafc] p-4 md:p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
                        SA TOURS BOOKING
                    </p>
                    <h1 className="mt-1 text-3xl font-bold text-slate-900">
                        Payment History
                    </h1>
                </div>

            </div>
            {/* Summary Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Payments"
                    value={totalPayments}
                    subtitle="Verified payment records"
                    icon={<CreditCard className="h-5 w-5 text-white" />}
                    iconBg="bg-[#f97316]"
                />

                <StatCard
                    title="Total Paid"
                    value={formatCurrency(totalRevenue)}
                    subtitle="Total collected amount"
                    icon={<IndianRupee className="h-5 w-5 text-white" />}
                    iconBg="bg-emerald-500"
                />

                <StatCard
                    title="Successful"
                    value={totalPayments}
                    subtitle="Verified successful transactions"
                    icon={<CheckCircle2 className="h-5 w-5 text-white" />}
                    iconBg="bg-blue-500"
                />

                <StatCard
                    title="Latest Payment"
                    value={latestPayment ? formatCurrency(latestPayment.amount) : "₹0.00"}
                    subtitle={latestPayment ? formatDate(latestPayment.createdAt) : "No recent payment"}
                    icon={<ShieldCheck className="h-5 w-5 text-white" />}
                    iconBg="bg-violet-500"
                />
            </div>

            {/* Payment History Card */}
            {/* Payment History Card */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                {/* Top Bar */}
                <div className="border-b border-slate-200 px-4 py-4 md:px-5">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        {/* Title */}
                        <div className="shrink-0">
                            <h2 className="whitespace-nowrap text-lg font-bold text-slate-900 md:text-xl">
                                Payment History
                            </h2>
                        </div>

                        {/* Search + Refresh */}
                        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center xl:w-auto">
                            {/* Search */}
                            <div className="flex h-12 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 md:max-w-[420px] xl:w-[420px]">
                                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search payment ID, name, phone, email, route..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                                />
                            </div>

                            {/* Refresh */}
                            <button
                                onClick={fetchPayments}
                                disabled={fetching}
                                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-70"
                            >
                                <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {fetching ? (
                    <div className="px-6 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
                            <RefreshCw className="h-5 w-5 animate-spin text-[#f97316]" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-700">
                            Loading payments...
                        </p>
                    </div>
                ) : filteredPayments.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                            <CreditCard className="h-5 w-5 text-slate-500" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-800">
                            No payments found
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Your verified payments will appear here after successful booking.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden overflow-x-auto xl:block">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-left">
                                        <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                                            Payment ID
                                        </th>
                                        <th className="px-4 py-4 text-sm font-semibold text-slate-700">
                                            Pickup
                                        </th>
                                        <th className="px-4 py-4 text-sm font-semibold text-slate-700">
                                            Drop
                                        </th>
                                        <th className="px-4 py-4 text-sm font-semibold text-slate-700">
                                            Amount
                                        </th>
                                        <th className="px-4 py-4 text-sm font-semibold text-slate-700">
                                            Date
                                        </th>
                                        <th className="px-4 py-4 text-sm font-semibold text-slate-700">
                                            Status
                                        </th>
                                        <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                                            Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredPayments.map((p) => (
                                        <tr
                                            key={p.id}
                                            className="border-b border-slate-100 transition hover:bg-orange-50/20"
                                        >
                                            {/* Payment ID */}
                                            <td className="px-5 py-4 align-middle">
                                                <div className="max-w-[230px]">
                                                    <p
                                                        className="truncate text-base font-semibold text-slate-900"
                                                        title={p.paymentId}
                                                    >
                                                        {p.paymentId}
                                                    </p>
                                                    <p
                                                        className="mt-1 truncate text-xs text-slate-500"
                                                        title={p.orderId}
                                                    >
                                                        {p.orderId}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Pickup */}
                                            <td className="px-4 py-4 align-middle">
                                                <span className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-[#ea580c]">
                                                    {p.pickup || "—"}
                                                </span>
                                            </td>

                                            {/* Drop */}
                                            <td className="px-4 py-4 align-middle">
                                                <span className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                                                    {p.drop || "—"}
                                                </span>
                                            </td>

                                            {/* Amount */}
                                            <td className="px-4 py-4 align-middle">
                                                <div className="inline-flex rounded-2xl bg-orange-50 px-4 py-2">
                                                    <span className="text-base font-bold text-[#ea580c]">
                                                        {Number(p.amount || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Date - FIXED */}
                                            <td className="px-4 py-4 align-middle">
                                                <div className="flex min-w-[180px] items-center gap-2">
                                                    <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                                                    <div className="leading-5 text-slate-700">
                                                        <p className="whitespace-nowrap text-sm font-medium">
                                                            {p.createdAt
                                                                ? p.createdAt.toLocaleDateString("en-IN", {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                })
                                                                : "—"}
                                                        </p>
                                                        <p className="whitespace-nowrap text-xs text-slate-500">
                                                            {p.createdAt
                                                                ? p.createdAt.toLocaleTimeString("en-IN", {
                                                                    hour: "numeric",
                                                                    minute: "2-digit",
                                                                    hour12: true,
                                                                })
                                                                : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4 align-middle">
                                                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Verified
                                                </span>
                                            </td>

                                            {/* Action */}
                                            <td className="px-5 py-4 align-middle">
                                                <button
                                                    onClick={() => setSelectedPayment(p)}
                                                    className="inline-flex items-center gap-2 rounded-2xl bg-[#f97316] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile / Tablet Cards */}
                        <div className="grid grid-cols-1 gap-4 p-4 xl:hidden md:grid-cols-2 md:p-5">
                            {filteredPayments.map((p) => (
                                <div
                                    key={p.id}
                                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                Payment ID
                                            </p>
                                            <p
                                                className="mt-1 break-all text-sm font-semibold text-slate-900"
                                                title={p.paymentId}
                                            >
                                                {p.paymentId}
                                            </p>
                                            <p
                                                className="mt-1 break-all text-xs text-slate-500"
                                                title={p.orderId}
                                            >
                                                {p.orderId}
                                            </p>
                                        </div>

                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Verified
                                        </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <div className="rounded-2xl bg-orange-50 px-4 py-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                Pickup
                                            </p>
                                            <p className="mt-1 text-sm font-bold text-[#ea580c]">
                                                {p.pickup || "—"}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                Drop
                                            </p>
                                            <p className="mt-1 text-sm font-bold text-emerald-700">
                                                {p.drop || "—"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="rounded-2xl bg-orange-50 px-4 py-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                Amount
                                            </p>
                                            <p className="mt-1 text-sm font-bold text-[#ea580c]">
                                                {formatCurrency(p.amount)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                Date
                                            </p>
                                            <p className="mt-1 text-xs font-semibold text-slate-800">
                                                {p.createdAt
                                                    ? p.createdAt.toLocaleDateString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })
                                                    : "—"}
                                            </p>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                {p.createdAt
                                                    ? p.createdAt.toLocaleTimeString("en-IN", {
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                        hour12: true,
                                                    })
                                                    : ""}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedPayment(p)}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
                                    >
                                        <Eye className="h-4 w-4" />
                                        View Details
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Payment Details Modal */}
            {selectedPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-white shadow-2xl">
                        {/* Modal Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
                                    PAYMENT DETAILS
                                </p>
                                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                                    {selectedPayment.paymentId}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Verified transaction details and booking information
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedPayment(null)}
                                className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            {/* Top Stats */}
                            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                                <ModalStat
                                    label="Amount Paid"
                                    value={formatCurrency(selectedPayment.amount)}
                                    icon={<IndianRupee className="h-5 w-5 text-[#f97316]" />}
                                    bg="bg-orange-50"
                                />
                                <ModalStat
                                    label="Status"
                                    value="Verified"
                                    icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                                    bg="bg-emerald-50"
                                />
                                <ModalStat
                                    label="Date"
                                    value={formatDate(selectedPayment.createdAt)}
                                    icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
                                    bg="bg-blue-50"
                                />
                            </div>

                            {/* Main Info */}
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <DetailCard title="Payment Information">
                                    <DetailRow label="Payment ID" value={selectedPayment.paymentId} />
                                    <DetailRow label="Order ID" value={selectedPayment.orderId} />
                                    <DetailRow
                                        label="Currency"
                                        value={selectedPayment.currency || "INR"}
                                    />
                                    <DetailRow
                                        label="Amount"
                                        value={formatCurrency(selectedPayment.amount)}
                                    />
                                </DetailCard>

                                <DetailCard title="Passenger Information">
                                    <DetailRow
                                        label="Passenger Name"
                                        value={selectedPayment.passengerName}
                                    />
                                    <DetailRow label="Phone" value={selectedPayment.phone} />
                                    <DetailRow label="Email" value={selectedPayment.email} />
                                    <DetailRow label="Seat No" value={selectedPayment.seatNo} />
                                </DetailCard>

                                <DetailCard title="Route Information">
                                    <DetailRow label="Pickup" value={selectedPayment.pickup} />
                                    <DetailRow label="Drop" value={selectedPayment.drop} />
                                    <DetailRow label="Bus Number" value={selectedPayment.busNumber} />
                                </DetailCard>

                                <DetailCard title="Booking Summary">
                                    <DetailRow
                                        label="Total Booking Records"
                                        value={String(selectedPayment.bookings?.length || 1)}
                                    />
                                    <DetailRow label="Verified Status" value="Successful" />
                                    <DetailRow
                                        label="Created At"
                                        value={formatDate(selectedPayment.createdAt)}
                                    />
                                </DetailCard>
                            </div>

                            {/* Multiple Bookings */}
                            {selectedPayment.bookings?.length > 1 && (
                                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                    <h4 className="text-lg font-bold text-slate-900">
                                        Included Bookings
                                    </h4>

                                    <div className="mt-4 space-y-3">
                                        {selectedPayment.bookings.map((b, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-2xl border border-slate-200 bg-white p-4"
                                            >
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                    <DetailRow
                                                        label="Passenger"
                                                        value={b?.name || "—"}
                                                        compact
                                                    />
                                                    <DetailRow
                                                        label="Seat"
                                                        value={String(b?.seatNo || "—")}
                                                        compact
                                                    />
                                                    <DetailRow
                                                        label="Pickup"
                                                        value={b?.pickup || "—"}
                                                        compact
                                                    />
                                                    <DetailRow
                                                        label="Drop"
                                                        value={b?.drop || "—"}
                                                        compact
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setSelectedPayment(null)}
                                    className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* =========================
   Small UI Components
========================= */

function StatCard({ title, value, subtitle, icon, iconBg }) {
    return (
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-slate-500">{title}</p>
                    <h3 className="mt-3 text-2xl font-bold text-slate-900 break-words">
                        {value}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
                </div>

                <div
                    className={`flex h-16 w-16 items-center justify-center rounded-3xl shadow-md ${iconBg}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function Badge({ color = "orange", text }) {
    const styles = {
        orange: "bg-orange-50 text-[#ea580c]",
        green: "bg-emerald-100 text-emerald-700",
    };

    return (
        <span
            className={`inline-flex rounded-full px-4 py-2 text-base font-semibold ${styles[color] || styles.orange
                }`}
        >
            {text || "—"}
        </span>
    );
}

function InfoMini({ label, value, color = "orange" }) {
    const bg =
        color === "green"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-orange-50 text-[#ea580c]";

    return (
        <div className={`rounded-2xl px-4 py-3 ${bg}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {label}
            </p>
            <p className="mt-1 text-sm font-bold">{value}</p>
        </div>
    );
}

function ModalStat({ label, value, icon, bg }) {
    return (
        <div className={`rounded-3xl p-4 ${bg}`}>
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                    {icon}
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {label}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    );
}

function DetailCard({ title, children }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-lg font-bold text-slate-900">{title}</h4>
            <div className="mt-4 space-y-4">{children}</div>
        </div>
    );
}

function DetailRow({ label, value, compact = false }) {
    return (
        <div className={compact ? "" : "border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                {value || "—"}
            </p>
        </div>
    );
}