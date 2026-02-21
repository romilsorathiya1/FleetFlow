import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import Trip from '@/models/Trip';
import MaintenanceLog from '@/models/MaintenanceLog';
import FuelLog from '@/models/FuelLog';
import Alert from '@/models/Alert';
import { runAllAlertChecks } from '@/lib/alertChecks';

// GET /api/analytics/summary — Dashboard KPI summary
export async function GET(request) {
    try {
        await dbConnect();

        // Parse filter params
        const { searchParams } = new URL(request.url);
        const typeParam = searchParams.get('type');
        const regionParam = searchParams.get('region');

        // Build vehicle filter
        const vehicleFilter = {};
        if (typeParam) vehicleFilter.type = typeParam;
        if (regionParam) vehicleFilter.region = regionParam;
        const hasFilter = Object.keys(vehicleFilter).length > 0;

        // Run alert checks non-blocking (fires and forgets)
        runAllAlertChecks().catch(() => { });

        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const [
            totalVehicles,
            availableVehicles,
            onTripVehicles,
            inShopVehicles,
            retiredVehicles,
            totalDrivers,
            offDutyDrivers,
            onDutyDrivers,
            draftTrips,
            unreadAlerts,
            recentTrips,
            vehiclesByType,
            vehiclesByStatus,
            expiringDrivers,
            idleVehicles,
            maintenanceDueVehicles,
        ] = await Promise.all([
            Vehicle.countDocuments(vehicleFilter),
            Vehicle.countDocuments({ ...vehicleFilter, status: 'Available' }),
            Vehicle.countDocuments({ ...vehicleFilter, status: 'On Trip' }),
            Vehicle.countDocuments({ ...vehicleFilter, status: 'In Shop' }),
            Vehicle.countDocuments({ ...vehicleFilter, status: 'Retired' }),
            Driver.countDocuments(),
            Driver.countDocuments({ status: 'Off Duty' }),
            Driver.countDocuments({ status: 'On Duty' }),
            Trip.countDocuments({ status: 'Draft' }),
            Alert.countDocuments({ isRead: false, isDismissed: false }),
            // Recent trips: filter by vehicle type/region via populate match
            Trip.find()
                .sort({ createdAt: -1 })
                .limit(20)
                .populate('vehicle', 'name licensePlate type region')
                .populate('driver', 'name')
                .lean()
                .then(trips => {
                    if (!hasFilter) return trips.slice(0, 5);
                    return trips.filter(t => {
                        if (!t.vehicle) return false;
                        if (typeParam && t.vehicle.type !== typeParam) return false;
                        if (regionParam && t.vehicle.region !== regionParam) return false;
                        return true;
                    }).slice(0, 5);
                }),
            Vehicle.aggregate([
                ...(hasFilter ? [{ $match: vehicleFilter }] : []),
                { $group: { _id: '$type', count: { $sum: 1 } } },
            ]),
            Vehicle.aggregate([
                ...(hasFilter ? [{ $match: vehicleFilter }] : []),
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Driver.find({
                licenseExpiry: { $lte: thirtyDaysFromNow, $gte: now },
            })
                .select('name licenseCategory licenseExpiry')
                .sort({ licenseExpiry: 1 })
                .lean(),
            Vehicle.find({
                ...vehicleFilter,
                status: 'Available',
                $or: [
                    { lastTripDate: { $lt: sevenDaysAgo } },
                    { lastTripDate: { $exists: false } },
                    { lastTripDate: null },
                ],
            })
                .select('name type lastTripDate')
                .lean(),
            Vehicle.find({
                ...vehicleFilter,
                $expr: {
                    $gte: [
                        { $subtract: ['$currentOdometer', '$lastServiceOdometer'] },
                        4500,
                    ],
                },
            })
                .select('name currentOdometer lastServiceOdometer')
                .lean(),
        ]);

        const nonRetired = totalVehicles - retiredVehicles;
        const utilizationRate = nonRetired > 0
            ? Math.round((onTripVehicles / nonRetired) * 100)
            : 0;

        // Transform vehiclesByType into object
        const typeMap = {};
        vehiclesByType.forEach((v) => { typeMap[v._id] = v.count; });

        // Transform vehiclesByStatus into object
        const statusMap = {};
        vehiclesByStatus.forEach((v) => { statusMap[v._id] = v.count; });

        const response = NextResponse.json({
            activeFleet: onTripVehicles,
            maintenanceAlerts: inShopVehicles,
            utilizationRate,
            pendingCargo: draftTrips,
            totalDrivers,
            availableDrivers: offDutyDrivers,
            onDutyDrivers,
            unreadAlerts,
            recentTrips,
            vehiclesByType: typeMap,
            vehiclesByStatus: statusMap,
            totalVehicles,
            licenseExpiringCount: expiringDrivers.length,
            expiringDrivers,
            idleVehicleCount: idleVehicles.length,
            idleVehicles,
            maintenanceDueVehicles,
        });

        // Cache for 30 seconds, allow stale-while-revalidate for 60s
        response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

        return response;
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
