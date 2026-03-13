import { MapPin } from "lucide-react";
import SectionTitle from "./SectionTitle";

const routes = [
    "Shrivardhan",
    "Borli Panchatan",
    "Dighi",
    "Mahasala",
    "Mangaon",
    "Panvel",
    "Vashi",
    "Mumbai",
];

export default function RoutesPreview() {
    return (
        <section className="bg-[#f8fafc] py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionTitle
                    eyebrow="Service Routes"
                    title="Serving key travel points from coastal towns to major city destinations"
                    subtitle="Our route network connects important local pickup areas with Panvel, Vashi and Mumbai for regular daily travel."
                />

                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {routes.map((route, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
                                <MapPin size={18} />
                            </div>
                            <span className="font-medium text-slate-800">{route}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}