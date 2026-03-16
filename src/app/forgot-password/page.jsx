"use client";

import { showAppToast } from "@/lib/client/toast";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Eye,
    EyeOff,
    KeyRound,
    LockKeyhole,
    Mail,
    ShieldCheck,
    Smartphone,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function ForgotPasswordPage() {
    const [step, setStep] = useState(1);

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (resendCooldown <= 0) return;

        const timer = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [resendCooldown]);

    const getErrorMessage = (error, fallback) => {
        const raw = String(error?.message || "").trim();

        if (!raw || raw === "Failed to fetch" || raw.toLowerCase().includes("network")) {
            return "Network error. Please check your connection and try again.";
        }

        return raw || fallback;
    };

    // STEP 1 - SEND OTP
    const sendOtp = async (e) => {
        if (e) e.preventDefault();

        if (!email.trim()) {
            showAppToast("error", "Please enter your email address.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "send-otp",
                    email: email.trim(),
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || data.message || "Failed to send OTP");
            }

            showAppToast("success", data.message || "OTP sent successfully.");
            setStep(2);
            setResendCooldown(30);
        } catch (error) {
            showAppToast("error", getErrorMessage(error, "Unable to send OTP."));
        } finally {
            setLoading(false);
        }
    };

    // STEP 2 - OTP UI CHECK ONLY
    const handleOtpContinue = (e) => {
        e.preventDefault();

        if (!otp.trim()) {
            showAppToast("error", "Please enter the OTP.");
            return;
        }

        if (otp.trim().length !== 6) {
            showAppToast("error", "Please enter a valid 6-digit OTP.");
            return;
        }

        setStep(3);
    };

    // STEP 3 - RESET PASSWORD
    const resetPassword = async (e) => {
        e.preventDefault();

        if (!newPassword || !confirmPassword) {
            showAppToast("error", "Please fill all password fields.");
            return;
        }

        if (newPassword.length < 6) {
            showAppToast("error", "Password must be at least 6 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            showAppToast("error", "Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "reset-password",
                    email: email.trim(),
                    otp: otp.trim(),
                    newPassword,
                    confirmPassword,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || data.message || "Reset failed");
            }

            showAppToast("success", data.message || "Password reset successful.");

            setTimeout(() => {
                window.location.href = "/login";
            }, 900);
        } catch (error) {
            showAppToast("error", getErrorMessage(error, "Unable to reset password."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="min-h-[calc(100vh-90px)] bg-[#f8fafc] py-8 sm:py-10 lg:py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
                    {/* LEFT SIDE CONTENT */}
                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        animate="show"
                        className="order-2 lg:order-1"
                    >
                        <motion.p
                            variants={fadeUp}
                            className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 ring-1 ring-orange-100"
                        >
                            <KeyRound size={16} />
                            Reset Your Password Securely
                        </motion.p>

                        <motion.h1
                            variants={fadeUp}
                            className="mt-5 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[50px] lg:leading-[1.05]"
                        >
                            Recover your account in{" "}
                            <span className="text-orange-500">three simple steps</span>
                        </motion.h1>

                        <motion.p
                            variants={fadeUp}
                            className="mt-5 max-w-2xl text-[15px] leading-8 text-slate-600 sm:text-base"
                        >
                            Enter your registered email address, verify the OTP sent to you, and
                            set a new password to securely access your SA Tours & Travels account.
                        </motion.p>

                        <motion.div variants={stagger} className="mt-8 grid gap-4 sm:grid-cols-3">
                            <motion.div
                                variants={fadeUp}
                                whileHover={{ y: -4 }}
                                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <Mail size={20} />
                                </div>
                                <p className="mt-4 text-base font-bold text-slate-900">Step 1</p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Enter your registered email address.
                                </p>
                            </motion.div>

                            <motion.div
                                variants={fadeUp}
                                whileHover={{ y: -4 }}
                                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <Smartphone size={20} />
                                </div>
                                <p className="mt-4 text-base font-bold text-slate-900">Step 2</p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Enter the 6-digit OTP sent to your email.
                                </p>
                            </motion.div>

                            <motion.div
                                variants={fadeUp}
                                whileHover={{ y: -4 }}
                                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <ShieldCheck size={20} />
                                </div>
                                <p className="mt-4 text-base font-bold text-slate-900">Step 3</p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Set a new password and confirm it securely.
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
                        <div className="mx-auto max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
                            <div className="text-center">
                                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
                                    Forgot Password
                                </p>
                                <h2 className="mt-3 text-3xl font-bold text-slate-900">
                                    {step === 1 && "Verify Email"}
                                    {step === 2 && "Verify OTP"}
                                    {step === 3 && "Reset Password"}
                                </h2>
                                <p className="mt-3 text-sm leading-7 text-slate-600">
                                    {step === 1 && "Enter your registered email to receive an OTP."}
                                    {step === 2 && "Enter the OTP sent to your email address."}
                                    {step === 3 && "Create your new password securely."}
                                </p>
                            </div>

                            {/* Step indicator */}
                            <div className="mt-6 flex items-center gap-3">
                                {[1, 2, 3].map((item) => (
                                    <div key={item} className="flex-1">
                                        <div
                                            className={`h-2 rounded-full ${step >= item ? "bg-orange-500" : "bg-slate-200"
                                                }`}
                                        />
                                        <p className="mt-2 text-center text-xs font-medium text-slate-600">
                                            Step {item}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* STEP 1 */}
                            {step === 1 && (
                                <form className="mt-8 space-y-5" onSubmit={sendOtp}>
                                    <div>
                                        <label
                                            htmlFor="forgot-email"
                                            className="mb-2 block text-sm font-medium text-slate-700"
                                        >
                                            Email Address
                                        </label>
                                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                                            <Mail size={18} className="shrink-0 text-slate-400" />
                                            <input
                                                id="forgot-email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="Enter your registered email"
                                                className="w-full bg-transparent text-sm outline-none"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full rounded-full bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {loading ? "Sending..." : "Send OTP"}
                                    </button>

                                    <Link
                                        href="/login"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-orange-500"
                                    >
                                        <ArrowLeft size={16} />
                                        Back to Login
                                    </Link>
                                </form>
                            )}

                            {/* STEP 2 */}
                            {step === 2 && (
                                <form className="mt-8 space-y-5" onSubmit={handleOtpContinue}>
                                    <div>
                                        <label
                                            htmlFor="forgot-otp"
                                            className="mb-2 block text-sm font-medium text-slate-700"
                                        >
                                            OTP Code
                                        </label>
                                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                                            <Smartphone size={18} className="shrink-0 text-slate-400" />
                                            <input
                                                id="forgot-otp"
                                                type="text"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                placeholder="Enter 6-digit OTP"
                                                maxLength={6}
                                                className="w-full bg-transparent text-sm outline-none"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={sendOtp}
                                        disabled={loading || resendCooldown > 0}
                                        className="text-sm font-medium text-orange-500 transition hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {resendCooldown > 0
                                            ? `Resend OTP in ${resendCooldown}s`
                                            : "Resend OTP"}
                                    </button>

                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            Back
                                        </button>

                                        <button
                                            type="submit"
                                            className="w-full rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                                        >
                                            Continue
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* STEP 3 */}
                            {step === 3 && (
                                <form className="mt-8 space-y-5" onSubmit={resetPassword}>
                                    <div>
                                        <label
                                            htmlFor="forgot-new-password"
                                            className="mb-2 block text-sm font-medium text-slate-700"
                                        >
                                            New Password
                                        </label>
                                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                                            <LockKeyhole size={18} className="shrink-0 text-slate-400" />
                                            <input
                                                id="forgot-new-password"
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Enter new password"
                                                className="w-full bg-transparent text-sm outline-none"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword((prev) => !prev)}
                                                className="shrink-0 text-slate-400 transition hover:text-orange-500"
                                                aria-label={showNewPassword ? "Hide password" : "Show password"}
                                            >
                                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="forgot-confirm-password"
                                            className="mb-2 block text-sm font-medium text-slate-700"
                                        >
                                            Confirm Password
                                        </label>
                                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                                            <LockKeyhole size={18} className="shrink-0 text-slate-400" />
                                            <input
                                                id="forgot-confirm-password"
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Confirm new password"
                                                className="w-full bg-transparent text-sm outline-none"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                                className="shrink-0 text-slate-400 transition hover:text-orange-500"
                                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            Back
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {loading ? "Resetting..." : "Reset Password"}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}