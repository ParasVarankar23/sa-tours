"use client";

import { showAppToast } from "@/lib/client/toast";
import { getFirebaseAuth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { motion } from "framer-motion";
import { Mail, ShieldCheck, User, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const auth = getFirebaseAuth();
const googleProvider = new GoogleAuthProvider();

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: "easeOut" },
    },
};

const stagger = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ fullName: "", email: "" });
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [credentialsPreview, setCredentialsPreview] = useState(null);

    const getErrorMessage = (error, fallback) => {
        const raw = String(error?.message || "").trim();

        if (!raw || raw === "Failed to fetch" || raw.toLowerCase().includes("network")) {
            return "Network error. Please check your connection and try again.";
        }

        if (raw.toLowerCase() === "email or phone already registered") {
            return "Signup failed. Email or phone is already registered.";
        }

        return raw || fallback;
    };

    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setCredentialsPreview(null);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Signup failed");
            }

            if (data.token) {
                localStorage.setItem("authToken", data.token);
            }

            if (data.authToken) {
                localStorage.setItem("authToken", data.authToken);
            }

            if (data.credentials?.email && data.credentials?.password) {
                setCredentialsPreview({
                    email: data.credentials.email,
                    password: data.credentials.password,
                });
            }

            showAppToast("success", "Signup successful.");

            if (
                Array.isArray(data.firebaseSync?.warnings) &&
                data.firebaseSync.warnings.length > 0
            ) {
                showAppToast("warning", data.firebaseSync.warnings[0]);
            }

            setTimeout(() => {
                router.push(data.redirectTo || "/user");
            }, 900);
        } catch (error) {
            showAppToast("error", getErrorMessage(error, "Unable to sign up."));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setGoogleLoading(true);
        setCredentialsPreview(null);

        try {
            // Force account chooser for clarity and to avoid silent sign-in
            googleProvider.setCustomParameters({ prompt: "select_account" });
            console.debug("calling signInWithPopup (signup)...");
            const result = await signInWithPopup(auth, googleProvider);
            console.debug("signInWithPopup (signup) result:", result);
            // Use Firebase ID token (same project) so Admin SDK can verify it server-side
            const firebaseIdToken = await result.user.getIdToken();

            if (!firebaseIdToken) {
                throw new Error("Unable to read Firebase ID token. Try again.");
            }

            const res = await fetch("/api/auth/google-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idToken: firebaseIdToken,
                    fullName: formData.fullName,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Google signup failed");
            }

            if (data.authToken) {
                localStorage.setItem("authToken", data.authToken);
            }

            showAppToast("success", "Signup successful.");

            if (
                Array.isArray(data.firebaseSync?.warnings) &&
                data.firebaseSync.warnings.length > 0
            ) {
                showAppToast("warning", data.firebaseSync.warnings[0]);
            }

            const role = data.user?.role;
            const position = data.user?.position;

            setTimeout(() => {
                if (role === "admin") {
                    router.push("/admin");
                } else if (role === "staff" || position) {
                    router.push("/staff-portal/booking");
                } else {
                    router.push("/user/booking");
                }
            }, 700);
        } catch (error) {
            const raw = String(error?.message || "").trim();

            if (
                raw.includes("auth/invalid-continue-uri") ||
                raw.includes("INVALID_CONTINUE_URI")
            ) {
                showAppToast(
                    "error",
                    "Firebase Google auth is not configured for localhost. Add localhost in Firebase Authentication → Settings → Authorized domains."
                );
            } else if (
                raw.includes("auth/popup-closed-by-user")
            ) {
                showAppToast("error", "Google popup was closed before completing signup.");
            } else if (
                raw.includes("auth/popup-blocked")
            ) {
                showAppToast("error", "Popup blocked by browser. Please allow popups and try again.");
            } else {
                showAppToast("error", getErrorMessage(error, "Unable to sign up with Google."));
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-100 py-12 sm:py-16 lg:py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-10 lg:grid-cols-2">
                    {/* LEFT SIDE CONTENT */}
                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        animate="show"
                        className="order-2 lg:order-1"
                    >
                        <motion.p
                            variants={fadeUp}
                            className="inline-flex items-center rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600 shadow-sm"
                        >
                            Create Your Travel Account
                        </motion.p>

                        <motion.h1
                            variants={fadeUp}
                            className="mt-5 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl"
                        >
                            Join and Book Your{" "}
                            <span className="text-orange-500">Bus Travel</span> Easily
                        </motion.h1>

                        <motion.p
                            variants={fadeUp}
                            className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg"
                        >
                            Create your account to manage bookings, save travel details,
                            and enjoy a smooth bus seat reservation experience.
                        </motion.p>

                        <motion.div
                            variants={stagger}
                            className="mt-6 grid gap-3 sm:grid-cols-3"
                        >
                            <motion.div
                                variants={fadeUp}
                                whileHover={{ y: -4 }}
                                className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <User size={18} />
                                </div>
                                <p className="mt-3 text-lg font-bold text-slate-900">
                                    Quick Access
                                </p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    Save your travel details for future bookings.
                                </p>
                            </motion.div>

                            <motion.div
                                variants={fadeUp}
                                whileHover={{ y: -4 }}
                                className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <Users size={18} />
                                </div>
                                <p className="mt-3 text-lg font-bold text-slate-900">
                                    Easy Booking
                                </p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    Faster form filling for daily and group travel.
                                </p>
                            </motion.div>

                            <motion.div
                                variants={fadeUp}
                                whileHover={{ y: -4 }}
                                className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <ShieldCheck size={18} />
                                </div>
                                <p className="mt-3 text-lg font-bold text-slate-900">
                                    Safe & Secure
                                </p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    Protected access to your account and travel data.
                                </p>
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* RIGHT SIDE FORM */}
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                        className="order-1 lg:order-2"
                    >
                        <div className="mx-auto max-w-md rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
                            <div className="text-center">
                                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
                                    Join Us
                                </p>
                                <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                                    Create Account
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Sign up to manage your travel inquiries and bookings
                                    easily.
                                </p>
                            </div>

                            <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
                                {/* Full Name */}
                                <div>
                                    <label
                                        htmlFor="signup-name"
                                        className="mb-1.5 block text-sm font-medium text-slate-700"
                                    >
                                        Full Name
                                    </label>
                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2.5 transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                                        <User size={18} className="text-slate-400" />
                                        <input
                                            id="signup-name"
                                            type="text"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            placeholder="Enter your full name"
                                            className="w-full bg-transparent text-sm outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label
                                        htmlFor="signup-email"
                                        className="mb-1.5 block text-sm font-medium text-slate-700"
                                    >
                                        Email Address
                                    </label>
                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2.5 transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                                        <Mail size={18} className="text-slate-400" />
                                        <input
                                            id="signup-email"
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Enter your email"
                                            className="w-full bg-transparent text-sm outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Create Account Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {loading ? "Creating..." : "Create Account"}
                                </button>

                                {/* Credentials Preview */}
                                {credentialsPreview && (
                                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm text-slate-700">
                                        <p className="font-semibold text-slate-900">
                                            Login Credentials
                                        </p>
                                        <p className="mt-1">
                                            Email: {credentialsPreview.email}
                                        </p>
                                        <p>Password: {credentialsPreview.password}</p>
                                    </div>
                                )}

                                {/* Divider */}
                                <div className="relative py-1">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200" />
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white px-3 text-xs font-medium text-slate-400">
                                            OR CONTINUE WITH
                                        </span>
                                    </div>
                                </div>

                                {/* Google Button */}
                                <button
                                    type="button"
                                    disabled={googleLoading}
                                    onClick={handleGoogleSignup}
                                    className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 48 48"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            fill="#FFC107"
                                            d="M43.611 20.083H42V20H24v8h11.303C33.659 32.657 29.263 36 24 36c-6.627 0-12-5.373-12-12S17.373 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                                        />
                                        <path
                                            fill="#FF3D00"
                                            d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.682 0-14.296 4.337-17.694 10.691z"
                                        />
                                        <path
                                            fill="#4CAF50"
                                            d="M24 44c5.167 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.145 35.091 26.715 36 24 36c-5.242 0-9.624-3.317-11.284-7.946l-6.522 5.025C9.557 39.556 16.227 44 24 44z"
                                        />
                                        <path
                                            fill="#1976D2"
                                            d="M43.611 20.083H42V20H24v8h11.303c-.79 2.237-2.231 4.166-4.084 5.571l.003-.002 6.19 5.238C36.971 38.205 44 33 44 24c0-1.341-.138-2.65-.389-3.917z"
                                        />
                                    </svg>
                                    {googleLoading ? "Please wait..." : "Sign up with Google"}
                                </button>

                                {/* Login Link */}
                                <p className="text-center text-sm text-slate-600">
                                    Already have an account?{" "}
                                    <Link
                                        href="/login"
                                        className="font-semibold text-orange-500 hover:text-orange-600"
                                    >
                                        Login Here
                                    </Link>
                                </p>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}