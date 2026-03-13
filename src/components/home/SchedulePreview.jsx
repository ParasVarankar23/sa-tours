"use client";

import Link from "next/link";
import { ArrowRight, Clock3, MapPin, Bus } from "lucide-react";
import Reveal from "../Reveal";
import StaggerContainer from "../StaggerContainer";
import StaggerItem from "../StaggerItem";

const schedule = [
    {
        route: "Dighi to Mumbai",
        time: "3:00 AM",
        frequency: "Daily Morning Service",
        type: "Departure",
    },
    {
        route: "Borli to Mumbai",
        time: "4:00 AM",
        frequency: "Daily Morning Service",
        type: "Departure",
    },
    {
        route: "Mumbai Return Service",
        time: "2:00 PM",
        frequency: "Daily Return Service",
        type: "Return",
    },
    {
        route: "Mumbai Return Service",
        time: "4:00 PM",
        frequency: "Daily Return Service",
        type: "Return",
    },
];

export default function SchedulePreview() {
    return (
        <section className="bg-[#f8fafc] py-8 lg:py-5">
            <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8">
                {/* HEADER */}
                <Reveal>
                    <div className="max-w-4xl">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
                            Daily Schedule
                        </p>

                        <h2 className="mt-3 text-3xl  font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.08]">
                            Fixed daily timings for a smooth and dependable journey
                        </h2>

                        <p className="mt-4 text-justify text-[15px] leading-8 text-slate-600 sm:text-base">
                            Passengers can rely on our regular morning departures to Mumbai and
                            scheduled afternoon return services with comfortable travel and
                            dependable timing.
                        </p>
                    </div>
                </Reveal>

                {/* SCHEDULE CARDS */}
                <StaggerContainer className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {schedule.map((item, index) => (
                        <StaggerItem key={index}>
                            <div className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                        <Clock3 size={18} />
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${item.type === "Departure"
                                                ? "bg-orange-50 text-orange-600"
                                                : "bg-slate-100 text-slate-600"
                                            }`}
                                    >
                                        {item.type}
                                    </span>
                                </div>

                                <h3 className="mt-4 text-lg font-bold text-slate-900">
                                    {item.route}
                                </h3>

                                <p className="mt-3 text-3xl font-bold text-orange-500">{item.time}</p>

                                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                                    <Bus size={15} />
                                    <span>{item.frequency}</span>
                                </div>
                            </div>
                        </StaggerItem>
                    ))}
                </StaggerContainer>

                {/* BOTTOM INFO BAR */}
                <Reveal delay={0.1}>
                    <div className="mt-6 rounded-[26px] border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50">
                        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-500">Primary Route</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            Borli / Dighi to Mumbai
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                        <Clock3 size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-500">Morning Timings</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            3:00 AM & 4:00 AM
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                        <Bus size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-500">Return Timings</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            2:00 PM & 4:00 PM
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Link
                                href="/schedule"
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                View Full Schedule
                                <ArrowRight size={15} />
                            </Link>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}