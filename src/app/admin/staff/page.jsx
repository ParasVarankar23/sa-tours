"use client";

import {
    BriefcaseBusiness,
    Building2,
    Car,
    ChevronLeft,
    ChevronRight,
    Filter,
    Mail,
    Pencil,
    Phone,
    Plus,
    Search,
    Sparkles,
    Trash2,
    UserRound,
    Users,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { showAppToast } from "../../../lib/client/toast";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const positionOptions = ["All", "Driver", "Cleaner", "Office Staff"];
const formPositionOptions = ["Driver", "Cleaner", "Office Staff"];

const positionIcons = {
    Driver: Car,
    Cleaner: Sparkles,
    "Office Staff": Building2,
};

const COLORS = ["#f97316", "#fb923c", "#fdba74"];

const initialForm = {
    name: "",
    email: "",
    phoneNumber: "",
    position: "Driver",
};

const ITEMS_PER_PAGE = 10;

export default function AdminStaffPage() {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [positionFilter, setPositionFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState("");
    const [confirmAction, setConfirmAction] = useState(() => async () => { });

    const [formData, setFormData] = useState(initialForm);
    const [editData, setEditData] = useState({
        uid: "",
        name: "",
        email: "",
        phoneNumber: "",
        position: "Driver",
    });

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/staff");
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch staff");
            }

            setStaffList(data.staff || []);
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Failed to load staff");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const positionCounts = useMemo(() => {
        return {
            Driver: staffList.filter((s) => s.position === "Driver").length,
            Cleaner: staffList.filter((s) => s.position === "Cleaner").length,
            "Office Staff": staffList.filter((s) => s.position === "Office Staff").length,
        };
    }, [staffList]);

    const chartData = useMemo(() => {
        return [
            { name: "Driver", value: positionCounts.Driver },
            { name: "Cleaner", value: positionCounts.Cleaner },
            { name: "Office Staff", value: positionCounts["Office Staff"] },
        ];
    }, [positionCounts]);

    const filteredStaff = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();

        return staffList.filter((staff) => {
            const matchesSearch =
                `${staff.name || ""} ${staff.email || ""} ${staff.phoneNumber || ""} ${staff.position || ""}`
                    .toLowerCase()
                    .includes(term);

            const matchesPosition =
                positionFilter === "All" || staff.position === positionFilter;

            return matchesSearch && matchesPosition;
        });
    }, [staffList, searchTerm, positionFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, positionFilter]);

    const totalPages = Math.ceil(filteredStaff.length / ITEMS_PER_PAGE) || 1;

    const paginatedStaff = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredStaff.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredStaff, currentPage]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();

        if (
            !formData.name.trim() ||
            !formData.email.trim() ||
            !formData.phoneNumber.trim() ||
            !formData.position.trim()
        ) {
            return showAppToast("error", "Please fill all fields");
        }

        if (!formPositionOptions.includes(formData.position)) {
            return showAppToast("error", "Invalid position");
        }

        setSaving(true);

        try {
            const res = await fetch("/api/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create staff");
            }

            showAppToast("success", "Staff created successfully");
            setShowAddModal(false);
            setFormData(initialForm);
            fetchStaff();
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Error creating staff");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (staff) => {
        setEditData({
            uid: staff.uid,
            name: staff.name || "",
            email: staff.email || "",
            phoneNumber: staff.phoneNumber || "",
            position: staff.position || "Driver",
        });
        setShowEditModal(true);
    };

    const handleUpdateStaff = async (e) => {
        e.preventDefault();

        if (
            !editData.uid ||
            !editData.name.trim() ||
            !editData.phoneNumber.trim() ||
            !editData.position.trim()
        ) {
            return showAppToast("error", "Please fill all required fields");
        }

        setSaving(true);

        try {
            const res = await fetch("/api/staff", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: editData.uid,
                    name: editData.name,
                    phoneNumber: editData.phoneNumber,
                    position: editData.position,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update staff");
            }

            showAppToast("success", "Staff updated successfully");
            setShowEditModal(false);
            fetchStaff();
        } catch (err) {
            console.error(err);
            showAppToast("error", err.message || "Error updating staff");
        } finally {
            setSaving(false);
        }
    };

    const openConfirm = (message, action) => {
        setConfirmMessage(message);
        setConfirmAction(() => action);
        setConfirmOpen(true);
    };

    const closeConfirm = () => {
        setConfirmOpen(false);
        setConfirmMessage("");
        setConfirmAction(() => async () => { });
    };

    const handleDeleteStaff = async (uid) => {
        openConfirm("Delete this staff member?", async () => {
            try {
                setDeletingId(uid);

                const res = await fetch(`/api/staff?uid=${uid}`, {
                    method: "DELETE",
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to delete staff");
                }

                showAppToast("success", "Staff deleted successfully");
                fetchStaff();
            } catch (err) {
                console.error(err);
                showAppToast("error", err.message || "Error deleting staff");
            } finally {
                setDeletingId("");
            }
        });
    };

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    return (
        <div className="w-full min-h-screen bg-[#f8fafc] p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f97316]">
                        SA TOURS DASHBOARD
                    </p>
                    <h1 className="mt-1 text-3xl font-bold text-slate-900">
                        Staff Management
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage all staff members with search, filters, analytics and actions.
                    </p>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#ea580c]"
                >
                    <Plus className="h-5 w-5" />
                    Add Staff
                </button>
            </div>

            {/* Top Summary Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    title="Total Staff"
                    value={staffList.length}
                    icon={<Users className="h-6 w-6 text-[#f97316]" />}
                />

                <SummaryCard
                    title="Drivers"
                    value={positionCounts.Driver}
                    icon={<Car className="h-6 w-6 text-[#f97316]" />}
                />

                <SummaryCard
                    title="Cleaners"
                    value={positionCounts.Cleaner}
                    icon={<Sparkles className="h-6 w-6 text-[#f97316]" />}
                />

                <SummaryCard
                    title="Office Staff"
                    value={positionCounts["Office Staff"]}
                    icon={<Building2 className="h-6 w-6 text-[#f97316]" />}
                />
            </div>

            {/* Position Overview Cards */}
            {/* <div className="mb-6 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Position Overview
                    </h2>
                    <p className="text-sm text-slate-500">
                        Staff distribution based on position.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {Object.entries(positionCounts).map(([position, count]) => {
                        const Icon = positionIcons[position];
                        return (
                            <div
                                key={position}
                                className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                                        <Icon className="h-5 w-5 text-[#f97316]" />
                                    </div>
                                    <span className="text-2xl font-bold text-slate-900">
                                        {count}
                                    </span>
                                </div>
                                <p className="mt-3 text-sm font-semibold text-slate-700">
                                    {position}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div> */}

            {/* Table Section */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="border-b border-slate-200 px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Staff List
                            </h2>
                            <p className="text-sm text-slate-500">
                                Showing {paginatedStaff.length} of {filteredStaff.length} result(s)
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            {/* Search */}
                            <div className="relative w-full sm:w-[320px]">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search name, email, phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 py-3 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                                />
                            </div>

                            {/* Filter */}
                            <div className="relative w-full sm:w-[180px]">
                                <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={positionFilter}
                                    onChange={(e) => setPositionFilter(e.target.value)}
                                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                                >
                                    {positionOptions.map((pos) => (
                                        <option key={pos} value={pos}>
                                            {pos}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Staff
                                </th>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Email
                                </th>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Phone
                                </th>
                                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Position
                                </th>
                                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                                        Loading staff...
                                    </td>
                                </tr>
                            ) : paginatedStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                                        No staff found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedStaff.map((staff) => (
                                    <tr key={staff.uid} className="hover:bg-orange-50/30 transition">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50">
                                                    {staff.photoUrl ? (
                                                        <img
                                                            src={staff.photoUrl}
                                                            alt={staff.name || "staff"}
                                                            className="h-11 w-11 rounded-2xl object-cover"
                                                        />
                                                    ) : (
                                                        <UserRound className="h-5 w-5 text-[#f97316]" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {staff.name || "-"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-700">
                                            {staff.email || "-"}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-700">
                                            {staff.phoneNumber || "-"}
                                        </td>

                                        <td className="px-5 py-4">
                                            <span className="inline-flex items-center whitespace-nowrap rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[#f97316]">
                                                {staff.position || "-"}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(staff)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#f97316]"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    Edit
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteStaff(staff.uid)}
                                                    disabled={deletingId === staff.uid || confirmOpen}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    {deletingId === staff.uid ? "Deleting..." : "Delete"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && filteredStaff.length > 0 && (
                    <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                            Page {currentPage} of {totalPages}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap">
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

            {/* Enhanced Bar Graph Section */}
            <div className="mt-6 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                            Position-wise Staff Distribution
                        </h2>
                        <p className="text-sm text-slate-500">
                            Visual breakdown of staff members by role in your SA Tours team.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-orange-50 px-4 py-2 text-sm font-semibold text-[#f97316]">
                        Total Staff: {staffList.length}
                    </div>
                </div>

                {staffList.length === 0 ? (
                    <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50/30">
                        <div className="text-center">
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                                <Users className="h-6 w-6 text-[#f97316]" />
                            </div>
                            <p className="text-base font-semibold text-slate-700">
                                No chart data available
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Add staff members to see position-wise analytics.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        {/* Left Side - Bar Chart */}
                        <div className="xl:col-span-2 rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-orange-50/30 p-4">
                            <div className="h-[380px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData}
                                        margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                                        barCategoryGap="28%"
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                            stroke="#f1f5f9"
                                        />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: "#475569", fontSize: 13 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            tick={{ fill: "#64748b", fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip content={<CustomBarTooltip />} />
                                        <Bar
                                            dataKey="value"
                                            radius={[12, 12, 0, 0]}
                                            maxBarSize={70}
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Right Side - Position Stats */}
                        <div className="space-y-4">
                            {chartData.map((item, index) => {
                                const Icon = positionIcons[item.name] || Users;
                                const percentage =
                                    staffList.length > 0
                                        ? ((item.value / staffList.length) * 100).toFixed(1)
                                        : 0;

                                return (
                                    <div
                                        key={item.name}
                                        className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                                                    <Icon className="h-5 w-5 text-[#f97316]" />
                                                </div>

                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {percentage}% of total staff
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-slate-900">
                                                    {item.value}
                                                </p>
                                                <p className="text-xs text-slate-500">Staff</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 h-2.5 w-full rounded-full bg-orange-100">
                                            <div
                                                className="h-2.5 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${percentage}%`,
                                                    backgroundColor: COLORS[index % COLORS.length],
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <ModalWrapper onClose={() => setShowAddModal(false)} title="Add Staff Member">
                    <form onSubmit={handleAddStaff} className="space-y-5">
                        <InputField
                            label="Full Name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            icon={<UserRound className="h-5 w-5 text-[#f97316]" />}
                            placeholder="Enter full name"
                        />

                        <InputField
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            icon={<Mail className="h-5 w-5 text-[#f97316]" />}
                            placeholder="Enter email address"
                        />

                        <InputField
                            label="Phone Number"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            icon={<Phone className="h-5 w-5 text-[#f97316]" />}
                            placeholder="Enter phone number"
                        />

                        <SelectField
                            label="Position"
                            name="position"
                            value={formData.position}
                            onChange={handleInputChange}
                            icon={<BriefcaseBusiness className="h-5 w-5 text-[#f97316]" />}
                            options={formPositionOptions}
                        />

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ea580c] disabled:opacity-60"
                            >
                                {saving ? "Saving..." : "Create Staff"}
                            </button>
                        </div>
                    </form>
                </ModalWrapper>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <ModalWrapper onClose={() => setShowEditModal(false)} title="Edit Staff Member">
                    <form onSubmit={handleUpdateStaff} className="space-y-5">
                        <InputField
                            label="Full Name"
                            name="name"
                            value={editData.name}
                            onChange={handleEditInputChange}
                            icon={<UserRound className="h-5 w-5 text-[#f97316]" />}
                            placeholder="Enter full name"
                        />

                        <InputField
                            label="Email (readonly)"
                            name="email"
                            type="email"
                            value={editData.email}
                            readOnly
                            icon={<Mail className="h-5 w-5 text-[#f97316]" />}
                            placeholder="Email"
                        />

                        <InputField
                            label="Phone Number"
                            name="phoneNumber"
                            value={editData.phoneNumber}
                            onChange={handleEditInputChange}
                            icon={<Phone className="h-5 w-5 text-[#f97316]" />}
                            placeholder="Enter phone number"
                        />

                        <SelectField
                            label="Position"
                            name="position"
                            value={editData.position}
                            onChange={handleEditInputChange}
                            icon={<BriefcaseBusiness className="h-5 w-5 text-[#f97316]" />}
                            options={formPositionOptions}
                        />

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ea580c] disabled:opacity-60"
                            >
                                {saving ? "Updating..." : "Update Staff"}
                            </button>
                        </div>
                    </form>
                </ModalWrapper>
            )}

            {confirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900">Please confirm</h3>
                            <p className="mt-3 text-sm text-slate-700">{confirmMessage}</p>

                            <div className="mt-6 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => closeConfirm()}
                                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={async () => {
                                        try {
                                            await confirmAction();
                                        } catch (err) {
                                            console.error(err);
                                        } finally {
                                            closeConfirm();
                                        }
                                    }}
                                    className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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

function ModalWrapper({ children, onClose, title }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                        <p className="text-sm text-slate-500">
                            Fill the details carefully.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">{children}</div>
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
    readOnly = false,
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </label>
            <div
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${readOnly
                    ? "border-slate-200 bg-slate-50"
                    : "border-slate-200 bg-white focus-within:border-orange-400"
                    }`}
            >
                {icon}
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    readOnly={readOnly}
                    placeholder={placeholder}
                    className={`w-full outline-none ${readOnly ? "bg-transparent text-slate-500" : "text-slate-900"
                        }`}
                />
            </div>
        </div>
    );
}

function SelectField({ label, name, value, onChange, icon, options }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-orange-400">
                {icon}
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="w-full bg-transparent outline-none text-slate-900"
                >
                    {options.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function CustomBarTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-lg">
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="mt-1 text-sm font-medium text-[#f97316]">
                    Staff Count: {payload[0].value}
                </p>
            </div>
        );
    }

    return null;
}