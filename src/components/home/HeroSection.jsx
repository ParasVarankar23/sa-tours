import { ArrowRight, Bus, CalendarDays, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.22),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.15),_transparent_35%)]" />
            <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
                <div className="flex flex-col justify-center">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-200">
                        <Bus size={16} />
                        Reliable Daily Bus Service
                    </div>

                    <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                        Daily Bus Service from Borli, Dighi & Mahasala to Mumbai
                    </h1>

                    <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                        SA Tours & Travels provides dependable daily bus transportation to Panvel,
                        Vashi and Mumbai, along with private bus booking for weddings, events,
                        group travel and special tours.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <a
                            href="https://wa.me/919999999999"
                            target="_blank"
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                        >
                            <MessageCircle size={18} />
                            Book Your Seat
                        </a>

                        <a
                            href="tel:+919999999999"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/10"
                        >
                            <Phone size={18} />
                            Call Now
                        </a>

                        <Link
                            href="/schedule"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
                        >
                            <CalendarDays size={18} />
                            View Schedule
                        </Link>
                    </div>

                    <div className="mt-10 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                            <p className="text-3xl font-bold">4+</p>
                            <p className="mt-1 text-sm text-slate-300">Owned Buses</p>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                            <p className="text-3xl font-bold">Daily</p>
                            <p className="mt-1 text-sm text-slate-300">Morning & Return Service</p>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                            <p className="text-3xl font-bold">3</p>
                            <p className="mt-1 text-sm text-slate-300">Office Locations</p>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-5">
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                                <div className="h-56 rounded-[1.5rem] bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600" />
                            </div>
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                                <div className="h-36 rounded-[1.5rem] bg-gradient-to-br from-sky-400 via-blue-500 to-blue-700" />
                            </div>
                        </div>

                        <div className="space-y-5 pt-8">
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                                <div className="h-36 rounded-[1.5rem] bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600" />
                            </div>
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                                <div className="h-56 rounded-[1.5rem] bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="absolute -bottom-6 left-4 right-4 rounded-3xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="flex items-center gap-3">
                                <MapPin className="text-orange-500" size={18} />
                                <div>
                                    <p className="text-xs text-slate-500">Primary Route</p>
                                    <p className="text-sm font-semibold">Borli to Mumbai</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <CalendarDays className="text-orange-500" size={18} />
                                <div>
                                    <p className="text-xs text-slate-500">Morning Departure</p>
                                    <p className="text-sm font-semibold">3:00 AM / 4:00 AM</p>
                                </div>
                            </div>
                            <Link
                                href="/contact"
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                            >
                                Contact Us
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}