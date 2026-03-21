"use client";

import {
    LogIn,
    Menu,
    MessageCircle,
    X
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const mainNavLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Services", href: "/services" },
    { name: "Schedule", href: "/schedule" },
    { name: "Contact", href: "/contact" },
];



export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-20 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 shrink-0">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-200">
                            <span className="text-base font-bold">SA</span>
                        </div>

                        <div className="leading-tight">
                            <h1 className="text-lg font-bold text-slate-900">
                                SA Tours & Travels
                            </h1>
                            <p className="text-xs text-slate-500">Daily Bus Service</p>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden lg:flex items-center gap-7">
                        {mainNavLinks.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="text-[15px] font-medium text-slate-600 transition hover:text-orange-500"
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop Buttons */}
                    <div className="hidden lg:flex items-center gap-3">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 rounded-full border border-orange-200 px-5 py-2.5 text-sm font-medium text-orange-500 transition hover:bg-orange-50"
                        >
                            <LogIn size={16} />
                            Login
                        </Link>

                        <a
                            href="https://wa.me/+91 9209471309"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
                        >
                            <MessageCircle size={16} />
                            Book Now
                        </a>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        onClick={() => setOpen(!open)}
                        className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                        aria-label="Toggle menu"
                    >
                        {open ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {open && (
                    <div className="lg:hidden pb-5">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
                            <div className="flex flex-col gap-2">
                                {[...mainNavLinks].map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-orange-500"
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </div>

                            <div className="mt-4 grid gap-3">
                                <Link
                                    href="/login"
                                    onClick={() => setOpen(false)}
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-orange-200 px-4 py-3 text-sm font-medium text-orange-500 transition hover:bg-orange-50"
                                >
                                    <LogIn size={16} />
                                    Login
                                </Link>

                                <a
                                    href="https://wa.me/+91 9209471309"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white"
                                >
                                    <MessageCircle size={16} />
                                    Book Now
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}