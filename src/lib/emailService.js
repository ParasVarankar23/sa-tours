import nodemailer from "nodemailer";
import { getAdminDb } from "./firebaseAdmin";

const allowSelfSignedCert = process.env.SMTP_ALLOW_SELF_SIGNED === "true";
const smtpUser = (process.env.SMTP_EMAIL || "").trim();
const smtpPass = (process.env.SMTP_PASS || "")
    .replaceAll(" ", "")
    .replaceAll("\t", "")
    .trim();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: smtpUser,
        pass: smtpPass,
    },
    tls: {
        rejectUnauthorized: !allowSelfSignedCert,
    },
    // avoid very long hangs
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
});

// Verify transporter on startup
transporter
    .verify()
    .then(() => console.log("SMTP transporter verified and ready"))
    .catch((err) =>
        console.warn(
            "SMTP transporter verification failed:",
            err?.message || err
        )
    );

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sa-tours.vercel.app";

/* =========================================================
   Shared Helpers
========================================================= */

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function sendMailWithRetry(mailOptions, attempts = 3) {
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
        try {
            const info = await transporter.sendMail(mailOptions);
            return info;
        } catch (err) {
            lastErr = err;
            console.warn(`sendMail attempt ${i + 1} failed:`, err && err.message ? err.message : err);
            // exponential backoff
            const wait = Math.min(1000 * Math.pow(2, i), 5000);
            await new Promise((res) => setTimeout(res, wait));
        }
    }

    // all attempts failed
    const msg = lastErr && lastErr.message ? lastErr.message : String(lastErr);
    throw new Error(`All sendMail attempts failed: ${msg}`);
}

function infoRow(label, value) {
    return `
        <tr>
            <td style="padding: 10px 0; width: 38%; color: #64748b; font-size: 14px; font-weight: 600; vertical-align: top;">
                ${escapeHtml(label)}
            </td>
            <td style="padding: 10px 0; color: #0f172a; font-size: 15px; font-weight: 700; vertical-align: top;">
                ${escapeHtml(value || "--")}
            </td>
        </tr>
    `;
}

function createEmailTemplate({
    preheader = "SA Tours Notification",
    title = "SA Tours",
    subtitle = "Travel made simple",
    badgeText = "SA TOURS",
    introTitle = "",
    introText = "",
    bodyHtml = "",
    buttonText = "",
    buttonUrl = "",
    footerNote = "Need help? Contact SA Tours support.",
}) {
    const safeTitle = escapeHtml(title);
    const safeSubtitle = escapeHtml(subtitle);
    const safeBadgeText = escapeHtml(badgeText);
    const safeIntroTitle = escapeHtml(introTitle);
    const safeIntroText = escapeHtml(introText);
    const safeFooterNote = escapeHtml(footerNote);

    const buttonHtml =
        buttonText && buttonUrl
            ? `
            <div style="text-align:center; margin: 28px 0 8px;">
                <a href="${buttonUrl}" style="
                    display:inline-block;
                    padding: 14px 26px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: #ffffff;
                    text-decoration: none;
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 0.2px;
                    box-shadow: 0 10px 24px rgba(249,115,22,0.25);
                ">
                    ${escapeHtml(buttonText)}
                </a>
            </div>
        `
            : "";

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${safeTitle}</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f8fafc; font-family:Arial, Helvetica, sans-serif; color:#334155;">
            <!-- Preheader -->
            <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
                ${escapeHtml(preheader)}
            </div>

            <div style="width:100%; background:#f8fafc; padding:28px 12px;">
                <div style="
                    max-width:680px;
                    margin:0 auto;
                    background:#ffffff;
                    border:1px solid #fed7aa;
                    border-radius:24px;
                    overflow:hidden;
                    box-shadow:0 16px 40px rgba(15,23,42,0.08);
                ">
                    <!-- Header -->
                    <div style="
                        background: linear-gradient(135deg, #f97316, #ea580c);
                        padding:32px 24px;
                        text-align:center;
                        color:#ffffff;
                    ">
                        <div style="
                            display:inline-block;
                            background: rgba(255,255,255,0.18);
                            border:1px solid rgba(255,255,255,0.22);
                            padding:6px 14px;
                            border-radius:999px;
                            font-size:11px;
                            font-weight:700;
                            letter-spacing:1.2px;
                            margin-bottom:14px;
                        ">
                            ${safeBadgeText}
                        </div>

                        <h1 style="margin:0; font-size:34px; line-height:1.2; font-weight:800;">
                            ${safeTitle}
                        </h1>

                        <p style="margin:10px 0 0; font-size:15px; opacity:0.95;">
                            ${safeSubtitle}
                        </p>
                    </div>

                    <!-- Body -->
                    <div style="padding:30px 24px;">
                        ${introTitle
            ? `
                            <h2 style="
                                margin:0 0 10px;
                                font-size:22px;
                                line-height:1.3;
                                color:#0f172a;
                                font-weight:800;
                            ">
                                ${safeIntroTitle}
                            </h2>
                        `
            : ""
        }

                        ${introText
            ? `
                            <p style="
                                margin:0 0 22px;
                                font-size:15px;
                                line-height:1.7;
                                color:#475569;
                            ">
                                ${safeIntroText}
                            </p>
                        `
            : ""
        }

                        ${bodyHtml}

                        ${buttonHtml}
                    </div>

                    <!-- Footer -->
                    <div style="
                        background:#fffaf5;
                        border-top:1px solid #ffedd5;
                        padding:20px 24px 26px;
                        text-align:center;
                    ">
                        <p style="margin:0; font-size:13px; color:#64748b;">
                            ${safeFooterNote}
                        </p>
                        <p style="margin:10px 0 0; font-size:12px; color:#94a3b8;">
                            © 2026 SA Tours. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
}

function createInfoCard(title, rowsHtml) {
    return `
        <div style="
            margin:22px 0;
            background:#ffffff;
            border:1px solid #fdba74;
            border-radius:18px;
            overflow:hidden;
        ">
            <div style="
                background:#fff7ed;
                padding:14px 18px;
                border-bottom:1px solid #fed7aa;
                font-size:14px;
                font-weight:800;
                letter-spacing:0.3px;
                color:#9a3412;
            ">
                ${escapeHtml(title)}
            </div>
            <div style="padding:16px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    ${rowsHtml}
                </table>
            </div>
        </div>
    `;
}

function normalizeStopName(name) {
    if (!name) return name;
    const n = String(name || "").trim();
    const aliasMap = {
        // common aliases -> canonical stop names
        'borli mumbai': 'Borli Dongri',
        'borli': 'Borli Dongri',
        'panvel': 'Panvel',
    };
    const key = n.toLowerCase();
    return aliasMap[key] || n;
}

function createOtpCard(otp) {
    return `
        <div style="
            margin:22px 0;
            background:#fff7ed;
            border:2px solid #f97316;
            border-radius:20px;
            padding:26px 20px;
            text-align:center;
        ">
            <p style="
                margin:0 0 10px;
                font-size:13px;
                color:#9a3412;
                font-weight:700;
                letter-spacing:0.4px;
            ">
                YOUR OTP CODE
            </p>

            <div style="
                font-size:42px;
                font-weight:800;
                color:#ea580c;
                letter-spacing:10px;
                font-family:monospace;
                line-height:1.2;
            ">
                ${escapeHtml(otp)}
            </div>

            <p style="
                margin:12px 0 0;
                font-size:13px;
                color:#64748b;
            ">
                Valid for 10 minutes
            </p>
        </div>
    `;
}

function createAlertBox(text, type = "warning") {
    const styles =
        type === "success"
            ? {
                bg: "#ecfdf5",
                border: "#86efac",
                color: "#166534",
            }
            : type === "danger"
                ? {
                    bg: "#fef2f2",
                    border: "#fca5a5",
                    color: "#991b1b",
                }
                : {
                    bg: "#fff7ed",
                    border: "#fdba74",
                    color: "#9a3412",
                };

    return `
        <div style="
            margin:20px 0;
            background:${styles.bg};
            border:1px solid ${styles.border};
            color:${styles.color};
            border-radius:16px;
            padding:16px 18px;
            font-size:14px;
            line-height:1.7;
        ">
            ${text}
        </div>
    `;
}

/* =========================================================
   1) SIGNUP EMAIL
========================================================= */
export async function sendSignupEmail(email, name, generatedPassword) {
    const loginUrl = `${APP_URL}/login`;

    const credentialsCard = createInfoCard(
        "Account Details",
        `
            ${infoRow("Passenger Name", name || "Passenger")}
            ${infoRow("Registered Email", email)}
        `
    );

    const passwordCard = `
        <div style="
            margin:22px 0;
            background:#fff7ed;
            border:1px solid #fdba74;
            border-radius:18px;
            padding:22px;
            text-align:center;
        ">
            <p style="
                margin:0 0 8px;
                font-size:13px;
                color:#9a3412;
                font-weight:700;
                letter-spacing:0.4px;
            ">
                TEMPORARY PASSWORD
            </p>
            <div style="
                display:inline-block;
                background:#ffffff;
                border:2px dashed #f97316;
                border-radius:14px;
                padding:14px 22px;
                font-size:28px;
                font-weight:800;
                color:#ea580c;
                font-family:monospace;
                letter-spacing:2px;
                margin-top:8px;
            ">
                ${escapeHtml(generatedPassword)}
            </div>
        </div>
    `;

    const htmlContent = createEmailTemplate({
        preheader: "Welcome to SA Tours - Your account is ready",
        title: "Welcome to SA Tours",
        subtitle: "Your travel account is now active",
        badgeText: "NEW ACCOUNT",
        introTitle: `Hello ${name || "Passenger"},`,
        introText:
            "Your SA Tours account has been created successfully. You can now log in, view available buses, select your seat, and manage your bookings with ease.",
        bodyHtml: `
            ${credentialsCard}
            ${passwordCard}
            ${createAlertBox(
            "<strong>Important:</strong> Please keep this password secure. For better safety, change it after your first login."
        )}
        `,
        buttonText: "Login to SA Tours",
        buttonUrl: loginUrl,
        footerNote: "Need help logging in? Contact SA Tours support.",
    });

    try {
        const mailOptions = {
            from: `"SA Tours" <${smtpUser}>`,
            to: email,
            subject: "Welcome to SA Tours - Your Login Credentials",
            html: htmlContent,
        };

        const info = await sendMailWithRetry(mailOptions);
        console.log("Signup email sent successfully:", info?.messageId || info);
        return true;
    } catch (error) {
        console.error("Error sending signup email:", error);
        throw new Error("Failed to send signup email: " + error.message);
    }
}

/* =========================================================
   2) FORGOT PASSWORD OTP EMAIL
========================================================= */
export async function sendForgotPasswordEmail(email, otp) {
    const htmlContent = createEmailTemplate({
        preheader: "SA Tours password reset verification",
        title: "Password Reset OTP",
        subtitle: "Secure verification for your account",
        badgeText: "SECURITY",
        introTitle: "Password Reset Requested",
        introText: `We received a request to reset the password for your SA Tours account associated with ${email}. Use the OTP below to continue.`,
        bodyHtml: `
            ${createOtpCard(otp)}
            ${createAlertBox(
            "<strong>Security Note:</strong> Never share this OTP with anyone. If you did not request this reset, you can safely ignore this email."
        )}
        `,
        footerNote: "If this wasn't you, your account remains safe unless the OTP is shared.",
    });

    try {
        const mailOptions = {
            from: `"SA Tours" <${smtpUser}>`,
            to: email,
            subject: "SA Tours - Your Password Reset OTP",
            html: htmlContent,
        };

        const info = await sendMailWithRetry(mailOptions);
        console.log("Forgot password OTP email sent:", info?.messageId || info);
        return true;
    } catch (error) {
        console.error("Error sending forgot password email:", error);
        throw new Error("Failed to send forgot password email: " + error.message);
    }
}

/* =========================================================
   3) BOOKING CONFIRMATION EMAIL
========================================================= */
export async function sendBookingConfirmation(email, name, booking = {}) {
    // normalize stop names for clearer emails
    const pickupName = normalizeStopName(booking.pickup || "");
    const dropName = normalizeStopName(booking.drop || "");

    // try to fetch bus contact info (helpline/emergency) from DB using busId or busNumber
    let busInfo = null;
    try {
        const db = getAdminDb();
        const busId = booking.busId || null;
        if (busId) {
            const snap = await db.ref(`buses/${busId}`).once('value');
            if (snap.exists()) busInfo = snap.val() || null;
        }
    } catch (e) {
        console.warn('Failed to load bus info for email:', e && e.message ? e.message : e);
    }
    const defaultHelpline = process.env.SA_TOURS_DEFAULT_HELPLINE || '8805718986';
    const defaultBookingContact = process.env.SA_TOURS_DEFAULT_BOOKING || '9209471601';

    const helpline = (busInfo && (busInfo.helpline || busInfo.contact || busInfo.phone)) || defaultHelpline;

    // determine route-specific booking contact (fall back to busInfo.bookingContact or defaults)
    let bookingContact = (busInfo && (busInfo.bookingContact || busInfo.booking || busInfo.phoneBooking)) || '';
    const routeKey = String(booking.routeName || booking.route || booking.routeId || '').toLowerCase();
    if (!bookingContact) {
        if (routeKey.includes('borli')) bookingContact = '9209471309';
        else if (routeKey.includes('dighi')) bookingContact = '9273635316';
        else bookingContact = defaultBookingContact;
    }

    // determine a direct bus contact (driver/vehicle) to show in emails
    let busContact = (busInfo && (busInfo.phone || busInfo.driverContact || busInfo.contact)) || '';
    if (!busContact) {
        if (routeKey.includes('borli')) busContact = '9209471309';
        else if (routeKey.includes('dighi')) busContact = '9273635316';
        else busContact = helpline || defaultHelpline;
    }

    const bookingCard = createInfoCard(
        "Booking Details",
        `
            ${infoRow("Passenger Name", name || "Passenger")}
            ${infoRow(
            "Bus",
            `${booking.busNumber || "--"}${booking.routeName ? ` — ${booking.routeName}` : ""}`
        )}
            ${infoRow(
            "Travel Date & Time",
            `${booking.date || "--"} • ${booking.startTime || "--:--"} → ${booking.endTime || "--:--"
            }`
        )}
            ${infoRow("Seat Number", booking.seatNo || "--")}
            ${infoRow("Helpline", helpline || '--')}
            ${infoRow("Bus Booking", bookingContact || '--')}
            ${infoRow("Bus Contact", busContact || '--')}
            ${infoRow("Pickup Point", `${pickupName || "--"}${booking.pickupTime ? ` (${booking.pickupTime})` : ""}`)}
            ${infoRow("Drop Point", `${dropName || "--"}${booking.dropTime ? ` (${booking.dropTime})` : ""}`)}
        `
    );


    // add payment info if present
    let paymentRows = '';
    if (booking.payment || booking.paymentMethod || booking.fare) {
        paymentRows += infoRow('Fare', booking.fare !== undefined ? `₹${Number(booking.fare || 0).toFixed(2)}` : '--');
        paymentRows += infoRow('Payment Method', booking.paymentMethod || '--');
        if (booking.payment) paymentRows += infoRow('Payment ID', booking.payment);
    }

    const htmlContent = createEmailTemplate({
        preheader: "Your SA Tours booking is confirmed",
        title: "Booking Confirmed",
        subtitle: "Your seat has been reserved successfully",
        badgeText: "CONFIRMED",
        introTitle: `Hello ${name || "Passenger"},`,
        introText:
            "Great news! Your booking has been confirmed successfully. Please review your trip details below and keep this email for reference.",
        bodyHtml: `
            ${bookingCard}
            ${paymentRows ? createInfoCard('Payment Details', paymentRows) : ''}
            ${createAlertBox(
            "<strong>Travel Reminder:</strong> Please arrive at your pickup point at least 10–15 minutes before departure.",
            "success"
        )}
        `,
        buttonText: "View My Bookings",
        buttonUrl: APP_URL,
        footerNote: "Wishing you a safe and comfortable journey with SA Tours.",
    });

    // attempt to generate a simple PDF receipt and attach if possible
    let attachments = [];
    try {
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        const endPromise = new Promise((res) => doc.on('end', res));

        doc.fontSize(20).fillColor('#ea580c').text('SA Tours — Booking Receipt', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).fillColor('#0f172a');
        const rows = [
            ['Passenger', name || 'Passenger'],
            ['Bus', booking.busNumber || '--'],
            ['Seat', booking.seatNo || '--'],
            ['Date', booking.date || '--'],
            ['Time', `${booking.startTime || '--'} → ${booking.endTime || '--'}`],
            ['Pickup', pickupName || '--'],
            ['Drop', dropName || '--'],
            ['Fare', booking.fare !== undefined ? `₹${Number(booking.fare || 0).toFixed(2)}` : '--'],
            ['Payment Method', booking.paymentMethod || '--'],
            ['Payment ID', booking.payment || '--'],
        ];

        rows.forEach(([k, v]) => {
            doc.font('Helvetica-Bold').text(k + ':', { continued: true, width: 150 });
            doc.font('Helvetica').text(' ' + String(v));
            doc.moveDown(0.2);
        });

        doc.moveDown(1);
        doc.fontSize(10).fillColor('#64748b').text('Thank you for booking with SA Tours. Present this receipt at the counter if needed.', { align: 'left' });
        doc.end();

        await endPromise;
        const pdfBuffer = Buffer.concat(chunks);
        if (pdfBuffer && pdfBuffer.length) {
            attachments.push({ filename: 'receipt.pdf', content: pdfBuffer, contentType: 'application/pdf' });
        }
    } catch (e) {
        console.warn('PDF generation failed (pdfkit may not be installed):', e && e.message ? e.message : e);
    }

    try {
        const mailOptions = {
            from: `"SA Tours" <${smtpUser}>`,
            to: email,
            subject: `Booking Confirmed — ${booking.busNumber || 'SA Tours'}`,
            html: htmlContent,
            attachments: attachments,
        };

        console.log('sendBookingConfirmation: sending to', email, 'subject:', mailOptions.subject, 'attachments:', attachments.length);

        const info = await sendMailWithRetry(mailOptions);
        console.log('Booking confirmation email sent:', info?.messageId || info);
        return true;
    } catch (error) {
        console.error('Error sending booking confirmation email:', error?.message || error);
        throw new Error('Failed to send booking confirmation email: ' + (error?.message || String(error)));
    }
}

/* =========================================================
   4) BOOKING CANCELLATION EMAIL
========================================================= */
export async function sendBookingCancellation(email, name, booking = {}) {
    const pickupName = normalizeStopName(booking.pickup || "");
    const dropName = normalizeStopName(booking.drop || "");

    // try to fetch bus contact info (helpline/emergency) from DB using busId or busNumber
    let busInfo = null;
    try {
        const db = getAdminDb();
        const busId = booking.busId || null;
        if (busId) {
            const snap = await db.ref(`buses/${busId}`).once('value');
            if (snap.exists()) busInfo = snap.val() || null;
        }
    } catch (e) {
        console.warn('Failed to load bus info for cancellation email:', e && e.message ? e.message : e);
    }

    const defaultHelpline = process.env.SA_TOURS_DEFAULT_HELPLINE || '8805718986';
    const defaultBookingContact = process.env.SA_TOURS_DEFAULT_BOOKING || '9209471601';

    const helpline = (busInfo && (busInfo.helpline || busInfo.contact || busInfo.phone)) || defaultHelpline;
    let bookingContact = (busInfo && (busInfo.bookingContact || busInfo.booking || busInfo.phoneBooking)) || '';
    const routeKey = String(booking.routeName || booking.route || booking.routeId || '').toLowerCase();
    if (!bookingContact) {
        if (routeKey.includes('borli')) bookingContact = '9209471309';
        else if (routeKey.includes('dighi')) bookingContact = '9273635316';
        else bookingContact = defaultBookingContact;
    }

    // determine a direct bus contact (driver/vehicle) to show in emails
    let busContact = (busInfo && (busInfo.phone || busInfo.driverContact || busInfo.contact)) || '';
    if (!busContact) {
        if (routeKey.includes('borli')) busContact = '9209471309';
        else if (routeKey.includes('dighi')) busContact = '9273635316';
        else busContact = helpline || defaultHelpline;
    }

    // add payment info if present
    let paymentRows = '';
    if (booking.payment || booking.paymentMethod || booking.fare) {
        paymentRows += infoRow('Fare', booking.fare !== undefined ? `₹${Number(booking.fare || 0).toFixed(2)}` : '--');
        paymentRows += infoRow('Payment Method', booking.paymentMethod || '--');
        if (booking.payment) paymentRows += infoRow('Payment ID', booking.payment);
    }

    const bookingCard = createInfoCard(
        "Cancelled Booking Details",
        `
            ${infoRow("Passenger Name", name || "Passenger")}
            ${infoRow(
            "Bus",
            `${booking.busNumber || "--"}${booking.routeName ? ` — ${booking.routeName}` : ""
            }`
        )}
            ${infoRow(
            "Travel Date & Time",
            `${booking.date || "--"} • ${booking.startTime || "--:--"} → ${booking.endTime || "--:--"
            }`
        )}
            ${infoRow("Seat Number", booking.seatNo || "--")}
            ${infoRow("Helpline", helpline || '--')}
            ${infoRow("Bus Booking", bookingContact || '--')}
            ${infoRow("Bus Contact", busContact || '--')}
            ${infoRow("Pickup Point", `${pickupName || "--"}${booking.pickupTime ? ` (${booking.pickupTime})` : ""}`)}
            ${infoRow("Drop Point", `${dropName || "--"}${booking.dropTime ? ` (${booking.dropTime})` : ""}`)}
        `
    );

    const htmlContent = createEmailTemplate({
        preheader: "Your SA Tours booking has been cancelled",
        title: "Booking Cancelled",
        subtitle: "Your reservation has been cancelled",
        badgeText: "CANCELLED",
        introTitle: `Hello ${name || "Passenger"},`,
        introText:
            "Your booking has been cancelled successfully. Please review the cancelled booking details below.",
        bodyHtml: `
            ${bookingCard}
            ${createAlertBox(
            "<strong>Travel Reminder:</strong> Please arrive at your pickup point at least 10–15 minutes before departure.",
            "success"
        )}
            ${paymentRows ? createInfoCard('Payment Details', paymentRows) : ''}
        `,
        buttonText: "View My Bookings",
        buttonUrl: APP_URL,
        footerNote: "We hope to serve you again soon with SA Tours.",
    });
    // send simple booking confirmation (PDF attach handled in server-side flow)
    try {
        const mailOptions = {
            from: `"SA Tours" <${smtpUser}>`,
            to: email,
            subject: `Booking Cancelled — ${booking.busNumber || "SA Tours"}`,
            html: htmlContent,
        };

        console.log("sendBookingCancellation: sending to", email, "subject:", mailOptions.subject);
        const info = await sendMailWithRetry(mailOptions);
        console.log("Booking cancellation email sent:", info?.messageId || info);
        return true;
    } catch (error) {
        console.error("Error sending booking cancellation email:", error?.message || error);
        throw new Error('Failed to send booking cancellation email: ' + (error?.message || String(error)));
    }
}