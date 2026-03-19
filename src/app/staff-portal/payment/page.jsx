"use client";

import { X } from "lucide-react";
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
        return () => (mounted = false);
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return payments;
        return payments.filter((p) => {
            const meta = p?.metadata || {};
            const user = meta.user || {};
            const first = (Array.isArray(meta.bookings) && meta.bookings.length) ? meta.bookings[0] : {};
            const name = String(user.name || first.name || p.userId || "").toLowerCase();
            return name.includes(q) || String(user.phone || first.phone || "").toLowerCase().includes(q);
        });
    }, [payments, search]);

    const getAmount = (p) => {
        if (p?.details?.amount) return p.details.amount / 100;
        if (p?.amount) return Number(p.amount);
        return 0;
    };

    return (
        <div className="p-6">
            <h1 className="mb-4 text-2xl font-bold">Payments — Staff (View Only)</h1>

            <div className="mb-4 max-w-md">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payments..." className="w-full rounded border px-3 py-2" />
            </div>

            {loading ? (
                <p>Loading…</p>
            ) : (
                <div className="space-y-3">
                    {filtered.map((p) => (
                        <div key={p.paymentId || p.id || Math.random()} className="rounded border p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-500">{(p?.metadata?.bookings && p.metadata.bookings[0]?.busNumber) || "-"}</div>
                                    <div className="text-lg font-semibold">{(p?.metadata?.user?.name) || (p?.metadata?.bookings && p.metadata.bookings[0]?.name) || p.userId || "-"}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm">₹{getAmount(p).toFixed(2)}</div>
                                    <button onClick={() => setSelected(p)} className="mt-2 rounded bg-slate-50 px-3 py-1 text-sm">View</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selected ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded bg-white p-6">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-bold">Payment Details</h2>
                            </div>
                            <button onClick={() => setSelected(null)} className="p-2"><X /></button>
                        </div>

                        <div className="space-y-2">
                            <p><strong>Payment ID:</strong> {selected.paymentId || selected.id || "-"}</p>
                            <p><strong>Amount:</strong> ₹{getAmount(selected).toFixed(2)}</p>
                            <p><strong>User:</strong> {(selected?.metadata?.user?.name) || (selected?.metadata?.bookings && selected.metadata.bookings[0]?.name) || "-"}</p>
                            <p><strong>Phone:</strong> {(selected?.metadata?.user?.phone) || (selected?.metadata?.bookings && selected.metadata.bookings[0]?.phone) || "-"}</p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
