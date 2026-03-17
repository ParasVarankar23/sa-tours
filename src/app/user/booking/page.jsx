"use client";

import { showAppToast } from "@/lib/client/toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function UserBookingPage() {
    const params = useSearchParams();
    const router = useRouter();
    const busId = params.get("busId");

    const [bus, setBus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        passengerName: "",
        phoneNumber: "",
        pickupPoint: "",
        dropPoint: "",
        seatNumber: "",
        amount: 100,
    });

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                if (!busId) return setBus(null);
                const res = await fetch(`/api/bus`);
                const json = await res.json();
                const found = (json.buses || []).find((b) => b.busId === busId);
                setBus(found || null);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [busId]);

    const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!bus) return showAppToast("error", "Select a bus first");
        if (!form.passengerName || !form.phoneNumber || !form.pickupPoint || !form.dropPoint || !form.seatNumber) {
            return showAppToast("error", "Please fill required fields");
        }

        setSaving(true);
        try {
            // create booking first
            const bookingRes = await fetch("/api/booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    busId: bus.busId,
                    busNumber: bus.busNumber,
                    busName: bus.busName,
                    routeName: bus.routeName,
                    travelDate: bus.travelDate,
                    startTime: bus.startTime,
                    endTime: bus.endTime,
                    passengerName: form.passengerName,
                    phoneNumber: form.phoneNumber,
                    pickupPoint: form.pickupPoint,
                    dropPoint: form.dropPoint,
                    seatNumber: form.seatNumber,
                    notes: form.notes || "",
                }),
            });

            const bookingJson = await bookingRes.json();
            if (!bookingRes.ok) throw new Error(bookingJson.error || "Booking failed");

            const booking = bookingJson.booking;

            // create razorpay order
            const payRes = await fetch("/api/payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "createOrder", amount: Number(form.amount), receipt: booking.bookingId }),
            });

            const payJson = await payRes.json();
            if (!payRes.ok) throw new Error(payJson.error || "Payment init failed");

            const { order, keyId } = payJson;

            // open Razorpay checkout
            const options = {
                key: keyId,
                amount: order.amount,
                currency: order.currency,
                name: bus.busName || "SA Tours",
                description: `Booking ${booking.bookingId}`,
                order_id: order.id,
                handler: async function (response) {
                    // record payment server-side
                    await fetch("/api/payment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "confirm",
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            bookingId: booking.bookingId,
                            amount: Number(form.amount),
                            payer: form.passengerName,
                            method: "razorpay",
                        }),
                    });

                    showAppToast("success", "Payment successful. Booking confirmed.");
                    router.push("/user/booking/success?bookingId=" + booking.bookingId);
                },
                prefill: {
                    name: form.passengerName,
                    contact: form.phoneNumber,
                },
                theme: { color: "#f97316" },
            };

            // load script
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => {
                const rzp = new window.Razorpay(options);
                rzp.open();
            };
            document.body.appendChild(script);
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to book");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!bus) return <div className="p-6">Bus not found.</div>;

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Book Bus {bus.busNumber}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Passenger name</label>
                    <input name="passengerName" value={form.passengerName} onChange={handle} className="w-full border px-3 py-2 rounded" />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Phone number</label>
                    <input name="phoneNumber" value={form.phoneNumber} onChange={handle} className="w-full border px-3 py-2 rounded" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Pickup</label>
                        <input name="pickupPoint" value={form.pickupPoint} onChange={handle} className="w-full border px-3 py-2 rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Drop</label>
                        <input name="dropPoint" value={form.dropPoint} onChange={handle} className="w-full border px-3 py-2 rounded" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Seat number</label>
                    <input name="seatNumber" value={form.seatNumber} onChange={handle} className="w-full border px-3 py-2 rounded" />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Amount (INR)</label>
                    <input name="amount" type="number" value={form.amount} onChange={handle} className="w-full border px-3 py-2 rounded" />
                </div>

                <div className="flex justify-end">
                    <button type="submit" disabled={saving} className="rounded-2xl bg-[#f97316] px-4 py-2 text-white">
                        {saving ? "Processing…" : "Pay & Book"}
                    </button>
                </div>
            </form>
        </div>
    );
}
