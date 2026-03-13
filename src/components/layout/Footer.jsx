import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";

export default function Footer() {
    return (
        <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                                <span className="text-lg font-bold">SA</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">SA Tours & Travels</h3>
                                <p className="text-sm text-slate-500">Reliable Daily Bus Service</p>
                            </div>
                        </div>

                        <p className="mt-4 text-sm leading-7 text-slate-600">
                            Providing reliable daily bus service from Borli, Dighi,
                            Mahasala and Mangaon to Panvel, Vashi and Mumbai, along with private
                            bus booking for weddings, events and group travel.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Quick Links</h4>
                        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
                            <Link href="/">Home</Link>
                            <Link href="/about">About</Link>
                            <Link href="/services">Services</Link>
                            <Link href="/schedule">Schedule</Link>
                            <Link href="/routes">Routes</Link>
                            <Link href="/contact">Contact</Link>
                            <Link href="/terms">Terms & Conditions</Link>
                            <Link href="/privacy">Privacy Policy</Link>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Services</h4>
                        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
                            <span>Daily Bus Service</span>
                            <span>Wedding Transportation</span>
                            <span>Private Bus Hire</span>
                            <span>Pilgrimage Tours</span>
                            <span>Group Travel</span>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Contact</h4>
                        <div className="mt-4 space-y-4 text-sm text-slate-600">
                            <p className="flex items-start gap-2">
                                <MapPin size={16} className="mt-0.5 text-orange-500" />
                                Borli Panchatan Office, Near ST Stand
                            </p>
                            <p className="flex items-start gap-2">
                                <MapPin size={16} className="mt-0.5 text-orange-500" />
                                Mahasala Office, Near ST Stand
                            </p>
                            <p className="flex items-start gap-2">
                                <MapPin size={16} className="mt-0.5 text-orange-500" />
                                Mumbai Office, Dongri
                            </p>
                            <p className="flex items-center gap-2">
                                <Phone size={16} className="text-orange-500" />
                                +91 88302 10690
                            </p>
                            <p className="flex items-center gap-2">
                                <Mail size={16} className="text-orange-500" />
                                satoursandtravels@gmail.com
                            </p>
                        </div>

                        <a
                            href="https://wa.me/+91 88302 106909"
                            target="_blank"
                            className="mt-5 inline-flex items-center gap-2 rounded-full bg-green-500 px-5 py-3 text-sm font-semibold text-white"
                        >
                            <MessageCircle size={16} />
                            WhatsApp Booking
                        </a>
                    </div>
                </div>

                <div className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
                    © 2026 SA Tours & Travels. All rights reserved. Payments are processed securely via Razorpay.
                </div>
            </div>
        </footer>
    );
}