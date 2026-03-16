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
    secure: false, // use TLS
    auth: {
        user: smtpUser,
        pass: smtpPass,
    },
    tls: {
        rejectUnauthorized: !allowSelfSignedCert,
    },
});
/**
 * Send signup welcome email with generated password
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} generatedPassword - Generated password
 */
export async function sendSignupEmail(email, name, generatedPassword) {
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #7a1c1c; color: white; padding: 20px; border-radius: 5px; text-align: center; }
                .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
                .password-box { background-color: #fff; border: 2px solid #7a1c1c; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
                .password { font-size: 24px; font-weight: bold; color: #7a1c1c; letter-spacing: 2px; font-family: monospace; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
                .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; color: #856404; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to College Portal</h1>
                </div>
                
                <div class="content">
                    <p>Hello <strong>${name}</strong>,</p>
                    
                    <p>Your account has been successfully created! Below is your login credentials:</p>
                    
                    <div class="password-box">
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Your Password:</strong></p>
                        <div class="password">${generatedPassword}</div>
                    </div>
                    
                    <div class="warning">
                        <strong>Important:</strong> Please save this password in a secure location. You'll need it to login to your account. Consider changing it after your first login.
                    </div>
                    
                    <p>You can now login at: <strong>https://snk-college.vercel.app/login</strong></p>
                    
                    <p>If you have any questions or need assistance, please contact our support team.</p>
                    
                    <p>Best regards,<br>College Portal Team</p>
                </div>
                
                <div class="footer">
                    <p>&copy; 2026 College Portal. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const mailOptions = {
            from: smtpUser,
            to: email,
            subject: "Welcome to College Portal - Your Login Credentials",
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email: " + error.message);
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
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #7a1c1c; color: white; padding: 20px; border-radius: 5px; text-align: center; }
                .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
                .otp-box { background: #fff; border: 2px solid #7a1c1c; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                .otp-code { font-size: 40px; font-weight: bold; color: #7a1c1c; letter-spacing: 10px; font-family: monospace; }
                .note { background: #fff3cd; border: 1px solid #ffc107; color: #856404; border-radius: 5px; padding: 10px; margin-top: 16px; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset OTP</h1>
                </div>

                <div class="content">
                    <p>We received a request to reset your password for <strong>${email}</strong>.</p>

                    <p>Use the following 6-digit OTP to reset your password:</p>

                    <div class="otp-box">
                        <p style="margin:0 0 8px 0; color:#555;">Your OTP Code</p>
                        <div class="otp-code">${otp}</div>
                        <p style="margin:10px 0 0 0; color:#888; font-size:13px;">Valid for 10 minutes</p>
                    </div>

                    <div class="note">
                        Do not share this OTP with anyone. If you did not request this, you can safely ignore this email.
                    </div>
                </div>

                <div class="footer">
                    <p>&copy; 2026 SA Tours. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const mailOptions = {
            from: smtpUser,
            to: email,
            subject: "SA Tours - Your Password Reset OTP",
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Forgot password guidance email sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending forgot password email:", error);
        throw new Error("Failed to send forgot password email: " + error.message);
    }
}
