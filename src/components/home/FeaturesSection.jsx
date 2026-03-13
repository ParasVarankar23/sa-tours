const features = [
    {
        title: "Lots Of Choices",
        desc: "Choose from many destinations and packages.",
    },
    {
        title: "Best Tour Guide",
        desc: "Professional guides for safe and memorable travel.",
    },
    {
        title: "Easy Booking",
        desc: "Quick and simple booking with secure payments.",
    },
    {
        title: "Customer Support",
        desc: "We are here for you before and after your trip.",
    },
];

export default function FeaturesSection() {
    return (
        <section className="px-6 md:px-10 py-10">
            <div className="grid md:grid-cols-5 gap-6">
                <div className="md:col-span-1">
                    <p className="text-sm text-orange-500 font-semibold mb-2">Why Us</p>
                    <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                        Best Features <br /> For You
                    </h2>
                </div>

                <div className="md:col-span-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {features.map((item, index) => (
                        <div
                            key={index}
                            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
                        >
                            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center font-bold text-lg mb-4">
                                ✦
                            </div>
                            <h3 className="font-semibold text-gray-800">{item.title}</h3>
                            <p className="text-sm text-gray-500 mt-2 leading-6">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}