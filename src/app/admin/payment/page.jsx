"use client";

import { showAppToast } from "@/lib/client/toast";
import { useEffect, useState } from "react";

export default function AdminPaymentPage() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const res = await fetch("/api/payment");
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Failed to load payments");
                setPayments(json.payments || []);
            } catch (err) {
                console.error(err);
                showAppToast("error", err.message || "Failed to load payments");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const filtered = payments.filter((p) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
            String(p.payer || "").toLowerCase().includes(q) ||
            String(p.bookingId || "").toLowerCase().includes(q) ||
            String(p.paymentId || "").toLowerCase().includes(q)
        );
    });

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Payments</h2>

            <div className="mb-4 flex items-center gap-3">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, booking or payment id" className="w-full border px-3 py-2 rounded" />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Payer</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Booking</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Payment ID</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Amount</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading...</td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No payments found</td>
                            </tr>
                        ) : (
                            filtered.map((p) => (
                                <tr key={p.paymentId || p.id}>
                                    <td className="px-4 py-3 text-sm text-slate-800">{p.payer}</td>
                                    <td className="px-4 py-3 text-sm text-slate-800">{p.bookingId}</td>
                                    <td className="px-4 py-3 text-sm text-slate-800">{p.paymentId}</td>
                                    <td className="px-4 py-3 text-sm text-slate-800">₹{p.amount}</td>
                                    <td className="px-4 py-3 text-sm text-slate-800">{p.status}</td>
                                    <td className="px-4 py-3 text-sm text-slate-800">{p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
