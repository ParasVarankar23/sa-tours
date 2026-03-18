"use client";
import { useEffect, useState } from "react";

export default function AdminPaymentPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`/api/public/payments?all=true`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok && data.success) setPayments(data.payments || []);
      } catch (e) {
        console.error("Failed to fetch payments:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">All Payment History</h2>
      {loading ? (
        <p>Loading...</p>
      ) : payments.length === 0 ? (
        <p>No payments recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-2 py-1">Payment ID</th>
                <th className="px-2 py-1">Order ID</th>
                <th className="px-2 py-1">Amount</th>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">User</th>
                <th className="px-2 py-1">Meta</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-2 py-2">{p.paymentId || p.id}</td>
                  <td className="px-2 py-2">{p.orderId || (p.details && p.details.order_id)}</td>
                  <td className="px-2 py-2">{p.details && p.details.amount ? `${(p.details.amount / 100).toFixed(2)} ${p.details.currency || 'INR'}` : '-'}</td>
                  <td className="px-2 py-2">{p.verifiedAt || '-'}</td>
                  <td className="px-2 py-2">{p.metadata && p.metadata.userId ? p.metadata.userId : '-'}</td>
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
