"use client";

import { useEffect, useState } from "react";

export default function StaffPortalPage() {
    const [entries, setEntries] = useState([]);
    const [message, setMessage] = useState("");
    const [loadingEntries, setLoadingEntries] = useState(true);
    const [savingManual, setSavingManual] = useState(false);
    const [uploadingSheet, setUploadingSheet] = useState(false);
    const [manualForm, setManualForm] = useState({ fullName: "", email: "", phone: "" });
    const [sheetFile, setSheetFile] = useState(null);

    async function loadEntries() {
        setLoadingEntries(true);
        try {
            const res = await fetch("/api/staff/entries", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Unable to load entries");
            setEntries(data.entries || []);
        } catch (error) {
            setMessage(error.message || "Unable to load entries");
        } finally {
            setLoadingEntries(false);
        }
    }

    useEffect(() => {
        loadEntries();
    }, []);

    async function handleManualSubmit(e) {
        e.preventDefault();
        setSavingManual(true);
        setMessage("");

        try {
            const res = await fetch("/api/staff/entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(manualForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Unable to save entry");

            setEntries(data.entries || []);
            setManualForm({ fullName: "", email: "", phone: "" });
            setMessage(data.message || "Entry added");
        } catch (error) {
            setMessage(error.message || "Unable to save entry");
        } finally {
            setSavingManual(false);
        }
    }

    async function handleSheetUpload(e) {
        e.preventDefault();
        if (!sheetFile) {
            setMessage("Please choose a file first");
            return;
        }

        setUploadingSheet(true);
        setMessage("");

        try {
            const form = new FormData();
            form.append("file", sheetFile);

            const res = await fetch("/api/staff/entries", {
                method: "POST",
                body: form,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Upload failed");

            setEntries(data.entries || []);
            setSheetFile(null);
            setMessage(data.message || "Sheet uploaded");
        } catch (error) {
            setMessage(error.message || "Upload failed");
        } finally {
            setUploadingSheet(false);
        }
    }

    let recordsSection = null;
    if (loadingEntries) {
        recordsSection = <p className="mt-3 text-sm text-slate-500">Loading entries...</p>;
    } else if (entries.length === 0) {
        recordsSection = <p className="mt-3 text-sm text-slate-500">No entries yet.</p>;
    } else {
        recordsSection = (
            <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Phone</th>
                            <th className="px-3 py-2">Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry) => (
                            <tr key={entry.id} className="border-b border-slate-100">
                                <td className="px-3 py-2 text-slate-900">{entry.fullName}</td>
                                <td className="px-3 py-2 text-slate-700">{entry.email}</td>
                                <td className="px-3 py-2 text-slate-700">{entry.phone}</td>
                                <td className="px-3 py-2 text-slate-500">{entry.source}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900">Staff Data Entry</h2>
                <p className="mt-2 text-slate-600">
                    Add name, email and phone manually or upload a sheet (.csv/.xlsx/.xls).
                </p>

                <div className="mt-2 text-xs text-slate-500">Required columns: name, email, phone</div>

                {message && <p className="mt-3 text-sm text-slate-700">{message}</p>}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <form
                    onSubmit={handleManualSubmit}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                    <h3 className="text-lg font-semibold text-slate-900">Manual Entry</h3>
                    <div className="mt-4 grid gap-3">
                        <input
                            required
                            value={manualForm.fullName}
                            onChange={(e) => setManualForm((prev) => ({ ...prev, fullName: e.target.value }))}
                            placeholder="Full name"
                            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400"
                        />
                        <input
                            required
                            type="email"
                            value={manualForm.email}
                            onChange={(e) => setManualForm((prev) => ({ ...prev, email: e.target.value }))}
                            placeholder="Email"
                            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400"
                        />
                        <input
                            required
                            type="tel"
                            value={manualForm.phone}
                            onChange={(e) => setManualForm((prev) => ({ ...prev, phone: e.target.value }))}
                            placeholder="Phone"
                            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={savingManual}
                        className="mt-4 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {savingManual ? "Saving..." : "Add Entry"}
                    </button>
                </form>

                <form
                    onSubmit={handleSheetUpload}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                    <h3 className="text-lg font-semibold text-slate-900">Upload Excel Sheet</h3>
                    <div className="mt-4 grid gap-3">
                        <input
                            required
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={(e) => setSheetFile(e.target.files?.[0] || null)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        <p className="text-xs text-slate-500">
                            Tip: CSV works out of the box. For xls/xlsx install package: xlsx
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={uploadingSheet}
                        className="mt-4 rounded-full border border-orange-300 px-5 py-2.5 text-sm font-semibold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {uploadingSheet ? "Uploading..." : "Upload Sheet"}
                    </button>
                </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Entered Records</h3>
                {recordsSection}
            </div>
        </div>
    );
}
