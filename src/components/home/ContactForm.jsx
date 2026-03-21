"use client";

import { motion } from "framer-motion";
import {
    BriefcaseBusiness,
    Building2,
    Bus,
    Clock3,
    MapPin,
    MessageCircle,
    MessageSquareText,
    Phone,
    PhoneCall,
    Send,
    User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: "easeOut" },
    },
};

const stagger = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

export default function ContactSection() {
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        service: "Daily Bus Seat Booking",
        message: "",
        agreedTerms: false,
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        let newValue = value;
        if (e.target.name === "phone" && typeof newValue === "string") {
            // keep digits only and cap to 10 characters
            newValue = newValue.replace(/\D/g, "").slice(0, 10);
        }

        if (e.target.name === "fullName" && typeof newValue === "string") {
            // remove any digits from the full name as user types
            newValue = newValue.replace(/\d/g, "").slice(0, 100);
        }

        setFormData((prev) => ({
            ...prev,
            [e.target.name]: newValue,
        }));
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = "Please enter your full name";
        } else if (!/^[A-Za-z\s'\-]{2,}$/.test(formData.fullName.trim())) {
            newErrors.fullName = "Enter a valid full name (letters and spaces only)";
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "Please enter your phone number";
        } else if (!/^\d{10}$/.test(formData.phone.trim())) {
            newErrors.phone = "Enter a valid 10-digit phone number";
        }

        if (!formData.message.trim()) {
            newErrors.message = "Please enter your travel requirement";
        }

        if (!formData.agreedTerms) {
            newErrors.agreedTerms = "Please agree to Terms and Privacy Policy";
        }

        return newErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const validationErrors = validate();
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) return;

        const text = `Hello SA Tours & Travels,

Name: ${formData.fullName}
Phone: ${formData.phone}
Service Required: ${formData.service}

Travel Requirement:
${formData.message}`;

        const whatsappUrl = `https://wa.me/919209471309?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, "_blank");
    };

    return (
        <section className="bg-[#f8fafc] py-5 sm:py-6 lg:py-7">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-6">
                    {/* LEFT SIDE INFO */}
                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.12 }}
                        className="order-2 lg:order-1"
                    >
                        {/* Top Badge */}
                        <motion.p
                            variants={fadeUp}
                            className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 ring-1 ring-orange-100"
                        >
                            <Bus size={16} />
                            Contact SA Tours & Travels
                        </motion.p>

                        {/* Heading */}
                        <motion.h2
                            variants={fadeUp}
                            className="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[40px] lg:leading-[1.08]"
                        >
                            Get quick support for{" "}
                            <span className="text-orange-500">bookings</span>,{" "}
                            <span className="text-orange-500">routes</span> and{" "}
                            <span className="text-orange-500">travel plans</span>
                        </motion.h2>

                        {/* Description */}
                        <motion.p
                            variants={fadeUp}
                            className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base"
                        >
                            Contact SA Tours & Travels for daily bus seat booking, private bus hire,
                            wedding transportation, group travel, special tours and route-related
                            inquiries. Our team is available to assist you quickly through WhatsApp
                            and phone support.

                        </motion.p>

                        {/* Quick Info Cards */}
                        <motion.div
                            variants={stagger}
                            className="mt-6 grid gap-4 sm:grid-cols-2"
                        >
                            <motion.div
                                variants={fadeUp}
                                whileHover={{ y: -4 }}
                                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                        <PhoneCall size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Call / WhatsApp</p>
                                        <p className="text-sm text-slate-600">+91  92094 71309</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                variants={fadeUp}
                                whileHover={{ y: -4 }}
                                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                        <Clock3 size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Daily Timings</p>
                                        <p className="text-sm text-slate-600">3:00 AM / 4:00 AM & 2:00 PM / 4:00 PM</p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* RIGHT SIDE FORM */}
                    <motion.form
                        onSubmit={handleSubmit}
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.15 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="order-1 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/50 sm:p-5 lg:order-2"
                    >
                        {/* Header */}
                        <div className="mb-4">
                            <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
                                Quick Inquiry
                            </p>
                            <h3 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                                Book your travel in a few seconds
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Fill in your details and we will connect through WhatsApp for booking,
                                route support and travel assistance.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {/* Full Name */}
                            <div>
                                <label htmlFor="contact-full-name" className="mb-2 block text-sm font-medium text-slate-700">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User
                                        size={18}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                        id="contact-full-name"
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder="Enter your full name"
                                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                </div>
                                {errors.fullName && (
                                    <p className="mt-2 text-xs font-medium text-red-500">{errors.fullName}</p>
                                )}
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label htmlFor="contact-phone" className="mb-2 block text-sm font-medium text-slate-700">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <Phone
                                        size={18}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                        id="contact-phone"
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="Enter your phone number"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={10}
                                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                </div>
                                {errors.phone && (
                                    <p className="mt-2 text-xs font-medium text-red-500">{errors.phone}</p>
                                )}
                            </div>

                            {/* Service Required */}
                            <div className="sm:col-span-2">
                                <label htmlFor="contact-service" className="mb-2 block text-sm font-medium text-slate-700">
                                    Service Required
                                </label>
                                <div className="relative">
                                    <BriefcaseBusiness
                                        size={18}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <select
                                        id="contact-service"
                                        name="service"
                                        value={formData.service}
                                        onChange={handleChange}
                                        className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    >
                                        <option>Daily Bus Seat Booking</option>
                                        <option>Wedding Transportation</option>
                                        <option>Private Bus Hire</option>
                                        <option>Special Tours</option>
                                        <option>Group Travel</option>
                                        <option>Staff Transport</option>
                                    </select>
                                </div>
                            </div>

                            {/* Message */}
                            <div className="sm:col-span-2">
                                <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-slate-700">
                                    Message
                                </label>
                                <div className="relative">
                                    <MessageSquareText
                                        size={18}
                                        className="pointer-events-none absolute left-4 top-4 text-slate-400"
                                    />
                                    <textarea
                                        id="contact-message"
                                        rows="3"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        placeholder="Write your travel requirement, date, route, passenger count, timing..."
                                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                </div>
                                {errors.message && (
                                    <p className="mt-2 text-xs font-medium text-red-500">{errors.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-3">
                            <label className="flex items-start gap-3 text-sm text-slate-600">
                                <input
                                    type="checkbox"
                                    name="agreedTerms"
                                    checked={formData.agreedTerms}
                                    onChange={handleChange}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                                />
                                <span className="text-xs leading-6 sm:text-sm">
                                    I agree to the <Link href="/terms" className="font-semibold text-orange-500 hover:text-orange-600">Terms & Conditions</Link> and <Link href="/privacy" className="font-semibold text-orange-500 hover:text-orange-600">Privacy Policy</Link>. Payments, if applicable, are processed securely via Razorpay.
                                </span>
                            </label>
                            {errors.agreedTerms && (
                                <p className="mt-2 text-xs font-medium text-red-500">{errors.agreedTerms}</p>
                            )}
                        </div>

                        {/* Bottom Action Area */}
                        <div className="mt-4">
                            <p className="text-xs leading-6 text-slate-500">
                                Your inquiry will open directly in WhatsApp for faster booking support.
                            </p>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <button
                                    type="submit"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                                >
                                    <Send size={16} />
                                    Send Inquiry
                                </button>

                                <a
                                    href="https://wa.me/919209471309"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                                >
                                    <MessageCircle size={16} />
                                    WhatsApp
                                </a>
                            </div>
                        </div>
                    </motion.form>
                </div>

                {/* Full Width Office Locations */}
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.15 }}
                    className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">
                                Office Locations
                            </p>
                            <h3 className="text-xl font-bold text-slate-900">
                                Visit our support offices
                            </h3>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex items-start gap-3">
                                <MapPin size={18} className="mt-1 text-orange-500" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Borli Panchatan Office
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-slate-600">
                                        Near ST Stand, Borli Panchatan, Shrivardhan side area
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex items-start gap-3">
                                <MapPin size={18} className="mt-1 text-orange-500" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Mhasla Office
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-slate-600">
                                        Near ST Stand, Mhasla
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex items-start gap-3">
                                <MapPin size={18} className="mt-1 text-orange-500" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Mumbai Office
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-slate-600">
                                        Dongri, Mumbai
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}