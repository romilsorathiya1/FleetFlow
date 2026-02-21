import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Driver from '@/models/Driver';
import Trip from '@/models/Trip';

// GET /api/drivers/[id]
export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const driver = await Driver.findById(id).lean();
        if (!driver) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }

        // Fetch recent trips
        const trips = await Trip.find({ driver: id })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('vehicle', 'name licensePlate')
            .lean();

        const now = new Date();
        let licenseExpiryStatus = 'ok';
        if (driver.licenseExpiry) {
            const diff = (new Date(driver.licenseExpiry) - now) / (1000 * 60 * 60 * 24);
            if (diff < 0) licenseExpiryStatus = 'expired';
            else if (diff < 30) licenseExpiryStatus = 'critical';
            else if (diff < 60) licenseExpiryStatus = 'warning';
        }

        const completionRate =
            driver.totalTrips > 0
                ? Math.round((driver.completedTrips / driver.totalTrips) * 100)
                : 0;

        return NextResponse.json({ ...driver, trips, licenseExpiryStatus, completionRate });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/drivers/[id]
export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        // Shift-hours check: reset if new day
        if (body.totalHoursToday !== undefined) {
            const driver = await Driver.findById(id);
            if (driver) {
                const today = new Date().toDateString();
                const lastDuty = driver.lastDutyDate ? new Date(driver.lastDutyDate).toDateString() : null;
                if (lastDuty !== today) {
                    body.totalHoursToday = 0;
                    body.lastDutyDate = new Date();
                }
            }
        }

        const driver = await Driver.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!driver) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }
        return NextResponse.json(driver);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/drivers/[id]
export async function DELETE(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        // Check for active trips
        const activeTrips = await Trip.countDocuments({
            driver: id,
            status: { $in: ['Draft', 'Dispatched'] },
        });
        if (activeTrips > 0) {
            return NextResponse.json(
                { error: `Cannot remove: driver has ${activeTrips} active trip(s)` },
                { status: 400 }
            );
        }

        const driver = await Driver.findByIdAndUpdate(
            id,
            { status: 'Suspended' },
            { new: true }
        );
        if (!driver) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Driver suspended', driver });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
