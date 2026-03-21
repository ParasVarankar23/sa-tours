"use client";

import { motion } from "framer-motion";
import {
    ArrowRight,
    BriefcaseBusiness,
    Bus,
    CalendarHeart,
    MapPinned,
    Users2,
} from "lucide-react";
import Link from "next/link";

const services = [
    {
        title: "Daily Bus Service",
        desc: "Regular passenger transport from Borli, Dighi, Mhasla and nearby areas to Panvel, Vashi and Mumbai.",
        icon: Bus,
        badge: "Daily",
    },
    {
        title: "Wedding Transportation",
        desc: "Comfortable and reliable bus arrangements for wedding guests, family functions and event travel.",
        icon: CalendarHeart,
        badge: "Events",
    },
    {
        title: "Private Bus Hire",
        desc: "Book buses for private functions, special travel plans, custom routes and personal group bookings.",
        icon: BriefcaseBusiness,
        badge: "Private",
    },
    {
        title: "Pilgrimage Tours",
        desc: "Organized travel for temple visits, devotional tours, family trips and spiritual group journeys.",
        icon: MapPinned,
        badge: "Special Tour",
    },
    {
        title: "Group Travel",
        desc: "Travel support for group outings, family trips, staff movement, events and community journeys.",
        icon: Users2,
        badge: "Group",
    },
];

const fadeUp = {
    hidden: { opacity: 0, y: 28 },
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

export default function ServicesPreview() {
    return (
        <section className="bg-white py-8 lg:py-10">
            <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
                {/* HEADER */}
                <motion.div
                    initial={{ opacity: 0, y: 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mx-auto max-w-4xl text-center"
                >
                    <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
                        Our Services
                    </p>

                    <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.08]">
                        More than a bus service — complete travel support for every need
                    </h2>

                    <p className="mt-4 text-[15px] leading-8 text-slate-600 sm:text-base">
                        From daily passenger routes to event transportation and private group
                        bookings, we provide dependable and comfortable travel solutions.
                    </p>
                </motion.div>

                {/* TOP ROW - 3 CARDS */}
                <motion.div
                    variants={stagger}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.15 }}
                    className="mt-6 grid gap-4 lg:grid-cols-3"
                >
                    {services.slice(0, 3).map((service, index) => {
                        const Icon = service.icon;
                        return (
                            <motion.div
                                key={index}
                                variants={fadeUp}
                                className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 transition duration-300 group-hover:bg-orange-500 group-hover:text-white">
                                        <Icon size={22} />
                                    </div>

                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                        {service.badge}
                                    </span>
                                </div>

                                <h3 className="mt-4 text-xl font-bold text-slate-900">
                                    {service.title}
                                </h3>

                                <p className="mt-3 text-sm leading-7 text-slate-600">
                                    {service.desc}
                                </p>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* BOTTOM ROW - 2 CARDS */}
                <motion.div
                    variants={stagger}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.15 }}
                    className="mt-4 grid gap-4 lg:grid-cols-2"
                >
                    {services.slice(3).map((service, index) => {
                        const Icon = service.icon;
                        return (
                            <motion.div
                                key={index}
                                variants={fadeUp}
                                className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 transition duration-300 group-hover:bg-orange-500 group-hover:text-white">
                                        <Icon size={22} />
                                    </div>

                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                        {service.badge}
                                    </span>
                                </div>

                                <h3 className="mt-4 text-xl font-bold text-slate-900">
                                    {service.title}
                                </h3>

                                <p className="mt-3 text-sm leading-7 text-slate-600">
                                    {service.desc}
                                </p>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* BOTTOM CTA BAR */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
                    className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-sm"
                >
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                            <p className="text-base font-semibold text-slate-900">
                                Need a bus for daily travel, weddings, tours or private bookings?
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                                Contact SA Tours & Travels for reliable transportation support and
                                flexible travel arrangements.
                            </p>
                        </div>

                        <Link
                            href="/services"
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Explore All Services
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}