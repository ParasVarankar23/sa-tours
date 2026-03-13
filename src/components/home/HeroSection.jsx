const heroImages = [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
    "https://images.unsplash.com/photo-1493558103817-58b2924bce98",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
];

export default function HeroSection() {
    return (
        <section className="px-6 md:px-10 py-8 md:py-12">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
                {/* Left Content */}
                <div>
                    <p className="text-sm text-orange-500 font-semibold mb-3">
                        Explore the World ✈️
                    </p>

                    <h1 className="text-4xl md:text-6xl font-bold leading-tight text-gray-900">
                        Discover The <br />
                        Best Destinations <br />
                        In The World
                    </h1>

                    <p className="mt-5 text-gray-500 max-w-xl text-sm md:text-base leading-7">
                        Let’s build your dream holiday with our recommended tours and
                        beautiful destinations around the world.
                    </p>

                    {/* Search Box */}
                    <div className="mt-8 bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex flex-col md:flex-row gap-4 md:items-center">
                        <div className="flex-1">
                            <label className="text-xs text-gray-400 block mb-1">Location</label>
                            <input
                                type="text"
                                placeholder="Where are you going?"
                                className="w-full outline-none text-sm text-gray-700"
                            />
                        </div>

                        <div className="w-full md:w-[180px]">
                            <label className="text-xs text-gray-400 block mb-1">Select Date</label>
                            <input
                                type="date"
                                className="w-full outline-none text-sm text-gray-700 bg-transparent"
                            />
                        </div>

                        <button className="px-6 py-3 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition">
                            Check Now
                        </button>
                    </div>
                </div>

                {/* Right Image Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-3xl overflow-hidden h-[220px] md:h-[260px]">
                        <img
                            src={heroImages[0]}
                            alt="travel"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-3xl overflow-hidden h-[140px] md:h-[160px]">
                            <img
                                src={heroImages[1]}
                                alt="travel"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="rounded-3xl overflow-hidden h-[160px] md:h-[180px]">
                            <img
                                src={heroImages[2]}
                                alt="travel"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    <div className="rounded-3xl overflow-hidden h-[180px] col-span-2">
                        <img
                            src={heroImages[3]}
                            alt="travel"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}