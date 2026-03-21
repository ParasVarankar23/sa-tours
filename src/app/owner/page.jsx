"use client";

import PageHero from "@/components/PageHero";
import { motion } from "framer-motion";
import {
    BadgeCheck,
    BriefcaseBusiness,
    MessageCircle,
    Phone,
    ShieldCheck,
    UserCircle2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

function CountUpStat({ end = 0, duration = 1200, suffix = "", label = "" }) {
    const [count, setCount] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasStarted) {
                    setHasStarted(true);
                }
            },
            { threshold: 0.5 }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [hasStarted]);

    useEffect(() => {
        if (!hasStarted) return;

        let startTime = null;
        let frameId;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(Math.floor(progress * end));

            if (progress < 1) {
                frameId = requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [hasStarted, end, duration]);

    return (
        <div ref={ref} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-lg font-bold text-slate-900">
                {count}
                {suffix}
            </p>
            <p className="mt-1 text-xs text-slate-500">{label}</p>
        </div>
    );
}

export default function OwnerPage() {
    return (
        <>
            <PageHero
                title="Owner Information"
                subtitle="Meet the leadership behind SA Tours & Travels, committed to reliable service, customer trust and quality travel support."
                compact
            />

            <section className="bg-[#f8fafc] py-5 lg:py-6">
                <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
                    <div className="grid items-start gap-4 lg:grid-cols-[0.95fr_1.05fr] lg:gap-6">
                        {/* LEFT OWNER PROFILE CARD */}
                        <motion.div
                            variants={stagger}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, amount: 0.15 }}
                            className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50"
                        >
                            {/* Profile Visual */}
                            <motion.div
                                variants={fadeUp}
                                className="rounded-[26px] bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 p-5"
                            >
                                <div className="flex h-[300px] sm:h-[360px] lg:h-[400px] items-center justify-center rounded-[22px] bg-white/60 backdrop-blur">
                                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-md sm:h-32 sm:w-32">
                                        <UserCircle2 size={70} className="text-orange-500 sm:size-[82px]" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Small Trust Stats */}
                            <motion.div
                                variants={fadeUp}
                                className="mt-4 grid gap-3 sm:grid-cols-3"
                            >
                                <CountUpStat end={4} suffix="+" label="Owned Buses" />

                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
                                    <p className="text-lg font-bold text-slate-900">Daily</p>
                                    <p className="mt-1 text-xs text-slate-500">Service Operations</p>
                                </div>

                                <CountUpStat end={3} label="Office Locations" />
                            </motion.div>
                        </motion.div>

                        {/* RIGHT OWNER INFO */}
                        <motion.div
                            variants={stagger}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, amount: 0.15 }}
                            className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50 sm:p-7"
                        >
                            <motion.p
                                variants={fadeUp}
                                className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500"
                            >
                                Owner Details
                            </motion.p>

                            <motion.h2
                                variants={fadeUp}
                                className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.08]"
                            >
                                SA Tours & Travels Management
                            </motion.h2>

                            <motion.p
                                variants={fadeUp}
                                className="mt-4 text-[15px] leading-8 text-slate-600 sm:text-base"
                            >
                                The leadership behind SA Tours & Travels is dedicated to providing
                                dependable daily bus service, safe travel, professional customer
                                support and well-managed transportation solutions for passengers,
                                families and private group bookings.
                            </motion.p>

                            {/* INFO LIST */}
                            <motion.div variants={stagger} className="mt-6 space-y-3">
                                <motion.div
                                    variants={fadeUp}
                                    className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
                                        <BriefcaseBusiness size={18} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">
                                        Founder & Managing Operations
                                    </span>
                                </motion.div>

                                <motion.div
                                    variants={fadeUp}
                                    className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
                                        <Phone size={18} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">
                                        +91 9209471309
                                    </span>
                                </motion.div>

                                <motion.div
                                    variants={fadeUp}
                                    className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">
                                        Focused on Safe, Reliable & Timely Service
                                    </span>
                                </motion.div>
                            </motion.div>

                            {/* TRUST POINTS */}
                            <motion.div
                                variants={stagger}
                                className="mt-6 grid gap-3 sm:grid-cols-2"
                            >
                                <motion.div
                                    variants={fadeUp}
                                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                                >
                                    <BadgeCheck size={16} className="text-orange-500" />
                                    Trusted Local Travel Support
                                </motion.div>

                                <motion.div
                                    variants={fadeUp}
                                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                                >
                                    <BadgeCheck size={16} className="text-orange-500" />
                                    Passenger-Focused Service
                                </motion.div>

                                <motion.div
                                    variants={fadeUp}
                                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                                >
                                    <BadgeCheck size={16} className="text-orange-500" />
                                    Daily Route Management
                                </motion.div>

                                <motion.div
                                    variants={fadeUp}
                                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                                >
                                    <BadgeCheck size={16} className="text-orange-500" />
                                    Private Booking Support
                                </motion.div>
                            </motion.div>

                            {/* ACTION BUTTONS */}
                            <motion.div
                                variants={fadeUp}
                                className="mt-6 flex flex-wrap gap-3"
                            >
                                <a
                                    href="tel:+919209471309"
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                                >
                                    <Phone size={15} />
                                    Call Now
                                </a>

                                <a
                                    href="https://wa.me/919209471309"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                                >
                                    <MessageCircle size={15} />
                                    WhatsApp
                                </a>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>
        </>
    );
}