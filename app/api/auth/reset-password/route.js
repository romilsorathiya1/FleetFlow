import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

const otpStore = global.__otpStore || (global.__otpStore = new Map());

// POST /api/auth/reset-password — Reset password after OTP verification
export async function POST(request) {
    try {
        await dbConnect();
        const { email, password, confirmPassword } = await request.json();

        if (!email || !password || !confirmPassword) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: 'Passwords do not match' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Verify OTP was completed
        const stored = otpStore.get(email.toLowerCase());
        if (!stored || !stored.verified) {
            return NextResponse.json(
                { error: 'OTP verification required. Please start over.' },
                { status: 403 }
            );
        }

        // Hash and update password
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { password: hashedPassword },
            { new: true }
        );

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Clean up OTP store
        otpStore.delete(email.toLowerCase());

        return NextResponse.json({
            message: 'Password reset successfully. You can now log in with your new password.',
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Failed to reset password' },
            { status: 500 }
        );
    }
}
