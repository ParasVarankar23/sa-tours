"use client";

import { useState } from "react";

export default function AdminStaffPage() {
    const [formData, setFormData] = useState({ fullName: "", email: "", phone: "" });
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch("/api/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed");

            setMessage("Staff created successfully. Password sent on email.");
            setFormData({ fullName: "", email: "", phone: "" });
        } catch (err) {
            setMessage(err.message || "Unable to create staff");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Create Staff Access</h2>
            <p className="mt-2 text-slate-600">Only admin can create staff login credentials.</p>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:max-w-xl">
                <input
                    value={formData.fullName}
                    onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="Full name"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400"
                />
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Email"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400"
                />
                <input
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Phone"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? "Creating..." : "Create Staff"}
                </button>
            </form>

            {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
        </div>
    );
}
