import nodemailer from "nodemailer";

const allowSelfSignedCert = process.env.SMTP_ALLOW_SELF_SIGNED === "true";
const smtpUser = (process.env.SMTP_EMAIL || "").trim();
const smtpPass = (process.env.SMTP_PASS || "")
    .replaceAll(" ", "")
    .replaceAll("\t", "")
    .trim();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS
    auth: {
        user: smtpUser,
        pass: smtpPass,
    },
    tls: {
        rejectUnauthorized: !allowSelfSignedCert,
    },
});

// verify transporter on startup to produce helpful logs
transporter.verify()
    .then(() => console.log("SMTP transporter verified and ready"))
    .catch((err) => console.warn("SMTP transporter verification failed:", err && err.message ? err.message : err));

/**
 * Send signup welcome email with generated password
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} generatedPassword - Generated password
 */
export async function sendSignupEmail(email, name, generatedPassword) {
    const loginUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
        : "https://sa-tours.vercel.app/login";

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Welcome to SA Tours</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #f8fafc;
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #334155;
                }
                .wrapper {
                    width: 100%;
                    background-color: #f8fafc;
                    padding: 24px 0;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: #ffffff;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 1px solid #fed7aa;
                    box-shadow: 0 10px 30px rgba(249, 115, 22, 0.08);
                }
                .header {
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: #ffffff;
                    padding: 28px 24px;
                    text-align: center;
                }
                .brand {
                    font-size: 28px;
                    font-weight: bold;
                    margin: 0;
                    letter-spacing: 0.5px;
                }
                .subtitle {
                    margin: 8px 0 0 0;
                    font-size: 14px;
                    opacity: 0.95;
                }
                .content {
                    padding: 28px 24px;
                    background-color: #ffffff;
                }
                .hello {
                    font-size: 16px;
                    margin: 0 0 16px 0;
                }
                .message {
                    margin: 0 0 18px 0;
                    font-size: 15px;
                    color: #475569;
                }
                .credential-box {
                    background: #fff7ed;
                    border: 1px solid #fdba74;
                    border-radius: 14px;
                    padding: 20px;
                    margin: 22px 0;
                }
                .credential-label {
                    font-size: 13px;
                    color: #9a3412;
                    margin-bottom: 6px;
                    font-weight: 600;
                }
                .credential-value {
                    font-size: 15px;
                    color: #1e293b;
                    font-weight: 700;
                    word-break: break-word;
                }
                .password-box {
                    margin-top: 16px;
                    padding: 16px;
                    background: #ffffff;
                    border: 2px dashed #f97316;
                    border-radius: 12px;
                    text-align: center;
                }
                .password-title {
                    margin: 0 0 8px 0;
                    font-size: 13px;
                    color: #9a3412;
                    font-weight: 600;
                }
                .password {
                    font-size: 28px;
                    font-weight: bold;
                    color: #ea580c;
                    letter-spacing: 2px;
                    font-family: monospace;
                }
                .warning {
                    background-color: #fff7ed;
                    border: 1px solid #fdba74;
                    color: #9a3412;
                    padding: 14px 16px;
                    border-radius: 12px;
                    margin: 20px 0;
                    font-size: 14px;
                }
                .button-wrap {
                    text-align: center;
                    margin: 24px 0;
                }
                .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: #ffffff !important;
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: bold;
                }
                .support {
                    margin-top: 18px;
                    font-size: 14px;
                    color: #64748b;
                }
                .footer {
                    text-align: center;
                    padding: 18px 24px 24px;
                    font-size: 12px;
                    color: #94a3b8;
                    background: #fffaf5;
                    border-top: 1px solid #ffedd5;
                }
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <h1 class="brand">SA Tours</h1>
                        <p class="subtitle">Your travel account is ready</p>
                    </div>

                    <div class="content">
                        <p class="hello">Hello <strong>${name}</strong>,</p>

                        <p class="message">
                            Welcome to <strong>SA Tours</strong>! Your account has been created successfully.
                            You can now log in and start exploring available buses, routes, and bookings.
                        </p>

                        <div class="credential-box">
                            <div class="credential-label">Registered Email</div>
                            <div class="credential-value">${email}</div>

                            <div class="password-box">
                                <p class="password-title">Your Temporary Password</p>
                                <div class="password">${generatedPassword}</div>
                            </div>
                        </div>

                        <div class="warning">
                            <strong>Important:</strong> Please keep this password secure. 
                            We recommend changing it after your first login for better security.
                        </div>

                        <div class="button-wrap">
                            <a href="${loginUrl}" class="button">Login to SA Tours</a>
                        </div>

                        <p class="support">
                            If you need any help, feel free to contact the SA Tours support team.
                        </p>
                    </div>

                    <div class="footer">
                        <p>&copy; 2026 SA Tours. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const mailOptions = {
            from: `"SA Tours" <${smtpUser}>`,
            to: email,
            subject: "Welcome to SA Tours - Your Login Credentials",
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Signup email sent successfully:", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending signup email:", error);
        throw new Error("Failed to send signup email: " + error.message);
    }
}

/**
 * Send forgot password OTP email
 * @param {string} email - User email
 * @param {string} otp - 6-digit OTP code
 */
export async function sendForgotPasswordEmail(email, otp) {
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>SA Tours Password Reset OTP</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #f8fafc;
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #334155;
                }
                .wrapper {
                    width: 100%;
                    background-color: #f8fafc;
                    padding: 24px 0;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: #ffffff;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 1px solid #fed7aa;
                    box-shadow: 0 10px 30px rgba(249, 115, 22, 0.08);
                }
                .header {
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: #ffffff;
                    padding: 28px 24px;
                    text-align: center;
                }
                .brand {
                    font-size: 28px;
                    font-weight: bold;
                    margin: 0;
                    letter-spacing: 0.5px;
                }
                .subtitle {
                    margin: 8px 0 0 0;
                    font-size: 14px;
                    opacity: 0.95;
                }
                .content {
                    padding: 28px 24px;
                    background-color: #ffffff;
                }
                .message {
                    margin: 0 0 18px 0;
                    font-size: 15px;
                    color: #475569;
                }
                .otp-box {
                    background: #fff7ed;
                    border: 2px solid #f97316;
                    border-radius: 14px;
                    padding: 22px;
                    text-align: center;
                    margin: 22px 0;
                }
                .otp-title {
                    margin: 0 0 8px 0;
                    font-size: 14px;
                    color: #9a3412;
                    font-weight: 600;
                }
                .otp-code {
                    font-size: 42px;
                    font-weight: bold;
                    color: #ea580c;
                    letter-spacing: 10px;
                    font-family: monospace;
                    margin: 8px 0;
                }
                .otp-expiry {
                    font-size: 13px;
                    color: #9ca3af;
                    margin-top: 8px;
                }
                .note {
                    background: #fff7ed;
                    border: 1px solid #fdba74;
                    color: #9a3412;
                    border-radius: 12px;
                    padding: 14px 16px;
                    margin-top: 16px;
                    font-size: 14px;
                }
                .footer {
                    text-align: center;
                    padding: 18px 24px 24px;
                    font-size: 12px;
                    color: #94a3b8;
                    background: #fffaf5;
                    border-top: 1px solid #ffedd5;
                }
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <h1 class="brand">SA Tours</h1>
                        <p class="subtitle">Password reset verification</p>
                    </div>

                    <div class="content">
                        <p class="message">
                            We received a request to reset the password for your <strong>SA Tours</strong> account:
                            <br /><strong>${email}</strong>
                        </p>

                        <p class="message">
                            Use the following 6-digit OTP to continue resetting your password:
                        </p>

                        <div class="otp-box">
                            <p class="otp-title">Your OTP Code</p>
                            <div class="otp-code">${otp}</div>
                            <p class="otp-expiry">Valid for 10 minutes</p>
                        </div>

                        <div class="note">
                            <strong>Security Note:</strong> Never share this OTP with anyone. 
                            If you did not request a password reset, you can safely ignore this email.
                        </div>
                    </div>

                    <div class="footer">
                        <p>&copy; 2026 SA Tours. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const mailOptions = {
            from: `"SA Tours" <${smtpUser}>`,
            to: email,
            subject: "SA Tours - Your Password Reset OTP",
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Forgot password OTP email sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending forgot password email:", error);
        throw new Error("Failed to send forgot password email: " + error.message);
    }
}

/**
 * Send booking confirmation email
 * @param {string} email - recipient email
 * @param {string} name - passenger name
 * @param {object} booking - booking details object (seatNo, busNumber, date, pickup, pickupTime, drop, dropTime, startTime, endTime, routeName)
 */
export async function sendBookingConfirmation(email, name, booking = {}) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sa-tours.vercel.app";

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Booking Confirmed - SA Tours</title>
            <style>
                body { font-family: Arial, sans-serif; background: #f8fafc; color: #334155; margin:0; padding:24px; }
                .card { max-width:600px; margin:0 auto; background:#fff; border-radius:12px; padding:20px; border:1px solid #fed7aa; }
                .brand { background:linear-gradient(135deg,#f97316,#ea580c); color:#fff; padding:16px; border-radius:8px; text-align:center; font-size:20px; font-weight:700; }
                .section { margin-top:16px; }
                .label { font-size:13px; color:#64748b; }
                .value { font-size:15px; color:#0f172a; font-weight:600; }
                .cta { display:block; text-align:center; margin-top:18px; }
                .button { display:inline-block; padding:10px 16px; border-radius:8px; background:linear-gradient(135deg,#f97316,#ea580c); color:#fff; text-decoration:none; font-weight:700; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="brand">SA Tours — Booking Confirmed</div>
                <div class="section">
                    <p class="label">Hello <strong>${name || "Passenger"}</strong>,</p>
                    <p class="label">Your booking has been confirmed. Below are the details:</p>
                </div>

                <div class="section">
                    <div class="label">Bus</div>
                    <div class="value">${booking.busNumber || "--"} ${booking.routeName ? `— ${booking.routeName}` : ""}</div>
                    <div class="label">Date & Time</div>
                    <div class="value">${booking.date || "--"} • ${booking.startTime || "--:--"} → ${booking.endTime || "--:--"}</div>
                    <div class="label">Seat</div>
                    <div class="value">${booking.seatNo || "--"}</div>
                    <div class="label">Pickup</div>
                    <div class="value">${booking.pickup || "--"} ${booking.pickupTime ? `(${booking.pickupTime})` : ""}</div>
                    <div class="label">Drop</div>
                    <div class="value">${booking.drop || "--"} ${booking.dropTime ? `(${booking.dropTime})` : ""}</div>
                </div>

                <div class="section cta">
                    <a class="button" href="${appUrl}">View your bookings</a>
                </div>

                <div class="section" style="margin-top:10px; font-size:12px; color:#94a3b8">If you did not expect this email, please contact SA Tours support.</div>
            </div>
        </body>
        </html>
    `;

    try {
        const mailOptions = {
            from: `"SA Tours" <${smtpUser}>`,
            to: email,
            subject: `Booking Confirmed — ${booking.busNumber || "SA Tours"}`,
            html: htmlContent,
        };

        // diagnostic log (avoid logging credentials)
        console.log("sendBookingConfirmation: sending to", email, "subject:", mailOptions.subject);

        const info = await transporter.sendMail(mailOptions);
        console.log("Booking confirmation email sent:", info && info.messageId ? info.messageId : info);
        return true;
    } catch (error) {
        console.error("Error sending booking confirmation email:", error && error.message ? error.message : error);
        throw new Error("Failed to send booking confirmation email: " + (error && error.message ? error.message : String(error)));
    }
}

/**
 * Send booking cancellation email
 * @param {string} email - recipient email
 * @param {string} name - passenger name
 * @param {object} booking - booking details object (seatNo, busNumber, date, pickup, pickupTime, drop, dropTime, startTime, endTime, routeName)
 */
export async function sendBookingCancellation(email, name, booking = {}) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sa-tours.vercel.app";

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Booking Cancelled - SA Tours</title>
            <style>
                body { font-family: Arial, sans-serif; background: #f8fafc; color: #334155; margin:0; padding:24px; }
                .card { max-width:600px; margin:0 auto; background:#fff; border-radius:12px; padding:20px; border:1px solid #fed7aa; }
                .brand { background:linear-gradient(135deg,#f97316,#ea580c); color:#fff; padding:16px; border-radius:8px; text-align:center; font-size:20px; font-weight:700; }
                .section { margin-top:16px; }
                .label { font-size:13px; color:#64748b; }
                .value { font-size:15px; color:#0f172a; font-weight:600; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="brand">SA Tours — Booking Cancelled</div>
                <div class="section">
                    <p class="label">Hello <strong>${name || "Passenger"}</strong>,</p>
                    <p class="label">Your booking has been cancelled. Details below:</p>
                </div>

                <div class="section">
                    <div class="label">Bus</div>
                    <div class="value">${booking.busNumber || "--"} ${booking.routeName ? `— ${booking.routeName}` : ""}</div>
                    <div class="label">Date & Time</div>
                    <div class="value">${booking.date || "--"} • ${booking.startTime || "--:--"} → ${booking.endTime || "--:--"}</div>
                    <div class="label">Seat</div>
                    <div class="value">${booking.seatNo || "--"}</div>
                    <div class="label">Pickup</div>
                    <div class="value">${booking.pickup || "--"} ${booking.pickupTime ? `(${booking.pickupTime})` : ""}</div>
                    <div class="label">Drop</div>
                    <div class="value">${booking.drop || "--"} ${booking.dropTime ? `(${booking.dropTime})` : ""}</div>
                </div>

                <div class="section" style="margin-top:10px; font-size:12px; color:#94a3b8">If you think this was a mistake, please contact SA Tours support.</div>
            </div>
        </body>
        </html>
    `;

    try {
        const mailOptions = {
            from: `"SA Tours" <${smtpUser}>`,
            to: email,
            subject: `Booking Cancelled — ${booking.busNumber || "SA Tours"}`,
            html: htmlContent,
        };

        console.log("sendBookingCancellation: sending to", email, "subject:", mailOptions.subject);
        const info = await transporter.sendMail(mailOptions);
        console.log("Booking cancellation email sent:", info && info.messageId ? info.messageId : info);
        return true;
    } catch (error) {
        console.error("Error sending booking cancellation email:", error && error.message ? error.message : error);
        throw new Error("Failed to send booking cancellation email: " + (error && error.message ? error.message : String(error)));
    }
}