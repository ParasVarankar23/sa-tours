"use client";

import { showAppToast } from "@/lib/client/toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function StaffPortalPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("authToken");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const res = await fetch("/api/auth/me", { headers });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(data.error || "Failed to fetch profile");
                }
                setProfile(data);
            } catch (err) {
                console.error(err);
                showAppToast("error", err.message || "Failed to load profile");
                // if unauthorized, go to login
                if ((err.message || "").toLowerCase().includes("token") || (err.message || "").toLowerCase().includes("missing")) {
                    router.push("/login");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) return <div className="p-6">Loading...</div>;
    if (!profile) return <div className="p-6">No profile found.</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">Staff Portal</h1>
            <div className="mt-4 max-w-xl rounded-md border bg-white p-4">
                <div className="mb-2 text-sm text-slate-500">Name</div>
                <div className="text-lg font-semibold">{profile.fullName || "—"}</div>

                <div className="mt-4 mb-2 text-sm text-slate-500">Email</div>
                <div className="text-sm">{profile.email || "—"}</div>

                <div className="mt-4 mb-2 text-sm text-slate-500">Role</div>
                <div className="text-sm font-medium">{profile.role || "user"}</div>

                <div className="mt-4 mb-2 text-sm text-slate-500">Position</div>
                <div className="text-sm font-medium">{profile.position || "—"}</div>
            </div>
        </div>
    );
}
