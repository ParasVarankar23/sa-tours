import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import SectionTitle from "./SectionTitle";

const schedule = [
    { route: "Dighi to Mumbai", time: "3:00 AM", frequency: "Daily" },
    { route: "Borli to Mumbai", time: "4:00 AM", frequency: "Daily" },
    { route: "Mumbai Return Service", time: "2:00 PM", frequency: "Daily" },
    { route: "Mumbai Return Service", time: "4:00 PM", frequency: "Daily" },
];

export default function SchedulePreview() {
    return (
        <section className="bg-[#f8fafc] py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionTitle
                    eyebrow="Daily Schedule"
                    title="Fixed daily timings for a smooth and dependable journey"
                    subtitle="Passengers can rely on our regular morning departures to Mumbai and scheduled afternoon return services."
                />

                <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {schedule.map((item, index) => (
                        <div key={index} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
                                <Clock3 size={22} />
                            </div>
                            <h3 className="mt-5 text-lg font-bold text-slate-900">{item.route}</h3>
                            <p className="mt-2 text-2xl font-bold text-orange-500">{item.time}</p>
                            <p className="mt-2 text-sm text-slate-500">{item.frequency}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-8">
                    <Link
                        href="/schedule"
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white"
                    >
                        View Full Schedule
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </section>
    );
}