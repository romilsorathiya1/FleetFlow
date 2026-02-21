import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Alert from '@/models/Alert';
import { checkRateLimit } from '@/lib/rateLimit';
import { sanitizeBody } from '@/lib/validation';

// GET /api/alerts — Return all non-dismissed alerts
export async function GET(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const countOnly = searchParams.get('countOnly');
        const type = searchParams.get('type');

        // If countOnly, return just the unread count
        if (countOnly === 'true') {
            const count = await Alert.countDocuments({
                isRead: false,
                isDismissed: false,
            });
            return NextResponse.json({ count });
        }

        // Build filter
        const filter = { isDismissed: false };
        if (type && type !== 'All') {
            filter.type = type;
        }

        const alerts = await Alert.find(filter)
            .sort({ createdAt: -1 })
            .populate('vehicle', 'name licensePlate type')
            .populate('driver', 'name email licenseExpiry')
            .lean();

        return NextResponse.json(alerts);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/alerts — Create a new alert (internal use)
export async function POST(request) {
    try {
        // Rate limit check
        const rateLimited = checkRateLimit(request);
        if (rateLimited) return rateLimited;

        await dbConnect();
        const body = await request.json();

        // Sanitize inputs
        sanitizeBody(body, { message: 500 });

        const alert = await Alert.create(body);
        return NextResponse.json(alert, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message, code: 'VALIDATION_ERROR' }, { status: 400 });
    }
}
