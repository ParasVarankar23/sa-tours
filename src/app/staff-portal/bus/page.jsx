"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

export default function StaffBusPage() {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        let mounted = true;
        const fetchBuses = async () => {
            try {
                const res = await fetch("/api/bus");
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to load buses");
                if (mounted) setBuses(data.buses || []);
            } catch (e) {
                console.error(e);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchBuses();
        return () => (mounted = false);
    }, []);

    const filtered = (buses || []).filter((b) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            String(b.busNumber || "").toLowerCase().includes(q) ||
            String(b.busName || "").toLowerCase().includes(q) ||
            String(b.routeName || "").toLowerCase().includes(q)
        );
    });

    return (
        <div className="p-6">
            <h1 className="mb-4 text-2xl font-bold">Buses — Staff (View Only)</h1>

            <div className="mb-4 flex w-full max-w-md items-center gap-2">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search buses..."
                    className="w-full rounded border px-3 py-2"
                />
            </div>

            {loading ? (
                <p>Loading…</p>
            ) : (
                <div className="space-y-3">
                    {filtered.map((b) => (
                        <div key={b.busId || b.id || b.busNumber} className="rounded border p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-500">{b.routeName || b.busType}</div>
                                    <div className="text-lg font-semibold">{b.busNumber} {b.busName ? `— ${b.busName}` : ""}</div>
                                </div>
                                <div>
                                    <button
                                        onClick={() => setSelected(b)}
                                        className="rounded bg-slate-50 px-3 py-1 text-sm"
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 ? <p className="text-sm text-slate-500">No buses found</p> : null}
                </div>
            )}

            {selected ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded bg-white p-6">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-bold">{selected.busNumber} {selected.busName}</h2>
                                <p className="text-sm text-slate-500">{selected.routeName}</p>
                            </div>
                            <button onClick={() => setSelected(null)} className="p-2">
                                <X />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                                <p className="text-xs text-slate-500">Start</p>
                                <p className="font-medium">{String(selected.startPoint || "-")}</p>
                                <p className="text-xs text-slate-400">{selected.startTime || "-"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">End</p>
                                <p className="font-medium">{String(selected.endPoint || "-")}</p>
                                <p className="text-xs text-slate-400">{selected.endTime || "-"}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-xs text-slate-500">Pickup Points</p>
                                <ul className="mt-2 list-inside list-disc">
                                    {(Array.isArray(selected.pickupPoints) ? selected.pickupPoints : []).map((p, i) => (
                                        <li key={i} className="text-sm">{typeof p === 'object' ? p.name : String(p)}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
