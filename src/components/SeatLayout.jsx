"use client";

/**
 * Reusable SeatLayout
 * Props:
 * - layout: "23" | "27" | "32" (string or number)
 * - bookedSeats: array of seat numbers (strings or numbers)
 * - selectedSeat: currently selected seat (string or number)
 * - onSelect(seatNumber)
 * - compact: boolean (smaller buttons)
 */
import clsx from "clsx";

function toStr(s) {
    return String(s || "");
}

function makeLayout(layout) {
    // Return rows array of objects { left: seat|null, right: [seat,seat]|[] }
    // plus cabins array for bottom cabins
    const L = String(layout);
    if (L === "23") {
        // 23-seat: 8 rows of 2+1 + back row of 3
        // we'll generate an intuitive layout: rows 1..7 normal, back row 8 has 3 seats, cabins 6
        const rows = [];
        let seat = 1;
        for (let r = 0; r < 7; r++) {
            // left 1, right 2
            rows.push({ left: seat++, right: [seat++, seat++] });
        }
        // back row (3 seats)
        const back = { left: null, right: [seat++, seat++, seat++] };
        const cabins = Array.from({ length: 6 }, (_, i) => seat + i);
        return { rows: [...rows, back], cabins };
    }

    if (L === "27") {
        // 27-seat: 9 rows of left1 + right2, then cabins 6
        const rows = [];
        let seat = 1;
        for (let r = 0; r < 9; r++) {
            rows.push({ left: seat++, right: [seat++, seat++] });
        }
        const cabins = Array.from({ length: 6 }, (_, i) => seat + i);
        return { rows, cabins };
    }

    // default 32
    // 10 rows of left1 + right2 = 30 seats + 2 back single seats -> + cabins 6 (optional)
    const rows = [];
    let seat = 1;
    for (let r = 0; r < 10; r++) {
        rows.push({ left: seat++, right: [seat++, seat++] });
    }
    // if over 32, trim
    const cabins = Array.from({ length: 6 }, (_, i) => seat + i);
    return { rows, cabins };
}

export default function SeatLayout({ layout = "32", bookedSeats = [], selectedSeat, onSelect, compact = false }) {
    const L = String(layout || "32");
    const { rows, cabins } = makeLayout(L);

    const bookedSet = new Set((bookedSeats || []).map((s) => toStr(s)));

    const renderSeat = (s) => {
        if (!s) return <div className="w-0" />;
        const id = toStr(s);
        const isBooked = bookedSet.has(id);
        const isSelected = toStr(selectedSeat) === id;

        const base = "flex items-center justify-center rounded-md border select-none";
        const sizeCls = compact ? "h-8 px-2 text-sm" : "h-10 px-3 text-sm";

        const cls = clsx(base, sizeCls, {
            "bg-red-200 border-red-300 text-red-800 cursor-not-allowed": isBooked,
            "bg-[#f97316] text-white": isSelected && !isBooked,
            "bg-white border-slate-200 text-slate-800 hover:bg-orange-50 cursor-pointer": !isBooked && !isSelected,
        });

        return (
            <button key={id} disabled={isBooked} onClick={() => onSelect && onSelect(id)} className={cls}>
                {id}
            </button>
        );
    };

    return (
        <div className="w-full">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-600">Driver</div>
                <div className="text-sm text-slate-500">Seats ({L})</div>
            </div>

            <div className="space-y-2">
                {rows.map((row, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <div className="w-16 flex justify-center">{renderSeat(row.left)}</div>
                        <div className="flex-1" />
                        <div className="flex gap-3">{(row.right || []).map((s) => renderSeat(s))}</div>
                    </div>
                ))}
            </div>

            <div className="mt-4 grid grid-cols-6 gap-2">
                {cabins.map((c) => (
                    <div key={c} className="flex flex-col items-center">
                        <div className="text-xs text-slate-500">CB</div>
                        {renderSeat(c)}
                    </div>
                ))}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-4 text-xs">
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-white border border-slate-200" /> Available</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-[#f97316]" /> Selected</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-red-200 border border-red-300" /> Booked</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-slate-100 border border-slate-200" /> Cabin</div>
            </div>
        </div>
    );
}
