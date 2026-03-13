const tabs = ["Maldives", "Phuket", "Beach", "South Goa"];

export default function DestinationSearch() {
    return (
        <section className="px-6 md:px-10 py-10">
            <div className="bg-[#fff7f1] rounded-[32px] p-8 md:p-10 text-center">
                <p className="text-sm text-orange-500 font-semibold mb-3">
                    Top Destination
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                    Let’s Explore Your Dream <br /> Destination Here!
                </h2>

                <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-sm md:text-base">
                    We have handpicked the best destinations for your next unforgettable
                    journey.
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    {tabs.map((tab, index) => (
                        <button
                            key={index}
                            className={`px-5 py-2 rounded-full text-sm font-medium border ${index === 0
                                    ? "bg-orange-500 text-white border-orange-500"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}

                    <button className="px-5 py-2 rounded-full bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition">
                        See More
                    </button>
                </div>
            </div>
        </section>
    );
}