import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Driver from '@/models/Driver';
import { checkRateLimit } from '@/lib/rateLimit';
import { validateRequired, validateEmail, sanitizeBody } from '@/lib/validation';

// GET /api/drivers — list with filters
export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const licenseCategory = searchParams.get('licenseCategory');
        const search = searchParams.get('search');

        const query = {};
        if (status) query.status = status;
        if (licenseCategory) query.licenseCategory = licenseCategory;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        const drivers = await Driver.find(query).sort({ createdAt: -1 }).lean();

        const now = new Date();
        const enriched = drivers.map((d) => {
            let licenseExpiryStatus = 'ok';
            if (d.licenseExpiry) {
                const diff = (new Date(d.licenseExpiry) - now) / (1000 * 60 * 60 * 24);
                if (diff < 0) licenseExpiryStatus = 'expired';
                else if (diff < 30) licenseExpiryStatus = 'critical';
                else if (diff < 60) licenseExpiryStatus = 'warning';
            }
            const completionRate =
                d.totalTrips > 0
                    ? Math.round((d.completedTrips / d.totalTrips) * 100)
                    : 0;
            return { ...d, licenseExpiryStatus, completionRate };
        });

        // Status counts
        const counts = await Driver.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const statusCounts = { total: 0 };
        counts.forEach((c) => {
            statusCounts[c._id] = c.count;
            statusCounts.total += c.count;
        });

        // Expired license count
        const expiredCount = await Driver.countDocuments({
            licenseExpiry: { $lt: now },
        });
        statusCounts.expiredLicenses = expiredCount;

        return NextResponse.json({ drivers: enriched, statusCounts });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/drivers — create new driver
export async function POST(request) {
    try {
        // Rate limit check
        const rateLimited = checkRateLimit(request);
        if (rateLimited) return rateLimited;

        await dbConnect();
        const body = await request.json();

        // Sanitize inputs
        sanitizeBody(body, { name: 100, email: 150, phone: 20, licenseNumber: 50 });

        // Validate required fields
        const reqError = validateRequired(body, ['name', 'email', 'phone', 'licenseExpiry']);
        if (reqError) {
            return NextResponse.json(reqError, { status: 400 });
        }

        // Validate email format
        const emailError = validateEmail(body.email);
        if (emailError) {
            return NextResponse.json(emailError, { status: 400 });
        }

        if (new Date(body.licenseExpiry) < new Date()) {
            return NextResponse.json(
                { error: 'License expiry must be in the future', field: 'licenseExpiry', code: 'INVALID_DATE' },
                { status: 400 }
            );
        }

        body.status = body.status || 'Off Duty';
        const driver = await Driver.create(body);
        return NextResponse.json(driver, { status: 201 });
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'email';
            const message = field === 'licenseNumber'
                ? 'A driver with this license number already exists'
                : 'A driver with this email already exists';

            return NextResponse.json(
                { error: message, field, code: 'DUPLICATE' },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: error.message, code: 'SERVER_ERROR' }, { status: 500 });
    }
}
