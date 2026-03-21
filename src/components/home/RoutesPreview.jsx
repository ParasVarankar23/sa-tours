"use client";

import { motion } from "framer-motion";
import { ArrowRight, Bus, Clock3, MapPin } from "lucide-react";
import Link from "next/link";

const routes = [
    "Borli Panchatan",
    "Dighi",
    "Velas",
    "Mhasla",
    "Mangaon",
    "Panvel",
    "Vashi",
    "Mumbai",
];

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, ease: "easeOut" },
    },
};

const stagger = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.08,
        },
    },
};

export default function RoutesPreview() {
    return (
        <section className="bg-[#f8fafc] py-8 lg:py-10">
            <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
                {/* HEADER */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="max-w-4xl"
                >
                    <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
                        Service Routes
                    </p>

                    <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.08]">
                        Serving key travel points from local towns to major city destinations
                    </h2>

                    <p className="mt-4 text-[15px] leading-8 text-slate-600 sm:text-base">
                        Our route network connects important local pickup areas with Panvel,
                        Vashi and Mumbai for regular daily travel and return services.
                    </p>
                </motion.div>

                {/* ROUTE GRID */}
                <motion.div
                    variants={stagger}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.15 }}
                    className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    {routes.map((route, index) => (
                        <motion.div
                            key={index}
                            variants={fadeUp}
                            className="group flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md hover:shadow-slate-200/60"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 transition duration-300 group-hover:bg-orange-500 group-hover:text-white">
                                <MapPin size={18} />
                            </div>

                            <div>
                                <p className="text-[11px] text-slate-500">Pickup / Stop</p>
                                <span className="text-sm font-semibold text-slate-900">{route}</span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* ROUTE FLOW CARDS */}
                <motion.div
                    variants={stagger}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.15 }}
                    className="mt-6 grid gap-4 lg:grid-cols-3"
                >
                    <motion.div
                        variants={fadeUp}
                        className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                            <MapPin size={18} />
                        </div>
                        <p className="mt-4 text-sm font-medium text-slate-500">Main Pickup Areas</p>
                        <h3 className="mt-2 text-lg font-bold text-slate-900">
                            Borli, Dighi, Mhasla, Mangoan
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                            Regular boarding support from major nearby travel points and local stops.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={fadeUp}
                        className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                            <Bus size={18} />
                        </div>
                        <p className="mt-4 text-sm font-medium text-slate-500">Main Destinations</p>
                        <h3 className="mt-2 text-lg font-bold text-slate-900">
                            Panvel, Vashi & Mumbai
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                            Daily service connecting local towns to important city destinations.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={fadeUp}
                        className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                            <Clock3 size={18} />
                        </div>
                        <p className="mt-4 text-sm font-medium text-slate-500">Daily Timings</p>
                        <h3 className="mt-2 text-lg font-bold text-slate-900">
                            3:00 AM, 4:00 AM, 2:00 PM, 4:00 PM
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                            Fixed morning departures and return services for smooth daily travel.
                        </p>
                    </motion.div>
                </motion.div>

                {/* BOTTOM ROUTE SUMMARY BAR */}
                <motion.div
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
                    className="mt-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50"
                >
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <MapPin size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500">Popular Route</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Borli → Panvel → Vashi → Mumbai
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <Bus size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500">Coverage</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Local to City Connectivity
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <Clock3 size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500">Service Type</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Daily Morning & Return
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Link
                            href="/routes"
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            View All Routes
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}