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

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed right-4 bottom-4 left-4 z-[70] mx-auto w-auto max-w-[920px] rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/50 sm:p-5">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-500">
                Cookie Consent
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                We use cookies to improve your experience
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
                We use essential cookies for website functionality and optional cookies for analytics. Read our
                <Link href="/privacy" className="ml-1 font-semibold text-orange-500 hover:text-orange-600">
                    Privacy Policy
                </Link>
                and
                <Link href="/terms" className="ml-1 font-semibold text-orange-500 hover:text-orange-600">
                    Terms & Conditions
                </Link>
                .
            </p>

            {showManage && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Essential Cookies</p>
                            <p className="text-xs text-slate-500">Always active for basic site functionality.</p>
                        </div>
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                            Required
                        </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Analytics Cookies</p>
                            <p className="text-xs text-slate-500">Help us understand traffic and improve pages.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={analytics}
                            onChange={(e) => setAnalytics(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                            aria-label="Toggle analytics cookies"
                        />
                    </div>

                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setShowManage(false)}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={saveCustomConsent}
                            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                        >
                            Save Preferences
                        </button>
                    </div>
                </div>
            )}

            {!showManage && (
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => saveConsent("cancelled")}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowManage(true)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                    >
                        Manage
                    </button>
                    <button
                        type="button"
                        onClick={() => saveConsent("accepted_all")}
                        className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                    >
                        Accept All
                    </button>
                </div>
            )}
        </div>
    );
}
