"use client";

import clsx from "clsx";

function toStr(s) {
    return String(s || "");
}

function getSeatRows(total) {
    const seatMaps = {
        23: [
            { left: null, right: [1, 2] },
            { left: 3, right: [4, 5] },
            { left: 6, right: [7, 8] },
            { left: 9, right: [10, 11] },
            { left: 12, right: [13, 14] },
            { left: 15, right: [16, 17] },
            { left: 18, right: [] },
            { left: null, right: [19, 20, 21, 22, 23], isBack: true },
        ],
        27: [
            { left: null, right: [1, 2] },
            { left: 3, right: [4, 5] },
            { left: 6, right: [7, 8] },
            { left: 9, right: [10, 11] },
            { left: 12, right: [13, 14] },
            { left: 15, right: [16, 17] },
            { left: 18, right: [19, 20] },
            { left: 21, right: [22] },
            { left: null, right: [23, 24, 25, 26, 27], isBack: true },
        ],
        31: [
            { left: null, right: [1, 2] },
            { left: 3, right: [4, 5] },
            { left: 6, right: [7, 8] },
            { left: 9, right: [10, 11] },
            { left: 12, right: [13, 14] },
            { left: 15, right: [16, 17] },
            { left: 18, right: [19, 20] },
            { left: 21, right: [22, 23] },
            { left: 24, right: [25, 26] },
            { left: null, right: [27, 28, 29, 30, 31], isBack: true },
        ],
    };

    if (seatMaps[total]) return seatMaps[total];

    const rows = [];
    let seat = 1;

    if (seat <= total) {
        const first = [];
        if (seat <= total) first.push(seat++);
        if (seat <= total) first.push(seat++);
        rows.push({ left: null, right: first });
    }

    while (seat <= total) {
        const remaining = total - seat + 1;

        if (remaining <= 5) {
            const back = [];
            while (seat <= total) back.push(seat++);
            rows.push({ left: null, right: back, isBack: true });
            break;
        }

        const left = seat++;
        const right = [];
        if (seat <= total) right.push(seat++);
        if (seat <= total) right.push(seat++);

        rows.push({ left, right });
    }

    return rows;
}

export default function SeatLayout({
    layout = "31",
    bookedSeats = [],
    bookedMap = {},
    selectedSeats = [],
    onSelect,
    onViewBooking,
    compact = false,
    cabins = [],
}) {
    const totalSeats = Number(String(layout || "31")) || 31;
    const rows = getSeatRows(totalSeats);

    const cabinSeatIds = Array.isArray(cabins)
        ? cabins.map((c, i) => String(c?.seatNo || `CB${i + 1}`))
        : [];

    const bookedSet = new Set((bookedSeats || []).map((s) => toStr(s)));
    const selectedSet = new Set((selectedSeats || []).map((s) => toStr(s)));

    const renderSeat = (seatValue, isCabin = false) => {
        if (!seatValue) return null;

        const id = toStr(seatValue);
        const booking = bookedMap && bookedMap[id] ? bookedMap[id] : null;
        const isBlocked = booking && booking.status === "blocked";
        const isBooked = bookedSet.has(id);
        const isSelected = selectedSet.has(id);

        const base =
            "flex items-center justify-center rounded-lg border font-medium transition-all duration-200 select-none shrink-0";

        const sizeCls = compact
            ? "h-7 min-w-[32px] px-1.5 text-[11px] sm:h-8 sm:min-w-[34px] sm:px-2 sm:text-xs"
            : "h-8 min-w-[34px] px-2 text-xs sm:h-9 sm:min-w-[38px] sm:px-2 sm:text-xs md:h-10 md:min-w-[42px] md:px-2.5 md:text-sm";

        const cls = clsx(base, sizeCls, {
            "bg-red-200 border-red-300 text-red-800 cursor-pointer": isBooked && !isBlocked,
            "bg-amber-100 border-amber-300 text-amber-800 cursor-pointer": isBlocked,
            "bg-[#f97316] border-[#f97316] text-white shadow-sm": isSelected && !isBooked && !isBlocked,
            "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer":
                isCabin && !isBooked && !isBlocked && !isSelected,
            "bg-white border-slate-300 text-slate-800 hover:bg-orange-50 hover:border-orange-300 cursor-pointer":
                !isBooked && !isBlocked && !isSelected && !isCabin,
        });

        return (
            <button
                key={id}
                type="button"
                onClick={() => {
                    if (isBooked || isBlocked) {
                        if (onViewBooking) return onViewBooking(id, booking);
                        return;
                    }
                    if (onSelect) onSelect(id);
                }}
                className={cls}
            >
                {id}
            </button>
        );
    };

    return (
        <div className="w-full">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700 sm:text-base">
                    Seats ({totalSeats})
                </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4 md:p-6">
                <div className="overflow-x-auto">
                    <div className="min-w-[260px] sm:min-w-[320px] md:min-w-0">
                        <div className="space-y-1.5 sm:space-y-2 md:space-y-2.5">
                            {rows.map((row, index) => {
                                const rightSeats = row.right || [];
                                const isBack = !!row.isBack;

                                return (
                                    <div
                                        key={index}
                                        className={`flex items-center gap-2 sm:gap-3 md:gap-4 ${isBack ? "justify-center" : "justify-between"
                                            }`}
                                    >
                                        {!isBack ? (
                                            <div className="w-10 sm:w-12 md:w-14 flex justify-center shrink-0">
                                                {row.left ? (
                                                    renderSeat(row.left)
                                                ) : (
                                                    <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shrink-0" />
                                                )}
                                            </div>
                                        ) : null}

                                        {!isBack && <div className="flex-1 min-w-[12px] sm:min-w-[24px] md:min-w-[36px]" />}

                                        <div
                                            className={`flex flex-wrap gap-1.5 sm:gap-2 md:gap-2.5 ${isBack ? "justify-center" : "justify-end"
                                                }`}
                                        >
                                            {rightSeats.map((seat) => renderSeat(seat))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {cabinSeatIds.length > 0 && (
                    <div className="mt-5 border-t border-slate-200 pt-4 sm:mt-6">
                        <div className="mb-2 text-xs font-semibold text-slate-700 sm:text-sm">
                            Cabin
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                            {cabinSeatIds.map((seatId) => (
                                <div key={seatId} className="flex flex-col items-center gap-1">
                                    <div className="text-[10px] font-semibold text-slate-500">CB</div>
                                    {renderSeat(seatId, true)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-2 text-[10px] sm:mt-6 sm:text-[11px] md:grid-cols-3 lg:grid-cols-5">
                    <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded border border-slate-300 bg-white" />
                        Available
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded bg-[#f97316]" />
                        Selected
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded border border-red-300 bg-red-200" />
                        Booked
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded border border-slate-300 bg-slate-100" />
                        Cabin
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded border border-amber-300 bg-amber-100" />
                        Blocked
                    </div>
                </div>
            </div>
        </div>
    );
}