import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Trip from '@/models/Trip';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import Alert from '@/models/Alert';
import { checkRateLimit } from '@/lib/rateLimit';
import { validateObjectId } from '@/lib/validation';

// PUT /api/trips/[id]/status — lifecycle management
export async function PUT(request, { params }) {
    try {
        // Rate limit check
        const rateLimited = checkRateLimit(request);
        if (rateLimited) return rateLimited;

        await dbConnect();
        const { id } = await params;

        // Validate ObjectId
        const idError = validateObjectId(id, 'tripId');
        if (idError) return NextResponse.json(idError, { status: 400 });

        const body = await request.json();
        const { status, endOdometer, cancellationReason, cancellationNote, revenue } = body;

        const trip = await Trip.findById(id);
        if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

        if (status === 'Completed') {
            const now = new Date();
            const odo = Number(endOdometer) || trip.startOdometer || 0;
            const actualDistance = odo - (trip.startOdometer || 0);
            const durationHours = trip.startTime
                ? (now - new Date(trip.startTime)) / 3600000
                : 0;

            // Update trip
            trip.status = 'Completed';
            trip.endTime = now;
            trip.endOdometer = odo;
            trip.actualDistanceKm = actualDistance;
            trip.revenue = Number(revenue) || 0;
            await trip.save();

            // Update vehicle
            const vehicle = await Vehicle.findById(trip.vehicle);
            if (vehicle) {
                vehicle.status = 'Available';
                vehicle.currentOdometer = odo;
                await vehicle.save();

                // Check service threshold
                if (vehicle.currentOdometer - vehicle.lastServiceOdometer >= 5000) {
                    await Alert.create({
                        type: 'Service Due',
                        severity: 'High',
                        message: `Vehicle ${vehicle.name} is due for service (5000km threshold reached)`,
                        vehicle: vehicle._id,
                    });
                }
            }

            // Update driver
            const driver = await Driver.findById(trip.driver);
            if (driver) {
                driver.status = 'Off Duty';
                driver.totalTrips += 1;
                driver.completedTrips += 1;
                const today = new Date().toDateString();
                const lastDuty = driver.lastDutyDate
                    ? new Date(driver.lastDutyDate).toDateString()
                    : null;
                if (lastDuty !== today) {
                    driver.totalHoursToday = durationHours;
                } else {
                    driver.totalHoursToday += durationHours;
                }
                driver.lastDutyDate = now;
                await driver.save();
            }
        } else if (status === 'Cancelled') {
            if (!cancellationReason) {
                return NextResponse.json(
                    { error: 'Cancellation reason is required' },
                    { status: 400 }
                );
            }

            trip.status = 'Cancelled';
            trip.cancellationReason = cancellationReason;
            trip.cancellationNote = cancellationNote || '';
            trip.endTime = new Date();
            await trip.save();

            // Release vehicle
            await Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'Available' });

            // Update driver
            const driver = await Driver.findById(trip.driver);
            if (driver) {
                driver.status = 'Off Duty';
                driver.totalTrips += 1;
                driver.cancelledTrips += 1;
                driver.safetyScore = Math.max(0, driver.safetyScore - 2);
                await driver.save();
            }
        } else if (status === 'Dispatched') {
            trip.status = 'Dispatched';
            await trip.save();
        } else {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const updated = await Trip.findById(id)
            .populate('vehicle', 'name licensePlate type maxCapacity currentOdometer')
            .populate('driver', 'name email phone');

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
