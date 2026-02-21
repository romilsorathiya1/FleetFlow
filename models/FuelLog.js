import mongoose from 'mongoose';

const FuelLogSchema = new mongoose.Schema(
    {
        vehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vehicle',
            required: [true, 'Vehicle is required'],
        },
        trip: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Trip',
        },
        liters: {
            type: Number,
            required: [true, 'Liters is required'],
        },
        costPerLiter: {
            type: Number,
            required: [true, 'Cost per liter is required'],
        },
        totalCost: {
            type: Number,
        },
        kmDriven: Number,
        fuelEfficiency: Number,
        date: {
            type: Date,
            default: Date.now,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Pre-save hook: auto-calculate totalCost and fuelEfficiency
FuelLogSchema.pre('save', function () {
    this.totalCost = this.liters * this.costPerLiter;

    if (this.kmDriven && this.liters > 0) {
        this.fuelEfficiency = parseFloat((this.kmDriven / this.liters).toFixed(2));
    }
});

// Indexes
FuelLogSchema.index({ vehicle: 1 });
FuelLogSchema.index({ date: -1 });
FuelLogSchema.index({ trip: 1 });

export default mongoose.models.FuelLog || mongoose.model('FuelLog', FuelLogSchema);
