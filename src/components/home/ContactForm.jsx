"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    User,
    Phone,
    BriefcaseBusiness,
    MessageSquareText,
    Send,
    MessageCircle,
} from "lucide-react";

export default function ContactForm() {
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        service: "Daily Bus Seat Booking",
        message: "",
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = "Please enter your full name";
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "Please enter your phone number";
        } else if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
            newErrors.phone = "Enter a valid 10-digit phone number";
        }

        if (!formData.message.trim()) {
            newErrors.message = "Please enter your travel requirement";
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

        const whatsappUrl = `https://wa.me/918830210690?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, "_blank");
    };

    return (
        <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50 sm:p-7"
        >
            {/* Header */}
            <div className="mb-5">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
                    Quick Inquiry
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Book your travel in a few seconds
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                    Fill in your details and we will connect through WhatsApp for booking,
                    route support and travel assistance.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        Full Name
                    </label>
                    <div className="relative">
                        <User
                            size={18}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                    </div>
                    {errors.fullName && (
                        <p className="mt-2 text-xs font-medium text-red-500">{errors.fullName}</p>
                    )}
                </div>

                {/* Phone Number */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        Phone Number
                    </label>
                    <div className="relative">
                        <Phone
                            size={18}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Enter your phone number"
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                    </div>
                    {errors.phone && (
                        <p className="mt-2 text-xs font-medium text-red-500">{errors.phone}</p>
                    )}
                </div>

                {/* Service Required */}
                <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        Service Required
                    </label>
                    <div className="relative">
                        <BriefcaseBusiness
                            size={18}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <select
                            name="service"
                            value={formData.service}
                            onChange={handleChange}
                            className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
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
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        Message
                    </label>
                    <div className="relative">
                        <MessageSquareText
                            size={18}
                            className="pointer-events-none absolute left-4 top-4 text-slate-400"
                        />
                        <textarea
                            rows="5"
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder="Write your travel requirement, date, route, passenger count, timing..."
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                    </div>
                    {errors.message && (
                        <p className="mt-2 text-xs font-medium text-red-500">{errors.message}</p>
                    )}
                </div>
            </div>

            {/* Bottom Action Area */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-6 text-slate-500">
                    Your inquiry will open directly in WhatsApp for faster booking support.
                </p>

                <div className="flex flex-wrap gap-3">
                    <a
                        href="https://wa.me/918830210690"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-500"
                    >
                        <MessageCircle size={16} />
                        WhatsApp
                    </a>

                    <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                    >
                        <Send size={16} />
                        Send Inquiry
                    </button>
                </div>
            </div>
        </motion.form>
    );
}