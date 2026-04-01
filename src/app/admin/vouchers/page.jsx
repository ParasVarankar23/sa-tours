"use client";

import { showAppToast } from "@/lib/client/toast";
import {
    CheckCircle2,
    Clock3,
    Eye,
    Search,
    TicketPercent,
    X,
    XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function AdminVouchersPage() {
    const [loading, setLoading] = useState(false);
    const [vouchers, setVouchers] = useState([]);
    const [viewVoucher, setViewVoucher] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const token =
                typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
            const headers = { "Content-Type": "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch("/api/admin/vouchers", { method: "GET", headers });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch vouchers");
            setVouchers(Array.isArray(data.vouchers) ? data.vouchers : []);
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to fetch vouchers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, []);

    const redeemVoucher = async (code) => {
        try {
            const token = localStorage.getItem("authToken");
            const headers = { "Content-Type": "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch(`/api/admin/vouchers/redeem`, {
                method: "POST",
                headers,
                body: JSON.stringify({ code }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Redeem failed");

            showAppToast("success", data.message || "Voucher redeemed");
            fetchVouchers();
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Redeem failed");
        }
    };

    const getVoucherStatus = (voucher) => {
        if (voucher.usedAt) return "used";

        if (voucher.expiresAt) {
            const expiry = new Date(voucher.expiresAt);
            if (!isNaN(expiry.getTime()) && expiry < new Date()) {
                return "expired";
            }
        }

        return "active";
    };

    const filteredVouchers = useMemo(() => {
        return vouchers.filter((v) => {
            const status = getVoucherStatus(v);

            const matchesFilter =
                filterStatus === "all" ? true : status === filterStatus;

            const search = searchTerm.toLowerCase();
            const matchesSearch =
                !search ||
                (v.code || "").toLowerCase().includes(search) ||
                (v.email || "").toLowerCase().includes(search) ||
                (v.phone || "").toLowerCase().includes(search) ||
                (v.name || v.customerName || v.metadata?.name || "")
                    .toLowerCase()
                    .includes(search);

            return matchesFilter && matchesSearch;
        });
    }, [vouchers, searchTerm, filterStatus]);

    const stats = useMemo(() => {
        const total = vouchers.length;
        const active = vouchers.filter((v) => getVoucherStatus(v) === "active").length;
        const used = vouchers.filter((v) => getVoucherStatus(v) === "used").length;
        const expired = vouchers.filter((v) => getVoucherStatus(v) === "expired").length;

        return { total, active, used, expired };
    }, [vouchers]);

    const formatDate = (date) => {
        if (!date) return "—";
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;
        return d.toLocaleString("en-GB");
    };

    const formatTimeStr = (t) => {
        if (!t) return null;
        const m = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (!m) return String(t);
        let hh = Number(m[1]);
        const mm = m[2];
        const ampm = hh >= 12 ? "PM" : "AM";
        const hh12 = ((hh + 11) % 12) + 1;
        return `${hh12}:${mm} ${ampm}`;
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            active: "bg-orange-50 text-orange-700 border border-orange-200",
            used: "bg-emerald-50 text-emerald-700 border border-emerald-200",
            expired: "bg-rose-50 text-rose-700 border border-rose-200",
        };

        return (
            <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
            >
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                            <TicketPercent size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                                Voucher Management
                            </h2>
                            <p className="text-sm text-slate-500">
                                Search, filter, view and redeem vouchers
                            </p>
                        </div>
                    </div>

                    {loading && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
                            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-500"></div>
                            Loading vouchers...
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total</p>
                                <h3 className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</h3>
                            </div>
                            <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                                <TicketPercent size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Active</p>
                                <h3 className="mt-2 text-3xl font-bold text-orange-600">{stats.active}</h3>
                            </div>
                            <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                                <Clock3 size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Used</p>
                                <h3 className="mt-2 text-3xl font-bold text-emerald-600">{stats.used}</h3>
                            </div>
                            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                                <CheckCircle2 size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Expired</p>
                                <h3 className="mt-2 text-3xl font-bold text-rose-600">{stats.expired}</h3>
                            </div>
                            <div className="rounded-xl bg-rose-50 p-3 text-rose-600">
                                <XCircle size={22} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search + Filter */}
                <div className="mb-6 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative w-full lg:max-w-md">
                            <Search
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500"
                                size={18}
                            />
                            <input
                                type="text"
                                placeholder="Search by code, name, email or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-orange-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {["all", "active", "used", "expired"].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-all ${filterStatus === status
                                        ? "bg-orange-500 text-white"
                                        : "border border-orange-200 bg-white text-slate-700 hover:bg-orange-50"
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-orange-50">
                                <tr className="text-left text-sm font-semibold text-slate-700">
                                    <th className="px-5 py-4">Code</th>
                                    <th className="px-5 py-4">Amount</th>
                                    <th className="px-5 py-4">Issued</th>
                                    <th className="px-5 py-4">Expires</th>
                                    <th className="px-5 py-4">Contact</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredVouchers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="mb-3 rounded-full bg-orange-50 p-4 text-orange-500">
                                                    <TicketPercent size={28} />
                                                </div>
                                                <p className="text-base font-semibold text-slate-700">
                                                    No vouchers found
                                                </p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Try changing search or filter options
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVouchers.map((v, index) => {
                                        const status = getVoucherStatus(v);

                                        return (
                                            <tr
                                                key={v.code}
                                                className={`border-t border-slate-100 hover:bg-orange-50/40 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                                    }`}
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="font-mono text-sm font-semibold text-slate-800">
                                                        {v.code}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 font-semibold text-slate-800">
                                                    ₹ {v.amount ?? "—"}
                                                </td>

                                                <td className="px-5 py-4 text-sm text-slate-600">
                                                    {formatDate(v.issuedAt)}
                                                </td>

                                                <td className="px-5 py-4 text-sm text-slate-600">
                                                    {formatDate(v.expiresAt)}
                                                </td>

                                                <td className="px-5 py-4 text-sm text-slate-700">
                                                    {v.email || v.phone || "—"}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <StatusBadge status={status} />
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={() => setViewVoucher(v)}
                                                            className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
                                                        >
                                                            <Eye size={16} />
                                                            View
                                                        </button>

                                                        {status === "active" ? (
                                                            <button
                                                                onClick={() => redeemVoucher(v.code)}
                                                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                                            >
                                                                Redeem
                                                            </button>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-lg bg-orange-400 px-3 py-2 text-sm text-white">
                                                                Done
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal */}
                {viewVoucher && (
                    <div className="fixed inset-0 z-[60] bg-black/50 p-3 sm:p-4">
                        <div className="flex min-h-full items-center justify-center">
                            <div className="w-full max-w-4xl rounded-2xl border border-orange-100 bg-white shadow-2xl max-h-[92vh] overflow-hidden">
                                {/* Header */}
                                <div className="flex items-start justify-between border-b border-orange-100 bg-orange-50 px-5 py-4 sm:px-6">
                                    <div className="pr-4">
                                        <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
                                            Voucher Details
                                        </h3>
                                        <p className="mt-1 text-sm font-medium text-orange-600 break-all">
                                            {viewVoucher.code}
                                        </p>
                                    </div>

                                    {/* ONLY ONE CLOSE BUTTON */}
                                    <button
                                        onClick={() => setViewVoucher(null)}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-white text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Body scroll only */}
                                <div className="max-h-[calc(92vh-88px)] overflow-y-auto px-5 py-5 sm:px-6">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Name
                                            </p>
                                            <p className="mt-2 text-base font-semibold text-slate-800 break-words">
                                                {viewVoucher.name ||
                                                    viewVoucher.customerName ||
                                                    viewVoucher.metadata?.name ||
                                                    "—"}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Phone
                                            </p>
                                            <p className="mt-2 text-base font-semibold text-slate-800 break-words">
                                                {viewVoucher.phone || viewVoucher.metadata?.phone || "—"}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Email
                                            </p>
                                            <p className="mt-2 text-base font-semibold text-slate-800 break-all">
                                                {viewVoucher.email || viewVoucher.metadata?.email || "—"}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Amount / Fare
                                            </p>
                                            <p className="mt-2 text-base font-semibold text-slate-800">
                                                ₹ {viewVoucher.amount ?? "—"}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Pickup
                                            </p>
                                            <p className="mt-2 text-base font-medium capitalize text-slate-800 break-words">
                                                {viewVoucher.pickup || viewVoucher.metadata?.pickup || "—"}
                                            </p>
                                            {(() => {
                                                const t = viewVoucher.pickupTime || viewVoucher.metadata?.pickupTime || viewVoucher.metadata?.cancelledBooking?.time || null;
                                                const ft = formatTimeStr(t);
                                                return ft ? (
                                                    <p className="mt-1 text-sm text-slate-500">{ft}</p>
                                                ) : null;
                                            })()}
                                        </div>

                                        <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Drop
                                            </p>
                                            <p className="mt-2 text-base font-medium capitalize text-slate-800 break-words">
                                                {viewVoucher.drop || viewVoucher.metadata?.drop || "—"}
                                            </p>
                                            {(() => {
                                                const t = viewVoucher.dropTime || viewVoucher.metadata?.dropTime || viewVoucher.metadata?.cancelledBooking?.time || null;
                                                const ft = formatTimeStr(t);
                                                return ft ? (
                                                    <p className="mt-1 text-sm text-slate-500">{ft}</p>
                                                ) : null;
                                            })()}
                                        </div>

                                        <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Issued
                                            </p>
                                            <p className="mt-2 text-base font-medium text-slate-800 break-words">
                                                {formatDate(viewVoucher.issuedAt || viewVoucher.issued)}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Expires
                                            </p>
                                            <p className="mt-2 text-base font-medium text-slate-800 break-words">
                                                {formatDate(viewVoucher.expiresAt)}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4 md:col-span-2">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Usage Status
                                            </p>
                                            <div className="mt-2">
                                                <StatusBadge status={getVoucherStatus(viewVoucher)} />
                                            </div>
                                            <p className="mt-3 text-sm text-slate-600">
                                                {viewVoucher.usedAt
                                                    ? `Used at: ${formatDate(viewVoucher.usedAt)}`
                                                    : "Not used yet"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}