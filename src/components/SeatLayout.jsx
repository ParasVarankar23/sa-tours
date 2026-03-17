"use client";


/**
 * SeatLayout component props:
 * - layout: number (23,27,32)
 * - bookedSeats: array of seat numbers (strings or numbers)
 * - selectedSeat: current selected seat
 * - onSelect(seatNumber)
 */
export default function SeatLayout({ layout = 32, bookedSeats = [], selectedSeat, onSelect }) {
    // build seat rows for template: left 1, right 2 layout
    const total = Number(layout) || 32;

    // simple algorithm to generate seat numbers row-wise
    const seats = [];
    for (let i = 1; i <= total; i++) seats.push(i.toString());

    const isBooked = (s) => bookedSeats.includes(String(s));

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between">
                <div className="w-1/4 text-sm font-semibold text-slate-600">Driver Front</div>
                <div className="w-3/4 text-right text-sm text-slate-500">Seats ({layout})</div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {seats.map((s, idx) => {
                    const booked = isBooked(s);
                    const selected = selectedSeat === s;
                    const cls = `flex h-10 items-center justify-center rounded-md border ${booked ? "bg-red-200 border-red-300 text-red-700" : selected ? "bg-[#f97316] text-white" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`;
                    return (
                        <button
                            key={s}
                            disabled={booked}
                            onClick={() => onSelect && onSelect(s)}
                            className={cls}
                        >
                            Seat {s}
                        </button>
                    );
                })}
            </div>

            <div className="mt-2 grid grid-cols-4 gap-2 text-sm">
                <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded bg-emerald-50 border border-emerald-200" /> Available
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded bg-[#f97316]" /> Selected
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded bg-red-200 border border-red-300" /> Booked
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded bg-slate-100 border border-slate-200" /> Cabin
                </div>
            </div>
        </div>
    );
}
