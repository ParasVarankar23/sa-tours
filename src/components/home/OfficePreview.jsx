import { Building2, MapPin } from "lucide-react";
import SectionTitle from "./SectionTitle";

const offices = [
    {
        name: "Borli Panchatan Office",
        address: "Near ST Stand, Borli Panchatan",
    },
    {
        name: "Mahasala Office",
        address: "Near ST Stand, Mahasala",
    },
    {
        name: "Mumbai Office",
        address: "Dongri, Mumbai",
    },
];

export default function OfficesPreview() {
    return (
        <section className="bg-white py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionTitle
                    eyebrow="Office Locations"
                    title="Visit our offices for seat booking, route details and travel assistance"
                    subtitle="Our team is available at convenient office locations to help with bookings, timing information and special travel arrangements."
                    center
                />

                <div className="mt-12 grid gap-6 md:grid-cols-3">
                    {offices.map((office, index) => (
                        <div key={index} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
                                <Building2 size={24} />
                            </div>
                            <h3 className="mt-5 text-xl font-bold text-slate-900">{office.name}</h3>
                            <p className="mt-3 flex items-start gap-2 text-sm leading-7 text-slate-600">
                                <MapPin size={18} className="mt-1 text-orange-500" />
                                {office.address}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}