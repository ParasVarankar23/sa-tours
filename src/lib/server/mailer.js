function orangeTemplate(title, bodyHtml) {
    return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
      <div style="background:#f97316;padding:18px 22px;color:white;font-size:20px;font-weight:700">SA Tours & Travels</div>
      <div style="padding:22px;background:#ffffff;color:#0f172a">
        <h2 style="margin:0 0 12px 0;color:#0f172a">${title}</h2>
        ${bodyHtml}
        <p style="margin-top:24px;color:#64748b;font-size:13px">If you did not request this, you can ignore this email.</p>
      </div>
    </div>`;
}

async function sendViaSmtp({ to, subject, html }) {
    let nodemailer;
    try {
        nodemailer = (await import("nodemailer")).default;
    } catch {
        return false;
    }

    const user = process.env.SMTP_EMAIL;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) return false;

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
        tls: {
            rejectUnauthorized: process.env.SMTP_ALLOW_SELF_SIGNED !== "true",
        },
    });

    await transporter.sendMail({
        from: `SA Tours & Travels <${user}>`,
        to,
        subject,
        html,
    });

    return true;
}

export async function sendSignupPasswordEmail(email, fullName, password) {
    const html = orangeTemplate(
        "Your Account Is Ready",
        `<p style="margin:0 0 12px 0">Hi ${fullName || "User"},</p>
         <p style="margin:0 0 12px 0">Your account has been created successfully.</p>
         <p style="margin:0 0 10px 0"><strong>Login Password:</strong></p>
         <div style="display:inline-block;background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:10px 14px;font-size:18px;font-weight:700;color:#c2410c">${password}</div>
         <p style="margin-top:14px">Please change your password after first login.</p>`
    );

    const sent = await sendViaSmtp({
        to: email,
        subject: "SA Tours & Travels - Signup Password",
        html,
    });

    if (!sent) {
        console.log("[EMAIL FALLBACK] signup password:", { email, password });
    }
}

export async function sendOtpEmail(email, otp) {
    const html = orangeTemplate(
        "Password Reset OTP",
        `<p style="margin:0 0 12px 0">Use this OTP to reset your password:</p>
         <div style="display:inline-block;background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:10px 14px;font-size:22px;letter-spacing:4px;font-weight:700;color:#c2410c">${otp}</div>
         <p style="margin-top:14px">This OTP is valid for 10 minutes.</p>`
    );

    const sent = await sendViaSmtp({
        to: email,
        subject: "SA Tours & Travels - Reset OTP",
        html,
    });

    if (!sent) {
        console.log("[EMAIL FALLBACK] otp:", { email, otp });
    }
}
