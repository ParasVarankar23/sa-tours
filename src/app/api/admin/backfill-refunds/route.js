import { NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "../../../../lib/firebaseAdmin";

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

        let updated = 0;
        const failures = [];

        for (const id of Object.keys(payments || {})) {
            try {
                const p = payments[id] || {};
                const original = p.details && p.details.amount ? Number(p.details.amount) / 100 : (p.amount !== undefined ? Number(p.amount) : null);
                if (original === null || original === undefined) continue;

                const currentRefund = p.refund && Number.isFinite(Number(p.refund.amount)) ? Number(p.refund.amount) : 0;

                // If refund already equals original and marked success, skip
                if (currentRefund === original && p.refund && p.refund.success) continue;

                const refundRecord = {
                    attempted: true,
                    success: true,
                    amount: Math.round((original + Number.EPSILON) * 100) / 100,
                    error: null,
                    raw: p.refund ? p.refund.raw || null : null,
                    note: 'backfilled_full_refund',
                    refundedAt: new Date().toISOString(),
                };

                await db.ref(`payments/${id}/refund`).set(refundRecord);
                updated++;
            } catch (e) {
                failures.push({ id, error: e && e.message ? e.message : String(e) });
            }
        }

        return NextResponse.json({ success: true, updated, failures }, { status: 200 });
    } catch (err) {
        console.error('/api/admin/backfill-refunds error:', err && err.message ? err.message : err);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
