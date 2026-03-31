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

        const body = await req.json();
        const paymentId = body.paymentId ? String(body.paymentId) : null;
        const amount = body.amount !== undefined && body.amount !== null ? Number(body.amount) : null; // rupees
        const note = body.note ? String(body.note) : null;
        const success = body.success === undefined ? true : !!body.success;
        const refundedAt = body.refundedAt ? String(body.refundedAt) : new Date().toISOString();

        if (!paymentId) return NextResponse.json({ success: false, error: 'paymentId is required' }, { status: 400 });
        if (amount === null || !Number.isFinite(amount) || amount < 0) return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });

        const db = getAdminDb();
        const snap = await db.ref(`payments/${paymentId}`).once('value');
        if (!snap.exists()) return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });

        const refundRecord = {
            attempted: true,
            success: !!success,
            amount: Math.round((Number(amount) + Number.EPSILON) * 100) / 100,
            error: null,
            raw: null,
            note: note || 'manual_refund_by_admin',
            refundedAt,
        };

        await db.ref(`payments/${paymentId}/refund`).set(refundRecord);

        // create admin notification
        try {
            const now = new Date().toISOString();
            const ts = Date.now();
            const payload = {
                title: 'Manual refund recorded',
                message: `Refund of ₹${refundRecord.amount.toFixed(2)} recorded for payment ${paymentId}`,
                data: { paymentId, refund: refundRecord },
                createdAt: now,
                ts,
                read: false,
            };
            await db.ref(`notifications/roles/admin`).push().set(payload);
        } catch (e) {
            console.warn('Failed to create admin notification for manual refund', e && e.message ? e.message : e);
        }

        return NextResponse.json({ success: true, paymentId, refund: refundRecord }, { status: 200 });
    } catch (err) {
        console.error('/api/admin/manual-refund error:', err && err.message ? err.message : err);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
