const destinations = [
    {
        title: "Kelingking Beach",
        location: "Bali, Indonesia",
        price: "$250",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    },
    {
        title: "Maya Bay Beach",
        location: "Krabi, Thailand",
        price: "$320",
        image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
    },
    {
        title: "Kuta Beach",
        location: "Bali, Indonesia",
        price: "$280",
        image: "https://images.unsplash.com/photo-1493558103817-58b2924bce98",
    },
    {
        title: "Blue Lagoon",
        location: "Iceland",
        price: "$450",
        image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    },
    {
        title: "Tropical Paradise",
        location: "Maldives",
        price: "$500",
        image: "https://images.unsplash.com/photo-1468413253725-0d5181091126",
    },
    {
        title: "Island Escape",
        location: "Philippines",
        price: "$390",
        image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1",
    },
];

export default function DestinationGrid() {
    return (
        <section className="px-6 md:px-10 py-10">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {destinations.map((place, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition"
                    >
                        <div className="h-56 overflow-hidden">
                            <img
                                src={place.image}
                                alt={place.title}
                                className="w-full h-full object-cover hover:scale-105 transition duration-500"
                            />
                        </div>

                        <div className="p-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800">{place.title}</h3>
                                <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-500 text-sm font-semibold">
                                    {place.price}
                                </span>
                            </div>

                            <p className="text-sm text-gray-500 mt-2">{place.location}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-center mt-8">
                <button className="px-6 py-3 rounded-full bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition">
                    View More
                </button>
            </div>
        </section>
    );
}