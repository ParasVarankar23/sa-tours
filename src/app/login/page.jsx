"use client";

import { LockKeyhole, Mail } from "lucide-react";

export default function LoginPage() {
    return (
        <section className="min-h-[80vh] bg-[#f8fafc] py-20">
            <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
                    <div className="text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                            Welcome Back
                        </p>
                        <h1 className="mt-3 text-3xl font-bold text-slate-900">Login</h1>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                            Access your account for bookings, schedule details and travel updates.
                        </p>
                    </div>

                    <form className="mt-8 space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Email Address
                            </label>
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-orange-400">
                                <Mail size={18} className="text-slate-400" />
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="w-full outline-none text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-orange-400">
                                <LockKeyhole size={18} className="text-slate-400" />
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    className="w-full outline-none text-sm"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}