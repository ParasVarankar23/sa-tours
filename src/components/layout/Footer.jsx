import Link from "next/link";

export default function Footer() {
    return (
        <footer className="px-6 md:px-10 py-10 border-t border-gray-100">
            <div className="grid md:grid-cols-4 gap-8">
                {/* Brand */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                            T
                        </div>
                        <span className="text-xl font-bold text-gray-800">Travelr</span>
                    </div>
                    <p className="text-sm text-gray-500 leading-6">
                        Explore the world with trusted guides and beautiful destinations.
                    </p>
                </div>

                {/* About */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-4">About</h3>
                    <div className="flex flex-col gap-2 text-sm text-gray-500">
                        <Link href="#">Home</Link>
                        <Link href="#">About Us</Link>
                        <Link href="#">Tours</Link>
                        <Link href="#">Contact</Link>
                    </div>
                </div>

                {/* Support */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-4">Support</h3>
                    <div className="flex flex-col gap-2 text-sm text-gray-500">
                        <Link href="#">Help Center</Link>
                        <Link href="#">Terms & Conditions</Link>
                        <Link href="#">Privacy Policy</Link>
                        <Link href="#">Accessibility</Link>
                    </div>
                </div>

                {/* Social */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-4">Social Media</h3>
                    <div className="flex gap-3">
                        <span className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                            f
                        </span>
                        <span className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                            t
                        </span>
                        <span className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                            i
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-10 pt-6 border-t border-gray-100 text-sm text-gray-500 text-center">
                © 2026 Travelr. All rights reserved.
            </div>
        </footer>
    );
}