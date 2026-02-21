import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// GET /api/users/[id]
export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const user = await User.findById(id).lean();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/users/[id]
export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        const updateData = {};
        if (body.name) updateData.name = body.name;
        if (body.email) updateData.email = body.email;
        if (body.role) updateData.role = body.role;
        if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive;

        // If password is provided, hash it
        if (body.password && body.password.length >= 6) {
            updateData.password = await bcrypt.hash(body.password, 12);
        }

        const user = await User.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json(
                { error: 'A user with this email already exists', field: 'email', code: 'DUPLICATE' },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/users/[id] — deactivate user
export async function DELETE(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        const user = await User.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User deactivated', user });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
