"use client";

import { showAppToast } from "@/lib/client/toast";
import {
    Camera,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Save,
    User,
    X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

export default function ProfilePage() {
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);

    const [profile, setProfile] = useState({
        uid: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        role: "user",
        photoUrl: "",
        photoPublicId: "",
    });

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        address: "",
    });

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");

    const initials = useMemo(() => {
        const name = String(formData.name || profile.name || "").trim();

        if (!name) return "U";

        const parts = name.split(/\s+/);
        if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";

        return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    }, [formData.name, profile.name]);

    useEffect(() => {
        let active = true;

        async function loadProfile() {
            try {
                const authToken = localStorage.getItem("authToken");

                const res = await fetch("/api/auth/profile", {
                    method: "GET",
                    cache: "no-store",
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    throw new Error(data?.error || "Failed to load profile");
                }

                // ✅ IMPORTANT FIX: data.profile
                const p = data?.profile || {};

                if (active) {
                    const normalized = {
                        uid: p.uid || "",
                        name: p.name || "",
                        email: p.email || "",
                        phone: p.phone || "",
                        address: p.address || "",
                        role: p.role || "user",
                        photoUrl: p.photoUrl || "",
                        photoPublicId: p.photoPublicId || "",
                    };

                    setProfile(normalized);
                    setFormData({
                        name: normalized.name,
                        phone: normalized.phone,
                        address: normalized.address,
                    });
                }
            } catch (error) {
                showAppToast("error", error.message || "Unable to load profile.");
            } finally {
                if (active) setLoading(false);
            }
        }

        loadProfile();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl("");
            return;
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile]);

    function handleChange(e) {
        const { name, value } = e.target;

        // Phone: allow digits only and limit to 10 characters
        if (name === "phone") {
            const digits = String(value || "").replace(/\D/g, "").slice(0, 10);
            setFormData((prev) => ({ ...prev, phone: digits }));
            return;
        }

        // Name: strip numeric characters (allow letters, punctuation and spaces)
        if (name === "name") {
            const cleaned = String(value || "").replace(/[0-9]/g, "");
            setFormData((prev) => ({ ...prev, name: cleaned }));
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    }

    function handleEdit() {
        setEditing(true);
    }

    function handleCancel() {
        setEditing(false);
        setSelectedFile(null);
        setPreviewUrl("");
        setFormData({
            name: profile.name || "",
            phone: profile.phone || "",
            address: profile.address || "",
        });
    }

    function handleFileChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showAppToast("error", "Please select a valid image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showAppToast("error", "Image size must be less than 5MB.");
            return;
        }

        setSelectedFile(file);
    }

    async function handleSave() {
        const nameTrim = String(formData.name || "").trim();
        const phoneTrim = String(formData.phone || "").trim();

        if (!nameTrim) {
            showAppToast("error", "Name is required.");
            return;
        }

        // Name: allow letters, spaces and common punctuation only
        const nameValid = /^[A-Za-z\s.'-]+$/.test(nameTrim);
        if (!nameValid) {
            showAppToast("error", "Name must contain only letters and spaces.");
            return;
        }

        // Phone: if provided, must be exactly 10 digits
        if (phoneTrim && !/^\d{10}$/.test(phoneTrim)) {
            showAppToast("error", "Phone number must be exactly 10 digits.");
            return;
        }

        setSaving(true);

        try {
            const authToken = localStorage.getItem("authToken");
            const payload = new FormData();

            payload.append("name", nameTrim);
            payload.append("phone", phoneTrim);
            payload.append("address", String(formData.address || "").trim());

            if (selectedFile) {
                payload.append("photo", selectedFile);
            }

            const res = await fetch("/api/auth/profile", {
                method: "PUT",
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
                body: payload,
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data?.error || "Failed to update profile");
            }

            // ✅ IMPORTANT FIX: data.profile
            const updated = data?.profile || {};

            const normalized = {
                uid: updated.uid || profile.uid,
                name: updated.name || formData.name.trim(),
                email: updated.email || profile.email,
                phone: updated.phone || formData.phone.trim(),
                address: updated.address || formData.address.trim(),
                role: updated.role || profile.role,
                photoUrl: updated.photoUrl || profile.photoUrl,
                photoPublicId: updated.photoPublicId || profile.photoPublicId,
            };

            setProfile(normalized);
            setFormData({
                name: normalized.name,
                phone: normalized.phone,
                address: normalized.address,
            });

            setSelectedFile(null);
            setPreviewUrl("");
            setEditing(false);

            showAppToast("success", data?.message || "Profile updated successfully.");
        } catch (error) {
            showAppToast("error", error.message || "Unable to update profile.");
        } finally {
            setSaving(false);
        }
    }

    const displayImage = previewUrl || profile.photoUrl || "";

    if (loading) {
        return (
            <section className="mx-auto w-full max-w-6xl">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="animate-pulse">
                        <div className="mb-8 flex justify-end">
                            <div className="h-12 w-36 rounded-2xl bg-slate-200" />
                        </div>
                        <div className="mx-auto h-28 w-28 rounded-full bg-slate-200" />
                        <div className="mx-auto mt-5 h-8 w-56 rounded-xl bg-slate-200" />
                        <div className="mx-auto mt-3 h-5 w-72 rounded-lg bg-slate-100" />
                        <div className="mt-10 grid gap-5 md:grid-cols-2">
                            <div className="h-24 rounded-2xl bg-slate-100" />
                            <div className="h-24 rounded-2xl bg-slate-100" />
                            <div className="h-24 rounded-2xl bg-slate-100" />
                            <div className="h-32 rounded-2xl bg-slate-100 md:col-span-2" />
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="mx-auto w-full max-w-6xl">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                {/* ORANGE TOP BAR */}
                <div className="h-4 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400" />

                <div className="p-4 sm:p-6 lg:p-8">
                    {/* ACTION BUTTONS */}
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        {!editing ? (
                            <button
                                type="button"
                                onClick={handleEdit}
                                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                            >
                                <Pencil size={16} />
                                Edit Profile
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    <Save size={16} />
                                    {saving ? "Saving..." : "Save"}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    <X size={16} />
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>

                    {/* PROFILE CENTER */}
                    <div className="mt-4 flex flex-col items-center text-center">
                        <div className="relative">
                            {displayImage ? (
                                <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-orange-100 shadow-lg sm:h-32 sm:w-32">
                                    <Image
                                        src={displayImage}
                                        alt="Profile"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-3xl font-bold text-white shadow-lg shadow-orange-200 sm:h-32 sm:w-32 sm:text-4xl">
                                    {initials}
                                </div>
                            )}

                            {editing && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 inline-flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-orange-500 text-white shadow-lg transition hover:bg-orange-600"
                                    >
                                        <Camera size={18} />
                                    </button>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </>
                            )}
                        </div>

                        <h1 className="mt-5 text-2xl font-bold text-slate-900 sm:text-3xl">
                            {formData.name || "User Name"}
                        </h1>

                        <p className="mt-2 text-sm text-slate-500 sm:text-base break-all">
                            {profile.email || "No email available"}
                        </p>

                        <div className="mt-4 inline-flex items-center rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 ring-1 ring-orange-100">
                            {String(profile.role || "user").charAt(0).toUpperCase() +
                                String(profile.role || "user").slice(1)}
                        </div>
                    </div>

                    {/* FORM FIELDS */}
                    <div className="mt-10 grid gap-5 md:grid-cols-2">
                        {/* NAME */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Name
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <User size={18} />
                                </span>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    disabled={!editing}
                                    placeholder="Enter your full name"
                                    inputMode="text"
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                            </div>
                        </div>

                        {/* EMAIL */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Email
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Mail size={18} />
                                </span>
                                <input
                                    type="email"
                                    value={profile.email || ""}
                                    disabled
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* PHONE */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Phone Number
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Phone size={18} />
                                </span>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    disabled={!editing}
                                    placeholder="Enter your phone number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={10}
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                            </div>
                        </div>

                        {/* ROLE */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Role
                            </label>
                            <input
                                type="text"
                                value={
                                    String(profile.role || "user").charAt(0).toUpperCase() +
                                    String(profile.role || "user").slice(1)
                                }
                                disabled
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                            />
                        </div>

                        {/* ADDRESS */}
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Address
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-4 text-slate-400">
                                    <MapPin size={18} />
                                </span>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    disabled={!editing}
                                    rows={4}
                                    placeholder="Enter your address"
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-500 resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}