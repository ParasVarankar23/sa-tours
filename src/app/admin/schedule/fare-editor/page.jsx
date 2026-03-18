"use client";

import { showAppToast } from "@/lib/client/toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function FareEditorPage() {
    const router = useRouter();
    const params = useSearchParams();
    const busIdParam = params.get("busId") || "";
    const dateParam = params.get("date") || "";

    const [buses, setBuses] = useState([]);
    const [selectedBusId, setSelectedBusId] = useState(busIdParam);
    const [date, setDate] = useState(dateParam);
    const [exactFareMap, setExactFareMap] = useState({});
    const [forwardTerminal, setForwardTerminal] = useState("");
    const [returnTerminal, setReturnTerminal] = useState("");
    const [cityEntryStop, setCityEntryStop] = useState("");
    const [returnVillageStartStop, setReturnVillageStartStop] = useState("");
    const [majorDropStopsText, setMajorDropStopsText] = useState("");
    const [hiddenPickupText, setHiddenPickupText] = useState("");
    const [hiddenDropText, setHiddenDropText] = useState("");
    const [blockedPairsText, setBlockedPairsText] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchBuses = async () => {
            try {
                const res = await fetch("/api/bus");
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to load buses");
                setBuses(data.buses || []);
            } catch (e) {
                console.error(e);
                showAppToast("error", e.message || "Failed to load buses");
            }
        };
        fetchBuses();
    }, []);

    const selectedBus = (buses || []).find((b) => b.busId === selectedBusId) || null;

    useEffect(() => {
        // try load existing saved override for this bus+date
        if (!selectedBusId || !date) return;
        try {
            const key = `schedule_pricing_override:${selectedBusId}:${date}`;
            const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
            if (raw) {
                const parsed = JSON.parse(raw);
                setExactFareMap(parsed.exactFareMap || {});
                if (parsed.terminals) {
                    setForwardTerminal(parsed.terminals.forward || "");
                    setReturnTerminal(parsed.terminals.return || "");
                }
                if (parsed.bookingConfig) {
                    const bc = parsed.bookingConfig || {};
                    setCityEntryStop(bc.cityEntryStop || bc.cityEntry || "");
                    setReturnVillageStartStop(bc.returnVillageStartStop || bc.returnVillageStart || "");
                    setMajorDropStopsText((bc.majorDropStops || []).join(", "));
                    setHiddenPickupText((bc.hiddenPickupStops || []).join(", "));
                    setHiddenDropText((bc.hiddenDropStops || []).join(", "));
                    setBlockedPairsText((bc.blockedPairs || []).map(p => Array.isArray(p) ? p.join("|") : String(p)).join("\n"));
                }
            } else if (selectedBus && selectedBus.pricingRules && selectedBus.pricingRules.exactFareMap) {
                setExactFareMap({ ...(selectedBus.pricingRules.exactFareMap || {}) });
                // default terminals: try find 'Panvel' for return, otherwise last stop
                const stops = (selectedBus.stops || []).map((s) => (typeof s === 'string' ? s : s.stopName));
                const panvelIdx = stops.findIndex((s) => s && s.toLowerCase().includes('panvel'));
                setForwardTerminal(stops[stops.length - 1] || "");
                setReturnTerminal(panvelIdx !== -1 ? stops[panvelIdx] : (stops[stops.length - 1] || ""));
                // load bookingConfig from selectedBus if present
                if (selectedBus.bookingConfig) {
                    const bc = selectedBus.bookingConfig || {};
                    setCityEntryStop(bc.cityEntryStop || bc.cityEntry || "");
                    setReturnVillageStartStop(bc.returnVillageStartStop || bc.returnVillageStart || "");
                    setMajorDropStopsText((bc.majorDropStops || []).join(", "));
                    setHiddenPickupText((bc.hiddenPickupStops || []).join(", "));
                    setHiddenDropText((bc.hiddenDropStops || []).join(", "));
                    setBlockedPairsText((bc.blockedPairs || []).map(p => Array.isArray(p) ? p.join("|") : String(p)).join("\n"));
                }
            }
        } catch (e) {
            // ignore
        }
    }, [selectedBusId, date, selectedBus]);

    const handleSave = () => {
        if (!selectedBusId || !date) return showAppToast("error", "Select bus and date before saving");
        // filter empty
        const filtered = {};
        Object.keys(exactFareMap || {}).forEach((k) => {
            const v = exactFareMap[k];
            if (v !== "" && v !== undefined && v !== null) filtered[k] = Number(v);
        });
        // build bookingConfig
        const buildList = (txt) => (typeof txt === 'string' ? txt.split(',').map(s => s.trim()).filter(Boolean) : []);
        const parseBlocked = (txt) => {
            if (!txt) return [];
            return String(txt).split(/\r?\n/).map((line) => {
                const p = line.trim();
                if (!p) return null;
                const parts = p.includes('|') ? p.split('|') : (p.includes(',') ? p.split(',') : [p]);
                return parts.map(x => x.trim()).filter(Boolean);
            }).filter(Boolean);
        };

        const bookingConfig = {
            cityEntryStop: cityEntryStop || null,
            returnVillageStartStop: returnVillageStartStop || null,
            majorDropStops: buildList(majorDropStopsText),
            hiddenPickupStops: buildList(hiddenPickupText),
            hiddenDropStops: buildList(hiddenDropText),
            blockedPairs: parseBlocked(blockedPairsText),
        };

        const payload = { exactFareMap: filtered, terminals: { forward: forwardTerminal || null, return: returnTerminal || null }, bookingConfig };
        try {
            const key = `schedule_pricing_override:${selectedBusId}:${date}`;
            localStorage.setItem(key, JSON.stringify(payload));
            showAppToast("success", "Pricing saved. Returning to schedule page...");
            // redirect back to schedule page
            router.push(`/admin/schedule`);
        } catch (e) {
            console.error(e);
            showAppToast("error", "Failed to save pricing");
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#f8fafc] p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Route-wise Fare Editor</h1>
                    <p className="mt-1 text-sm text-slate-500">Select bus & date, then enter fares for stop pairs.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push('/admin/schedule')}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleSave}
                        className="rounded-2xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ea580c]"
                    >
                        Save and Return
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Select Bus</label>
                        <select value={selectedBusId} onChange={(e) => setSelectedBusId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm">
                            <option value="">-- Select bus --</option>
                            {buses.map((b) => (
                                <option key={b.busId} value={b.busId}>{`${b.busNumber} — ${b.routeName}`}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Select Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm" />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Forward terminal (end stop)</label>
                        <select value={forwardTerminal} onChange={(e) => setForwardTerminal(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm">
                            <option value="">-- Select terminal --</option>
                            {(selectedBus?.stops || []).map((s, i) => {
                                const name = typeof s === 'string' ? s : s.stopName;
                                return <option key={i} value={name}>{name}</option>;
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Return terminal (end stop for return trips)</label>
                        <select value={returnTerminal} onChange={(e) => setReturnTerminal(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm">
                            <option value="">-- Select return terminal --</option>
                            {(selectedBus?.stops || []).map((s, i) => {
                                const name = typeof s === 'string' ? s : s.stopName;
                                return <option key={i} value={name}>{name}</option>;
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">City entry stop</label>
                        <input value={cityEntryStop} onChange={(e) => setCityEntryStop(e.target.value)} placeholder="e.g. Panvel" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm" />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Return village start stop</label>
                        <input value={returnVillageStartStop} onChange={(e) => setReturnVillageStartStop(e.target.value)} placeholder="e.g. Kolad" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm" />
                    </div>
                </div>

                <div>
                    {selectedBus ? (
                        <div className="rounded-lg border bg-white p-4">
                            <h3 className="text-sm font-semibold text-slate-700">Stops</h3>
                            <p className="text-xs text-slate-500">Enter fares for From→To pairs</p>

                            <div className="mt-3 max-h-72 overflow-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-slate-500">
                                            <th className="px-2 py-1">From</th>
                                            <th className="px-2 py-1">To</th>
                                            <th className="px-2 py-1">Fare (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const stops = (selectedBus.stops || []).map((s) => (typeof s === 'string' ? s : s.stopName));
                                            const rows = [];
                                            const forwardLimit = forwardTerminal ? stops.indexOf(forwardTerminal) : stops.length - 1;
                                            for (let i = 0; i < stops.length; i++) {
                                                for (let j = i + 1; j < stops.length; j++) {
                                                    if (j > forwardLimit) continue;
                                                    const from = stops[i];
                                                    const to = stops[j];
                                                    const key = `${from}|${to}`;
                                                    rows.push(
                                                        <tr key={key} className="border-t">
                                                            <td className="px-2 py-2 text-slate-700">{from}</td>
                                                            <td className="px-2 py-2 text-slate-700">{to}</td>
                                                            <td className="px-2 py-2">
                                                                <input type="number" min={0} value={exactFareMap[key] ?? ''} onChange={(e) => setExactFareMap((p) => ({ ...p, [key]: e.target.value }))} className="w-28 rounded-md border px-2 py-1 text-sm" />
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            }
                                            return rows;
                                        })()}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label className="text-xs font-medium text-slate-600">Hidden pickup stops (comma separated)</label>
                                    <input value={hiddenPickupText} onChange={(e) => setHiddenPickupText(e.target.value)} placeholder="e.g. Agarwada, Vadvali Phata" className="w-full mt-1 rounded-md border px-2 py-1 text-sm" />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-600">Hidden drop stops (comma separated)</label>
                                    <input value={hiddenDropText} onChange={(e) => setHiddenDropText(e.target.value)} placeholder="e.g. Agarwada, Vadvali Phata" className="w-full mt-1 rounded-md border px-2 py-1 text-sm" />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-600">Major drop stops (comma separated)</label>
                                    <input value={majorDropStopsText} onChange={(e) => setMajorDropStopsText(e.target.value)} placeholder="Panvel, Nerul, Vashi, Chembur, Dongri" className="w-full mt-1 rounded-md border px-2 py-1 text-sm" />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-600">Blocked pairs (one per line, use `From|To`)</label>
                                    <textarea value={blockedPairsText} onChange={(e) => setBlockedPairsText(e.target.value)} placeholder={"Dighi|Adgaon\nAdgaon|Dighi"} className="w-full mt-1 rounded-md border px-2 py-1 text-sm h-20" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border bg-white p-4 text-sm text-slate-500">Select a bus to edit fares.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
