import mongoose from 'mongoose';

const IncidentSchema = new mongoose.Schema(
    {
        date: Date,
        description: String,
        severity: {
            type: String,
            enum: ['Low', 'Medium', 'High'],
        },
    },
    { _id: false }
);

const DriverSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Driver name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        phone: String,
        licenseNumber: {
            type: String,
            required: [true, 'License number is required'],
            unique: true,
        },
        licenseExpiry: {
            type: Date,
            required: [true, 'License expiry date is required'],
        },
        licenseCategory: {
            type: [String],
            enum: ['Truck', 'Van', 'Bike'],
        },
        status: {
            type: String,
            enum: ['On Duty', 'Off Duty', 'Suspended'],
            default: 'Off Duty',
        },
        safetyScore: {
            type: Number,
            default: 100,
            min: 0,
            max: 100,
        },
        totalTrips: {
            type: Number,
            default: 0,
        },
        completedTrips: {
            type: Number,
            default: 0,
        },
        cancelledTrips: {
            type: Number,
            default: 0,
        },
        totalHoursToday: {
            type: Number,
            default: 0,
        },
        lastDutyDate: Date,
        incidents: [IncidentSchema],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual: completion rate
DriverSchema.virtual('completionRate').get(function () {
    if (this.totalTrips === 0) return 0;
    return Math.round((this.completedTrips / this.totalTrips) * 100);
});

// Indexes
DriverSchema.index({ status: 1 });
DriverSchema.index({ licenseExpiry: 1 });
DriverSchema.index({ licenseCategory: 1 });

export default mongoose.models.Driver || mongoose.model('Driver', DriverSchema);
