"use client";

import { motion } from "framer-motion";

export default function PageHero({ title, subtitle }) {
    return (
        <section className="relative overflow-hidden bg-[#f8fafc] pt-8 pb-8 lg:pt-10 lg:pb-10">
            {/* Background Glow */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 left-0 h-64 w-64 rounded-full bg-orange-100/50 blur-3xl" />
                <div className="absolute top-8 right-0 h-72 w-72 rounded-full bg-slate-100 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mx-auto max-w-4xl text-center"
                >
                    {/* Eyebrow */}
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
                        SA Tours & Travels
                    </p>

                    {/* Title */}
                    <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[48px] lg:leading-[1.08]">
                        {title}
                    </h1>

                    {/* Subtitle */}
                    <p className="mt-4 text-[15px] leading-8 text-slate-600 sm:text-base">
                        {subtitle}
                    </p>
                </motion.div>
            </div>
        </section>
    );
}