import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MaintenanceLog from '@/models/MaintenanceLog';
import Vehicle from '@/models/Vehicle';
import Alert from '@/models/Alert';
import { checkRateLimit } from '@/lib/rateLimit';
import { validateRequired, validateObjectId, sanitizeBody } from '@/lib/validation';

// GET /api/maintenance
export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const search = searchParams.get('search');

        const query = {};
        if (status) query.status = status;
        if (type) query.type = type;
        if (search) {
            query.$or = [
                { description: { $regex: search, $options: 'i' } },
                { serviceProvider: { $regex: search, $options: 'i' } },
            ];
        }

        const logs = await MaintenanceLog.find(query)
            .sort({ createdAt: -1 })
            .populate('vehicle', 'name licensePlate type currentOdometer monthlyBudget')
            .lean();

        // Counts
        const ongoing = await MaintenanceLog.countDocuments({ status: 'Ongoing' });
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const resolvedThisMonth = await MaintenanceLog.countDocuments({
            status: 'Resolved',
            resolvedAt: { $gte: monthStart },
        });
        const costAgg = await MaintenanceLog.aggregate([
            { $match: { serviceDate: { $gte: monthStart } } },
            { $group: { _id: null, total: { $sum: '$cost' } } },
        ]);
        const totalCostThisMonth = costAgg[0]?.total || 0;

        // Budget vs actual per vehicle (this month)
        const budgetData = await MaintenanceLog.aggregate([
            { $match: { serviceDate: { $gte: monthStart } } },
            { $group: { _id: '$vehicle', spent: { $sum: '$cost' } } },
        ]);

        const vehicleIds = budgetData.map((b) => b._id);
        const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } })
            .select('name monthlyBudget')
            .lean();

        const budgetComparison = budgetData.map((b) => {
            const v = vehicles.find((x) => x._id.toString() === b._id.toString());
            return {
                vehicleId: b._id,
                vehicleName: v?.name || 'Unknown',
                budget: v?.monthlyBudget || 0,
                spent: b.spent,
                percentage: v?.monthlyBudget ? Math.round((b.spent / v.monthlyBudget) * 100) : 0,
            };
        });

        return NextResponse.json({
            logs,
            stats: { ongoing, resolvedThisMonth, totalCostThisMonth },
            budgetComparison,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/maintenance
export async function POST(request) {
    try {
        // Rate limit check
        const rateLimited = checkRateLimit(request);
        if (rateLimited) return rateLimited;

        await dbConnect();
        const body = await request.json();

        // Sanitize inputs
        sanitizeBody(body, { description: 1000, serviceProvider: 200 });

        // Validate required fields
        const reqError = validateRequired(body, ['vehicle', 'type']);
        if (reqError) {
            return NextResponse.json(reqError, { status: 400 });
        }

        // Validate ObjectId
        const idError = validateObjectId(body.vehicle, 'vehicle');
        if (idError) return NextResponse.json(idError, { status: 400 });

        // Validate maintenance type
        const validTypes = ['Oil Change', 'Tire Replacement', 'Brake Service', 'Engine Repair', 'Battery', 'Other'];
        if (!validTypes.includes(body.type)) {
            return NextResponse.json(
                { error: 'Invalid maintenance type', field: 'type', code: 'INVALID_ENUM' },
                { status: 400 }
            );
        }

        const vehicle = await Vehicle.findById(body.vehicle);
        if (!vehicle) {
            return NextResponse.json({ error: 'Vehicle not found', field: 'vehicle', code: 'NOT_FOUND' }, { status: 404 });
        }
        if (vehicle.status === 'On Trip') {
            return NextResponse.json(
                { error: "Cannot service a vehicle that is currently on a trip", field: 'vehicle', code: 'UNAVAILABLE' },
                { status: 400 }
            );
        }

        const log = await MaintenanceLog.create({
            vehicle: body.vehicle,
            type: body.type,
            cost: Number(body.cost) || 0,
            description: body.description,
            serviceProvider: body.serviceProvider,
            status: 'Ongoing',
            odometerAtService: vehicle.currentOdometer,
        });

        // Put vehicle in shop
        vehicle.status = 'In Shop';
        await vehicle.save();

        // Create alert
        const severityMap = {
            'Engine Repair': 'High',
            'Brake Service': 'High',
            'Tire Replacement': 'Medium',
            'Oil Change': 'Low',
            'Battery': 'Medium',
            'Other': 'Low',
        };
        await Alert.create({
            type: 'Service Due',
            severity: severityMap[body.type] || 'Low',
            message: `Vehicle ${vehicle.name} sent to shop: ${body.type}`,
            vehicle: vehicle._id,
        });

        const populated = await MaintenanceLog.findById(log._id)
            .populate('vehicle', 'name licensePlate type')
            .lean();

        return NextResponse.json(populated, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message, code: 'SERVER_ERROR' }, { status: 500 });
    }
}
