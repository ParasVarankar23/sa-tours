"use client";

import { showAppToast } from "@/lib/client/toast";
import {
    Armchair,
    BusFront,
    ChevronLeft,
    ChevronRight,
    FileText,
    Filter,
    MapPin,
    Pencil,
    Phone,
    Plus,
    Search,
    Ticket,
    Trash2,
    UserRound,
    X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const ITEMS_PER_PAGE = 10;

const initialForm = {
    bookingId: "",
    busId: "",
    busNumber: "",
    busName: "",
    routeName: "",
    travelDate: "",
    startTime: "",
    endTime: "",
    passengerName: "",
    phoneNumber: "",
    pickupPoint: "",
    dropPoint: "",
    seatNumber: "",
    notes: "",
};

export default function AdminBookingPage() {
    const [bookingList, setBookingList] = useState([]);
    const [busList, setBusList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [cancelledFirst, setCancelledFirst] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const [formData, setFormData] = useState(initialForm);
    const [editData, setEditData] = useState(initialForm);

    const fetchData = async () => {
        try {
            setLoading(true);

            const [bookingRes, busRes] = await Promise.all([
                fetch("/api/booking"),
                fetch("/api/bus"),
            ]);

            const bookingData = await bookingRes.json();
            const busData = await busRes.json();

            if (!bookingRes.ok) {
                throw new Error(bookingData.error || "Failed to fetch bookings");
            }

            if (!busRes.ok) {
                throw new Error(busData.error || "Failed to fetch buses");
            }

            setBookingList(bookingData.bookings || []);
            setBusList(busData.buses || []);
        } catch (error) {
            console.error(error);
            showAppToast("error", error.message || "Failed to load booking data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredBookings = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();

        const list = bookingList.filter((booking) => {
            const matchesSearch =
                `${booking.passengerName || ""} ${booking.phoneNumber || ""} ${booking.busNumber || ""} ${booking.busName || ""} ${booking.routeName || ""} ${booking.seatNumber || ""}`
                    .toLowerCase()
                    .includes(term);

            const matchesStatus = statusFilter === "All" || booking.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        if (cancelledFirst) {
            list.sort((a, b) => {
                if (a.status === "Cancelled" && b.status !== "Cancelled") return -1;
                if (b.status === "Cancelled" && a.status !== "Cancelled") return 1;
                return 0;
            });
        }

        return list;
    }, [bookingList, searchTerm, statusFilter, cancelledFirst]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE) || 1;

    const paginatedBookings = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredBookings, currentPage]);

    const stats = useMemo(() => {
        return {
            total: bookingList.length,
            confirmed: bookingList.filter((b) => b.status === "Confirmed").length,
        };
    }, [bookingList]);

    const handleBusSelect = (busId, isEdit = false) => {
        const selectedBus = busList.find((b) => b.busId === busId);
        if (!selectedBus) return;

        const payload = {
            busId: selectedBus.busId || "",
            busNumber: selectedBus.busNumber || "",
            busName: selectedBus.busName || "",
            routeName: selectedBus.routeName || "",
            travelDate: selectedBus.travelDate || "",
            startTime: selectedBus.startTime || "",
            endTime: selectedBus.endTime || "",
        };

        if (isEdit) {
            setEditData((prev) => ({
                ...prev,
                ...payload,
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                ...payload,
            }));
        }
    };

    const handleInputChange = (e, isEdit = false) => {
        const { name, value } = e.target;

        if (name === "busId") {
            handleBusSelect(value, isEdit);
            return;
        }

        if (isEdit) {
            setEditData((prev) => ({
                ...prev,
                [name]: value,
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const validateBooking = (data) => {
        if (
            !data.busId ||
            !data.passengerName.trim() ||
            !data.phoneNumber.trim() ||
            !data.pickupPoint.trim() ||
            !data.dropPoint.trim() ||
            !data.seatNumber.trim()
        ) {
            return "Please fill all required booking fields";
        }
        return null;
    };

    const handleAddBooking = async (e) => {
        e.preventDefault();

        const error = validateBooking(formData);
        if (error) return showAppToast("error", error);

        setSaving(true);

        try {
            const res = await fetch("/api/booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create booking");
            }

            showAppToast("success", "Booking created successfully");
            setShowAddModal(false);
            setFormData(initialForm);
            fetchData();
        } catch (error) {
            console.error(error);
            showAppToast("error", error.message || "Failed to create booking");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (booking) => {
        setEditData({
            bookingId: booking.bookingId || "",
            busId: booking.busId || "",
            busNumber: booking.busNumber || "",
            busName: booking.busName || "",
            routeName: booking.routeName || "",
            travelDate: booking.travelDate || "",
            startTime: booking.startTime || "",
            endTime: booking.endTime || "",
            passengerName: booking.passengerName || "",
            phoneNumber: booking.phoneNumber || "",
            pickupPoint: booking.pickupPoint || "",
            dropPoint: booking.dropPoint || "",
            seatNumber: booking.seatNumber || "",
            notes: booking.notes || "",
        });

        setShowEditModal(true);
    };

    const handleUpdateBooking = async (e) => {
        e.preventDefault();

        const error = validateBooking(editData);
        if (error) return showAppToast("error", error);

        setSaving(true);

        try {
            const res = await fetch("/api/booking", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update booking");
            }

            showAppToast("success", "Booking updated successfully");
            setShowEditModal(false);
            fetchData();
        } catch (error) {
            console.error(error);
            showAppToast("error", error.message || "Failed to update booking");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBooking = async (bookingId) => {
        const confirmDelete = window.confirm("Delete this booking?");
        if (!confirmDelete) return;

        try {
            setDeletingId(bookingId);

            const res = await fetch(`/api/booking?bookingId=${bookingId}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to delete booking");
            }

            showAppToast("success", "Booking deleted successfully");
            fetchData();
        } catch (error) {
            console.error(error);
            showAppToast("error", error.message || "Failed to delete booking");
        } finally {
            setDeletingId("");
        }
    };

    const handleCancelBooking = async (bookingId) => {
        const confirmCancel = window.confirm("Cancel this booking and process refund?\nThis will attempt to refund via Razorpay according to cancellation rules.");
        if (!confirmCancel) return;

        try {
            setSaving(true);
            const res = await fetch("/api/booking/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to cancel booking");

            showAppToast("success", "Booking cancelled and refund processed (if payment existed)");
            fetchData();
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to cancel booking");
        } finally {
            setSaving(false);
        }
    };

    const handleRestoreBooking = async (booking) => {
        const confirmRestore = window.confirm("Restore this cancelled booking?");
        if (!confirmRestore) return;

        try {
            setSaving(true);
            const res = await fetch("/api/booking/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: booking.bookingId }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to restore booking");

            showAppToast("success", "Booking restored successfully");
            fetchData();
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to restore booking");
        } finally {
            setSaving(false);
        }
    };

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    return (
        <div className="min-h-screen w-full bg-[#f8fafc] p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
                        SA TOURS DASHBOARD
                    </p>
                    <h1 className="mt-1 text-3xl font-bold text-slate-900">
                        Booking Management
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Create bookings by selecting a bus and passenger details.
                    </p>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#ea580c]"
                >
                    <Plus className="h-5 w-5" />
                    Add Booking
                </button>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
                <SummaryCard
                    title="Total Bookings"
                    value={stats.total}
                    icon={<Ticket className="h-6 w-6 text-[#f97316]" />}
                />
                <SummaryCard
                    title="Confirmed"
                    value={stats.confirmed}
                    icon={<Ticket className="h-6 w-6 text-[#f97316]" />}
                />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Booking List
                            </h2>
                            <p className="text-sm text-slate-500">
                                Showing {paginatedBookings.length} of {filteredBookings.length} result(s)
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-[320px]">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search passenger, bus, seat..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                                />
                            </div>

                            <div className="relative w-full sm:w-[180px]">
                                <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <div className="flex items-center gap-3">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                                    >
                                        <option value="All">All Status</option>
                                        <option value="Confirmed">Confirmed</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>

                                    <label className="ml-2 flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={cancelledFirst}
                                            onChange={(e) => setCancelledFirst(e.target.checked)}
                                            className="h-4 w-4"
                                        />
                                        <span>Show cancelled first</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Passenger
                                </th>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Bus
                                </th>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Route
                                </th>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Seat
                                </th>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Status
                                </th>
                                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                                        Loading bookings...
                                    </td>
                                </tr>
                            ) : paginatedBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                                        No bookings found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedBookings.map((booking) => (
                                    <tr key={booking.bookingId} className="transition hover:bg-orange-50/30">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50">
                                                    <UserRound className="h-5 w-5 text-[#f97316]" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {booking.passengerName}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {booking.phoneNumber}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="text-sm font-medium text-slate-800">
                                                {booking.busNumber}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {booking.busName}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="text-sm font-medium text-slate-800">
                                                {booking.routeName}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {booking.pickupPoint} → {booking.dropPoint}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[#f97316]">
                                                Seat {booking.seatNumber}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4">
                                            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                {booking.status}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(booking)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#f97316]"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    Edit
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteBooking(booking.bookingId)}
                                                    disabled={deletingId === booking.bookingId}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    {deletingId === booking.bookingId ? "Deleting..." : "Delete"}
                                                </button>

                                                {booking.status === "Cancelled" ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleRestoreBooking(booking)}
                                                            disabled={saving}
                                                            className="inline-flex items-center gap-2 rounded-xl border border-green-200 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50 disabled:opacity-60"
                                                        >
                                                            Restore
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(booking)}
                                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 ml-2 transition hover:bg-slate-50"
                                                        >
                                                            View
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleCancelBooking(booking.bookingId)}
                                                            disabled={saving}
                                                            className="inline-flex items-center gap-2 rounded-xl border border-yellow-200 px-3 py-2 text-sm font-medium text-yellow-600 transition hover:bg-yellow-50 disabled:opacity-60"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(booking)}
                                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 ml-2 transition hover:bg-slate-50"
                                                        >
                                                            View
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filteredBookings.length > 0 && (
                    <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                            Page {currentPage} of {totalPages}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Prev
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => goToPage(page)}
                                    className={`h-10 w-10 rounded-xl text-sm font-semibold transition ${currentPage === page
                                        ? "bg-[#f97316] text-white"
                                        : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showAddModal && (
                <BookingFormModal
                    title="Add Booking"
                    data={formData}
                    busList={busList}
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAddBooking}
                    saving={saving}
                    handleInputChange={handleInputChange}
                />
            )}

            {showEditModal && (
                <BookingFormModal
                    title="Edit Booking"
                    data={editData}
                    busList={busList}
                    onClose={() => setShowEditModal(false)}
                    onSubmit={handleUpdateBooking}
                    saving={saving}
                    handleInputChange={(e) => handleInputChange(e, true)}
                    disableBusSelect
                />
            )}
        </div>
    );
}

/* =========================
   Booking Modal
========================= */
function BookingFormModal({
    title,
    data,
    busList,
    onClose,
    onSubmit,
    saving,
    handleInputChange,
    disableBusSelect = false,
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4">
            <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-white px-6 py-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                        <p className="text-sm text-slate-500">
                            Select a bus and add passenger details.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6">
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        {/* Left */}
                        <div className="space-y-6">
                            <div className="rounded-3xl border border-slate-200 p-5">
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-slate-900">
                                        Select Bus
                                    </h4>
                                    <p className="text-sm text-slate-500">
                                        Choose the bus to auto-fill route and timing details.
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Bus
                                    </label>
                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                        <BusFront className="h-5 w-5 text-[#f97316]" />
                                        <select
                                            name="busId"
                                            value={data.busId}
                                            onChange={handleInputChange}
                                            disabled={disableBusSelect}
                                            className="w-full bg-transparent outline-none disabled:opacity-70"
                                        >
                                            <option value="">Select Bus</option>
                                            {busList.map((bus) => (
                                                <option key={bus.busId} value={bus.busId}>
                                                    {bus.busNumber} | {bus.busName} | {bus.routeName} | {bus.startTime} → {bus.endTime}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Auto-filled Bus Info */}
                                {data.busId && (
                                    <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                                        <h5 className="mb-3 text-sm font-semibold text-slate-900">
                                            Selected Bus Details
                                        </h5>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <InfoItem label="Bus Number" value={data.busNumber} />
                                            <InfoItem label="Bus Name" value={data.busName} />
                                            <InfoItem label="Route" value={data.routeName} />
                                            <InfoItem label="Date" value={data.travelDate} />
                                            <InfoItem label="Start Time" value={data.startTime} />
                                            <InfoItem label="End Time" value={data.endTime} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-3xl border border-slate-200 p-5">
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-slate-900">
                                        Passenger Details
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <InputField
                                        label="Passenger Name"
                                        name="passengerName"
                                        value={data.passengerName}
                                        onChange={handleInputChange}
                                        icon={<UserRound className="h-5 w-5 text-[#f97316]" />}
                                        placeholder="Enter passenger name"
                                    />

                                    <InputField
                                        label="Phone Number"
                                        name="phoneNumber"
                                        value={data.phoneNumber}
                                        onChange={handleInputChange}
                                        icon={<Phone className="h-5 w-5 text-[#f97316]" />}
                                        placeholder="Enter phone number"
                                    />

                                    <InputField
                                        label="Pickup Point"
                                        name="pickupPoint"
                                        value={data.pickupPoint}
                                        onChange={handleInputChange}
                                        icon={<MapPin className="h-5 w-5 text-[#f97316]" />}
                                        placeholder="Pickup point"
                                    />

                                    <InputField
                                        label="Drop Point"
                                        name="dropPoint"
                                        value={data.dropPoint}
                                        onChange={handleInputChange}
                                        icon={<MapPin className="h-5 w-5 text-[#f97316]" />}
                                        placeholder="Drop point"
                                    />

                                    <InputField
                                        label="Seat Number"
                                        name="seatNumber"
                                        value={data.seatNumber}
                                        onChange={handleInputChange}
                                        icon={<Armchair className="h-5 w-5 text-[#f97316]" />}
                                        placeholder="e.g. 12"
                                    />

                                    <TextAreaField
                                        label="Notes (Optional)"
                                        name="notes"
                                        value={data.notes}
                                        onChange={handleInputChange}
                                        icon={<FileText className="h-5 w-5 text-[#f97316]" />}
                                        placeholder="Additional notes"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right */}
                        <div className="space-y-6">
                            <div className="rounded-3xl border border-orange-100 bg-orange-50/30 p-5">
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-slate-900">
                                        Booking Preview
                                    </h4>
                                    <p className="text-sm text-slate-500">
                                        Quick summary before confirming booking.
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                                            <Ticket className="h-6 w-6 text-[#f97316]" />
                                        </div>

                                        <div>
                                            <p className="text-sm text-slate-500">Booking For</p>
                                            <p className="text-lg font-bold text-slate-900">
                                                {data.passengerName || "Passenger Name"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-3">
                                        <PreviewRow label="Bus Number" value={data.busNumber || "--"} />
                                        <PreviewRow label="Bus Name" value={data.busName || "--"} />
                                        <PreviewRow label="Route" value={data.routeName || "--"} />
                                        <PreviewRow
                                            label="Time"
                                            value={
                                                data.startTime && data.endTime
                                                    ? `${data.startTime} → ${data.endTime}`
                                                    : "--"
                                            }
                                        />
                                        <PreviewRow label="Travel Date" value={data.travelDate || "--"} />
                                        <PreviewRow label="Pickup" value={data.pickupPoint || "--"} />
                                        <PreviewRow label="Drop" value={data.dropPoint || "--"} />
                                        <PreviewRow label="Seat" value={data.seatNumber || "--"} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ea580c] disabled:opacity-60"
                        >
                            {saving ? "Saving..." : "Save Booking"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* =========================
   Small Components
========================= */
function SummaryCard({ title, value, icon }) {
    return (
        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-slate-500">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                </div>
            </div>
        </div>
    );
}

function InputField({
    label,
    name,
    value,
    onChange,
    icon,
    placeholder,
    type = "text",
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                {icon}
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full text-slate-900 outline-none"
                />
            </div>
        </div>
    );
}

function TextAreaField({
    label,
    name,
    value,
    onChange,
    icon,
    placeholder,
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </label>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="mb-2 flex items-center gap-3">
                    {icon}
                    <span className="text-sm text-slate-500">Notes</span>
                </div>
                <textarea
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    rows={4}
                    className="w-full resize-none text-slate-900 outline-none"
                />
            </div>
        </div>
    );
}

function InfoItem({ label, value }) {
    return (
        <div className="rounded-2xl border border-white bg-white px-3 py-3 shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{value || "--"}</p>
        </div>
    );
}

function PreviewRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 text-sm last:border-b-0">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-900 text-right">{value}</span>
        </div>
    );
}