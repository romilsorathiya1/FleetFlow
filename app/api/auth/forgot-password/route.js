import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { sendOTPEmail } from '@/lib/mailer';

// In-memory OTP store (good enough for single-server setup)
// In production, use Redis or a DB collection with TTL
const otpStore = global.__otpStore || (global.__otpStore = new Map());

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/forgot-password — Send OTP to email
export async function POST(request) {
    try {
        await dbConnect();
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return NextResponse.json(
                { error: 'No account found with this email address' },
                { status: 404 }
            );
        }

        if (!user.isActive) {
            return NextResponse.json(
                { error: 'This account has been deactivated. Contact your administrator.' },
                { status: 403 }
            );
        }

        const otp = generateOTP();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        otpStore.set(email.toLowerCase(), { otp, expiresAt, attempts: 0 });

        // Send OTP email
        await sendOTPEmail(email, otp);

        return NextResponse.json({
            message: 'OTP sent successfully to your email',
            email: email.toLowerCase(),
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Failed to send OTP. Please try again.' },
            { status: 500 }
        );
    }
}
