"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function StaffSchedulePage() {
    const [buses, setBuses] = useState([]);
    const [schedules, setSchedules] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        let mounted = true;

        const fetchAll = async () => {
            try {
                const [bRes, sRes] = await Promise.all([fetch("/api/bus"), fetch("/api/schedule")]);
                const bData = await bRes.json();
                const sData = await sRes.json();
                if (!bRes.ok) throw new Error(bData.error || "Failed to load buses");
                if (!sRes.ok) throw new Error(sData.error || "Failed to load schedules");

                if (mounted) {
                    setBuses(bData.buses || []);
                    setSchedules(sData.schedules || {});
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchAll();
        return () => (mounted = false);
    }, []);

    const allItems = useMemo(() => {
        const out = [];
        for (const b of buses || []) {
            const id = b.busId || b.id || b.busNumber;
            const dates = schedules[id] ? Object.keys(schedules[id]) : [];
            for (const d of dates) {
                out.push({ bus: b, date: d });
            }
        }
        return out;
    }, [buses, schedules]);

    const filtered = allItems.filter((it) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            String(it.bus.busNumber || "").toLowerCase().includes(q) ||
            String(it.bus.routeName || "").toLowerCase().includes(q) ||
            String(it.date || "").toLowerCase().includes(q)
        );
    });

    return (
        <div className="p-6">
            <h1 className="mb-4 text-2xl font-bold">Schedules — Staff (View Only)</h1>

            <div className="mb-4 max-w-md">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search schedules..."
                    className="w-full rounded border px-3 py-2"
                />
            </div>

            {loading ? (
                <p>Loading…</p>
            ) : (
                <div className="space-y-3">
                    {filtered.map((it, i) => (
                        <div key={`${it.bus.busId || it.bus.id || i}-${it.date}`} className="rounded border p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-500">{it.bus.routeName}</div>
                                    <div className="text-lg font-semibold">{it.bus.busNumber} — {it.date}</div>
                                </div>
                                <div>
                                    <button onClick={() => setSelected(it)} className="rounded bg-slate-50 px-3 py-1 text-sm">View</button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 ? <p className="text-sm text-slate-500">No schedules</p> : null}
                </div>
            )}

            {selected ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded bg-white p-6">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-bold">{selected.bus.busNumber} — {selected.date}</h2>
                                <p className="text-sm text-slate-500">{selected.bus.routeName}</p>
                            </div>
                            <button onClick={() => setSelected(null)} className="p-2"><X /></button>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">Start</p>
                            <p className="font-medium">{selected.bus.startPoint || "-"} {selected.bus.startTime || ""}</p>

                            <p className="mt-3 text-sm text-slate-500">End</p>
                            <p className="font-medium">{selected.bus.endPoint || "-"} {selected.bus.endTime || ""}</p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
