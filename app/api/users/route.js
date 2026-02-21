import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkRateLimit } from '@/lib/rateLimit';
import { validateRequired, validateEmail, sanitizeBody } from '@/lib/validation';

// GET /api/users — list all users
export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const role = searchParams.get('role');

        const query = {};
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const users = await User.find(query).sort({ createdAt: -1 }).lean();

        // Role counts
        const counts = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
        ]);
        const roleCounts = { total: 0 };
        counts.forEach((c) => {
            roleCounts[c._id] = c.count;
            roleCounts.total += c.count;
        });

        const activeCount = await User.countDocuments({ isActive: true });
        const inactiveCount = await User.countDocuments({ isActive: false });
        roleCounts.active = activeCount;
        roleCounts.inactive = inactiveCount;

        return NextResponse.json({ users, roleCounts });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/users — create new user
export async function POST(request) {
    try {
        const rateLimited = checkRateLimit(request);
        if (rateLimited) return rateLimited;

        await dbConnect();
        const body = await request.json();

        sanitizeBody(body, { name: 100, email: 150 });

        const reqError = validateRequired(body, ['name', 'email', 'password', 'role']);
        if (reqError) {
            return NextResponse.json(reqError, { status: 400 });
        }

        const emailError = validateEmail(body.email);
        if (emailError) {
            return NextResponse.json(emailError, { status: 400 });
        }

        const validRoles = ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'];
        if (!validRoles.includes(body.role)) {
            return NextResponse.json(
                { error: 'Invalid role', field: 'role', code: 'INVALID_ENUM' },
                { status: 400 }
            );
        }

        if (body.password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters', field: 'password', code: 'FIELD_TOO_SHORT' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(body.password, 12);

        const user = await User.create({
            name: body.name,
            email: body.email,
            password: hashedPassword,
            role: body.role,
            isActive: true,
        });

        // Return without password
        const created = await User.findById(user._id).lean();
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json(
                { error: 'A user with this email already exists', field: 'email', code: 'DUPLICATE' },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: error.message, code: 'SERVER_ERROR' }, { status: 500 });
    }
}
