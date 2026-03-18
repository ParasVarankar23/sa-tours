"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";

export default function PaymentPage() {
    const { user, loading } = useAuth();
    const [payments, setPayments] = useState([]);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (!user || loading) return;
        const fetchPayments = async () => {
            setFetching(true);
            try {
                const res = await fetch(`/api/public/payments?userId=${encodeURIComponent(user.uid)}`);
                const data = await res.json();
                if (res.ok && data.success) setPayments(data.payments || []);
            } catch (e) {
                console.error("Failed to fetch payments:", e);
            } finally {
                setFetching(false);
            }
        };
        fetchPayments();
    }, [user, loading]);

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Payment History</h2>
            {fetching ? (
                <p>Loading...</p>
            ) : payments.length === 0 ? (
                <p>No payments found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full table-auto text-sm">
                        <thead>
                            <tr className="text-left">
                                <th className="px-2 py-1">Payment ID</th>
                                <th className="px-2 py-1">Order ID</th>
                                <th className="px-2 py-1">Amount</th>
                                <th className="px-2 py-1">Date</th>
                                <th className="px-2 py-1">Meta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p) => (
                                <tr key={p.id} className="border-t">
                                    <td className="px-2 py-2">{p.paymentId || p.id}</td>
                                    <td className="px-2 py-2">{p.orderId || (p.details && p.details.order_id)}</td>
                                    <td className="px-2 py-2">{p.details && p.details.amount ? `${(p.details.amount / 100).toFixed(2)} ${p.details.currency || 'INR'}` : '-'}</td>
                                    <td className="px-2 py-2">{p.verifiedAt || (p.details && p.details.created_at ? new Date(p.details.created_at * 1000).toLocaleString() : '-')}</td>
                                    <td className="px-2 py-2 break-words max-w-xs">{p.metadata ? JSON.stringify(p.metadata) : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

