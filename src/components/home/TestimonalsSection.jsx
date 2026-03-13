export default function TestimonialSection() {
    return (
        <section className="px-6 md:px-10 py-12">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
                {/* Left */}
                <div>
                    <p className="text-sm text-orange-500 font-semibold mb-3">What They Say</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                        What Our Customer <br /> Say About Us
                    </h2>

                    <div className="mt-8 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-4">
                            <img
                                src="https://randomuser.me/api/portraits/women/44.jpg"
                                alt="user"
                                className="w-14 h-14 rounded-full object-cover"
                            />
                            <div>
                                <h4 className="font-semibold text-gray-800">Jane Doe</h4>
                                <p className="text-sm text-gray-500">Traveler</p>
                            </div>
                        </div>

                        <p className="mt-5 text-gray-500 leading-7 text-sm md:text-base">
                            “Amazing experience! Everything was perfectly planned and the
                            destinations were breathtaking. Highly recommended.”
                        </p>

                        <div className="mt-4 text-yellow-400 text-lg">★★★★★</div>
                    </div>
                </div>

                {/* Right Mosaic */}
                <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 12 }).map((_, index) => (
                        <div
                            key={index}
                            className={`rounded-2xl overflow-hidden ${index === 5 || index === 6 ? "col-span-2 row-span-2" : ""
                                }`}
                        >
                            <img
                                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
                                alt="travel"
                                className="w-full h-full object-cover min-h-[80px]"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}