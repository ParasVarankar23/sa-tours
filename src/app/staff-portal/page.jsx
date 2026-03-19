"use client";

import Link from "next/link";

export default function StaffPortalIndex() {
    return (
        <div className="p-6">
            <h1 className="mb-4 text-2xl font-bold">Staff Portal (View Only)</h1>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Link href="/staff-portal/bus" className="rounded-xl border p-4 hover:shadow">
                    <h2 className="text-lg font-semibold">Buses</h2>
                    <p className="text-sm text-slate-500">View bus list and details</p>
                </Link>

                <Link href="/staff-portal/schedule" className="rounded-xl border p-4 hover:shadow">
                    <h2 className="text-lg font-semibold">Schedules</h2>
                    <p className="text-sm text-slate-500">View schedules</p>
                </Link>

                <Link href="/staff-portal/booking" className="rounded-xl border p-4 hover:shadow">
                    <h2 className="text-lg font-semibold">Bookings</h2>
                    <p className="text-sm text-slate-500">View bookings (no edit)</p>
                </Link>

                <Link href="/staff-portal/payment" className="rounded-xl border p-4 hover:shadow">
                    <h2 className="text-lg font-semibold">Payments</h2>
                    <p className="text-sm text-slate-500">View payments</p>
                </Link>
            </div>
        </div>
    );
}
