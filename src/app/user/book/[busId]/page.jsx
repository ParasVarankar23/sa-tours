"use client";

import SeatLayout from "@/components/SeatLayout";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BookPage() {
    const { busId } = useParams();
    const [bus, setBus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [travelDate, setTravelDate] = useState("");
    const [bookedSeats, setBookedSeats] = useState([]);
    const [selectedSeat, setSelectedSeat] = useState("");
    const [passenger, setPassenger] = useState({ passengerName: "", phoneNumber: "", pickupPoint: "", dropPoint: "", notes: "" });
    const [fareInfo, setFareInfo] = useState({ fare: 0 });
    const [loadingFare, setLoadingFare] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const res = await fetch(`/api/bus`);
                const data = await res.json();
                const found = (data.buses || []).find((b) => b.busId === busId);
                setBus(found || null);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [busId]);

    useEffect(() => {
        if (!bus || !travelDate) return;
        // fetch booked seats for bus/date
        (async () => {
            try {
                const res = await fetch(`/api/booking/by-bus?busId=${busId}&travelDate=${travelDate}`);
                const data = await res.json();
                const seats = (data.bookings || []).map((b) => String(b.seatNumber));
                setBookedSeats(seats);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [bus, travelDate, busId]);

    useEffect(() => {
        if (!bus || !travelDate) return;
        // initialize fare for default from/to if stops present
        if (bus.stops && bus.stops.length >= 2) {
            const from = bus.stops[0].stopName || bus.stops[0];
            const to = bus.stops[1].stopName || bus.stops[1];
            fetchFare(from, to);
        }
    }, [bus, travelDate]);

    async function fetchFare(fromStop, toStop) {
        try {
            setLoadingFare(true);
            const res = await fetch(`/api/pricing/calculate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ busId, fromStop, toStop }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to calculate fare");
            setFareInfo(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingFare(false);
        }
    }

    const handleSelectSeat = (s) => setSelectedSeat(s);

    const handlePay = async () => {
        if (!selectedSeat) return alert("Select a seat");
        if (!passenger.passengerName || !passenger.phoneNumber || !passenger.pickupPoint || !passenger.dropPoint) return alert("Fill passenger details");

        function loadScript(src) {
            return new Promise((resolve, reject) => {
                if (typeof window === "undefined") return reject(new Error("Window is undefined"));
                if (window.Razorpay) return resolve(true);
                const script = document.createElement("script");
                script.src = src;
                script.async = true;
                script.onload = () => resolve(true);
                script.onerror = () => reject(new Error("Failed to load script"));
                document.body.appendChild(script);
            });
        }

        try {
            await loadScript("https://checkout.razorpay.com/v1/checkout.js");
            // create order
            const amount = fareInfo.fare || 0;
            const orderRes = await fetch(`/api/razorpay/order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount }),
            });
            const orderData = await orderRes.json();
            if (!orderRes.ok) throw new Error(orderData.error || "Order creation failed");

            const { order, keyId } = orderData;

            // open Razorpay
            if (!window.Razorpay) throw new Error("Razorpay SDK not available");

            const rzp = new window.Razorpay({
                key: keyId,
                amount: order.amount,
                order_id: order.id,
                name: "SA Tours",
                handler: async function (response) {
                    // verify on server
                    const verifyRes = await fetch(`/api/razorpay/verify`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            bookingMeta: {
                                busId: bus.busId,
                                busNumber: bus.busNumber,
                                busName: bus.busName,
                                routeName: bus.routeName,
                                startPoint: bus.startPoint,
                                endPoint: bus.endPoint,
                                travelDate,
                                startTime: bus.startTime,
                                endTime: bus.endTime,
                                passengerName: passenger.passengerName,
                                phoneNumber: passenger.phoneNumber,
                                pickupPoint: passenger.pickupPoint,
                                dropPoint: passenger.dropPoint,
                                seatNumber: selectedSeat,
                                amount: fareInfo.fare,
                            },
                        }),
                    });

                    const verifyData = await verifyRes.json();
                    if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");

                    // redirect to bookings page
                    router.push(`/user/bookings`);
                },
                prefill: {
                    name: passenger.passengerName,
                    contact: passenger.phoneNumber,
                },
            });

            rzp.open();
        } catch (e) {
            console.error(e);
            alert(e.message || "Payment failed");
        }
    };

    if (loading) return <div className="p-6">Loading bus...</div>;
    if (!bus) return <div className="p-6">Bus not found</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">Book: {bus.busNumber} | {bus.busName}</h1>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-2">
                    <div className="rounded-2xl border p-4">
                        <div className="mb-4">
                            <p className="text-sm text-slate-500">{bus.routeName} • {bus.startTime} → {bus.endTime}</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium">Travel Date</label>
                            <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} className="mt-2 rounded-2xl border px-4 py-2" />
                        </div>

                        <div className="mb-4">
                            <SeatLayout layout={bus.seatLayout || 32} bookedSeats={bookedSeats} selectedSeat={selectedSeat} onSelect={handleSelectSeat} />
                        </div>

                        <div className="rounded-2xl border p-4">
                            <h3 className="font-semibold">Passenger Details</h3>
                            <div className="mt-3 grid grid-cols-1 gap-3">
                                <input placeholder="Full name" value={passenger.passengerName} onChange={(e) => setPassenger((p) => ({ ...p, passengerName: e.target.value }))} className="rounded-2xl border px-4 py-2" />
                                <input placeholder="Phone number" value={passenger.phoneNumber} onChange={(e) => setPassenger((p) => ({ ...p, phoneNumber: e.target.value }))} className="rounded-2xl border px-4 py-2" />
                                <select value={passenger.pickupPoint} onChange={(e) => { setPassenger((p) => ({ ...p, pickupPoint: e.target.value })); fetchFare(e.target.value, passenger.dropPoint || (bus.stops && (bus.stops[1]?.stopName || bus.stops[1]))); }} className="rounded-2xl border px-4 py-2">
                                    <option value="">Select pickup</option>
                                    {(bus.stops || []).map((s, idx) => <option key={idx} value={s.stopName || s}>{s.stopName || s}</option>)}
                                </select>
                                <select value={passenger.dropPoint} onChange={(e) => { setPassenger((p) => ({ ...p, dropPoint: e.target.value })); fetchFare(passenger.pickupPoint || (bus.stops && (bus.stops[0]?.stopName || bus.stops[0])), e.target.value); }} className="rounded-2xl border px-4 py-2">
                                    <option value="">Select drop</option>
                                    {(bus.stops || []).map((s, idx) => <option key={idx} value={s.stopName || s}>{s.stopName || s}</option>)}
                                </select>
                                <textarea placeholder="Notes (optional)" value={passenger.notes} onChange={(e) => setPassenger((p) => ({ ...p, notes: e.target.value }))} className="rounded-2xl border px-4 py-2" />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="rounded-2xl border p-4">
                        <h3 className="font-semibold">Fare Summary</h3>
                        <div className="mt-3">
                            <p>Fare: {loadingFare ? '...' : `₹ ${fareInfo.fare || 0}`}</p>
                            <p>Seat: {selectedSeat || '--'}</p>
                            <p>From: {passenger.pickupPoint || '--'}</p>
                            <p>To: {passenger.dropPoint || '--'}</p>
                        </div>

                        <div className="mt-4">
                            <button onClick={handlePay} className="w-full rounded-2xl bg-[#f97316] px-4 py-2 text-white">Pay & Confirm Booking</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
