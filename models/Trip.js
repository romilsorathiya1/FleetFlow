import mongoose from 'mongoose';

const TripSchema = new mongoose.Schema(
    {
        vehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vehicle',
            required: [true, 'Vehicle is required'],
        },
        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Driver',
            required: [true, 'Driver is required'],
        },
        origin: {
            type: String,
            required: [true, 'Origin is required'],
        },
        destination: {
            type: String,
            required: [true, 'Destination is required'],
        },
        cargoDescription: String,
        cargoWeight: {
            type: Number,
            required: [true, 'Cargo weight is required'],
        },
        estimatedDistanceKm: Number,
        actualDistanceKm: Number,
        status: {
            type: String,
            enum: ['Draft', 'Dispatched', 'Completed', 'Cancelled'],
            default: 'Draft',
        },
        cancellationReason: {
            type: String,
            enum: [
                'Vehicle Breakdown',
                'Driver Unavailable',
                'Client Cancelled',
                'Cargo Issue',
                'Weather',
                'Other',
            ],
        },
        cancellationNote: String,
        startOdometer: Number,
        endOdometer: Number,
        revenue: {
            type: Number,
            default: 0,
        },
        notes: String,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        startTime: Date,
        endTime: Date,
    },
    {
        timestamps: true,
    }
);

// Indexes
TripSchema.index({ status: 1 });
TripSchema.index({ vehicle: 1 });
TripSchema.index({ driver: 1 });
TripSchema.index({ createdAt: -1 });
TripSchema.index({ vehicle: 1, status: 1 });
TripSchema.index({ driver: 1, status: 1 });

export default mongoose.models.Trip || mongoose.model('Trip', TripSchema);
