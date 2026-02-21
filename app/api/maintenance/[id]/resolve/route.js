import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MaintenanceLog from '@/models/MaintenanceLog';
import Vehicle from '@/models/Vehicle';
import Alert from '@/models/Alert';
import { checkRateLimit } from '@/lib/rateLimit';
import { validateObjectId } from '@/lib/validation';

// PUT /api/maintenance/[id]/resolve
export async function PUT(request, { params }) {
    try {
        // Rate limit check
        const rateLimited = checkRateLimit(request);
        if (rateLimited) return rateLimited;

        await dbConnect();
        const { id } = await params;

        // Validate ObjectId
        const idError = validateObjectId(id, 'maintenanceLogId');
        if (idError) return NextResponse.json(idError, { status: 400 });
        const body = await request.json();

        const log = await MaintenanceLog.findById(id);
        if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 });
        if (log.status === 'Resolved') {
            return NextResponse.json({ error: 'Already resolved' }, { status: 400 });
        }

        // Resolve log
        log.status = 'Resolved';
        log.resolvedAt = new Date();
        if (body.finalCost !== undefined) log.cost = Number(body.finalCost);
        await log.save();

        // Update vehicle
        const vehicle = await Vehicle.findById(log.vehicle);
        if (vehicle) {
            vehicle.status = 'Available';
            vehicle.lastServiceOdometer = vehicle.currentOdometer;
            await vehicle.save();

            // Check monthly budget
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthCosts = await MaintenanceLog.aggregate([
                {
                    $match: {
                        vehicle: vehicle._id,
                        serviceDate: { $gte: monthStart },
                    },
                },
                { $group: { _id: null, total: { $sum: '$cost' } } },
            ]);
            const totalMonthly = monthCosts[0]?.total || 0;

            if (vehicle.monthlyBudget > 0 && totalMonthly > vehicle.monthlyBudget) {
                await Alert.create({
                    type: 'Budget Exceeded',
                    severity: 'Medium',
                    message: `Vehicle ${vehicle.name} has exceeded monthly maintenance budget (₹${totalMonthly.toLocaleString()} / ₹${vehicle.monthlyBudget.toLocaleString()})`,
                    vehicle: vehicle._id,
                });
            }
        }

        const populated = await MaintenanceLog.findById(id)
            .populate('vehicle', 'name licensePlate type')
            .lean();

        return NextResponse.json(populated);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
