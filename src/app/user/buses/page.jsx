"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function BusesPage() {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [term, setTerm] = useState("");

    const fetchBuses = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/bus");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load buses");
            setBuses(data.buses || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBuses();
    }, []);

    const filtered = buses.filter((b) => {
        const t = term.toLowerCase();
        return (
            b.busName?.toLowerCase().includes(t) ||
            b.busNumber?.toLowerCase().includes(t) ||
            b.routeName?.toLowerCase().includes(t) ||
            b.startPoint?.toLowerCase().includes(t) ||
            b.endPoint?.toLowerCase().includes(t)
        );
    });

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">Available Buses</h1>
            <div className="mt-4 flex items-center gap-3">
                <Search className="text-slate-400" />
                <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search buses" className="w-full rounded-2xl border px-4 py-2" />
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div>Loading...</div>
                ) : filtered.length === 0 ? (
                    <div>No buses</div>
                ) : (
                    filtered.map((bus) => (
                        <div key={bus.busId} className="rounded-2xl border p-4 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">{bus.busNumber} | {bus.busName}</h3>
                                    <p className="text-sm text-slate-500">{bus.routeName}</p>
                                    <p className="text-sm text-slate-500">{bus.startTime} → {bus.endTime}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-orange-600">{bus.busType || 'AC'}</p>
                                    <Link href={`/user/book/${bus.busId}`} className="mt-2 inline-block rounded-xl bg-[#f97316] px-4 py-2 text-white">Book Now</Link>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
