import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Trip from '@/models/Trip';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import { checkRateLimit } from '@/lib/rateLimit';
import { validateRequired, validateObjectId, sanitizeBody } from '@/lib/validation';

// GET /api/trips — list with filters
export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const query = {};
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { origin: { $regex: search, $options: 'i' } },
                { destination: { $regex: search, $options: 'i' } },
                { cargoDescription: { $regex: search, $options: 'i' } },
            ];
        }
        if (from || to) {
            query.createdAt = {};
            if (from) query.createdAt.$gte = new Date(from);
            if (to) query.createdAt.$lte = new Date(to + 'T23:59:59');
        }

        const trips = await Trip.find(query)
            .sort({ createdAt: -1 })
            .populate('vehicle', 'name licensePlate type maxCapacity currentOdometer')
            .populate('driver', 'name email phone status licenseCategory')
            .lean();

        // Status counts
        const counts = await Trip.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const statusCounts = { total: 0 };
        counts.forEach((c) => {
            statusCounts[c._id] = c.count;
            statusCounts.total += c.count;
        });

        return NextResponse.json({ trips, statusCounts });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/trips — create with full validation chain
export async function POST(request) {
    try {
        // Rate limit check
        const rateLimited = checkRateLimit(request);
        if (rateLimited) return rateLimited;

        await dbConnect();
        const body = await request.json();

        // Sanitize inputs
        sanitizeBody(body, { origin: 200, destination: 200, cargoDescription: 500, notes: 1000 });

        // Validate required fields
        const reqError = validateRequired(body, ['vehicle', 'driver', 'origin', 'destination', 'cargoWeight']);
        if (reqError) {
            return NextResponse.json(reqError, { status: 400 });
        }

        // Validate ObjectId format
        const vehicleIdError = validateObjectId(body.vehicle, 'vehicle');
        if (vehicleIdError) return NextResponse.json(vehicleIdError, { status: 400 });
        const driverIdError = validateObjectId(body.driver, 'driver');
        if (driverIdError) return NextResponse.json(driverIdError, { status: 400 });

        // 1. Check vehicle exists and is Available
        const vehicle = await Vehicle.findById(body.vehicle);
        if (!vehicle) return NextResponse.json({ error: 'Vehicle not found', field: 'vehicle', code: 'NOT_FOUND' }, { status: 404 });
        if (vehicle.status !== 'Available') {
            return NextResponse.json({ error: 'Vehicle is not available', field: 'vehicle', code: 'UNAVAILABLE' }, { status: 400 });
        }

        // 2. Check driver exists
        const driver = await Driver.findById(body.driver);
        if (!driver) return NextResponse.json({ error: 'Driver not found', field: 'driver', code: 'NOT_FOUND' }, { status: 404 });

        // Check vehicle type matches driver licenseCategory
        if (!driver.licenseCategory.includes(vehicle.type)) {
            return NextResponse.json(
                { error: 'Driver not licensed for this vehicle type', field: 'driver', code: 'LICENSE_MISMATCH' },
                { status: 400 }
            );
        }

        // 3. Check driver is Off Duty
        if (driver.status !== 'Off Duty') {
            return NextResponse.json({ error: 'Driver is not available', field: 'driver', code: 'UNAVAILABLE' }, { status: 400 });
        }

        // 4. Check license not expired
        if (new Date(driver.licenseExpiry) < new Date()) {
            return NextResponse.json(
                { error: 'Driver license is expired. Cannot assign.', field: 'driver', code: 'LICENSE_EXPIRED' },
                { status: 400 }
            );
        }

        // 5. Check cargo weight vs capacity
        const cargoWeight = Number(body.cargoWeight) || 0;
        if (cargoWeight > vehicle.maxCapacity) {
            return NextResponse.json(
                { error: `Cargo weight (${cargoWeight}kg) exceeds vehicle capacity (${vehicle.maxCapacity}kg)`, field: 'cargoWeight', code: 'OVERWEIGHT' },
                { status: 400 }
            );
        }

        // 6. Check driver shift limit
        const today = new Date().toDateString();
        const lastDuty = driver.lastDutyDate
            ? new Date(driver.lastDutyDate).toDateString()
            : null;
        const hoursToday = lastDuty === today ? driver.totalHoursToday : 0;
        if (hoursToday >= 10) {
            return NextResponse.json(
                { error: 'Driver shift limit reached (10 hrs today)', field: 'driver', code: 'SHIFT_LIMIT' },
                { status: 400 }
            );
        }

        // All checks passed — create trip
        const estimatedCost =
            (Number(body.estimatedDistanceKm) || 0) *
            (vehicle.averageFuelCostPerKm || 8);

        const trip = await Trip.create({
            vehicle: body.vehicle,
            driver: body.driver,
            origin: body.origin,
            destination: body.destination,
            cargoDescription: body.cargoDescription,
            cargoWeight,
            estimatedDistanceKm: Number(body.estimatedDistanceKm) || 0,
            startOdometer: vehicle.currentOdometer,
            status: 'Draft',
            startTime: new Date(),
            notes: body.notes,
        });

        // Update vehicle
        await Vehicle.findByIdAndUpdate(body.vehicle, {
            status: 'On Trip',
            lastTripDate: new Date(),
        });

        // Update driver
        await Driver.findByIdAndUpdate(body.driver, {
            status: 'On Duty',
            ...(lastDuty !== today ? { totalHoursToday: 0, lastDutyDate: new Date() } : {}),
        });

        const populated = await Trip.findById(trip._id)
            .populate('vehicle', 'name licensePlate type maxCapacity')
            .populate('driver', 'name email')
            .lean();

        return NextResponse.json({ ...populated, estimatedCost }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message, code: 'SERVER_ERROR' }, { status: 500 });
    }
}
