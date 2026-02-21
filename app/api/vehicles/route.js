import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import FuelLog from '@/models/FuelLog';
import MaintenanceLog from '@/models/MaintenanceLog';
import Trip from '@/models/Trip';
import { checkRateLimit } from '@/lib/rateLimit';
import { validateRequired, sanitizeBody } from '@/lib/validation';

// GET /api/vehicles — list with filters
export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const region = searchParams.get('region');
        const search = searchParams.get('search');

        const query = {};
        if (status) query.status = status;
        if (type) query.type = type;
        if (region) query.region = region;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { licensePlate: { $regex: search, $options: 'i' } },
                { model: { $regex: search, $options: 'i' } },
            ];
        }

        const vehicles = await Vehicle.find(query).sort({ createdAt: -1 }).lean();

        // Aggregate maintenance and fuel costs per vehicle
        const vehicleIds = vehicles.map((v) => v._id);

        const [maintenanceCosts, fuelCosts] = await Promise.all([
            MaintenanceLog.aggregate([
                { $match: { vehicle: { $in: vehicleIds } } },
                { $group: { _id: '$vehicle', total: { $sum: '$cost' } } },
            ]),
            FuelLog.aggregate([
                { $match: { vehicle: { $in: vehicleIds } } },
                { $group: { _id: '$vehicle', total: { $sum: '$totalCost' } } },
            ]),
        ]);

        const mCostMap = {};
        maintenanceCosts.forEach((m) => { mCostMap[m._id.toString()] = m.total; });
        const fCostMap = {};
        fuelCosts.forEach((f) => { fCostMap[f._id.toString()] = f.total; });

        const enriched = vehicles.map((v) => ({
            ...v,
            totalMaintenanceCost: mCostMap[v._id.toString()] || 0,
            totalFuelCost: fCostMap[v._id.toString()] || 0,
        }));

        // Compute status counts
        const counts = await Vehicle.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const statusCounts = { total: 0 };
        counts.forEach((c) => {
            statusCounts[c._id] = c.count;
            statusCounts.total += c.count;
        });

        return NextResponse.json({ vehicles: enriched, statusCounts });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/vehicles — create new vehicle
export async function POST(request) {
    try {
        // Rate limit check
        const rateLimited = checkRateLimit(request);
        if (rateLimited) return rateLimited;

        await dbConnect();
        const body = await request.json();

        // Sanitize inputs
        sanitizeBody(body, { name: 100, model: 100, licensePlate: 20, region: 50, notes: 1000 });

        // Validate required fields
        const reqError = validateRequired(body, ['name', 'model', 'licensePlate', 'type']);
        if (reqError) {
            return NextResponse.json(reqError, { status: 400 });
        }

        // Validate vehicle type
        if (!['Truck', 'Van', 'Bike'].includes(body.type)) {
            return NextResponse.json(
                { error: 'Invalid vehicle type', field: 'type', code: 'INVALID_ENUM' },
                { status: 400 }
            );
        }

        body.status = 'Available';
        const vehicle = await Vehicle.create(body);
        return NextResponse.json(vehicle, { status: 201 });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json(
                { error: 'A vehicle with this license plate already exists', field: 'licensePlate', code: 'DUPLICATE' },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: error.message, code: 'SERVER_ERROR' }, { status: 500 });
    }
}
