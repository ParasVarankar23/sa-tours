import { MessageCircle, Phone } from "lucide-react";

export default function CTASection() {
    return (
        <section className="bg-[#f8fafc] py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-orange-500 to-orange-600 p-8 text-white shadow-2xl sm:p-12">
                    <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-100">
                                Book Your Journey
                            </p>
                            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                                Need daily travel or private bus booking?
                            </h2>
                            <p className="mt-4 max-w-2xl text-base leading-8 text-orange-50">
                                Contact SA Tours & Travels for daily seat booking, wedding transportation,
                                group travel, private bus hire and special trip arrangements.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
                            <a
                                href="tel:+919999999999"
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-orange-600"
                            >
                                <Phone size={18} />
                                Call Now
                            </a>
                            <a
                                href="https://wa.me/919999999999"
                                target="_blank"
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur"
                            >
                                <MessageCircle size={18} />
                                WhatsApp Booking
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}