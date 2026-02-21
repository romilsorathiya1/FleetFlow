import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// GET /api/users/seed — Seed default test users
export async function GET() {
    try {
        await dbConnect();

        const existingUsers = await User.countDocuments();
        if (existingUsers > 0) {
            return NextResponse.json(
                { message: `Database already has ${existingUsers} users. Seed skipped.` },
                { status: 200 }
            );
        }

        const SALT_ROUNDS = 12;

        const users = [
            {
                name: 'Admin Manager',
                email: 'admin@fleetflow.com',
                password: await bcrypt.hash('Admin@123', SALT_ROUNDS),
                role: 'fleet_manager',
                isActive: true,
            },
            {
                name: 'Dispatcher User',
                email: 'dispatch@fleetflow.com',
                password: await bcrypt.hash('Dispatch@123', SALT_ROUNDS),
                role: 'dispatcher',
                isActive: true,
            },
            {
                name: 'Safety Officer',
                email: 'safety@fleetflow.com',
                password: await bcrypt.hash('Safety@123', SALT_ROUNDS),
                role: 'safety_officer',
                isActive: true,
            },
            {
                name: 'Finance Analyst',
                email: 'finance@fleetflow.com',
                password: await bcrypt.hash('Finance@123', SALT_ROUNDS),
                role: 'financial_analyst',
                isActive: true,
            },
        ];

        const created = await User.insertMany(users);

        return NextResponse.json({
            message: `Successfully seeded ${created.length} users`,
            users: created.map((u) => ({
                name: u.name,
                email: u.email,
                role: u.role,
            })),
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
