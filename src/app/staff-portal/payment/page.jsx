"use client";

import {
    X,
    Search,
    Eye,
    IndianRupee,
    CreditCard,
    CheckCircle2,
    Clock3,
    User,
    Phone,
    Bus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function StaffPaymentPage() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        let mounted = true;

        const fetchPayments = async () => {
            try {
                const token = localStorage.getItem("authToken");
                const res = await fetch(`/api/public/payments?all=true`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                const data = await res.json();

                if (res.ok && data.payments) {
                    if (mounted) setPayments(data.payments || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchPayments();

        return () => {
            mounted = false;
        };
    }, []);

    const getAmount = (p) => {
        if (p?.details?.amount) return p.details.amount / 100;
        if (p?.amount) return Number(p.amount);
        return 0;
    };

    const getName = (p) => {
        const meta = p?.metadata || {};
        const user = meta.user || {};
        const first =
            Array.isArray(meta.bookings) && meta.bookings.length ? meta.bookings[0] : {};
        return user.name || first.name || p.userId || "-";
    };

    const getPhone = (p) => {
        const meta = p?.metadata || {};
        const user = meta.user || {};
        const first =
            Array.isArray(meta.bookings) && meta.bookings.length ? meta.bookings[0] : {};
        return user.phone || first.phone || "-";
    };

    const getBusNumber = (p) => {
        return (
            (p?.metadata?.bookings && p.metadata.bookings[0]?.busNumber) ||
            p?.metadata?.busNumber ||
            "-"
        );
    };

    const getRoute = (p) => {
        const first =
            Array.isArray(p?.metadata?.bookings) && p.metadata.bookings.length
                ? p.metadata.bookings[0]
                : {};
        return (
            first.routeName ||
            `${first.pickup || first.from || "-"} - ${first.drop || first.to || "-"}`
        );
    };

    const getStatus = (p) => {
        return (
            p?.status ||
            p?.paymentStatus ||
            p?.details?.status ||
            "success"
        );
    };

    const getDate = (p) => {
        return (
            p?.createdAt ||
            p?.date ||
            p?.paymentDate ||
            p?.details?.created_at ||
            null
        );
    };

    const formatDate = (date) => {
        if (!date) return "-";
        try {
            return new Date(date).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "-";
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return payments;

        return payments.filter((p) => {
            const name = String(getName(p)).toLowerCase();
            const phone = String(getPhone(p)).toLowerCase();
            const bus = String(getBusNumber(p)).toLowerCase();
            const paymentId = String(p.paymentId || p.id || "").toLowerCase();

            return (
                name.includes(q) ||
                phone.includes(q) ||
                bus.includes(q) ||
                paymentId.includes(q)
            );
        });
    }, [payments, search]);

    const stats = useMemo(() => {
        const totalPayments = payments.length;
        const totalAmount = payments.reduce((sum, p) => sum + getAmount(p), 0);
        const successCount = payments.filter((p) =>
            String(getStatus(p)).toLowerCase().includes("success")
        ).length;
        const pendingCount = payments.filter((p) =>
            String(getStatus(p)).toLowerCase().includes("pending")
        ).length;

        return {
            totalPayments,
            totalAmount,
            successCount,
            pendingCount,
        };
    }, [payments]);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#f97316] sm:text-sm">
                        SA TOURS DASHBOARD
                    </p>
                    <h1 className="text-3xl font-bold text-[#0f172a] sm:text-4xl">
                        Payment Management
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 sm:text-base">
                        View all payment records, booking payments and customer transaction details.
                    </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-600 shadow-sm">
                    View Only Access
                </div>
            </div>

            {/* Stats */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Payments"
                    value={stats.totalPayments}
                    icon={<CreditCard className="h-8 w-8 text-orange-500" />}
                />
                <StatCard
                    title="Total Amount"
                    value={`₹${stats.totalAmount.toFixed(0)}`}
                    icon={<IndianRupee className="h-8 w-8 text-orange-500" />}
                />
                <StatCard
                    title="Successful"
                    value={stats.successCount}
                    icon={<CheckCircle2 className="h-8 w-8 text-orange-500" />}
                />
                <StatCard
                    title="Pending"
                    value={stats.pendingCount}
                    icon={<Clock3 className="h-8 w-8 text-orange-500" />}
                />
            </div>

            {/* Main Table Card */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                {/* Top Controls */}
                <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-[#0f172a]">Payment List</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Showing {filtered.length} of {payments.length} result(s)
                        </p>
                    </div>

                    <div className="flex w-full lg:w-auto">
                        <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:w-[420px]">
                            <Search className="h-5 w-5 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search payment ID, customer, phone, bus..."
                                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden overflow-x-auto lg:block">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr className="text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-6 py-5">Customer</th>
                                <th className="px-6 py-5">Bus</th>
                                <th className="px-6 py-5">Payment ID</th>
                                <th className="px-6 py-5">Amount</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5">Date</th>
                                <th className="px-6 py-5">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-10 text-center text-slate-500">
                                        Loading payments...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-10 text-center text-slate-500">
                                        No payments found
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((p, index) => {
                                    const amount = getAmount(p);
                                    const status = String(getStatus(p)).toLowerCase();

                                    return (
                                        <tr
                                            key={p.paymentId || p.id || index}
                                            className="border-t border-slate-100 hover:bg-slate-50/70"
                                        >
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                                                        <User className="h-7 w-7 text-orange-500" />
                                                    </div>
                                                    <div>
                                                        <div className="text-[15px] font-bold text-slate-800">
                                                            {getName(p)}
                                                        </div>
                                                        <div className="text-sm text-slate-500">
                                                            {getPhone(p)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-6">
                                                <div className="text-[15px] font-semibold text-slate-800">
                                                    {getBusNumber(p)}
                                                </div>
                                                <div className="text-sm text-slate-500">{getRoute(p)}</div>
                                            </td>

                                            <td className="px-6 py-6">
                                                <div className="max-w-[180px] truncate text-sm font-medium text-slate-700">
                                                    {p.paymentId || p.id || "-"}
                                                </div>
                                            </td>

                                            <td className="px-6 py-6">
                                                <div className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                                                    ₹{amount.toFixed(2)}
                                                </div>
                                            </td>

                                            <td className="px-6 py-6">
                                                <StatusBadge status={status} />
                                            </td>

                                            <td className="px-6 py-6">
                                                <div className="text-sm text-slate-600">
                                                    {formatDate(getDate(p))}
                                                </div>
                                            </td>

                                            <td className="px-6 py-6">
                                                <button
                                                    onClick={() => setSelected(p)}
                                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-4 p-4 lg:hidden">
                    {loading ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-slate-500">
                            Loading payments...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-slate-500">
                            No payments found
                        </div>
                    ) : (
                        filtered.map((p, index) => {
                            const amount = getAmount(p);
                            const status = String(getStatus(p)).toLowerCase();

                            return (
                                <div
                                    key={p.paymentId || p.id || index}
                                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="mb-4 flex items-start gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
                                            <User className="h-6 w-6 text-orange-500" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate text-lg font-bold text-slate-800">
                                                {getName(p)}
                                            </h3>
                                            <p className="truncate text-sm text-slate-500">
                                                {getPhone(p)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="text-xs text-slate-500">Bus</p>
                                            <p className="mt-1 font-semibold text-slate-800">
                                                {getBusNumber(p)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="text-xs text-slate-500">Amount</p>
                                            <p className="mt-1 font-semibold text-emerald-700">
                                                ₹{amount.toFixed(2)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="text-xs text-slate-500">Status</p>
                                            <div className="mt-1">
                                                <StatusBadge status={status} />
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="text-xs text-slate-500">Date</p>
                                            <p className="mt-1 font-semibold text-slate-800 text-xs">
                                                {formatDate(getDate(p))}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelected(p)}
                                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        <Eye className="h-4 w-4" />
                                        View Details
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* View Modal */}
            {selected ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">
                                    Payment Details
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    View only payment information
                                </p>
                            </div>

                            <button
                                onClick={() => setSelected(null)}
                                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-6 px-5 py-5 sm:px-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <InfoCard
                                    icon={<User className="h-4 w-4" />}
                                    label="Customer Name"
                                    value={getName(selected)}
                                />
                                <InfoCard
                                    icon={<Phone className="h-4 w-4" />}
                                    label="Phone Number"
                                    value={getPhone(selected)}
                                />
                                <InfoCard
                                    icon={<Bus className="h-4 w-4" />}
                                    label="Bus Number"
                                    value={getBusNumber(selected)}
                                />
                                <InfoCard
                                    icon={<CreditCard className="h-4 w-4" />}
                                    label="Payment ID"
                                    value={selected.paymentId || selected.id || "-"}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <InfoChip
                                    label="Amount"
                                    value={`₹${getAmount(selected).toFixed(2)}`}
                                    color="green"
                                />
                                <InfoChip
                                    label="Status"
                                    value={String(getStatus(selected))}
                                    color={
                                        String(getStatus(selected)).toLowerCase().includes("success")
                                            ? "green"
                                            : String(getStatus(selected)).toLowerCase().includes("pending")
                                                ? "orange"
                                                : "slate"
                                    }
                                />
                                <InfoChip
                                    label="Date"
                                    value={formatDate(getDate(selected))}
                                    color="slate"
                                />
                            </div>

                            <div className="rounded-2xl border border-slate-200 p-4">
                                <h3 className="mb-3 text-lg font-semibold text-slate-800">
                                    Route / Booking Info
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs text-slate-500">Route</p>
                                        <p className="mt-1 font-semibold text-slate-800">{getRoute(selected)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs text-slate-500">Booking Count</p>
                                        <p className="mt-1 font-semibold text-slate-800">
                                            {Array.isArray(selected?.metadata?.bookings)
                                                ? selected.metadata.bookings.length
                                                : 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => setSelected(null)}
                                    className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-orange-600"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function StatCard({ title, value, icon }) {
    return (
        <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50">
                    {icon}
                </div>
                <div>
                    <p className="text-lg text-slate-500">{title}</p>
                    <p className="mt-1 text-3xl sm:text-4xl font-bold text-[#0f172a]">{value}</p>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const s = String(status || "").toLowerCase();

    if (s.includes("success") || s.includes("paid") || s.includes("captured")) {
        return (
            <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                Success
            </span>
        );
    }

    if (s.includes("pending") || s.includes("created")) {
        return (
            <span className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-600">
                Pending
            </span>
        );
    }

    if (s.includes("failed")) {
        return (
            <span className="inline-flex rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">
                Failed
            </span>
        );
    }

    return (
        <span className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700">
            {status || "Unknown"}
        </span>
    );
}

function InfoCard({ icon, label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-500">
                {icon}
                <p className="text-sm font-medium">{label}</p>
            </div>
            <p className="text-lg font-semibold text-slate-800 break-words">{value || "-"}</p>
        </div>
    );
}

function InfoChip({ label, value, color = "slate" }) {
    const styles = {
        orange: "bg-orange-50 text-orange-600",
        green: "bg-emerald-50 text-emerald-700",
        slate: "bg-slate-100 text-slate-700",
    };

    return (
        <div className={`rounded-2xl p-4 ${styles[color]}`}>
            <p className="text-xs font-medium opacity-80">{label}</p>
            <p className="mt-2 text-sm sm:text-base font-bold break-words">{value}</p>
        </div>
    );
}