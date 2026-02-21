import dbConnect from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import Alert from '@/models/Alert';

/**
 * Check vehicles where (currentOdometer - lastServiceOdometer) >= 5000
 * Create "Service Due" alert if no duplicate exists in last 7 days
 */
async function checkOdometerAlerts() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const vehicles = await Vehicle.find({
        $expr: {
            $gte: [
                { $subtract: ['$currentOdometer', '$lastServiceOdometer'] },
                5000,
            ],
        },
        status: { $ne: 'Retired' },
    })
        .select('_id name currentOdometer lastServiceOdometer')
        .lean();

    for (const vehicle of vehicles) {
        const existing = await Alert.findOne({
            type: 'Service Due',
            vehicle: vehicle._id,
            createdAt: { $gte: sevenDaysAgo },
        });

        if (!existing) {
            const gap = vehicle.currentOdometer - vehicle.lastServiceOdometer;
            await Alert.create({
                type: 'Service Due',
                severity: gap >= 7000 ? 'Critical' : gap >= 6000 ? 'High' : 'Medium',
                message: `${vehicle.name} is due for service — ${gap.toLocaleString()} km since last service (5,000 km threshold exceeded)`,
                vehicle: vehicle._id,
            });
        }
    }
}

/**
 * Check drivers whose license expires within 30 days
 * Severity: Critical (<7d), High (<14d), Medium (<30d)
 */
async function checkLicenseExpiryAlerts() {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const drivers = await Driver.find({
        licenseExpiry: { $lte: thirtyDaysFromNow },
        status: { $ne: 'Suspended' },
    })
        .select('_id name licenseExpiry licenseCategory')
        .lean();

    for (const driver of drivers) {
        const existing = await Alert.findOne({
            type: 'License Expiring',
            driver: driver._id,
            createdAt: { $gte: sevenDaysAgo },
        });

        if (!existing) {
            const daysLeft = Math.ceil(
                (new Date(driver.licenseExpiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            let severity = 'Medium';
            if (daysLeft < 7) severity = 'Critical';
            else if (daysLeft < 14) severity = 'High';

            const expiredText = daysLeft <= 0 ? 'has EXPIRED' : `expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;

            await Alert.create({
                type: 'License Expiring',
                severity,
                message: `${driver.name}'s license ${expiredText}`,
                driver: driver._id,
            });
        }
    }
}

/**
 * Check vehicles with status "Available" idle for more than 7 days
 * Create alert if none exists for that vehicle in last 3 days
 */
async function checkIdleVehicleAlerts() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const vehicles = await Vehicle.find({
        status: 'Available',
        $or: [
            { lastTripDate: { $lt: sevenDaysAgo } },
            { lastTripDate: { $exists: false } },
            { lastTripDate: null },
        ],
    })
        .select('_id name type lastTripDate')
        .lean();

    for (const vehicle of vehicles) {
        const existing = await Alert.findOne({
            type: 'Idle Vehicle',
            vehicle: vehicle._id,
            createdAt: { $gte: threeDaysAgo },
        });

        if (!existing) {
            const idleDays = vehicle.lastTripDate
                ? Math.floor((Date.now() - new Date(vehicle.lastTripDate).getTime()) / (1000 * 60 * 60 * 24))
                : 'unknown number of';

            await Alert.create({
                type: 'Idle Vehicle',
                severity: 'Low',
                message: `${vehicle.name} (${vehicle.type}) has been idle for ${idleDays} days`,
                vehicle: vehicle._id,
            });
        }
    }
}

/**
 * Run all alert checks in parallel.
 * This is designed to be called non-blocking from the analytics summary route.
 */
export async function runAllAlertChecks() {
    try {
        await dbConnect();
        await Promise.all([
            checkOdometerAlerts(),
            checkLicenseExpiryAlerts(),
            checkIdleVehicleAlerts(),
        ]);
    } catch (error) {
        console.error('[AlertChecks] Error running alert checks:', error);
    }
}
