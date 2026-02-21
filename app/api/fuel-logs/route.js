import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FuelLog from '@/models/FuelLog';
import Vehicle from '@/models/Vehicle';
import Trip from '@/models/Trip';
import MaintenanceLog from '@/models/MaintenanceLog';
import { checkRateLimit } from '@/lib/rateLimit';
import { validateRequired, validateObjectId } from '@/lib/validation';

// GET /api/fuel-logs
export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const vehicleId = searchParams.get('vehicleId');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const query = {};
        if (vehicleId) query.vehicle = vehicleId;
        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) query.date.$lte = new Date(to + 'T23:59:59');
        }

        const logs = await FuelLog.find(query)
            .sort({ date: -1 })
            .populate('vehicle', 'name licensePlate type averageFuelCostPerKm')
            .populate('trip', 'origin destination status')
            .lean();

        // Aggregated stats per vehicle
        const perVehicle = await FuelLog.aggregate([
            { $match: query.vehicle ? { vehicle: query.vehicle } : {} },
            {
                $group: {
                    _id: '$vehicle',
                    totalLiters: { $sum: '$liters' },
                    totalCost: { $sum: '$totalCost' },
                    avgEfficiency: { $avg: '$fuelEfficiency' },
                    logCount: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'vehicles',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'vehicleInfo',
                },
            },
            { $unwind: '$vehicleInfo' },
            {
                $project: {
                    vehicleName: '$vehicleInfo.name',
                    licensePlate: '$vehicleInfo.licensePlate',
                    totalLiters: 1,
                    totalCost: 1,
                    avgEfficiency: { $round: ['$avgEfficiency', 2] },
                    logCount: 1,
                },
            },
        ]);

        // Fleet-wide totals
        const fleetTotals = perVehicle.reduce(
            (acc, v) => {
                acc.totalLiters += v.totalLiters;
                acc.totalCost += v.totalCost;
                return acc;
            },
            { totalLiters: 0, totalCost: 0 }
        );
        const fleetAvgEfficiency =
            perVehicle.length > 0
                ? parseFloat(
                    (perVehicle.reduce((s, v) => s + (v.avgEfficiency || 0), 0) / perVehicle.length).toFixed(2)
                )
                : 0;

        // Operational cost per vehicle (fuel + maintenance - revenue)
        const vehicleIds = perVehicle.map((v) => v._id);
        const maintenanceCosts = await MaintenanceLog.aggregate([
            { $match: { vehicle: { $in: vehicleIds } } },
            { $group: { _id: '$vehicle', totalMaintenance: { $sum: '$cost' } } },
        ]);
        const revenueTotals = await Trip.aggregate([
            { $match: { vehicle: { $in: vehicleIds }, status: 'Completed' } },
            { $group: { _id: '$vehicle', totalRevenue: { $sum: '$revenue' } } },
        ]);

        const operationalCost = perVehicle.map((v) => {
            const maint = maintenanceCosts.find((m) => m._id.toString() === v._id.toString());
            const rev = revenueTotals.find((r) => r._id.toString() === v._id.toString());
            const fuelCost = v.totalCost;
            const maintCost = maint?.totalMaintenance || 0;
            const revenue = rev?.totalRevenue || 0;
            const profit = revenue - fuelCost - maintCost;
            return {
                vehicleId: v._id,
                vehicleName: v.vehicleName,
                licensePlate: v.licensePlate,
                fuelCost,
                maintenanceCost: maintCost,
                totalExpense: fuelCost + maintCost,
                revenue,
                profit,
            };
        });

        return NextResponse.json({
            logs,
            perVehicle,
            fleetTotals: { ...fleetTotals, avgEfficiency: fleetAvgEfficiency },
            operationalCost,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/fuel-logs
export async function POST(request) {
    try {
        // Rate limit check
        const rateLimited = checkRateLimit(request);
        if (rateLimited) return rateLimited;

        await dbConnect();
        const body = await request.json();

        // Validate required fields
        const reqError = validateRequired(body, ['vehicle', 'liters', 'costPerLiter']);
        if (reqError) {
            return NextResponse.json(reqError, { status: 400 });
        }

        // Validate ObjectId
        const idError = validateObjectId(body.vehicle, 'vehicle');
        if (idError) return NextResponse.json(idError, { status: 400 });

        if (body.trip) {
            const tripIdError = validateObjectId(body.trip, 'trip');
            if (tripIdError) return NextResponse.json(tripIdError, { status: 400 });
        }

        const vehicle = await Vehicle.findById(body.vehicle);
        if (!vehicle) {
            return NextResponse.json({ error: 'Vehicle not found', field: 'vehicle', code: 'NOT_FOUND' }, { status: 404 });
        }

        const log = await FuelLog.create({
            vehicle: body.vehicle,
            trip: body.trip || undefined,
            liters: Number(body.liters),
            costPerLiter: Number(body.costPerLiter),
            kmDriven: Number(body.kmDriven) || 0,
            date: body.date || new Date(),
        });

        // Update vehicle averageFuelCostPerKm
        if (log.kmDriven > 0) {
            vehicle.averageFuelCostPerKm = parseFloat(
                (log.totalCost / log.kmDriven).toFixed(2)
            );
            await vehicle.save();
        }

        const populated = await FuelLog.findById(log._id)
            .populate('vehicle', 'name licensePlate type')
            .populate('trip', 'origin destination')
            .lean();

        return NextResponse.json(populated, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message, code: 'SERVER_ERROR' }, { status: 500 });
    }
}
