import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Trip from '@/models/Trip';
import FuelLog from '@/models/FuelLog';
import MaintenanceLog from '@/models/MaintenanceLog';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';

// GET /api/analytics/reports
export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate')
            ? new Date(searchParams.get('startDate'))
            : new Date(new Date().setMonth(new Date().getMonth() - 6));
        const endDate = searchParams.get('endDate')
            ? new Date(searchParams.get('endDate') + 'T23:59:59')
            : new Date();
        const vehicleId = searchParams.get('vehicleId');

        const dateMatch = { $gte: startDate, $lte: endDate };
        const vehicleMatch = vehicleId ? { vehicle: vehicleId } : {};

        // 1. Fuel efficiency by vehicle
        const fuelEfficiencyByVehicle = await FuelLog.aggregate([
            { $match: { date: dateMatch, ...vehicleMatch } },
            {
                $group: {
                    _id: '$vehicle',
                    avgKmPerLiter: { $avg: '$fuelEfficiency' },
                    totalKm: { $sum: '$kmDriven' },
                    totalLiters: { $sum: '$liters' },
                },
            },
            { $lookup: { from: 'vehicles', localField: '_id', foreignField: '_id', as: 'v' } },
            { $unwind: '$v' },
            {
                $project: {
                    vehicleId: '$_id', name: '$v.name',
                    avgKmPerLiter: { $round: ['$avgKmPerLiter', 2] },
                    totalKm: 1, totalLiters: 1,
                },
            },
            { $sort: { avgKmPerLiter: -1 } },
        ]);

        // 2. Vehicle ROI
        const fuelCosts = await FuelLog.aggregate([
            { $match: { date: dateMatch } },
            { $group: { _id: '$vehicle', fuelCost: { $sum: '$totalCost' } } },
        ]);
        const maintCosts = await MaintenanceLog.aggregate([
            { $match: { serviceDate: dateMatch } },
            { $group: { _id: '$vehicle', maintenanceCost: { $sum: '$cost' } } },
        ]);
        const revenues = await Trip.aggregate([
            { $match: { createdAt: dateMatch, status: 'Completed' } },
            { $group: { _id: '$vehicle', revenue: { $sum: '$revenue' } } },
        ]);
        const allVehicles = await Vehicle.find(vehicleId ? { _id: vehicleId } : {})
            .select('name acquisitionCost')
            .lean();

        const vehicleROI = allVehicles.map((v) => {
            const fc = fuelCosts.find((f) => f._id?.toString() === v._id.toString());
            const mc = maintCosts.find((m) => m._id?.toString() === v._id.toString());
            const rv = revenues.find((r) => r._id?.toString() === v._id.toString());
            const fuelCost = fc?.fuelCost || 0;
            const maintenanceCost = mc?.maintenanceCost || 0;
            const revenue = rv?.revenue || 0;
            const acq = v.acquisitionCost || 1;
            const roi = parseFloat((((revenue - fuelCost - maintenanceCost) / acq) * 100).toFixed(1));
            return { vehicleId: v._id, name: v.name, revenue, fuelCost, maintenanceCost, acquisitionCost: acq, roi };
        });

        // 3. Monthly cost trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyFuel = await FuelLog.aggregate([
            { $match: { date: { $gte: sixMonthsAgo } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, fuelCost: { $sum: '$totalCost' } } },
        ]);
        const monthlyMaint = await MaintenanceLog.aggregate([
            { $match: { serviceDate: { $gte: sixMonthsAgo } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$serviceDate' } }, maintenanceCost: { $sum: '$cost' } } },
        ]);
        const monthlyRevenue = await Trip.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo }, status: 'Completed' } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$revenue' }, trips: { $sum: 1 } } },
        ]);

        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push(d.toISOString().slice(0, 7));
        }
        const monthlyCostTrend = months.map((m) => ({
            month: m,
            fuelCost: monthlyFuel.find((x) => x._id === m)?.fuelCost || 0,
            maintenanceCost: monthlyMaint.find((x) => x._id === m)?.maintenanceCost || 0,
            revenue: monthlyRevenue.find((x) => x._id === m)?.revenue || 0,
            trips: monthlyRevenue.find((x) => x._id === m)?.trips || 0,
        }));

        // 4. Top drivers by completion rate
        const topDrivers = await Driver.find()
            .sort({ completedTrips: -1 })
            .limit(5)
            .select('name completedTrips totalTrips safetyScore')
            .lean();
        const topDriversFormatted = topDrivers.map((d) => ({
            driverId: d._id,
            name: d.name,
            completionRate: d.totalTrips > 0 ? Math.round((d.completedTrips / d.totalTrips) * 100) : 0,
            safetyScore: d.safetyScore,
            totalTrips: d.totalTrips,
        }));

        // 5. Cancellation reasons
        const cancellations = await Trip.aggregate([
            { $match: { status: 'Cancelled', createdAt: dateMatch } },
            { $group: { _id: '$cancellationReason', count: { $sum: 1 } } },
        ]);
        const totalCancelled = cancellations.reduce((s, c) => s + c.count, 0);
        const cancellationReasons = cancellations.map((c) => ({
            reason: c._id || 'Unknown',
            count: c.count,
            percentage: totalCancelled > 0 ? Math.round((c.count / totalCancelled) * 100) : 0,
        }));

        // 6. Cost per km
        const costPerKm = fuelEfficiencyByVehicle
            .filter((v) => v.totalKm > 0)
            .map((v) => {
                const fc = fuelCosts.find((f) => f._id?.toString() === v.vehicleId.toString());
                return {
                    vehicleId: v.vehicleId,
                    name: v.name,
                    costPerKm: v.totalKm > 0 ? parseFloat(((fc?.fuelCost || 0) / v.totalKm).toFixed(2)) : 0,
                };
            });

        // 7. Utilization trend (% days with at least 1 trip per month)
        const monthlyTrips = await Trip.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    uniqueDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
                },
            },
        ]);
        const totalVehicles = await Vehicle.countDocuments({ status: { $ne: 'Retired' } });
        const utilizationTrend = months.map((m) => {
            const mt = monthlyTrips.find((x) => x._id === m);
            const activeDays = mt?.uniqueDays?.length || 0;
            const daysInMonth = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate();
            const rate = totalVehicles > 0 ? Math.round((activeDays / daysInMonth) * 100) : 0;
            return { month: m, utilizationRate: rate };
        });

        // Summary KPIs
        const totalRevenue = vehicleROI.reduce((s, v) => s + v.revenue, 0);
        const totalFuelCost = vehicleROI.reduce((s, v) => s + v.fuelCost, 0);
        const totalMaintCost = vehicleROI.reduce((s, v) => s + v.maintenanceCost, 0);
        const totalTrips = await Trip.countDocuments({ createdAt: dateMatch });

        return NextResponse.json({
            fuelEfficiencyByVehicle,
            vehicleROI,
            monthlyCostTrend,
            topDrivers: topDriversFormatted,
            cancellationReasons,
            costPerKm,
            utilizationTrend,
            summary: { totalRevenue, totalFuelCost, totalMaintCost, totalTrips },
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
