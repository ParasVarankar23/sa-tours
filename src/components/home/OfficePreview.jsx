"use client";

import { motion } from "framer-motion";
import {
    ArrowRight,
    BadgeCheck,
    Building2,
    Clock3,
    MapPin,
    MessageCircle,
    Phone,
} from "lucide-react";
import Link from "next/link";

const offices = [
    {
        name: "Borli Panchatan Office",
        address: "Near ST Stand, Borli Panchatan",
        type: "Main Office",
        support: "Booking, route guidance and daily travel assistance",
    },
    {
        name: "Mhasla Office",
        address: "Near ST Stand, Mhasla",
        type: "Support Office",
        support: "Passenger support, timing details and local booking help",
    },
    {
        name: "Mumbai Office",
        address: "Dongri, Mumbai",
        type: "City Office",
        support: "Return service coordination and city-side travel support",
    },
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
            staggerChildren: 0.12,
        },
    },
};

export default function OfficesPreview() {
    return (
        <section className="bg-white py-8 lg:py-10">
            <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
                {/* HEADER */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mx-auto max-w-4xl text-center"
                >
                    <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
                        Office Locations
                    </p>

                    <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.08]">
                        Visit our offices for booking, route details and travel assistance
                    </h2>

                    <p className="mt-4 text-[15px] leading-8 text-slate-600 sm:text-base">
                        Our team is available at convenient office locations to help with
                        bookings, timing information and special travel arrangements.
                    </p>
                </motion.div>

                {/* OFFICE CARDS */}
                <motion.div
                    variants={stagger}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.15 }}
                    className="mt-6 grid gap-4 lg:grid-cols-3"
                >
                    {offices.map((office, index) => (
                        <motion.div
                            key={index}
                            variants={fadeUp}
                            className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 transition duration-300 group-hover:bg-orange-500 group-hover:text-white">
                                    <Building2 size={22} />
                                </div>

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                    {office.type}
                                </span>
                            </div>

                            <h3 className="mt-4 text-xl font-bold text-slate-900">{office.name}</h3>

                            <div className="mt-3 flex items-start gap-2 text-sm leading-7 text-slate-600">
                                <MapPin size={17} className="mt-1 shrink-0 text-orange-500" />
                                <span>{office.address}</span>
                            </div>

                            <div className="mt-3 flex items-start gap-2 text-sm leading-7 text-slate-600">
                                <BadgeCheck size={17} className="mt-1 shrink-0 text-orange-500" />
                                <span>{office.support}</span>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="mt-5 flex flex-wrap gap-3">
                                <a
                                    href="tel:+91  9209471601"
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                                >
                                    <Phone size={15} />
                                    Call
                                </a>

                                <a
                                    href="https://wa.me/919209471601"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                                >
                                    <MessageCircle size={15} />
                                    WhatsApp
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* BOTTOM SUPPORT BAR */}
                <motion.div
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
                    className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-sm"
                >
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <Building2 size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500">Office Support</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Booking & Route Assistance
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <Clock3 size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500">Daily Help</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Timing & Return Service Info
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <BadgeCheck size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500">Special Booking</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Events, Tours & Private Trips
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Link
                            href="/offices"
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            View Office Details
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}