import { NextResponse } from 'next/server';
import { getAdminDb, verifyAuthToken } from '../../../../lib/firebaseAdmin';

function safeStr(v) {
    return v === undefined || v === null ? '' : String(v);
}

export async function POST(req) {
    try {
        const authHeader = req.headers.get('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        let decoded;
        try {
            decoded = await verifyAuthToken(token);
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const role = (decoded && decoded.role) ? String(decoded.role).toLowerCase() : null;
        if (!(role === 'admin' || role === 'owner')) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const db = getAdminDb();
        const snap = await db.ref('payments').once('value');
        const payments = snap.exists() ? snap.val() : {};
        const ids = Object.keys(payments || {});

        let updated = 0;
        const failures = [];

        for (const id of ids) {
            try {
                const p = payments[id] || {};
                const meta = p.metadata || null;
                if (!meta) continue;
                if (meta.user) continue;

                let userObj = null;

                // If metadata.bookings is an array of full booking objects, use first
                if (Array.isArray(meta.bookings) && meta.bookings.length) {
                    const b = meta.bookings[0];
                    if (b && (b.name || b.phone || b.email)) {
                        userObj = {
                            name: safeStr(b.name),
                            phone: safeStr(b.phone),
                            email: safeStr(b.email),
                            pickup: safeStr(b.pickup),
                            drop: safeStr(b.drop),
                            pickupTime: safeStr(b.pickupTime || b.startTime),
                            dropTime: safeStr(b.dropTime || b.endTime),
                            busNumber: safeStr(b.busNumber || b.busId),
                            seatNo: safeStr(b.seatNo),
                        };
                    }
                }

                // If metadata.booking ref exists, try reading booking
                if (!userObj && meta.booking && meta.booking.date && meta.booking.busId && meta.booking.seatNo !== undefined) {
                    const { date, busId, seatNo } = meta.booking;
                    const bSnap = await db.ref(`bookings/${date}/${busId}/${seatNo}`).once('value');
                    if (bSnap.exists()) {
                        const b = bSnap.val() || {};
                        userObj = {
                            name: safeStr(b.name),
                            phone: safeStr(b.phone),
                            email: safeStr(b.email),
                            pickup: safeStr(b.pickup),
                            drop: safeStr(b.drop),
                            pickupTime: safeStr(b.pickupTime || b.startTime),
                            dropTime: safeStr(b.dropTime || b.endTime),
                            busNumber: safeStr(b.busNumber || b.busId),
                            seatNo: safeStr(b.seatNo),
                        };
                    }
                }

                // If bookings array contains refs or mix, try resolving
                if (!userObj && meta.bookings && Array.isArray(meta.bookings)) {
                    for (const b of meta.bookings) {
                        if (!b) continue;
                        if (b.name || b.phone || b.email) {
                            userObj = {
                                name: safeStr(b.name),
                                phone: safeStr(b.phone),
                                email: safeStr(b.email),
                                pickup: safeStr(b.pickup),
                                drop: safeStr(b.drop),
                                pickupTime: safeStr(b.pickupTime || b.startTime),
                                dropTime: safeStr(b.dropTime || b.endTime),
                                busNumber: safeStr(b.busNumber || b.busId),
                                seatNo: safeStr(b.seatNo),
                            };
                            break;
                        }
                        if (b.date && b.busId && b.seatNo !== undefined) {
                            const bSnap = await db.ref(`bookings/${b.date}/${b.busId}/${b.seatNo}`).once('value');
                            if (bSnap.exists()) {
                                const bb = bSnap.val() || {};
                                userObj = {
                                    name: safeStr(bb.name),
                                    phone: safeStr(bb.phone),
                                    email: safeStr(bb.email),
                                    pickup: safeStr(bb.pickup),
                                    drop: safeStr(bb.drop),
                                    pickupTime: safeStr(bb.pickupTime || bb.startTime),
                                    dropTime: safeStr(bb.dropTime || bb.endTime),
                                    busNumber: safeStr(bb.busNumber || bb.busId),
                                    seatNo: safeStr(bb.seatNo),
                                };
                                break;
                            }
                        }
                    }
                }

                if (userObj) {
                    await db.ref(`payments/${id}/metadata/user`).set(userObj);
                    updated++;
                }
            } catch (e) {
                failures.push({ id, error: e && e.message ? e.message : String(e) });
            }
        }

        return NextResponse.json({ success: true, updated, failures }, { status: 200 });
    } catch (err) {
        console.error('/api/admin/backfill-payments error:', err && err.message ? err.message : err);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
