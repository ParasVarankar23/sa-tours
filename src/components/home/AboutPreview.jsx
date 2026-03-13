import Link from "next/link";
import { ArrowRight, Bus, ShieldCheck, Users } from "lucide-react";
import SectionTitle from "./SectionTitle";

export default function AboutPreview() {
    return (
        <section className="bg-white py-24">
            <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
                <div className="grid grid-cols-2 gap-5">
                    <div className="rounded-[2rem] bg-gradient-to-br from-orange-100 to-orange-200 p-4">
                        <div className="h-72 rounded-[1.5rem] bg-gradient-to-br from-orange-400 to-orange-600" />
                    </div>
                    <div className="mt-10 rounded-[2rem] bg-gradient-to-br from-slate-100 to-slate-200 p-4">
                        <div className="h-60 rounded-[1.5rem] bg-gradient-to-br from-slate-700 to-slate-900" />
                    </div>
                </div>

                <div className="flex flex-col justify-center">
                    <SectionTitle
                        eyebrow="About Us"
                        title="Trusted daily travel service with comfortable buses and reliable timing"
                        subtitle="SA Tours & Travels provides regular daily passenger service from Borli Panchatan, Dighi, Mahasala, Shrivardhan and nearby areas to Panvel, Vashi and Mumbai. We also offer private bus booking for weddings, group events and special tours."
                    />

                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-3xl border border-slate-200 p-5">
                            <Bus className="text-orange-500" size={24} />
                            <p className="mt-3 text-lg font-bold">4+ Buses</p>
                            <p className="mt-1 text-sm text-slate-600">Owned and operated with care</p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 p-5">
                            <ShieldCheck className="text-orange-500" size={24} />
                            <p className="mt-3 text-lg font-bold">Reliable Service</p>
                            <p className="mt-1 text-sm text-slate-600">Safe, punctual and dependable</p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 p-5">
                            <Users className="text-orange-500" size={24} />
                            <p className="mt-3 text-lg font-bold">Helpful Staff</p>
                            <p className="mt-1 text-sm text-slate-600">Friendly support for passengers</p>
                        </div>
                    </div>

                    <Link
                        href="/about"
                        className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white"
                    >
                        Learn More
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </section>
    );
}