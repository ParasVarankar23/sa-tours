import { Bus, CalendarHeart, MapPinned, Users2, BriefcaseBusiness } from "lucide-react";
import SectionTitle from "./SectionTitle";

const services = [
    {
        title: "Daily Bus Service",
        desc: "Regular passenger transport from Borli, Dighi, Mahasala and nearby areas to Mumbai.",
        icon: Bus,
    },
    {
        title: "Wedding Transportation",
        desc: "Comfortable and reliable bus arrangements for wedding guests and family events.",
        icon: CalendarHeart,
    },
    {
        title: "Private Bus Hire",
        desc: "Book buses for private functions, special travel plans and custom routes.",
        icon: BriefcaseBusiness,
    },
    {
        title: "Pilgrimage Tours",
        desc: "Organized travel for temple visits, spiritual trips and family pilgrimage groups.",
        icon: MapPinned,
    },
    {
        title: "Group Travel",
        desc: "Travel support for group outings, family trips, events and community journeys.",
        icon: Users2,
    },
];

export default function ServicesPreview() {
    return (
        <section className="bg-white py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionTitle
                    eyebrow="Our Services"
                    title="More than a bus service — complete travel support for every need"
                    subtitle="From daily passenger routes to event transportation and private group bookings, we provide dependable travel solutions."
                    center
                />

                <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
                    {services.map((service, index) => {
                        const Icon = service.icon;
                        return (
                            <div
                                key={index}
                                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
                                    <Icon size={24} />
                                </div>
                                <h3 className="mt-5 text-lg font-bold text-slate-900">{service.title}</h3>
                                <p className="mt-3 text-sm leading-7 text-slate-600">{service.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}