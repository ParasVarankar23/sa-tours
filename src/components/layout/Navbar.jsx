import Link from "next/link";

export default function Navbar() {
    return (
        <header className="w-full px-6 md:px-10 py-5 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                    T
                </div>
                <span className="text-xl font-bold text-gray-800">Travelr</span>
            </div>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                <Link href="#" className="hover:text-orange-500 transition">Home</Link>
                <Link href="#" className="hover:text-orange-500 transition">About</Link>
                <Link href="#" className="hover:text-orange-500 transition">Destination</Link>
                <Link href="#" className="hover:text-orange-500 transition">Tours</Link>
                <Link href="#" className="hover:text-orange-500 transition">Blog</Link>
            </nav>

            {/* Buttons */}
            <div className="flex items-center gap-3">
                <button className="px-4 py-2 rounded-full border border-orange-300 text-orange-500 text-sm font-medium hover:bg-orange-50 transition">
                    Login
                </button>
                <button className="px-5 py-2 rounded-full bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition">
                    Sign Up
                </button>
            </div>
        </header>
    );
}