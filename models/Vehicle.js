import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Vehicle name is required'],
            trim: true,
        },
        model: {
            type: String,
            required: [true, 'Model is required'],
            trim: true,
        },
        licensePlate: {
            type: String,
            required: [true, 'License plate is required'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['Truck', 'Van', 'Bike'],
            required: [true, 'Vehicle type is required'],
        },
        maxCapacity: {
            type: Number,
            required: [true, 'Max capacity is required'],
        },
        currentOdometer: {
            type: Number,
            default: 0,
        },
        lastServiceOdometer: {
            type: Number,
            default: 0,
        },
        acquisitionCost: {
            type: Number,
            default: 0,
        },
        region: {
            type: String,
            default: 'Central',
        },
        status: {
            type: String,
            enum: ['Available', 'On Trip', 'In Shop', 'Retired'],
            default: 'Available',
        },
        lastTripDate: Date,
        yearOfManufacture: Number,
        averageFuelCostPerKm: {
            type: Number,
            default: 0,
        },
        monthlyBudget: {
            type: Number,
            default: 0,
        },
        notes: String,
    },
    {
        timestamps: true,
    }
);

// Indexes
VehicleSchema.index({ status: 1 });
VehicleSchema.index({ type: 1 });
VehicleSchema.index({ region: 1 });
VehicleSchema.index({ licensePlate: 1 }, { unique: true });
VehicleSchema.index({ status: 1, type: 1 });

export default mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
