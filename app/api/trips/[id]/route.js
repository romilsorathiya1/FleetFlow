import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Trip from '@/models/Trip';

// GET /api/trips/[id]
export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const trip = await Trip.findById(id)
            .populate('vehicle', 'name licensePlate type maxCapacity currentOdometer')
            .populate('driver', 'name email phone status licenseCategory')
            .lean();
        if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        return NextResponse.json(trip);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/trips/[id]
export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        const trip = await Trip.findByIdAndUpdate(id, body, { new: true, runValidators: true })
            .populate('vehicle', 'name licensePlate type maxCapacity')
            .populate('driver', 'name email');
        if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        return NextResponse.json(trip);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
