"use client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function ClientLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#f7f7f7] text-gray-900">
            <div className="max-w-[1280px] mx-auto bg-white shadow-sm min-h-screen flex flex-col">
                {/* Global Navbar */}
                <Navbar />

                {/* Page Content */}
                <main className="flex-1">
                    {children}
                </main>

                {/* Global Footer */}
                <Footer />
            </div>
        </div>
    );
}