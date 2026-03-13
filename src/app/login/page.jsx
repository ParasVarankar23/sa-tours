"use client";

import { auth, googleProvider } from "@/lib/firebase/client";
import {
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth";
import { motion } from "framer-motion";
import {
    Bus,
    CalendarDays,
    LockKeyhole,
    Mail,
    MapPin,
    ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ identifier: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Login failed");

            setMessage(data.message || "Login successful");
            setTimeout(() => router.push(data.redirectTo || "/user"), 700);
        } catch (error) {
            setMessage(error.message || "Unable to login");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setMessage("");

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const idToken = credential?.idToken;

            if (!idToken) {
                throw new Error("Unable to read Google token. Try again.");
            }

            const res = await fetch("/api/login-google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Google login failed");

            setMessage(data.message || "Google login successful");
            setTimeout(() => router.push(data.redirectTo || "/user"), 700);
        } catch (error) {
            setMessage(error.message || "Unable to login with Google");
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <section className="bg-[#f8fafc] py-3 sm:py-4 lg:py-5">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-start gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
                    {/* LEFT SIDE CONTENT */}
                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        animate="show"
                        className="order-2 hidden lg:order-1 lg:block"
                    >
                        <motion.p
                            variants={fadeUp}
                            className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 ring-1 ring-orange-100"
                        >
                            <Bus size={16} />
                            Welcome Back to SA Tours & Travels
                        </motion.p>

                        <motion.h1
                            variants={fadeUp}
                            className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[40px] lg:leading-[1.30]"
                        >
                            Login to manage your{" "}
                            <span className="text-orange-500">bookings</span> and{" "}
                            <span className="text-orange-500">travel updates</span>
                        </motion.h1>

                        <motion.p
                            variants={fadeUp}
                            className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]"
                        >
                            Access your account to check booking status, view daily bus schedules,
                            manage travel details and stay updated with route timing information for
                            Borli, Dighi, Mahasala, Panvel, Vashi and Mumbai.
                        </motion.p>

                        {/* INFO CARDS */}
                        <motion.div
                            variants={stagger}
                            className="mt-5 grid gap-3 sm:grid-cols-3"
                        >
                            <motion.div
                                variants={fadeUp}
                                whileHover={{ y: -4 }}
                                className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <CalendarDays size={18} />
                                </div>
                                <p className="mt-3 text-lg font-bold text-slate-900">View Schedule</p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    Check daily departure and return timings quickly.
                                </p>
                            </motion.div>

                            <motion.div
                                variants={fadeUp}
                                whileHover={{ y: -4 }}
                                className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <MapPin size={18} />
                                </div>
                                <p className="mt-3 text-lg font-bold text-slate-900">Track Routes</p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    Get route and office details for your travel support.
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
                                <p className="mt-3 text-lg font-bold text-slate-900">Secure Access</p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    Safe and reliable account access for passengers.
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
                        <div className="mx-auto max-w-md rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl sm:p-4">
                            <div className="text-center">
                                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
                                    Welcome Back
                                </p>
                                <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Login</h2>
                                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                                    Access your account for bookings, schedule details and travel updates.
                                </p>
                            </div>

                            <form className="mt-3.5 space-y-3" onSubmit={handleSubmit}>
                                <div>
                                    <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700">
                                        Email or Phone
                                    </label>
                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2 transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                                        <Mail size={18} className="text-slate-400" />
                                        <input
                                            id="login-email"
                                            type="text"
                                            name="identifier"
                                            value={formData.identifier}
                                            onChange={handleChange}
                                            placeholder="Enter your email or phone"
                                            className="w-full bg-transparent text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                                            Password
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2 transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                                        <LockKeyhole size={18} className="text-slate-400" />
                                        <input
                                            id="login-password"
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Enter your password"
                                            className="w-full bg-transparent text-sm outline-none"
                                        />
                                    </div>
                                    <Link
                                        href="/forgot-password"
                                        className="mt-1.5 block text-right text-[11px] font-medium text-orange-500 hover:text-orange-600"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                                >
                                    {loading ? "Logging in..." : "Login"}
                                </button>

                                {message && (
                                    <p className="text-center text-sm text-slate-600">{message}</p>
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
                                    onClick={handleGoogleLogin}
                                    className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50"
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 48 48"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.659 32.657 29.263 36 24 36c-6.627 0-12-5.373-12-12S17.373 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                                        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.682 0-14.296 4.337-17.694 10.691z" />
                                        <path fill="#4CAF50" d="M24 44c5.167 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.145 35.091 26.715 36 24 36c-5.242 0-9.624-3.317-11.284-7.946l-6.522 5.025C9.557 39.556 16.227 44 24 44z" />
                                        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.79 2.237-2.231 4.166-4.084 5.571l.003-.002 6.19 5.238C36.971 38.205 44 33 44 24c0-1.341-.138-2.65-.389-3.917z" />
                                    </svg>
                                    {googleLoading ? "Please wait..." : "Login with Google"}
                                </button>

                                <p className="text-center text-sm text-slate-600">
                                    Don&apos;t have an account?{" "}
                                    <Link
                                        href="/signup"
                                        className="font-semibold text-orange-500 hover:text-orange-600"
                                    >
                                        Create Account
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