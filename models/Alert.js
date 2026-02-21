import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['Service Due', 'License Expiring', 'Idle Vehicle', 'Shift Limit', 'Budget Exceeded'],
            required: true,
        },
        severity: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Critical'],
            required: true,
        },
        message: {
            type: String,
            required: [true, 'Alert message is required'],
        },
        vehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vehicle',
        },
        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Driver',
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        isDismissed: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
AlertSchema.index({ isRead: 1 });
AlertSchema.index({ isDismissed: 1 });
AlertSchema.index({ type: 1 });
AlertSchema.index({ isRead: 1, isDismissed: 1 });

export default mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
