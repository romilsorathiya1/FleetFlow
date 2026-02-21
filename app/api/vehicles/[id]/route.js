import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Trip from '@/models/Trip';

// GET /api/vehicles/[id]
export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const vehicle = await Vehicle.findById(id).lean();
        if (!vehicle) {
            return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }
        return NextResponse.json(vehicle);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/vehicles/[id]
export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        // If retiring, check for active trips
        if (body.status === 'Retired') {
            const activeTrips = await Trip.countDocuments({
                vehicle: id,
                status: { $in: ['Draft', 'Dispatched'] },
            });
            if (activeTrips > 0) {
                return NextResponse.json(
                    { error: `Cannot retire: vehicle has ${activeTrips} active trip(s)` },
                    { status: 400 }
                );
            }
        }

        const vehicle = await Vehicle.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!vehicle) {
            return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }
        return NextResponse.json(vehicle);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/vehicles/[id] — soft delete (retire)
export async function DELETE(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        const activeTrips = await Trip.countDocuments({
            vehicle: id,
            status: { $in: ['Draft', 'Dispatched'] },
        });
        if (activeTrips > 0) {
            return NextResponse.json(
                { error: `Cannot retire: vehicle has ${activeTrips} active trip(s)` },
                { status: 400 }
            );
        }

        const vehicle = await Vehicle.findByIdAndUpdate(
            id,
            { status: 'Retired' },
            { new: true }
        );
        if (!vehicle) {
            return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Vehicle retired', vehicle });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
