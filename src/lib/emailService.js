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
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
});

transporter
    .verify()
    .then(() => console.log("SMTP transporter verified and ready"))
    .catch((err) =>
        console.warn("SMTP transporter verification failed:", err?.message || err)
    );

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sa-tours.vercel.app";

/* =========================================================
   FIXED CONTACT NUMBERS
========================================================= */
const FIXED_HELPLINE = "8805718986";
const FIXED_BUS_BOOKING = "9209471601";

/* =========================================================
   SHARED HELPERS
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
            console.warn(`sendMail attempt ${i + 1} failed:`, err?.message || err);

            const wait = Math.min(1000 * Math.pow(2, i), 5000);
            await new Promise((res) => setTimeout(res, wait));
        }
    }

    const msg = lastErr?.message || String(lastErr);
    throw new Error(`All sendMail attempts failed: ${msg}`);
}

function normalizeStopName(name) {
    if (!name) return "";
    const n = String(name || "").trim();
    const key = n.toLowerCase();

    const aliasMap = {
        "borli mumbai": "Borli Dongri",
        "borli": "Borli Dongri",
        "borli dongri": "Borli Dongri",
        "dongri borli": "Dongri Borli",
        "dighi": "Dighi",
        "dighi dongri": "Dighi Dongri",
        "dongri dighi": "Dongri Dighi",
        "panvel": "Panvel",
        "dongri": "Dongri",
    };

    return aliasMap[key] || n;
}

function getPaymentMethod(booking = {}) {
    const raw =
        booking.paymentMethod ||
        booking.method ||
        booking.payment?.method ||
        booking.paymentDetails?.method ||
        booking.details?.method ||
        booking.details?.payment_method ||
        booking.razorpay?.method ||
        booking.gatewayMethod ||
        "";

    const value = String(raw || "").trim().toLowerCase();

    if (!value) return "Online Payment";
    if (value.includes("upi")) return "UPI";
    if (value.includes("card")) return "Card";
    if (value.includes("netbank")) return "Net Banking";
    if (value.includes("wallet")) return "Wallet";
    if (
        value.includes("cash") ||
        value.includes("offline") ||
        value.includes("cod") ||
        value.includes("cashcollected") ||
        value.includes("cash_collected")
    ) {
        return "Cash";
    }
    if (value.includes("razorpay")) return "Online Payment";

    return raw;
}

function formatCurrency(value) {
    const num = Number(value || 0);
    return `₹${num.toFixed(2)}`;
}

/* =========================================================
   TIME FORMAT HELPERS
   Converts:
   14:00 -> 2:00 PM
   04:00 -> 4:00 AM
   9:30 AM -> 9:30 AM
========================================================= */
function normalizeTimeValue(time = "") {
    return String(time || "")
        .trim()
        .toLowerCase()
        .replace(/\./g, ":")
        .replace(/\s+/g, " ");
}

function formatTime12Hour(time = "") {
    const raw = String(time || "").trim();
    if (!raw) return "--:--";

    const normalized = normalizeTimeValue(raw);

    // Already AM/PM format
    const ampmMatch = normalized.match(/^(\d{1,2}):(\d{2})\s?(am|pm)$/i);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1], 10);
        const minutes = ampmMatch[2];
        const meridian = ampmMatch[3].toUpperCase();

        if (hours === 0) hours = 12;
        return `${hours}:${minutes} ${meridian}`;
    }

    // 24-hour format
    const match24 = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        let hours = parseInt(match24[1], 10);
        const minutes = match24[2];

        if (Number.isNaN(hours) || hours < 0 || hours > 23) {
            return raw;
        }

        const meridian = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        if (hours === 0) hours = 12;

        return `${hours}:${minutes} ${meridian}`;
    }

    return raw;
}

/* =========================================================
   BUS CONTACT BY START TIME ONLY
   2:00 PM + 4:00 AM => 9209471309
   4:00 PM + 3:00 AM => 9273635316
========================================================= */
function getBusContactNumber(startTime = "") {
    const time12 = formatTime12Hour(startTime).toLowerCase();

    // 2:00 PM and 4:00 AM => 9209471309
    if (["2:00 pm", "4:00 am"].includes(time12)) {
        return "9209471309";
    }

    // 4:00 PM and 3:00 AM => 9273635316
    if (["4:00 pm", "3:00 am"].includes(time12)) {
        return "9273635316";
    }

    // Default fallback
    return FIXED_HELPLINE;
}

function infoRow(label, value, highlight = false) {
    return `
        <tr>
            <td style="
                padding: 12px 0;
                width: 38%;
                color: #64748b;
                font-size: 14px;
                font-weight: 600;
                vertical-align: top;
                border-bottom: 1px solid #f1f5f9;
            ">
                ${escapeHtml(label)}
            </td>
            <td style="
                padding: 12px 0;
                color: ${highlight ? "#ea580c" : "#0f172a"};
                font-size: 15px;
                font-weight: ${highlight ? "800" : "700"};
                vertical-align: top;
                border-bottom: 1px solid #f1f5f9;
            ">
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
            <div style="text-align:center; margin: 28px 0 6px;">
                <a href="${buttonUrl}" style="
                    display:inline-block;
                    padding: 14px 28px;
                    border-radius: 12px;
                    background: #ea580c;
                    color: #ffffff;
                    text-decoration: none;
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 0.2px;
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
            <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
                ${escapeHtml(preheader)}
            </div>

            <div style="width:100%; background:#f8fafc; padding:24px 12px;">
                <div style="
                    max-width:680px;
                    margin:0 auto;
                    background:#ffffff;
                    border:1px solid #e2e8f0;
                    border-radius:20px;
                    overflow:hidden;
                    box-shadow:0 8px 28px rgba(15,23,42,0.06);
                ">
                    <!-- Header -->
                    <div style="
                        background:#ea580c;
                        padding:28px 24px;
                        text-align:center;
                        color:#ffffff;
                    ">
                        <div style="
                            display:inline-block;
                            background: rgba(255,255,255,0.14);
                            border:1px solid rgba(255,255,255,0.18);
                            padding:6px 14px;
                            border-radius:999px;
                            font-size:11px;
                            font-weight:700;
                            letter-spacing:1px;
                            margin-bottom:14px;
                        ">
                            ${safeBadgeText}
                        </div>

                        <h1 style="
                            margin:0;
                            font-size:38px;
                            line-height:1.15;
                            font-weight:800;
                            letter-spacing:-0.5px;
                        ">
                            ${safeTitle}
                        </h1>

                        <p style="
                            margin:10px 0 0;
                            font-size:16px;
                            line-height:1.5;
                            color:rgba(255,255,255,0.92);
                        ">
                            ${safeSubtitle}
                        </p>
                    </div>

                    <!-- Body -->
                    <div style="padding:30px 24px;">
                        ${introTitle
            ? `
                            <h2 style="
                                margin:0 0 12px;
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
                                line-height:1.8;
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
                        background:#ffffff;
                        border-top:1px solid #e2e8f0;
                        padding:18px 24px 22px;
                        text-align:center;
                    ">
                        <p style="margin:0; font-size:13px; color:#64748b;">
                            ${safeFooterNote}
                        </p>
                        <p style="margin:8px 0 0; font-size:12px; color:#94a3b8;">
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
            border:1px solid #e2e8f0;
            border-radius:18px;
            overflow:hidden;
        ">
            <div style="
                background:#fff7ed;
                padding:14px 18px;
                border-bottom:1px solid #fed7aa;
                font-size:15px;
                font-weight:800;
                letter-spacing:0.2px;
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

function createOtpCard(otp) {
    return `
        <div style="
            margin:22px 0;
            background:#fff7ed;
            border:1px solid #fdba74;
            border-radius:18px;
            padding:24px 20px;
            text-align:center;
        ">
            <p style="
                margin:0 0 10px;
                font-size:12px;
                color:#9a3412;
                font-weight:700;
                letter-spacing:0.6px;
            ">
                YOUR OTP CODE
            </p>

            <div style="
                font-size:38px;
                font-weight:800;
                color:#ea580c;
                letter-spacing:8px;
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
                bg: "#f0fdf4",
                border: "#86efac",
                color: "#166534",
            }
            : type === "danger"
                ? {
                    bg: "#fef2f2",
                    border: "#fecaca",
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
            border-radius:14px;
            padding:15px 16px;
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
                font-size:12px;
                color:#9a3412;
                font-weight:700;
                letter-spacing:0.5px;
            ">
                TEMPORARY PASSWORD
            </p>
            <div style="
                display:inline-block;
                background:#ffffff;
                border:1px dashed #f97316;
                border-radius:12px;
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
            "<strong>Important:</strong> Please keep this password secure and change it after your first login."
        )}
        `,
        buttonText: "Login to SA Tours",
        buttonUrl: loginUrl,
        footerNote: "Need help logging in? Contact SA Tours support.",
    });

    try {
        const info = await sendMailWithRetry({
            from: `"SA Tours" <${smtpUser}>`,
            to: email,
            subject: "Welcome to SA Tours - Your Login Credentials",
            html: htmlContent,
        });

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
        footerNote:
            "If this wasn't you, your account remains safe unless the OTP is shared.",
    });

    try {
        const info = await sendMailWithRetry({
            from: `"SA Tours" <${smtpUser}>`,
            to: email,
            subject: "SA Tours - Your Password Reset OTP",
            html: htmlContent,
        });

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
    const pickupName = normalizeStopName(booking.pickup || "");
    const dropName = normalizeStopName(booking.drop || "");

    const formattedStartTime = formatTime12Hour(booking.startTime || "");
    const formattedEndTime = formatTime12Hour(booking.endTime || "");
    const formattedPickupTime = booking.pickupTime ? formatTime12Hour(booking.pickupTime) : "";
    const formattedDropTime = booking.dropTime ? formatTime12Hour(booking.dropTime) : "";

    try {
        const db = getAdminDb();
        const busId = booking.busId || null;
        if (busId) {
            await db.ref(`buses/${busId}`).once("value");
        }
    } catch (e) {
        console.warn("Failed to load bus info for email:", e?.message || e);
    }

    const helpline = FIXED_HELPLINE;
    const bookingContact = FIXED_BUS_BOOKING;
    const busContact = getBusContactNumber(booking.startTime || "");
    const paymentMethod = getPaymentMethod(booking);

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
            `${booking.date || "--"} • ${formattedStartTime} → ${formattedEndTime}`
        )}
            ${infoRow("Seat Number", booking.seatNo || "--")}
            ${infoRow("Ticket No", booking.ticket || "--")}
            ${infoRow("Helpline", helpline)}
            ${infoRow("Bus Booking", bookingContact)}
            ${infoRow("Bus Contact", busContact)}
            ${infoRow(
            "Pickup Point",
            `${pickupName || "--"}${formattedPickupTime ? ` (${formattedPickupTime})` : ""}`
        )}
            ${infoRow(
            "Drop Point",
            `${dropName || "--"}${formattedDropTime ? ` (${formattedDropTime})` : ""}`
        )}
        `
    );

    let paymentRows = "";
    if (booking.payment || booking.paymentMethod || booking.fare !== undefined) {
        paymentRows += infoRow(
            "Fare",
            booking.fare !== undefined ? formatCurrency(booking.fare) : "--",
            true
        );
        paymentRows += infoRow("Payment Method", paymentMethod || "Online Payment");
        if (booking.payment) {
            paymentRows += infoRow("Payment ID", booking.payment);
        }
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
            ${paymentRows ? createInfoCard("Payment Details", paymentRows) : ""}
            ${createAlertBox(
            "<strong>Travel Reminder:</strong> Please arrive at your pickup point at least 10–15 minutes before departure.",
            "success"
        )}
        `,
        buttonText: "View My Bookings",
        buttonUrl: APP_URL,
        footerNote: "Wishing you a safe and comfortable journey with SA Tours.",
    });

    let attachments = [];
    try {
        let PDFDocument;
        try {
            const pdfMod = await import("pdfkit");
            PDFDocument = pdfMod?.default || pdfMod;
        } catch (impErr) {
            try {
                PDFDocument = require("pdfkit");
            } catch (reqErr) {
                throw new Error("pdfkit import failed");
            }
        }

        const doc = new PDFDocument({
            size: "A4",
            margin: 40,
            info: {
                Title: "SA Tours Booking Receipt",
                Author: "SA Tours",
            },
        });

        const chunks = [];
        doc.on("data", (c) => chunks.push(c));
        const endPromise = new Promise((res) => doc.on("end", res));

        // Colors
        const ORANGE = "#ea580c";
        const DARK = "#0f172a";
        const MUTED = "#64748b";
        const BORDER = "#e2e8f0";
        const LIGHT = "#fff7ed";
        const WHITE = "#ffffff";

        // Header card
        doc.roundedRect(40, 35, 515, 90, 14).fill(ORANGE);
        doc
            .fillColor(WHITE)
            .font("Helvetica-Bold")
            .fontSize(11)
            .text("BOOKING RECEIPT", 40, 50, { width: 515, align: "center" });

        doc
            .fontSize(24)
            .text("SA Tours", 40, 68, { width: 515, align: "center" });

        doc
            .font("Helvetica")
            .fontSize(11)
            .text("Your trip details and payment summary", 40, 98, {
                width: 515,
                align: "center",
            });

        let y = 150;

        // Receipt meta
        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(14).text("Passenger Details", 40, y);
        y += 18;

        doc.roundedRect(40, y, 515, 82, 10).fillAndStroke("#ffffff", BORDER);

        const leftX = 56;
        const valueX = 180;

        const passengerRows = [
            ["Passenger Name", name || "Passenger"],
            ["Bus", `${booking.busNumber || "--"}${booking.routeName ? ` — ${booking.routeName}` : ""}`],
            ["Seat Number", booking.seatNo || "--"],
            ["Ticket No", booking.ticket || "--"],
        ];

        let rowY = y + 14;
        passengerRows.forEach(([label, value]) => {
            doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(10).text(label, leftX, rowY, { width: 110 });
            doc.fillColor(DARK).font("Helvetica").fontSize(10).text(String(value), valueX, rowY, { width: 330 });
            rowY += 20;
        });

        y += 105;

        // Journey Details
        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(14).text("Journey Details", 40, y);
        y += 18;

        doc.roundedRect(40, y, 515, 120, 10).fillAndStroke("#ffffff", BORDER);

        const journeyRows = [
            ["Travel Date", booking.date || "--"],
            ["Travel Time", `${formattedStartTime} → ${formattedEndTime}`],
            ["Pickup Point", `${pickupName || "--"}${formattedPickupTime ? ` (${formattedPickupTime})` : ""}`],
            ["Drop Point", `${dropName || "--"}${formattedDropTime ? ` (${formattedDropTime})` : ""}`],
            ["Bus Contact", busContact],
        ];

        rowY = y + 14;
        journeyRows.forEach(([label, value]) => {
            doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(10).text(label, leftX, rowY, { width: 110 });
            doc.fillColor(label === "Bus Contact" ? ORANGE : DARK)
                .font(label === "Bus Contact" ? "Helvetica-Bold" : "Helvetica")
                .fontSize(10)
                .text(String(value), valueX, rowY, { width: 330 });
            rowY += 20;
        });

        y += 142;

        // Payment Details
        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(14).text("Payment Details", 40, y);
        y += 18;

        doc.roundedRect(40, y, 515, 95, 10).fillAndStroke(LIGHT, BORDER);

        const paymentRowsPdf = [
            ["Fare", booking.fare !== undefined ? formatCurrency(booking.fare) : "--"],
            ["Payment Method", paymentMethod || "Online Payment"],
            ["Payment ID", booking.payment || "--"],
        ];

        rowY = y + 16;
        paymentRowsPdf.forEach(([label, value]) => {
            doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(10).text(label, leftX, rowY, { width: 110 });
            doc.fillColor(label === "Fare" ? ORANGE : DARK)
                .font(label === "Fare" ? "Helvetica-Bold" : "Helvetica")
                .fontSize(10)
                .text(String(value), valueX, rowY, { width: 330 });
            rowY += 22;
        });

        y += 120;

        // Support box
        doc.roundedRect(40, y, 515, 58, 10).fillAndStroke("#f8fafc", BORDER);

        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11).text("Support Contacts", 56, y + 12);
        doc.fillColor(MUTED).font("Helvetica").fontSize(10).text(
            `Helpline: ${helpline}    •    Bus Booking: ${bookingContact}    •    Bus Contact: ${busContact}`,
            56,
            y + 30,
            { width: 470 }
        );

        y += 82;

        // Footer note
        doc.fillColor(MUTED)
            .font("Helvetica")
            .fontSize(9)
            .text(
                "Please arrive at your pickup point 10–15 minutes before departure. Keep this receipt for reference.",
                40,
                y,
                { width: 515, align: "center" }
            );

        doc.end();
        await endPromise;

        const pdfBuffer = Buffer.concat(chunks);
        if (pdfBuffer?.length) {
            attachments.push({
                filename: "sa-tours-booking-receipt.pdf",
                content: pdfBuffer,
                contentType: "application/pdf",
            });
        }
    } catch (e) {
        console.warn("PDF generation failed (pdfkit may not be installed):", e?.message || e);
    }

    try {
        const info = await sendMailWithRetry({
            from: `"SA Tours" <${smtpUser}>`,
            to: email,
            subject: `Booking Confirmed — ${booking.busNumber || "SA Tours"}`,
            html: htmlContent,
            attachments,
        });

        console.log("Booking confirmation email sent:", info?.messageId || info);
        return true;
    } catch (error) {
        console.error("Error sending booking confirmation email:", error?.message || error);
        throw new Error(
            "Failed to send booking confirmation email: " + (error?.message || String(error))
        );
    }
}

/* =========================================================
   4) BOOKING CANCELLATION EMAIL
========================================================= */
export async function sendBookingCancellation(email, name, booking = {}) {
    const pickupName = normalizeStopName(booking.pickup || "");
    const dropName = normalizeStopName(booking.drop || "");

    const formattedStartTime = formatTime12Hour(booking.startTime || "");
    const formattedEndTime = formatTime12Hour(booking.endTime || "");
    const formattedPickupTime = booking.pickupTime ? formatTime12Hour(booking.pickupTime) : "";
    const formattedDropTime = booking.dropTime ? formatTime12Hour(booking.dropTime) : "";

    try {
        const db = getAdminDb();
        const busId = booking.busId || null;
        if (busId) {
            await db.ref(`buses/${busId}`).once("value");
        }
    } catch (e) {
        console.warn("Failed to load bus info for cancellation email:", e?.message || e);
    }

    const helpline = FIXED_HELPLINE;
    const bookingContact = FIXED_BUS_BOOKING;
    const busContact = getBusContactNumber(booking.startTime || "");
    const paymentMethod = getPaymentMethod(booking);

    let paymentRows = "";
    if (booking.payment || booking.paymentMethod || booking.fare !== undefined) {
        paymentRows += infoRow(
            "Fare",
            booking.fare !== undefined ? formatCurrency(booking.fare) : "--",
            true
        );
        paymentRows += infoRow("Payment Method", paymentMethod || "Online Payment");
        if (booking.payment) {
            paymentRows += infoRow("Payment ID", booking.payment);
        }
    }

    const bookingCard = createInfoCard(
        "Cancelled Booking Details",
        `
            ${infoRow("Passenger Name", name || "Passenger")}
            ${infoRow(
            "Bus",
            `${booking.busNumber || "--"}${booking.routeName ? ` — ${booking.routeName}` : ""}`
        )}
            ${infoRow(
            "Travel Date & Time",
            `${booking.date || "--"} • ${formattedStartTime} → ${formattedEndTime}`
        )}
            ${infoRow("Seat Number", booking.seatNo || "--")}
            ${infoRow("Helpline", helpline)}
            ${infoRow("Bus Booking", bookingContact)}
            ${infoRow("Bus Contact", busContact)}
            ${infoRow(
            "Pickup Point",
            `${pickupName || "--"}${formattedPickupTime ? ` (${formattedPickupTime})` : ""}`
        )}
            ${infoRow(
            "Drop Point",
            `${dropName || "--"}${formattedDropTime ? ` (${formattedDropTime})` : ""}`
        )}
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
            ${paymentRows ? createInfoCard("Payment Details", paymentRows) : ""}
            ${createAlertBox(
            "<strong>Need Help?</strong> Contact support if you need assistance with rescheduling or a future booking.",
            "warning"
        )}
        `,
        buttonText: "View My Bookings",
        buttonUrl: APP_URL,
        footerNote: "We hope to serve you again soon with SA Tours.",
    });

    try {
        const info = await sendMailWithRetry({
            from: `"SA Tours" <${smtpUser}>`,
            to: email,
            subject: `Booking Cancelled — ${booking.busNumber || "SA Tours"}`,
            html: htmlContent,
        });

        console.log("Booking cancellation email sent:", info?.messageId || info);
        return true;
    } catch (error) {
        console.error("Error sending booking cancellation email:", error?.message || error);
        throw new Error(
            "Failed to send booking cancellation email: " + (error?.message || String(error))
        );
    }
}