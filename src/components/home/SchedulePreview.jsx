"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    Clock3,
    MapPin,
    Bus,
    ArrowDown,
    ArrowRightLeft,
    Route,
} from "lucide-react";
import Reveal from "../Reveal";
import StaggerContainer from "../StaggerContainer";
import StaggerItem from "../StaggerItem";

/* -------------------------------------------------------
   PREVIEW CARDS
------------------------------------------------------- */
const schedulePreview = [
    {
        route: "Dighi → Dongri",
        time: "3:00 AM",
        frequency: "Morning Departure",
        type: "Departure",
    },
    {
        route: "Borli → Dongri",
        time: "4:00 AM",
        frequency: "Morning Departure",
        type: "Departure",
    },
    {
        route: "Dongri → Borli",
        time: "2:00 PM",
        frequency: "Evening Return",
        type: "Return",
    },
    {
        route: "Dongri → Dighi",
        time: "4:00 PM",
        frequency: "Evening Return",
        type: "Return",
    },
];

/* -------------------------------------------------------
   FINAL MANUAL ROUTE DATA
------------------------------------------------------- */
const routeOptions = [
    {
        key: "dighi-dongri",
        title: "Dighi → Dongri",
        subtitle: "Morning Departure",
        shortTime: "3:00 AM → 9:00 AM",
        routeLabel: "Dighi → Dongri",
        rows: [
            { stop: "Dighi", time: "3:00 AM", type: "stop" },
            { stop: "Kudgaon", time: "3:10 AM", type: "stop" },
            { stop: "Adgaon", time: "3:15 AM", type: "stop" },
            { stop: "Velas", time: "3:20 AM", type: "stop" },
            { stop: "Wadvali", time: "3:30 AM", type: "stop" },
            { stop: "Gondghar", time: "3:35 AM", type: "stop" },
            { stop: "Mendadi", time: "3:45 AM", type: "stop" },
            { stop: "Kharasai", time: "3:50 AM", type: "stop" },
            { stop: "Banoti", time: "3:55 AM", type: "stop" },
            { stop: "Mhasla", time: "4:10 AM", type: "stop" },
            { stop: "Sai", time: "4:30 AM", type: "stop" },
            { stop: "Morba", time: "4:45 AM", type: "stop" },
            { stop: "Mangaon", time: "5:00 AM", type: "stop" },
            { stop: "Indapur", time: "5:10 AM", type: "stop" },
            { stop: "Kolad", time: "5:30 AM", type: "stop" },
            { stop: "Vadkhal", time: "6:35 AM", type: "stop" },
            {
                stop: "Hotel Stop (Breakfast)",
                time: "6:35 AM to 6:45 AM",
                type: "break",
            },
            { stop: "Pen", time: "7:00 AM", type: "stop" },
            { stop: "Panvel", time: "7:45 AM", type: "stop" },
            { stop: "Kamothe", time: "7:55 AM", type: "stop" },
            { stop: "Kharghar", time: "8:05 AM", type: "stop" },
            { stop: "Nerul", time: "8:15 AM", type: "stop" },
            { stop: "Juinagar", time: "8:18 AM", type: "stop" },
            { stop: "Vashi", time: "8:20 AM", type: "stop" },
            { stop: "Mankhurd", time: "8:25 AM", type: "stop" },
            { stop: "Govandi", time: "8:30 AM", type: "stop" },
            { stop: "Chembur", time: "8:35 AM", type: "stop" },
            { stop: "Kurla", time: "8:40 AM", type: "stop" },
            { stop: "Wadala", time: "8:45 AM", type: "stop" },
            { stop: "Byculla", time: "8:50 AM", type: "stop" },
            { stop: "Masjid Bandar", time: "8:55 AM", type: "stop" },
            { stop: "Dongri", time: "9:00 AM", type: "stop" },
        ],
    },
    {
        key: "borli-dongri",
        title: "Borli → Dongri",
        subtitle: "Morning Departure",
        shortTime: "4:00 AM → 9:30 AM",
        routeLabel: "Borli → Dongri",
        rows: [
            { stop: "Borli", time: "4:00 AM", type: "stop" },
            { stop: "Kapoli", time: "4:05 AM", type: "stop" },
            { stop: "Shiste", time: "4:07 AM", type: "stop" },
            { stop: "Vadvali Phata", time: "4:10 AM", type: "stop" },
            { stop: "Gondghar", time: "4:15 AM", type: "stop" },
            { stop: "Mendadi", time: "4:25 AM", type: "stop" },
            { stop: "Kharasai", time: "4:30 AM", type: "stop" },
            { stop: "Banoti", time: "4:35 AM", type: "stop" },
            { stop: "Mhasla", time: "4:50 AM", type: "stop" },
            { stop: "Sai", time: "5:10 AM", type: "stop" },
            { stop: "Morba", time: "5:25 AM", type: "stop" },
            { stop: "Mangaon", time: "5:40 AM", type: "stop" },
            { stop: "Indapur", time: "5:50 AM", type: "stop" },
            { stop: "Kolad", time: "6:10 AM", type: "stop" },
            { stop: "Vadkhal", time: "7:15 AM", type: "stop" },
            {
                stop: "Hotel Stop (Breakfast)",
                time: "7:15 AM to 7:25 AM",
                type: "break",
            },
            { stop: "Pen", time: "7:40 AM", type: "stop" },
            { stop: "Panvel", time: "8:15 AM", type: "stop" },
            { stop: "Kamothe", time: "8:25 AM", type: "stop" },
            { stop: "Kharghar", time: "8:35 AM", type: "stop" },
            { stop: "Nerul", time: "8:45 AM", type: "stop" },
            { stop: "Juinagar", time: "8:48 AM", type: "stop" },
            { stop: "Vashi", time: "8:50 AM", type: "stop" },
            { stop: "Mankhurd", time: "8:55 AM", type: "stop" },
            { stop: "Govandi", time: "9:00 AM", type: "stop" },
            { stop: "Chembur", time: "9:05 AM", type: "stop" },
            { stop: "Kurla", time: "9:10 AM", type: "stop" },
            { stop: "Wadala", time: "9:15 AM", type: "stop" },
            { stop: "Byculla", time: "9:20 AM", type: "stop" },
            { stop: "Masjid Bandar", time: "9:25 AM", type: "stop" },
            { stop: "Dongri", time: "9:30 AM", type: "stop" },
        ],
    },
    {
        key: "dongri-borli",
        title: "Dongri → Borli",
        subtitle: "Evening Return",
        shortTime: "2:00 PM → 8:30 PM",
        routeLabel: "Dongri → Borli",
        rows: [
            { stop: "Dongri", time: "2:00 PM", type: "stop" },
            { stop: "Masjid Bandar", time: "2:05 PM", type: "stop" },
            { stop: "Byculla", time: "2:10 PM", type: "stop" },
            { stop: "Wadala", time: "2:15 PM", type: "stop" },
            { stop: "Kurla", time: "2:20 PM", type: "stop" },
            { stop: "Chembur", time: "2:25 PM", type: "stop" },
            { stop: "Govandi", time: "2:30 PM", type: "stop" },
            { stop: "Mankhurd", time: "2:35 PM", type: "stop" },
            { stop: "Vashi", time: "2:40 PM", type: "stop" },
            { stop: "Juinagar", time: "2:43 PM", type: "stop" },
            { stop: "Nerul", time: "2:48 PM", type: "stop" },
            { stop: "Kharghar", time: "3:00 PM", type: "stop" },
            { stop: "Kamothe", time: "3:10 PM", type: "stop" },
            { stop: "Panvel", time: "3:30 PM", type: "stop" },
            { stop: "Pen", time: "4:05 PM", type: "stop" },
            { stop: "Vadkhal", time: "4:20 PM", type: "stop" },
            {
                stop: "Hotel Stop (Lunch Break)",
                time: "4:20 PM to 4:50 PM",
                type: "break",
            },
            { stop: "Kolad", time: "5:40 PM", type: "stop" },
            { stop: "Indapur", time: "5:55 PM", type: "stop" },
            { stop: "Mangaon", time: "6:10 PM", type: "stop" },
            { stop: "Morba", time: "6:25 PM", type: "stop" },
            { stop: "Sai", time: "6:40 PM", type: "stop" },
            { stop: "Mhasla", time: "7:00 PM", type: "stop" },
            { stop: "Banoti", time: "7:15 PM", type: "stop" },
            { stop: "Kharasai", time: "7:20 PM", type: "stop" },
            { stop: "Mendadi", time: "7:25 PM", type: "stop" },
            { stop: "Gondghar", time: "7:35 PM", type: "stop" },
            { stop: "Vadvali Phata", time: "7:40 PM", type: "stop" },
            { stop: "Shiste", time: "7:43 PM", type: "stop" },
            { stop: "Kapoli", time: "7:50 PM", type: "stop" },
            { stop: "Borli", time: "8:30 PM", type: "stop" },
        ],
    },
    {
        key: "dongri-dighi",
        title: "Dongri → Dighi",
        subtitle: "Evening Return",
        shortTime: "4:00 PM → 10:30 PM",
        routeLabel: "Dongri → Dighi",
        rows: [
            { stop: "Dongri", time: "4:00 PM", type: "stop" },
            { stop: "Masjid Bandar", time: "4:05 PM", type: "stop" },
            { stop: "Byculla", time: "4:10 PM", type: "stop" },
            { stop: "Wadala", time: "4:15 PM", type: "stop" },
            { stop: "Kurla", time: "4:20 PM", type: "stop" },
            { stop: "Chembur", time: "4:25 PM", type: "stop" },
            { stop: "Govandi", time: "4:30 PM", type: "stop" },
            { stop: "Mankhurd", time: "4:35 PM", type: "stop" },
            { stop: "Vashi", time: "4:40 PM", type: "stop" },
            { stop: "Juinagar", time: "4:43 PM", type: "stop" },
            { stop: "Nerul", time: "4:48 PM", type: "stop" },
            { stop: "Kharghar", time: "5:00 PM", type: "stop" },
            { stop: "Kamothe", time: "5:10 PM", type: "stop" },
            { stop: "Panvel", time: "5:30 PM", type: "stop" },
            { stop: "Pen", time: "6:05 PM", type: "stop" },
            { stop: "Vadkhal", time: "6:20 PM", type: "stop" },
            {
                stop: "Hotel Stop (Refreshment Break)",
                time: "6:20 PM to 6:50 PM",
                type: "break",
            },
            { stop: "Kolad", time: "7:40 PM", type: "stop" },
            { stop: "Indapur", time: "7:55 PM", type: "stop" },
            { stop: "Mangaon", time: "8:10 PM", type: "stop" },
            { stop: "Morba", time: "8:25 PM", type: "stop" },
            { stop: "Sai", time: "8:40 PM", type: "stop" },
            { stop: "Mhasla", time: "9:00 PM", type: "stop" },
            { stop: "Banoti", time: "9:15 PM", type: "stop" },
            { stop: "Kharasai", time: "9:20 PM", type: "stop" },
            { stop: "Mendadi", time: "9:25 PM", type: "stop" },
            { stop: "Gondghar", time: "9:35 PM", type: "stop" },
            { stop: "Wadvali", time: "9:40 PM", type: "stop" },
            { stop: "Velas", time: "9:50 PM", type: "stop" },
            { stop: "Adgaon", time: "10:00 PM", type: "stop" },
            { stop: "Kudgaon", time: "10:10 PM", type: "stop" },
            { stop: "Dighi", time: "10:30 PM", type: "stop" },
        ],
    },
];

/* -------------------------------------------------------
   TABLE COMPONENT
------------------------------------------------------- */
function RouteTable({ route }) {
    return (
        <div className="mt-8 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            {/* HEADER BAR */}
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                        <Route size={18} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
                            {route.subtitle}
                        </p>
                        <h3 className="text-xl font-bold text-slate-900">{route.title}</h3>
                    </div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] text-slate-500">Schedule Window</p>
                    <p className="text-sm font-semibold text-slate-900">{route.shortTime}</p>
                </div>
            </div>

            {/* MOBILE CARD LIST */}
            <div className="block lg:hidden">
                <div className="divide-y divide-slate-100">
                    {route.rows.map((item, index) => (
                        <div
                            key={`${route.key}-mobile-${index}`}
                            className={`px-4 py-4 ${item.type === "break" ? "bg-orange-50/60" : "bg-white"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold text-slate-400">
                                        {item.type === "break" ? "BREAK STOP" : `STOP ${index + 1}`}
                                    </p>
                                    <p
                                        className={`mt-1 text-sm font-semibold ${item.type === "break" ? "text-orange-700" : "text-slate-900"
                                            }`}
                                    >
                                        {item.stop}
                                    </p>
                                </div>

                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${item.type === "break"
                                            ? "bg-orange-100 text-orange-700"
                                            : "bg-slate-100 text-slate-700"
                                        }`}
                                >
                                    {item.time}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full">
                    <thead className="bg-slate-900">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-white">
                                Sr. No.
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-white">
                                Stop Name
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-white">
                                Route
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-white">
                                Estimated Time
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {route.rows.map((item, index) => (
                            <tr
                                key={`${route.key}-${index}`}
                                className={`border-b border-slate-100 transition ${item.type === "break"
                                        ? "bg-orange-50/60 hover:bg-orange-50"
                                        : "hover:bg-slate-50"
                                    }`}
                            >
                                <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                                    {item.type === "break" ? "—" : index + 1}
                                </td>

                                <td
                                    className={`px-6 py-4 text-sm font-medium ${item.type === "break" ? "text-orange-700" : "text-slate-900"
                                        }`}
                                >
                                    {item.stop}
                                </td>

                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {item.type === "break" ? "Break / Hotel Stop" : route.routeLabel}
                                </td>

                                <td
                                    className={`px-6 py-4 text-sm font-semibold ${item.type === "break" ? "text-orange-700" : "text-orange-600"
                                        }`}
                                >
                                    {item.time}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */
export default function SchedulePreview() {
    const fullScheduleRef = useRef(null);
    const [activeRoute, setActiveRoute] = useState("dighi-dongri");

    const selectedRoute = useMemo(
        () => routeOptions.find((route) => route.key === activeRoute) || routeOptions[0],
        [activeRoute]
    );

    const scrollToFullSchedule = () => {
        fullScheduleRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    const handleRouteChange = (key) => {
        setActiveRoute(key);

        setTimeout(() => {
            fullScheduleRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 120);
    };

    return (
        <section className="bg-[#f8fafc] py-8 lg:py-6">
            <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8">
                {/* HEADER */}
                <Reveal>
                    <div className="max-w-4xl">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
                            Daily Schedule
                        </p>

                        <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.08]">
                            Fixed daily timings for a smooth and dependable journey
                        </h2>

                        <p className="mt-4 text-justify text-[15px] leading-8 text-slate-600 sm:text-base">
                            Passengers can rely on our regular morning departures and scheduled
                            evening return services with comfortable travel, planned hotel stops,
                            and dependable timing.
                        </p>
                    </div>
                </Reveal>

                {/* TOP PREVIEW CARDS */}
                <StaggerContainer className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {schedulePreview.map((item, index) => (
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

                                <p className="mt-3 text-3xl font-bold text-orange-500">
                                    {item.time}
                                </p>

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
                                        <p className="text-[11px] text-slate-500">Primary Routes</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            Dighi / Borli ↔ Dongri
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                        <Clock3 size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-500">Morning Services</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            3:00 AM & 4:00 AM
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                        <ArrowRightLeft size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-500">Return Services</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            2:00 PM & 4:00 PM
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={scrollToFullSchedule}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                View Full Schedule
                                <ArrowDown size={15} />
                            </button>
                        </div>
                    </div>
                </Reveal>

                {/* FULL SCHEDULE SECTION */}
                <div ref={fullScheduleRef} className="pt-10">
                    <Reveal>
                        <div className="mb-6">
                            <p className="text-sm font-bold uppercase tracking-[0.28em] text-orange-500">
                                Full Schedule Details
                            </p>
                            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                                Complete route timings with all stops
                            </h2>
                            <p className="mt-3 max-w-3xl text-[15px] leading-8 text-slate-600">
                                Select any route below to instantly view the complete stop-wise
                                schedule, including planned hotel and break stops.
                            </p>
                        </div>
                    </Reveal>

                    {/* ROUTE TABS / CARDS */}
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {routeOptions.map((route) => {
                            const isActive = activeRoute === route.key;

                            return (
                                <button
                                    key={route.key}
                                    type="button"
                                    onClick={() => handleRouteChange(route.key)}
                                    className={`rounded-[30px] border p-6 text-left transition-all duration-300 ${isActive
                                            ? "border-orange-200 bg-orange-50/70 shadow-md shadow-orange-100"
                                            : "border-slate-200 bg-white shadow-sm hover:-translate-y-1 hover:shadow-md"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p
                                                className={`text-sm font-bold ${isActive ? "text-orange-600" : "text-orange-500"
                                                    }`}
                                            >
                                                {route.title}
                                            </p>

                                            <p className="mt-3 text-xl font-bold text-slate-900">
                                                {route.shortTime}
                                            </p>

                                            <p className="mt-2 text-sm text-slate-500">{route.subtitle}</p>
                                        </div>

                                        <div
                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isActive
                                                    ? "bg-orange-500 text-white"
                                                    : "bg-orange-50 text-orange-500"
                                                }`}
                                        >
                                            <Route size={18} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* ACTIVE ROUTE TABLE */}
                    <RouteTable route={selectedRoute} />

                    {/* FOOTER NOTE */}
                    <Reveal delay={0.1}>
                        <div className="mt-8 rounded-[26px] border border-orange-100 bg-orange-50/60 p-5">
                            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                                <div>
                                    <p className="text-sm font-semibold text-orange-700">
                                        Important Note
                                    </p>
                                    <p className="mt-2 text-sm leading-7 text-slate-700">
                                        All timings shown are planned service timings. Actual pickup and
                                        drop time may vary slightly depending on traffic, road conditions,
                                        weather, and passenger boarding. Hotel stop timings are included
                                        for better travel comfort.
                                    </p>
                                </div>

                                <Link
                                    href="/booking"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                    Book Your Seat
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}