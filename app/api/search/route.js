import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import Trip from '@/models/Trip';

// GET /api/search?q=term — Global search across vehicles, drivers, trips
export async function GET(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');

        if (!q || q.length < 2) {
            return NextResponse.json({ vehicles: [], drivers: [], trips: [] });
        }

        const regex = { $regex: q, $options: 'i' };

        const [vehicles, drivers, trips] = await Promise.all([
            Vehicle.find({
                $or: [
                    { name: regex },
                    { licensePlate: regex },
                    { model: regex },
                ],
            })
                .select('name licensePlate model type status')
                .limit(5)
                .lean(),

            Driver.find({
                $or: [
                    { name: regex },
                    { email: regex },
                    { licenseNumber: regex },
                ],
            })
                .select('name email status licenseCategory')
                .limit(5)
                .lean(),

            Trip.find({
                $or: [
                    { origin: regex },
                    { destination: regex },
                    { cargoDescription: regex },
                ],
            })
                .select('origin destination status cargoWeight')
                .limit(5)
                .lean(),
        ]);

        return NextResponse.json({ vehicles, drivers, trips });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
