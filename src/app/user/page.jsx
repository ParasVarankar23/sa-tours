"use client";

import { useEffect, useState } from "react";

export default function UserPage() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Example: fetch user info from localStorage or API
        const stored = localStorage.getItem("authToken");
        // You can decode the token or fetch user info from API here
        // For now, just a placeholder name
        setUser({ name: "User" });
    }, []);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mt-10 mx-auto max-w-xl">
            <h2 className="text-2xl font-bold text-slate-900">Welcome, {user?.name || "User"}</h2>
            <p className="mt-2 text-slate-600">
                Your account is active. Use this space to view your profile, bookings, and updates.
            </p>
        </div>
    );
}
