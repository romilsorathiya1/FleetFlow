import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function sendOTPEmail(to, otp) {
    const mailOptions = {
        from: `"FleetFlow" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'FleetFlow — Password Reset OTP',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0f172a; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #f1f5f9; font-size: 24px; margin: 0;">Fleet<span style="color: #3B82F6;">Flow</span></h1>
                    <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
                </div>
                <div style="background: #1e293b; border-radius: 10px; padding: 24px; text-align: center; border: 1px solid #334155;">
                    <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 16px;">Use this OTP to reset your password:</p>
                    <div style="font-size: 36px; font-weight: 700; color: #3B82F6; letter-spacing: 8px; font-family: monospace; margin: 16px 0;">${otp}</div>
                    <p style="color: #64748b; font-size: 12px; margin: 16px 0 0;">This OTP expires in <strong style="color: #f59e0b;">10 minutes</strong>.</p>
                </div>
                <p style="color: #475569; font-size: 12px; text-align: center; margin-top: 24px;">
                    If you didn't request this, you can safely ignore this email.
                </p>
            </div>
        `,
    };

    return transporter.sendMail(mailOptions);
}
