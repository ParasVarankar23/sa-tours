"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Phone, MessageCircle } from "lucide-react";

const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Services", href: "/services" },
    { name: "Schedule", href: "/schedule" },
    { name: "Routes", href: "/routes" },
    { name: "Offices", href: "/offices" },
    { name: "Contact", href: "/contact" },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-20 items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200">
                            <span className="text-lg font-bold">SA</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">SA Tours & Travels</h1>
                            <p className="text-xs text-slate-500">Reliable Daily Bus Service</p>
                        </div>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-7">
                        {navLinks.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="text-sm font-medium text-slate-600 transition hover:text-orange-500"
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden lg:flex items-center gap-3">
                        <a
                            href="tel:+919999999999"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-orange-300 hover:text-orange-500"
                        >
                            <Phone size={16} />
                            Call Now
                        </a>
                        <a
                            href="https://wa.me/919999999999"
                            target="_blank"
                            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                        >
                            <MessageCircle size={16} />
                            Book Seat
                        </a>
                    </div>

                    <button
                        onClick={() => setOpen(!open)}
                        className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
                    >
                        {open ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                {open && (
                    <div className="lg:hidden pb-5">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
                            <div className="flex flex-col gap-3">
                                {navLinks.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-orange-500"
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </div>

                            <div className="mt-4 flex flex-col gap-3">
                                <a
                                    href="tel:+919999999999"
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
                                >
                                    <Phone size={16} />
                                    Call Now
                                </a>
                                <a
                                    href="https://wa.me/919999999999"
                                    target="_blank"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white"
                                >
                                    <MessageCircle size={16} />
                                    Book Seat
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}