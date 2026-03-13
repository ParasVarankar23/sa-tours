import PageHero from "@/components/PageHero";

const sections = [
    {
        title: "1. Booking Process",
        points: [
            "Bookings can be requested via phone, WhatsApp, contact form, or office visit.",
            "Seats are confirmed only after availability check and confirmation from SA Tours & Travels.",
            "For private trips, vehicle confirmation depends on route, date, timing, and advance notice.",
        ],
    },
    {
        title: "2. Payment Process (Razorpay)",
        points: [
            "Online payments are processed using Razorpay payment gateway.",
            "Supported methods may include UPI, cards, net banking, and wallets based on Razorpay availability.",
            "We do not store full card or UPI credentials on our servers.",
            "Booking is treated as paid only after successful transaction confirmation.",
        ],
    },
    {
        title: "3. Cancellation and Refund",
        points: [
            "Cancellation eligibility depends on booking type and timing before departure.",
            "Refundable amounts, if applicable, are processed to the original payment method.",
            "Razorpay and banking processing timelines may apply for final credit.",
        ],
    },
    {
        title: "4. Passenger Responsibilities",
        points: [
            "Provide accurate name, phone number, route, and travel timing details.",
            "Report at pickup point before scheduled departure time.",
            "Follow staff guidance for boarding, luggage, and seat discipline.",
        ],
    },
    {
        title: "5. Service Changes",
        points: [
            "Schedules or routes may change due to traffic, weather, breakdowns, or operational reasons.",
            "We will try to notify affected passengers at the earliest possible time.",
        ],
    },
];

export default function TermsPage() {
    return (
        <>
            <PageHero
                title="Terms & Conditions"
                subtitle="Please read these terms before booking travel services with SA Tours & Travels."
                compact
            />

            <section className="bg-white py-6 sm:py-8 lg:py-9">
                <div className="mx-auto max-w-[1050px] px-4 sm:px-6 lg:px-8">
                    <div className="rounded-3xl border border-slate-200 bg-[#f8fafc] p-5 sm:p-6 lg:p-7">
                        <p className="text-sm leading-7 text-slate-600">
                            Effective date: March 13, 2026
                        </p>

                        <div className="mt-5 space-y-5">
                            {sections.map((section) => (
                                <div key={section.title} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                                    <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
                                    <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                                        {section.points.map((point) => (
                                            <li key={point}>- {point}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <p className="mt-5 text-sm leading-7 text-slate-600">
                            For clarifications, contact us at +91 88302 10690 or via WhatsApp.
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
}
