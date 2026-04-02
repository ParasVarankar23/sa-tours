"use client";

import {
    ArrowRight,
    ArrowRightLeft,
    Bus,
    Clock3,
    MapPin,
    Phone,
    Route,
    X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import Reveal from "../Reveal";
import StaggerContainer from "../StaggerContainer";
import StaggerItem from "../StaggerItem";

/* -------------------------------------------------------
   ROUTE DATA
------------------------------------------------------- */
const routeOptions = [
    {
        key: "dighi-dongri",
        title: "Dighi → Dongri",
        subtitle: "Morning Departure",
        shortTime: "3:00 AM → 9:00 AM",
        routeLabel: "Dighi → Dongri",
        previewTime: "3:00 AM",
        type: "Departure",
        contactNumber: "9273635316",
        contactLabel: "Dighi Service Contact",
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
            { stop: "Hotel Stop (Breakfast)", time: "6:35 AM to 6:45 AM", type: "break" },
            { stop: "Pen", time: "7:00 AM", type: "stop" },
            { stop: "Panvel", time: "7:45 AM", type: "stop" },
            { stop: "Kamothe", time: "7:55 AM", type: "stop" },
            { stop: "Kharghar", time: "8:05 AM", type: "stop" },
            { stop: "Nerul", time: "8:15 AM", type: "stop" },
            { stop: "Juinagar", time: "8:18 AM", type: "stop" },
            { stop: "Sanpada", time: "8:19 AM", type: "stop" },
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
        previewTime: "4:00 AM",
        type: "Departure",
        contactNumber: "9209471309",
        contactLabel: "Borli Service Contact",
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
            { stop: "Hotel Stop (Breakfast)", time: "7:15 AM to 7:25 AM", type: "break" },
            { stop: "Pen", time: "7:40 AM", type: "stop" },
            { stop: "Panvel", time: "8:15 AM", type: "stop" },
            { stop: "Kamothe", time: "8:25 AM", type: "stop" },
            { stop: "Kharghar", time: "8:35 AM", type: "stop" },
            { stop: "Nerul", time: "8:45 AM", type: "stop" },
            { stop: "Juinagar", time: "8:48 AM", type: "stop" },
            { stop: "Sanpada", time: "8:49 AM", type: "stop" },
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
        previewTime: "2:00 PM",
        type: "Return",
        contactNumber: "9209471309",
        contactLabel: "Borli Return Service Contact",
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
            { stop: "Sanpada", time: "2:45 PM", type: "stop" },
            { stop: "Nerul", time: "2:48 PM", type: "stop" },
            { stop: "Kharghar", time: "3:00 PM", type: "stop" },
            { stop: "Kamothe", time: "3:10 PM", type: "stop" },
            { stop: "Panvel", time: "3:30 PM", type: "stop" },
            { stop: "Pen", time: "4:05 PM", type: "stop" },
            { stop: "Vadkhal", time: "4:20 PM", type: "stop" },
            { stop: "Hotel Stop (Lunch Break)", time: "4:20 PM to 4:50 PM", type: "break" },
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
        previewTime: "4:00 PM",
        type: "Return",
        contactNumber: "9273635316",
        contactLabel: "Dighi Return Service Contact",
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
            { stop: "Sanpada", time: "4:45 PM", type: "stop" },
            { stop: "Nerul", time: "4:48 PM", type: "stop" },
            { stop: "Kharghar", time: "5:00 PM", type: "stop" },
            { stop: "Kamothe", time: "5:10 PM", type: "stop" },
            { stop: "Panvel", time: "5:30 PM", type: "stop" },
            { stop: "Pen", time: "6:05 PM", type: "stop" },
            { stop: "Vadkhal", time: "6:20 PM", type: "stop" },
            { stop: "Hotel Stop (Refreshment Break)", time: "6:20 PM to 6:50 PM", type: "break" },
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
   TABLE COMPONENT INSIDE MODAL
------------------------------------------------------- */
function RouteTable({ route }) {
    return (
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            {/* MOBILE */}
            <div className="block lg:hidden">
                <div className="divide-y divide-slate-100">
                    {route.rows.map((item, index) => (
                        <div
                            key={`${route.key}-mobile-${index}`}
                            className={`px-4 py-4 ${item.type === "break" ? "bg-orange-50/60" : "bg-white"}`}
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

            {/* DESKTOP */}
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
   MODAL
------------------------------------------------------- */
function ScheduleModal({ route, onClose }) {
    if (!route) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5">
            <div className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
                {/* Header */}
                <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
                                Full Schedule Details
                            </p>
                            <h3 className="mt-2 text-xl font-bold text-slate-900 sm:text-3xl">
                                {route.title}
                            </h3>
                            <p className="mt-2 text-sm text-slate-500 sm:text-base">
                                {route.shortTime} • {route.subtitle}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <div className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                                    <Phone className="h-4 w-4" />
                                    {route.contactNumber}
                                </div>

                                <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                                    <Route className="h-4 w-4" />
                                    {route.routeLabel}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="max-h-[calc(92vh-110px)] overflow-y-auto p-4 sm:p-6">
                    <RouteTable route={route} />
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */
export default function SchedulePreview() {
    const [activeRouteKey, setActiveRouteKey] = useState(null);

    const selectedRoute = useMemo(
        () => routeOptions.find((route) => route.key === activeRouteKey) || null,
        [activeRouteKey]
    );

    const openRouteModal = (key) => {
        setActiveRouteKey(key);
        document.body.style.overflow = "hidden";
    };

    const closeRouteModal = () => {
        setActiveRouteKey(null);
        document.body.style.overflow = "auto";
    };

    return (
        <>
            <section className="bg-[#f8fafc] py-8 lg:py-6">
                <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8">
                    {/* HEADER */}
                    <Reveal>
                        <div className="max-w-4xl">
                            <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
                                Daily Schedule
                            </p>

                            <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[32px] lg:leading-[1.08]">
                                Fixed daily timings for a smooth and dependable journey
                            </h2>

                            <p className="mt-4 text-justify text-[15px] leading-8 text-slate-600 sm:text-base">
                                Passengers can rely on our regular morning departures and scheduled
                                evening return services with comfortable travel, planned hotel stops,
                                and dependable timing.
                            </p>
                        </div>
                    </Reveal>

                    {/* SINGLE ROUTE CARDS ONLY */}
                    <StaggerContainer className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {routeOptions.map((item) => (
                            <StaggerItem key={item.key}>
                                <button
                                    type="button"
                                    onClick={() => openRouteModal(item.key)}
                                    className="group w-full rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60"
                                >
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

                                    <h3 className="mt-4 text-lg font-bold text-slate-900">{item.title}</h3>

                                    <p className="mt-3 text-3xl font-bold text-orange-500">{item.previewTime}</p>

                                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                                        <Bus size={15} />
                                        <span>{item.subtitle}</span>
                                    </div>

                                    <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                                        <Phone size={15} className="text-orange-500" />
                                        <span>{item.contactNumber}</span>
                                    </div>

                                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                                        View full schedule
                                        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                                    </div>
                                </button>
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

                                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700">
                                    <Phone size={16} />
                                    Dighi: 9273635316 • Borli: 9209471309
                                </div>
                            </div>
                        </div>
                    </Reveal>

                    {/* FOOTER NOTE */}
                    <Reveal delay={0.15}>
                        <div className="mt-8 rounded-[26px] border border-orange-100 bg-orange-50/60 p-5">
                            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                                <div>
                                    <p className="text-sm font-semibold text-orange-700">Important Note</p>
                                    <p className="mt-2 text-sm leading-7 text-slate-700">
                                        Click any route card above to view the complete stop-wise schedule in a
                                        clean modal popup. Actual pickup and drop time may vary slightly depending
                                        on traffic, road conditions, weather, and passenger boarding.
                                    </p>
                                </div>

                                <Link
                                    href="/login"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                    Book Your Seat
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* MODAL */}
            <ScheduleModal route={selectedRoute} onClose={closeRouteModal} />
        </>
    );
}