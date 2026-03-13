const aboutImages = [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429",
];

export default function AboutSection() {
    return (
        <section className="px-6 md:px-10 py-10 md:py-16">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
                {/* Images */}
                <div className="relative flex gap-4">
                    <div className="w-1/2 rounded-3xl overflow-hidden h-[280px] md:h-[340px]">
                        <img
                            src={aboutImages[0]}
                            alt="about travel"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="w-1/2 mt-10 rounded-3xl overflow-hidden h-[220px] md:h-[280px]">
                        <img
                            src={aboutImages[1]}
                            alt="about travel"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Content */}
                <div>
                    <p className="text-sm text-orange-500 font-semibold mb-3">About Us</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                        We Recommend <br />
                        Beautiful Destinations <br />
                        Every Month
                    </h2>

                    <p className="mt-5 text-gray-500 leading-7 text-sm md:text-base">
                        We help travelers discover amazing places with budget-friendly and
                        premium packages. Explore the world with comfort and confidence.
                    </p>

                    <div className="grid grid-cols-3 gap-5 mt-8">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">2000+</h3>
                            <p className="text-sm text-gray-500 mt-1">Our Explorers</p>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">100+</h3>
                            <p className="text-sm text-gray-500 mt-1">Destinations</p>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">20+</h3>
                            <p className="text-sm text-gray-500 mt-1">Years Experience</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}