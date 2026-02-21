import { NextResponse } from 'next/server';

const otpStore = global.__otpStore || (global.__otpStore = new Map());

// POST /api/auth/verify-otp — Verify the OTP
export async function POST(request) {
    try {
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return NextResponse.json(
                { error: 'Email and OTP are required' },
                { status: 400 }
            );
        }

        const stored = otpStore.get(email.toLowerCase());

        if (!stored) {
            return NextResponse.json(
                { error: 'No OTP found. Please request a new one.' },
                { status: 400 }
            );
        }

        // Check expiration
        if (Date.now() > stored.expiresAt) {
            otpStore.delete(email.toLowerCase());
            return NextResponse.json(
                { error: 'OTP has expired. Please request a new one.' },
                { status: 400 }
            );
        }

        // Check max attempts
        if (stored.attempts >= 5) {
            otpStore.delete(email.toLowerCase());
            return NextResponse.json(
                { error: 'Too many incorrect attempts. Please request a new OTP.' },
                { status: 429 }
            );
        }

        // Verify OTP
        if (stored.otp !== otp) {
            stored.attempts += 1;
            return NextResponse.json(
                { error: `Incorrect OTP. ${5 - stored.attempts} attempts remaining.` },
                { status: 400 }
            );
        }

        // OTP is correct — mark as verified
        stored.verified = true;

        return NextResponse.json({
            message: 'OTP verified successfully',
            verified: true,
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        );
    }
}
