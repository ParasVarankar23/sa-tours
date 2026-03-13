"use client";

export default function ContactForm() {
    return (
        <form className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Full Name</label>
                    <input
                        type="text"
                        placeholder="Enter your full name"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Phone Number</label>
                    <input
                        type="text"
                        placeholder="Enter your phone number"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                    />
                </div>

                <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Service Required</label>
                    <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400">
                        <option>Daily Bus Seat Booking</option>
                        <option>Wedding Transportation</option>
                        <option>Private Bus Hire</option>
                        <option>Pilgrimage Tour</option>
                        <option>Group Travel</option>
                    </select>
                </div>

                <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Message</label>
                    <textarea
                        rows="5"
                        placeholder="Write your travel requirement..."
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                    />
                </div>
            </div>

            <button
                type="submit"
                className="mt-6 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
                Send Inquiry
            </button>
        </form>
    );
}