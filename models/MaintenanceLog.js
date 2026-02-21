import mongoose from 'mongoose';

const MaintenanceLogSchema = new mongoose.Schema(
    {
        vehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vehicle',
            required: [true, 'Vehicle is required'],
        },
        type: {
            type: String,
            required: [true, 'Maintenance type is required'],
            enum: ['Oil Change', 'Tire Replacement', 'Brake Service', 'Engine Repair', 'Battery', 'Other'],
        },
        cost: {
            type: Number,
            required: true,
            default: 0,
        },
        description: String,
        serviceProvider: String,
        status: {
            type: String,
            enum: ['Ongoing', 'Resolved'],
            default: 'Ongoing',
        },
        serviceDate: {
            type: Date,
            default: Date.now,
        },
        resolvedAt: Date,
        odometerAtService: Number,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
MaintenanceLogSchema.index({ vehicle: 1 });
MaintenanceLogSchema.index({ status: 1 });
MaintenanceLogSchema.index({ serviceDate: -1 });

export default mongoose.models.MaintenanceLog || mongoose.model('MaintenanceLog', MaintenanceLogSchema);
