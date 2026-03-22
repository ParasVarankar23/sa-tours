"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "sa_cookie_consent";

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);
    const [showManage, setShowManage] = useState(false);
    const [analytics, setAnalytics] = useState(false);

    useEffect(() => {
        const savedConsent = globalThis.localStorage.getItem(CONSENT_KEY);
        if (!savedConsent) {
            setIsVisible(true);
        }
    }, []);

    const saveConsent = (value) => {
        globalThis.localStorage.setItem(CONSENT_KEY, value);
        setIsVisible(false);
        setShowManage(false);
    };

    const saveCustomConsent = () => {
        const value = analytics ? "custom_analytics_on" : "custom_analytics_off";
        saveConsent(value);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-x-3 bottom-3 z-[70] sm:inset-x-4 sm:bottom-4">
            <div className="mx-auto w-full max-w-6xl rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-2xl shadow-slate-300/40 sm:px-6 sm:py-5 lg:px-7 lg:py-6">
                {!showManage ? (
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        {/* LEFT CONTENT */}
                        <div className="flex-1">
                            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-orange-500 sm:text-xs">
                                Cookie Consent
                            </p>

                            <h3 className="mt-2 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl lg:text-[32px]">
                                We use cookies to improve your experience
                            </h3>

                            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                                We use essential cookies for website functionality and optional
                                cookies for analytics. Read our
                                <Link
                                    href="/privacy"
                                    className="mx-1 font-semibold text-orange-500 hover:text-orange-600"
                                >
                                    Privacy Policy
                                </Link>
                                and
                                <Link
                                    href="/terms"
                                    className="ml-1 font-semibold text-orange-500 hover:text-orange-600"
                                >
                                    Terms & Conditions
                                </Link>
                                .
                            </p>
                        </div>

                        {/* RIGHT BUTTONS */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:shrink-0">
                            <button
                                type="button"
                                onClick={() => saveConsent("cancelled")}
                                className="inline-flex min-w-[120px] items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowManage(true)}
                                className="inline-flex min-w-[130px] items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                            >
                                Manage
                            </button>

                            <button
                                type="button"
                                onClick={() => saveConsent("accepted_all")}
                                className="inline-flex min-w-[145px] items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                            >
                                Accept All
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex flex-col gap-4">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-orange-500 sm:text-xs">
                                    Manage Cookie Preferences
                                </p>
                                <h3 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                                    Choose which cookies you want to allow
                                </h3>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            Essential Cookies
                                        </p>
                                        <p className="text-xs text-slate-500 sm:text-sm">
                                            Always active for basic site functionality.
                                        </p>
                                    </div>
                                    <span className="inline-flex w-fit rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                                        Required
                                    </span>
                                </div>

                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            Analytics Cookies
                                        </p>
                                        <p className="text-xs text-slate-500 sm:text-sm">
                                            Help us understand traffic and improve pages.
                                        </p>
                                    </div>

                                    <label className="inline-flex items-center gap-3">
                                        <span className="text-sm font-medium text-slate-700">
                                            Allow
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={analytics}
                                            onChange={(e) => setAnalytics(e.target.checked)}
                                            className="h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                                            aria-label="Toggle analytics cookies"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowManage(false)}
                                    className="inline-flex min-w-[120px] items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                                >
                                    Back
                                </button>

                                <button
                                    type="button"
                                    onClick={saveCustomConsent}
                                    className="inline-flex min-w-[170px] items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                                >
                                    Save Preferences
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}