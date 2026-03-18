"use client";

/**
 * Reusable SeatLayout
 * Props:
 * - layout: "23" | "27" | "31" (string or number)
 * - bookedSeats: array of seat numbers (strings or numbers)
 * - selectedSeat: currently selected seat (string or number)
 * - onSelect(seatNumber)
 * - compact: boolean (smaller buttons)
 */
import clsx from "clsx";

function toStr(s) {
    return String(s || "");
}

function makeLayout(layout, cabinsCount = 6) {
    // deterministic seat generator with explicit back-row starts for common layouts
    // returns rows: array of { left: number|null, right: number[] } and cabins numbers
    const total = Number(String(layout)) || 31;

    // explicit back row start number for known layouts
    const explicitBackStart = {
        23: 19, // back row should be 19..23
        27: 23, // back row should be 23..27
        31: 27, // back row should be 27..31
    };

    const backStart = explicitBackStart[total] || Math.max(1, total - (total % 3 === 0 ? 3 : total % 3));

    const rows = [];
    let seat = 1;

    // generate main rows up to backStart-1 using right-first ordering
    while (seat < backStart) {
        const remaining = backStart - seat;
        if (remaining >= 3) {
            const right1 = seat++;
            const right2 = seat++;
            const left = seat++;
            rows.push({ left, right: [right1, right2] });
        } else if (remaining === 2) {
            const right1 = seat++;
            const right2 = seat++;
            rows.push({ left: null, right: [right1, right2] });
        } else if (remaining === 1) {
            const right1 = seat++;
            rows.push({ left: null, right: [right1] });
        }
    }

    // back row explicitly from backStart to total
    const backRight = [];
    for (let s = backStart; s <= total; s++) backRight.push(s);
    rows.push({ left: null, right: backRight });
    // Adjust penultimate row: if the row before back row has a left seat and
    // the penultimate's following row (usually the row just before back) has room
    // to hold one more right seat, move that left into the next row so numbers
    // visually align (e.g., make 24 sit with 25,26).
    if (rows.length >= 2) {
        const pen = rows.length - 2; // index of penultimate row
        const next = pen + 1; // last row (back row)
        if (rows[pen].left !== null && Array.isArray(rows[next].right) && rows[next].right.length < 3) {
            // move left seat into the front of the next row's right array
            rows[next].right = [rows[pen].left, ...rows[next].right];
            rows[pen].left = null;
        }
    }

    const cabins = Array.from({ length: cabinsCount }, (_, i) => total + 1 + i);
    return { rows, cabins };
}

export default function SeatLayout({ layout = "31", bookedSeats = [], bookedMap = {}, selectedSeats = [], onSelect, onViewBooking, compact = false, cabins = [] }) {
    const L = String(layout || "31");
    const cabinsCount = Array.isArray(cabins) ? cabins.length : 6;
    const { rows, cabins: cabinNumbers } = makeLayout(L, cabinsCount);

    const bookedSet = new Set((bookedSeats || []).map((s) => toStr(s)));
    const selectedSet = new Set((selectedSeats || []).map((s) => toStr(s)));

    const renderSeat = (s) => {
        if (!s) return <div className="w-0" />;
        const id = toStr(s);
        const isBooked = bookedSet.has(id);
        const booking = bookedMap && bookedMap[id] ? bookedMap[id] : null;
        const isSelected = selectedSet.has(id);
        const isBlocked = booking && booking.status === "blocked";

        const base = "flex items-center justify-center rounded-md border select-none";
        const sizeCls = compact ? "h-8 px-2 text-sm" : "h-10 px-3 text-sm";

        const cls = clsx(base, sizeCls, {
            // booked seats (already purchased)
            "bg-red-200 border-red-300 text-red-800 cursor-not-allowed": isBooked && !isBlocked,
            // blocked seats (reserved by admin)
            "bg-amber-100 border-amber-300 text-amber-800 cursor-not-allowed": isBlocked,
            // selected by current user
            "bg-[#f97316] text-white": isSelected && !isBooked && !isBlocked,
            // available
            "bg-white border-slate-200 text-slate-800 hover:bg-orange-50 cursor-pointer": !isBooked && !isSelected && !isBlocked,
        });

        return (
            <button
                key={id}
                onClick={() => {
                    if (isBooked) {
                        if (onViewBooking) return onViewBooking(id, booking);
                        return;
                    }
                    return onSelect && onSelect(id);
                }}
                className={cls}
            >
                {id}
            </button>
        );
    };

    function renderPlaceholder(key) {
        // visually matches seat button size to create spacing
        return (
            <div key={key} className="h-10 w-12 rounded-md" />
        );
    }

    return (
        <div className="w-full">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-slate-500">Seats ({L})</div>
            </div>

            <div className="space-y-2">
                {rows.map((row, i) => {
                    const isBack = row.left === null;
                    const rightSeats = row.right || [];
                    // for back rows with fewer items, add placeholders to create a left gap
                    const placeholderCount = isBack ? Math.max(0, 3 - rightSeats.length) : 0;
                    return (
                        <div key={i} className="flex items-start gap-4">
                            <div className="w-16 flex justify-center">{i === 0 ? <div className="h-8" /> : null}{renderSeat(row.left)}</div>
                            <div className="flex-1" />
                            <div className="flex gap-3">{placeholderCount > 0 ? Array.from({ length: placeholderCount }).map((_, idx) => renderPlaceholder(`${i}-ph-${idx}`)) : null}{rightSeats.map((s) => renderSeat(s))}</div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 grid grid-cols-6 gap-2">
                {cabinNumbers.map((c) => (
                    <div key={c} className="flex flex-col items-center">
                        <div className="text-xs text-slate-500">CB</div>
                        {renderSeat(c)}
                    </div>
                ))}
            </div>

            <div className="mt-4 grid grid-cols-6 gap-4 text-xs">
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-white border border-slate-200" /> Available</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-[#f97316]" /> Selected</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-red-200 border border-red-300" /> Booked</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-slate-100 border border-slate-200" /> Cabin</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-amber-100 border border-amber-300" /> Blocked</div>
            </div>
        </div>
    );
}
