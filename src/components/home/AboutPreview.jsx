"use client";

import { motion } from "framer-motion";
import { Bus, Clock3, ShieldCheck } from "lucide-react";
import Image from "next/image";
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

const features = [
    {
        icon: Bus,
        title: "4+ Buses",
        desc: "Owned and operated with care for daily passenger travel.",
    },
    {
        icon: ShieldCheck,
        title: "Reliable Service",
        desc: "Safe, punctual and dependable routes every day.",
    },
    {
        icon: Clock3,
        title: "Daily Timings",
        desc: "Regular morning departures and return trips.",
    },
];

/* COUNT UP CARD (inside same file) */
function CountUpStat({ end = 0, duration = 1400, suffix = "", label = "" }) {
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
            { threshold: 0.4 }
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [hasStarted]);

    useEffect(() => {
        if (!hasStarted) return;

        let startTime = null;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;

            const progress = Math.min((timestamp - startTime) / duration, 1);
            const value = Math.floor(progress * end);

            setCount(value);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [hasStarted, end, duration]);

    return (
        <div
            ref={ref}
            className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm transition duration-300 hover:-translate-y-1"
        >
            <p className="text-lg font-bold text-slate-900">
                {count}
                {suffix}
            </p>
            <p className="mt-1 text-xs text-slate-500">{label}</p>
        </div>
    );
}

export default function AboutPreview() {
    return (
        <section className="bg-white py-8 lg:py-5">
            <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
                <div className="grid items-start gap-6 lg:grid-cols-[1fr_1fr] lg:gap-8">
                    {/* LEFT IMAGE LAYOUT */}
                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.15 }}
                        className="relative"
                    >
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-[1.1fr_0.9fr]">
                            {/* BIG IMAGE */}
                            <motion.div
                                variants={fadeUp}
                                whileHover={{ y: -4 }}
                                className="relative overflow-hidden rounded-[28px] bg-white p-2.5 shadow-lg shadow-slate-200/50"
                            >
                                <div className="relative h-[220px] sm:h-[300px] lg:h-[340px] overflow-hidden rounded-[22px]">
                                    <Image
                                        src="/bus1.png"
                                        alt="SA Tours Main Bus"
                                        fill
                                        className="object-cover transition duration-500 hover:scale-105"
                                    />
                                </div>

                                {/* Floating Badge */}
                                <motion.div
                                    animate={{ y: [0, -3, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute left-4 top-4 rounded-2xl bg-white/95 px-4 py-2.5 shadow-md backdrop-blur"
                                >
                                    <p className="text-[10px] font-medium text-slate-500">
                                        Trusted Service
                                    </p>
                                    <p className="text-sm font-bold text-slate-900">
                                        Daily Travel Support
                                    </p>
                                </motion.div>
                            </motion.div>

                            {/* RIGHT STACK */}
                            <div className="space-y-3 sm:pt-5">
                                <motion.div
                                    variants={fadeUp}
                                    whileHover={{ y: -4 }}
                                    className="overflow-hidden rounded-[24px] bg-white p-2.5 shadow-md shadow-slate-200/50"
                                >
                                    <div className="relative h-[160px] sm:h-[145px] lg:h-[140px] overflow-hidden rounded-[18px]">
                                        <Image
                                            src="/sa3.png"
                                            alt="SA Tours Bus Side View"
                                            fill
                                            className="object-cover object-center lg:object-top transition duration-500 hover:scale-105"
                                        />
                                    </div>
                                </motion.div>

                                <motion.div
                                    variants={fadeUp}
                                    whileHover={{ y: -4 }}
                                    className="overflow-hidden rounded-[24px] bg-white p-2.5 shadow-md shadow-slate-200/50"
                                >
                                    <div className="relative h-[160px] sm:h-[135px] lg:h-[170px] overflow-hidden rounded-[18px]">
                                        <Image
                                            src="/bus3.png"
                                            alt="SA Tours Travel Vehicle"
                                            fill
                                            className="object-cover object-center lg:object-top transition duration-500 hover:scale-105"
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Bottom Mini Info Strip with Auto Count */}
                        <motion.div
                            variants={fadeUp}
                            whileHover={{ y: -3 }}
                            className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm"
                        >
                            <div className="grid gap-3 sm:grid-cols-3">
                                <CountUpStat end={4} suffix="+" label="Owned Buses" />

                                <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm transition duration-300 hover:-translate-y-1">
                                    <p className="text-lg font-bold text-slate-900">Daily</p>
                                    <p className="mt-1 text-xs text-slate-500">Service Available</p>
                                </div>

                                <CountUpStat end={3} label="Office Locations" />
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* RIGHT CONTENT */}
                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.15 }}
                        className="flex flex-col justify-center"
                    >
                        {/* Section Tag */}
                        <motion.p
                            variants={fadeUp}
                            className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500"
                        >
                            About Us
                        </motion.p>

                        {/* Title */}
                        <motion.h2
                            variants={fadeUp}
                            className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[40px] lg:leading-[1.08]"
                        >
                            Trusted daily travel service with comfortable buses and reliable timing
                        </motion.h2>

                        {/* Description */}
                        <motion.p
                            variants={fadeUp}
                            className="mt-4 text-[15px] leading-8 text-slate-600 sm:text-base"
                        >
                            SA Tours & Travels provides regular daily passenger service from
                            Borli Panchatan, Dighi, Mhasla, Mangoan and nearby areas to
                            Panvel, Vashi and Mumbai. We also offer private bus booking for
                            weddings, group events, staff transport and special tours.
                        </motion.p>

                        {/* Feature Cards */}
                        <motion.div
                            variants={stagger}
                            className="mt-6 grid gap-3 sm:grid-cols-3"
                        >
                            {features.map((feature, index) => {
                                const Icon = feature.icon;
                                return (
                                    <motion.div
                                        key={index}
                                        variants={fadeUp}
                                        whileHover={{ y: -4 }}
                                        className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition"
                                    >
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                            <Icon size={18} />
                                        </div>
                                        <p className="mt-3 text-base font-bold text-slate-900">
                                            {feature.title}
                                        </p>
                                        <p className="mt-1 text-sm leading-6 text-slate-600">
                                            {feature.desc}
                                        </p>
                                    </motion.div>
                                );
                            })}
                        </motion.div>

                    </motion.div>
                </div>
            </div>
        </section>
    );
}