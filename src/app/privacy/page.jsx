import PageHero from "@/components/PageHero";

const sections = [
    {
        title: "1. Information We Collect",
        points: [
            "Name, phone number, and booking/travel details shared via forms, calls, WhatsApp, or office visits.",
            "Service preferences such as route, date, passenger count, and travel requirements.",
            "Payment transaction references for successful bookings.",
        ],
    },
    {
        title: "2. How We Use Your Information",
        points: [
            "To confirm bookings, schedule routes, and provide passenger support.",
            "To contact you about service updates, timing changes, or travel coordination.",
            "To maintain internal records for operations, compliance, and service quality.",
        ],
    },
    {
        title: "3. Payments and Razorpay",
        points: [
            "Online payments are processed by Razorpay secure payment gateway.",
            "Sensitive payment credentials are handled by Razorpay and not stored in full by us.",
            "We may store limited transaction details such as payment ID, amount, status, and booking reference.",
        ],
    },
    {
        title: "4. Data Sharing",
        points: [
            "We do not sell personal data to third parties.",
            "Data may be shared only with payment partners, legal authorities, or operational providers when required.",
        ],
    },
    {
        title: "5. Data Security and Retention",
        points: [
            "We apply reasonable technical and organizational safeguards for stored records.",
            "Data is retained only for operational, legal, and accounting purposes as necessary.",
        ],
    },
    {
        title: "6. Your Rights",
        points: [
            "You may request correction of incorrect contact or booking data.",
            "You may contact us for data-related queries and account support.",
        ],
    },
];

export default function PrivacyPage() {
    return (
        <>
            <PageHero
                title="Privacy Policy"
                subtitle="How SA Tours & Travels collects, uses, and protects your booking and payment information."
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
                            For privacy requests, contact us at +91  92094 71309 or satoursandtravels@gmail.com.
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
}
