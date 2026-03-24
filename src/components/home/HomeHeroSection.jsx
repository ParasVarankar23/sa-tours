"use client";

import { motion } from "framer-motion";
import {
    ArrowRight,
    Bus,
    CalendarDays,
    Clock3,
    MapPin,
    MessageCircle,
    Phone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" },
    },
};

const stagger = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.12,
        },
    },
};

export default function HomeHeroSection() {
    return (
        <section className="relative overflow-hidden bg-[#f8fafc] pt-5 pb-8 lg:pt-6 lg:pb-8">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-orange-100/40 blur-3xl" />
                <div className="absolute top-10 right-0 h-72 w-72 rounded-full bg-slate-100 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
                <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        animate="show"
                        className="relative z-10"
                    >
                        <motion.div
                            variants={fadeUp}
                            className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600 ring-1 ring-orange-100"
                        >
                            <Bus size={15} />
                            Trusted Daily Bus Service
                        </motion.div>

                        <motion.h1
                            variants={fadeUp}
                            className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.08]"
                        >
                            Travel Daily from{" "}
                            <span className="text-orange-500">Borli</span> to{" "}
                            <span className="text-orange-500">Mumbai</span>
                        </motion.h1>

                        <motion.p
                            variants={fadeUp}
                            className="mt-4 max-w-[95%] text-[15px] leading-8 text-slate-600 sm:text-base"
                        >
                            SA Tours & Travels provides reliable daily bus service from Borli,
                            Dighi, Mhasla, Mangoan and nearby areas to Panvel, Vashi and
                            Mumbai. We also offer private bus booking for weddings, events,
                            group travel and special tours.
                        </motion.p>

                        <motion.div
                            variants={fadeUp}
                            whileHover={{ y: -2 }}
                            className="mt-5 rounded-[24px] border border-slate-200 bg-white p-2.5 shadow-md shadow-slate-200/60"
                        >
                            <div className="grid gap-2 md:grid-cols-3 md:items-center">
                                <div className="flex items-center gap-2.5 rounded-2xl px-2 py-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-medium text-slate-500">Main Route</p>
                                        <p className="text-sm font-semibold text-slate-900 leading-5">
                                            Borli to Mumbai
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 rounded-2xl px-2 py-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                        <Clock3 size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-medium text-slate-500">Departure</p>
                                        <p className="text-sm font-semibold text-slate-900 leading-5">
                                            3:00 AM / 4:00 AM
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end px-1 py-1">
                                    <motion.a
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.98 }}
                                        href="https://wa.me/919209471601"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
                                    >
                                        Check Seat
                                        <ArrowRight size={14} />
                                    </motion.a>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            variants={fadeUp}
                            className="mt-4 flex flex-wrap gap-2.5"
                        >
                            <motion.a
                                whileHover={{ y: -2, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                href="tel:+9209471601"
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                            >
                                <Phone size={15} />
                                Call Now
                            </motion.a>

                            <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Link
                                    href="/schedule"
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                                >
                                    <CalendarDays size={15} />
                                    View Schedule
                                </Link>
                            </motion.div>

                            <motion.a
                                whileHover={{ y: -2, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                href="https://wa.me/919209471601"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                            >
                                <MessageCircle size={15} />
                                Book Now
                            </motion.a>
                        </motion.div>

                        <motion.div
                            variants={fadeUp}
                            className="mt-5 grid gap-3 sm:grid-cols-3"
                        >
                            {[
                                { title: "4+", sub: "Owned Buses" },
                                { title: "Daily", sub: "Morning & Return Trips" },
                                { title: "3", sub: "Office Locations" },
                            ].map((item, index) => (
                                <motion.div
                                    key={index}
                                    whileHover={{ y: -4 }}
                                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition"
                                >
                                    <p className="text-xl font-bold text-slate-900">{item.title}</p>
                                    <p className="mt-1 text-sm text-slate-500">{item.sub}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>

                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        animate="show"
                        className="relative"
                    >
                        <div className="grid grid-cols-2 gap-3.5">
                            <div className="space-y-3.5">
                                <motion.div
                                    variants={fadeUp}
                                    whileHover={{ y: -4 }}
                                    className="relative overflow-hidden rounded-[24px] bg-white p-2.5 shadow-md shadow-slate-200/60"
                                >
                                    <div className="relative h-40 overflow-hidden rounded-[18px] lg:h-44">
                                        <Image
                                            src="/bus1.jpeg"
                                            alt="SA Tours Route 1"
                                            fill
                                            className="object-cover transition duration-500 hover:scale-105"
                                        />
                                    </div>

                                    <motion.div
                                        animate={{ y: [0, -3, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute left-4 top-4 rounded-2xl bg-white/95 px-3 py-2 shadow-sm backdrop-blur"
                                    >
                                        <p className="text-[10px] font-medium text-slate-500">Popular Route</p>
                                        <p className="text-xs font-bold text-slate-900">Borli to Mumbai</p>
                                    </motion.div>
                                </motion.div>

                                <motion.div
                                    variants={fadeUp}
                                    whileHover={{ y: -4 }}
                                    className="overflow-hidden rounded-[24px] bg-white p-2.5 shadow-md shadow-slate-200/60"
                                >
                                    <div className="relative h-28 overflow-hidden rounded-[18px] lg:h-32">
                                        <Image
                                            src="/bus3.jpeg"
                                            alt="SA Tours Route 2"
                                            fill
                                            className="object-cover transition duration-500 hover:scale-105"
                                        />
                                    </div>
                                </motion.div>
                            </div>

                            <div className="space-y-3.5 pt-5">
                                <motion.div
                                    variants={fadeUp}
                                    whileHover={{ y: -4 }}
                                    className="overflow-hidden rounded-[24px] bg-white p-2.5 shadow-md shadow-slate-200/60"
                                >
                                    <div className="relative h-28 overflow-hidden rounded-[18px] lg:h-32">
                                        <Image
                                            src="/sa3.jpeg"
                                            alt="SA Tours Route 3"
                                            fill
                                            className="object-cover transition duration-500 hover:scale-105"
                                        />
                                    </div>
                                </motion.div>

                                <motion.div
                                    variants={fadeUp}
                                    whileHover={{ y: -4 }}
                                    className="relative overflow-hidden rounded-[24px] bg-white p-2.5 shadow-md shadow-slate-200/60"
                                >
                                    <div className="relative h-40 overflow-hidden rounded-[18px] lg:h-44">
                                        <Image
                                            src="/bus2.jpeg"
                                            alt="SA Tours Route 4"
                                            fill
                                            className="object-cover transition duration-500 hover:scale-105"
                                        />
                                    </div>

                                    <motion.div
                                        animate={{ y: [0, -3, 0] }}
                                        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute right-4 top-4 rounded-2xl bg-white px-3 py-2 shadow-md"
                                    >
                                        <p className="text-[10px] font-medium text-slate-500">Daily Service</p>
                                        <p className="text-xs font-bold text-orange-500">100% Reliable</p>
                                    </motion.div>
                                </motion.div>
                            </div>
                        </div>

                        <motion.div
                            variants={fadeUp}
                            whileHover={{ y: -3 }}
                            className="mt-4 rounded-[24px] border border-slate-200 bg-white p-3.5 shadow-lg shadow-slate-200/60"
                        >
                            <div className="grid gap-3 sm:grid-cols-3 sm:items-center">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500">Route</p>
                                        <p className="text-sm font-semibold text-slate-900 leading-5">
                                            Dighi / Borli to Mumbai
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                        <Clock3 size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500">Daily Timing</p>
                                        <p className="text-sm font-semibold text-slate-900 leading-5">
                                            3:00 AM / 4:00 AM
                                        </p>
                                    </div>
                                </div>

                                <motion.a
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.98 }}
                                    href="tel:+9209471601"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                    Contact Us
                                    <ArrowRight size={14} />
                                </motion.a>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
