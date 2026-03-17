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
    // Return rows array of objects { left: seat|null, right: [seat,seat]|[] }
    // plus cabins array for bottom cabins
    const L = String(layout);
    if (L === "23") {
        // 23-seat: 7 main rows of (1 left + 2 right) = 21 seats
        // plus a back row of 2 seats = 23 total; cabins follow after that
        const rows = [];
        let seat = 1;
        for (let r = 0; r < 7; r++) {
            // left 1, right 2
            rows.push({ left: seat++, right: [seat++, seat++] });
        }
        // back row (2 seats) to make total 23 seats
        const back = { left: null, right: [seat++, seat++] };
        const cabins = Array.from({ length: cabinsCount }, (_, i) => seat + i);
        return { rows: [...rows, back], cabins };
    }

    if (L === "27") {
        // 27-seat: 9 rows of left1 + right2, then cabins 6
        const rows = [];
        let seat = 1;
        for (let r = 0; r < 9; r++) {
            rows.push({ left: seat++, right: [seat++, seat++] });
        }
        const cabins = Array.from({ length: cabinsCount }, (_, i) => seat + i);
        return { rows, cabins };
    }

    // default (31): 9 rows of left1 + right2 = 27 seats, then a back row of 5 seats -> total 32? no, 27+5=32? Wait
    // We want total 31: 9*3=27, back row 4? but desired back row is 5 seats (27-31). Compute: 9 rows -> 27 seats, back row -> 5 seats (27..31) totals 32.
    // Correct approach: produce 9 main rows (27 seats) and back row with seats 27..31 (5 seats) — seat numbering overlaps, so instead generate 8 main rows (24), pairRow handled in visualizer; to keep consistent with numbering used elsewhere, we'll produce 9 main rows (27 seats) and back row of 4 seats plus move seat 27 into back row by shifting numbering.
    // Simpler and consistent: create 9 main rows (left1 + right2) -> seats 1..27, then back row with 4 seats -> 28..31, and adjust visualizer to include seat 27 in back row display. To move seat '27' visually into back row, visualizer will list lastRow as [27,28,29,30,31].
    const rows = [];
    let seat = 1;
    for (let r = 0; r < 9; r++) {
        rows.push({ left: seat++, right: [seat++, seat++] });
    }
    // back row: place the remaining seats. We'll place seats 28..31 in a right array, and keep seat 27 as last element of previous rows (visualizer will render 27 in back row visually)
    const back = { left: null, right: [seat++, seat++, seat++, seat++] };
    const cabins = Array.from({ length: cabinsCount }, (_, i) => seat + i);
    return { rows: [...rows, back], cabins };
}

export default function SeatLayout({ layout = "31", bookedSeats = [], selectedSeats = [], onSelect, compact = false, cabins = [] }) {
    const L = String(layout || "31");
    const cabinsCount = Array.isArray(cabins) ? cabins.length : 6;
    const { rows, cabins: cabinNumbers } = makeLayout(L, cabinsCount);

    const bookedSet = new Set((bookedSeats || []).map((s) => toStr(s)));
    const selectedSet = new Set((selectedSeats || []).map((s) => toStr(s)));

    const renderSeat = (s) => {
        if (!s) return <div className="w-0" />;
        const id = toStr(s);
        const isBooked = bookedSet.has(id);
        const isSelected = selectedSet.has(id);

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
                {cabinNumbers.map((c) => (
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
