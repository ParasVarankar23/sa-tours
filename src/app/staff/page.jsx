"use client";

import PageHero from "@/components/PageHero";
import { motion } from "framer-motion";
import {
    BadgeCheck,
    MessageCircle,
    Phone,
    ShieldCheck,
    UserRoundCheck,
    Users,
} from "lucide-react";

const staffMembers = [
    {
        name: "Sachin More",
        role: "Driver",
        desc: "Ensures safe, smooth and timely daily transport operations with passenger comfort in mind.",
    },
    {
        name: "Shankar Ghole",
        role: "Driver",
        desc: "Responsible for safe driving, route timing and comfortable passenger travel during daily operations.",
    },
    {
        name: "Ganesh Bhosale",
        role: "Cleaner",
        desc: "Maintains vehicle cleanliness, hygiene and overall passenger comfort before and after daily trips.",
    },
    {
        name: "Amit Bhosale",
        role: "Cleaner",
        desc: "Supports vehicle cleaning, seat maintenance and cleanliness for a safe and pleasant travel experience.",
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

export default function StaffPage() {
    return (
        <>
            <PageHero
                title="Our Staff"
                subtitle="Meet the professional and supportive team behind SA Tours & Travels who help deliver reliable and comfortable service every day."
                compact
            />

            <section className="bg-white py-5 lg:py-6">
                <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
                    {/* STAFF GRID */}
                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.15 }}
                        className="mt-2 grid gap-4 md:grid-cols-2"
                    >
                        {staffMembers.map((member, index) => (
                            <motion.div
                                key={index}
                                variants={fadeUp}
                                className="group rounded-[28px] border border-slate-200 bg-[#f8fafc] p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60"
                            >
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                    {/* LEFT CONTENT */}
                                    <div className="flex gap-4">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-orange-100 text-orange-500 transition duration-300 group-hover:bg-orange-500 group-hover:text-white">
                                            <Users size={24} />
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">{member.name}</h3>
                                            <p className="mt-1 text-sm font-semibold text-orange-500">
                                                {member.role}
                                            </p>
                                            <p className="mt-3 text-sm leading-7 text-slate-600">
                                                {member.desc}
                                            </p>
                                        </div>
                                    </div>

                                    {/* STATUS BADGE */}
                                    <div className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                                        Active Staff
                                    </div>
                                </div>

                                {/* FEATURES */}
                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                    <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                                        <UserRoundCheck size={16} className="text-orange-500" />
                                        Verified
                                    </div>

                                    <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                                        <ShieldCheck size={16} className="text-orange-500" />
                                        Support Ready
                                    </div>

                                    <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                                        <BadgeCheck size={16} className="text-orange-500" />
                                        Service Ready
                                    </div>
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
                            <div>
                                <p className="text-base font-semibold text-slate-900">
                                    Need help with booking, route timing or travel support?
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                    Our staff is available to assist with daily travel, return
                                    service, private bookings and customer support.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <a
                                    href="tel:+9209471601"
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                                >
                                    <Phone size={15} />
                                    Call Now
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
                        </div>
                    </motion.div>
                </div>
            </section>
        </>
    );
}