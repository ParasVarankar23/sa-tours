#!/usr/bin/env node
/**
 * Backfill payments metadata.user from existing bookings.
 *
 * Usage: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, NEXT_PUBLIC_FIREBASE_DATABASE_URL
 * Then run: node scripts/backfill-payments.js
 */
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// If a .env file exists in project root, load it into process.env (simple parser)
try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach((line) => {
            const m = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*)\s*$/);
            if (!m) return;
            let [, key, val] = m;
            if (val.startsWith("\"") && val.endsWith("\"")) val = val.slice(1, -1);
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            // preserve escaped newlines for private key
            process.env[key] = val;
        });
    }
} catch (e) {
    // non-fatal
}

function initAdmin() {
    if (admin.apps && admin.apps.length) return admin.app();

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        console.error('Missing Firebase admin env vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        process.exit(1);
    }

    return admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
}

async function main() {
    initAdmin();
    const db = admin.database();

    console.log('Reading payments...');
    const snap = await db.ref('payments').once('value');
    const payments = snap.exists() ? snap.val() : {};
    const ids = Object.keys(payments || {});
    console.log(`Found ${ids.length} payments`);

    let updated = 0;
    for (const id of ids) {
        try {
            const p = payments[id] || {};
            const meta = p.metadata || null;
            if (!meta) continue;
            if (meta.user) continue; // already populated

            let userObj = null;

            // Case 1: metadata.bookings (array) - use first booking entry if it has passenger info
            if (Array.isArray(meta.bookings) && meta.bookings.length) {
                const b = meta.bookings[0];
                if (b && (b.name || b.phone || b.email)) {
                    userObj = {
                        name: b.name || '',
                        phone: b.phone || '',
                        email: b.email || '',
                        pickup: b.pickup || '',
                        drop: b.drop || '',
                        pickupTime: b.pickupTime || b.startTime || '',
                        dropTime: b.dropTime || b.endTime || '',
                        busNumber: b.busNumber || b.busId || '',
                        seatNo: b.seatNo || ''
                    };
                }
            }

            // Case 2: metadata.booking {date,busId,seatNo} -> attempt to read booking record
            if (!userObj && meta.booking && meta.booking.date && meta.booking.busId && meta.booking.seatNo) {
                const { date, busId, seatNo } = meta.booking;
                const bSnap = await db.ref(`bookings/${date}/${busId}/${seatNo}`).once('value');
                if (bSnap.exists()) {
                    const b = bSnap.val() || {};
                    userObj = {
                        name: b.name || '',
                        phone: b.phone || '',
                        email: b.email || '',
                        pickup: b.pickup || '',
                        drop: b.drop || '',
                        pickupTime: b.pickupTime || b.startTime || '',
                        dropTime: b.dropTime || b.endTime || '',
                        busNumber: b.busNumber || b.busId || '',
                        seatNo: b.seatNo || ''
                    };
                }
            }

            // Case 3: metadata.bookings may include booking refs (date,busId,seatNo) or full booking objects
            if (!userObj && meta.bookings && Array.isArray(meta.bookings)) {
                for (const b of meta.bookings) {
                    if (b && (b.name || b.phone || b.email)) {
                        userObj = {
                            name: b.name || '',
                            phone: b.phone || '',
                            email: b.email || '',
                            pickup: b.pickup || '',
                            drop: b.drop || '',
                            pickupTime: b.pickupTime || '',
                            dropTime: b.dropTime || '',
                            busNumber: b.busNumber || '',
                            seatNo: b.seatNo || ''
                        };
                        break;
                    }
                    // if b contains booking ref instead of payload
                    if (b && b.date && b.busId && b.seatNo) {
                        const bSnap = await db.ref(`bookings/${b.date}/${b.busId}/${b.seatNo}`).once('value');
                        if (bSnap.exists()) {
                            const bb = bSnap.val() || {};
                            userObj = {
                                name: bb.name || '',
                                phone: bb.phone || '',
                                email: bb.email || '',
                                pickup: bb.pickup || '',
                                drop: bb.drop || '',
                                pickupTime: bb.pickupTime || '',
                                dropTime: bb.dropTime || '',
                                busNumber: bb.busNumber || '',
                                seatNo: bb.seatNo || ''
                            };
                            break;
                        }
                    }
                }
            }

            if (userObj) {
                await db.ref(`payments/${id}/metadata/user`).set(userObj);
                updated++;
                console.log(`Backfilled payment ${id} with user ${userObj.name || userObj.phone || ''}`);
            }
        } catch (e) {
            console.warn('Failed to backfill payment', id, e && e.message ? e.message : e);
        }
    }

    console.log(`Backfill complete. Updated ${updated} payments.`);
    process.exit(0);
}

main().catch((e) => {
    console.error('Backfill script error:', e && e.message ? e.message : e);
    process.exit(1);
});
