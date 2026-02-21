/**
 * FleetFlow Seed Data Script
 * Run: node scripts/seedData.js
 *
 * Seeds the database with demo data for vehicles, drivers, trips,
 * maintenance logs, fuel logs, and users.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fleetflow';

// ─── Schemas (inline to avoid ESM import issues) ───

const VehicleSchema = new mongoose.Schema({
    name: String, model: String, licensePlate: { type: String, unique: true, uppercase: true },
    type: { type: String, enum: ['Truck', 'Van', 'Bike'] },
    maxCapacity: Number, currentOdometer: { type: Number, default: 0 },
    lastServiceOdometer: { type: Number, default: 0 }, acquisitionCost: { type: Number, default: 0 },
    region: { type: String, default: 'Central' },
    status: { type: String, enum: ['Available', 'On Trip', 'In Shop', 'Retired'], default: 'Available' },
    lastTripDate: Date, yearOfManufacture: Number,
    averageFuelCostPerKm: { type: Number, default: 0 },
    monthlyBudget: { type: Number, default: 0 }, notes: String,
}, { timestamps: true });

const DriverSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true, lowercase: true },
    phone: String, licenseNumber: { type: String, unique: true },
    licenseExpiry: Date, licenseCategory: [{ type: String, enum: ['Truck', 'Van', 'Bike'] }],
    status: { type: String, enum: ['On Duty', 'Off Duty', 'Suspended'], default: 'Off Duty' },
    safetyScore: { type: Number, default: 100 },
    totalTrips: { type: Number, default: 0 }, completedTrips: { type: Number, default: 0 },
    cancelledTrips: { type: Number, default: 0 },
    totalHoursToday: { type: Number, default: 0 }, lastDutyDate: Date, incidents: [],
}, { timestamps: true });

const TripSchema = new mongoose.Schema({
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    origin: String, destination: String, cargoDescription: String, cargoWeight: Number,
    estimatedDistanceKm: Number, actualDistanceKm: Number,
    status: { type: String, enum: ['Draft', 'Dispatched', 'Completed', 'Cancelled'], default: 'Draft' },
    cancellationReason: String, cancellationNote: String,
    startOdometer: Number, endOdometer: Number,
    revenue: { type: Number, default: 0 }, notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startTime: Date, endTime: Date,
}, { timestamps: true });

const MaintenanceLogSchema = new mongoose.Schema({
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    type: { type: String, enum: ['Oil Change', 'Tire Replacement', 'Brake Service', 'Engine Repair', 'Battery', 'Other'] },
    cost: { type: Number, default: 0 }, description: String, serviceProvider: String,
    status: { type: String, enum: ['Ongoing', 'Resolved'], default: 'Ongoing' },
    serviceDate: { type: Date, default: Date.now }, resolvedAt: Date, odometerAtService: Number,
}, { timestamps: true });

const FuelLogSchema = new mongoose.Schema({
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    liters: Number, costPerLiter: Number, totalCost: Number,
    kmDriven: Number, fuelEfficiency: Number,
    date: { type: Date, default: Date.now },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true, lowercase: true },
    password: String, role: String, isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);
const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);
const MaintenanceLog = mongoose.models.MaintenanceLog || mongoose.model('MaintenanceLog', MaintenanceLogSchema);
const FuelLog = mongoose.models.FuelLog || mongoose.model('FuelLog', FuelLogSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// ─── Seed Data ───

async function seed() {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
        Vehicle.deleteMany({}),
        Driver.deleteMany({}),
        Trip.deleteMany({}),
        MaintenanceLog.deleteMany({}),
        FuelLog.deleteMany({}),
        User.deleteMany({}),
    ]);

    // === USERS ===
    const SALT = 12;
    const users = await User.insertMany([
        { name: 'Admin Manager', email: 'romilsorathiya9497@gmail.com', password: await bcrypt.hash('Admin@123', SALT), role: 'fleet_manager', isActive: true },
        { name: 'Dispatcher User', email: 'romilsorathiya9497@gmail.com', password: await bcrypt.hash('Dispatch@123', SALT), role: 'dispatcher', isActive: true },
        { name: 'Safety Officer', email: 'romilsorathiya9497@gmail.com', password: await bcrypt.hash('Safety@123', SALT), role: 'safety_officer', isActive: true },
        { name: 'Finance Analyst', email: 'romilsorathiya9497@gmail.com', password: await bcrypt.hash('Finance@123', SALT), role: 'financial_analyst', isActive: true },
    ]);
    console.log(`👤 Seeded ${users.length} users`);

    // === VEHICLES ===
    const now = new Date();
    const daysAgo = (d) => new Date(now.getTime() - d * 86400000);

    const vehicles = await Vehicle.insertMany([
        { name: 'Titan Alpha', model: 'Volvo FH16', licensePlate: 'MH01AB1234', type: 'Truck', maxCapacity: 25000, currentOdometer: 78500, lastServiceOdometer: 73000, acquisitionCost: 3500000, region: 'North', status: 'Available', yearOfManufacture: 2022, averageFuelCostPerKm: 18, monthlyBudget: 50000, lastTripDate: daysAgo(2) },
        { name: 'Swift Runner', model: 'Tata Ace', licensePlate: 'DL05CD5678', type: 'Van', maxCapacity: 750, currentOdometer: 42000, lastServiceOdometer: 40000, acquisitionCost: 600000, region: 'Central', status: 'On Trip', yearOfManufacture: 2023, averageFuelCostPerKm: 8, monthlyBudget: 20000, lastTripDate: daysAgo(0) },
        { name: 'Cargo King', model: 'Ashok Leyland 3520', licensePlate: 'KA03EF9012', type: 'Truck', maxCapacity: 35000, currentOdometer: 120000, lastServiceOdometer: 112000, acquisitionCost: 4200000, region: 'South', status: 'In Shop', yearOfManufacture: 2021, averageFuelCostPerKm: 22, monthlyBudget: 60000, lastTripDate: daysAgo(10) },
        { name: 'Urban Dash', model: 'Bajaj Maxima', licensePlate: 'TN04GH3456', type: 'Bike', maxCapacity: 200, currentOdometer: 15000, lastServiceOdometer: 14500, acquisitionCost: 250000, region: 'South', status: 'Available', yearOfManufacture: 2024, averageFuelCostPerKm: 4, monthlyBudget: 8000, lastTripDate: daysAgo(1) },
        { name: 'Mountain Express', model: 'BharatBenz 1617', licensePlate: 'RJ06IJ7890', type: 'Truck', maxCapacity: 16000, currentOdometer: 95000, lastServiceOdometer: 90000, acquisitionCost: 2800000, region: 'West', status: 'Available', yearOfManufacture: 2022, averageFuelCostPerKm: 16, monthlyBudget: 45000, lastTripDate: daysAgo(5) },
        { name: 'City Mover', model: 'Mahindra Bolero Pickup', licensePlate: 'GJ07KL2345', type: 'Van', maxCapacity: 1200, currentOdometer: 33000, lastServiceOdometer: 30000, acquisitionCost: 800000, region: 'West', status: 'Available', yearOfManufacture: 2023, averageFuelCostPerKm: 10, monthlyBudget: 25000, lastTripDate: daysAgo(15) },
        { name: 'Night Rider', model: 'Eicher Pro 2049', licensePlate: 'UP08MN6789', type: 'Truck', maxCapacity: 9000, currentOdometer: 60000, lastServiceOdometer: 55000, acquisitionCost: 1800000, region: 'North', status: 'Available', yearOfManufacture: 2023, averageFuelCostPerKm: 14, monthlyBudget: 35000, lastTripDate: daysAgo(3) },
        { name: 'Old Faithful', model: 'TATA 407', licensePlate: 'MP09OP0123', type: 'Van', maxCapacity: 2500, currentOdometer: 180000, lastServiceOdometer: 170000, acquisitionCost: 500000, region: 'Central', status: 'Retired', yearOfManufacture: 2018, averageFuelCostPerKm: 12, monthlyBudget: 0 },
    ]);
    console.log(`🚛 Seeded ${vehicles.length} vehicles`);

    // === DRIVERS ===
    const drivers = await Driver.insertMany([
        { name: 'Rajesh Kumar', email: 'rajesh@fleetflow.com', phone: '+91 98765 43210', licenseNumber: 'DL-0420110012345', licenseExpiry: daysAgo(-365), licenseCategory: ['Truck', 'Van'], status: 'On Duty', safetyScore: 92, totalTrips: 45, completedTrips: 42, cancelledTrips: 3, lastDutyDate: daysAgo(0) },
        { name: 'Priya Sharma', email: 'priya@fleetflow.com', phone: '+91 98765 43211', licenseNumber: 'MH-0120120054321', licenseExpiry: daysAgo(-180), licenseCategory: ['Van', 'Bike'], status: 'On Duty', safetyScore: 98, totalTrips: 38, completedTrips: 37, cancelledTrips: 1, lastDutyDate: daysAgo(0) },
        { name: 'Amit Patel', email: 'amit@fleetflow.com', phone: '+91 98765 43212', licenseNumber: 'GJ-0620130098765', licenseExpiry: daysAgo(5), licenseCategory: ['Truck'], status: 'Off Duty', safetyScore: 75, totalTrips: 60, completedTrips: 52, cancelledTrips: 8, incidents: [{ date: daysAgo(30), description: 'Minor fender bender in parking', severity: 'Low' }] },
        { name: 'Sneha Reddy', email: 'sneha@fleetflow.com', phone: '+91 98765 43213', licenseNumber: 'KA-0320140043210', licenseExpiry: daysAgo(-90), licenseCategory: ['Truck', 'Van'], status: 'Off Duty', safetyScore: 88, totalTrips: 28, completedTrips: 26, cancelledTrips: 2, lastDutyDate: daysAgo(2) },
        { name: 'Vikram Singh', email: 'vikram@fleetflow.com', phone: '+91 98765 43214', licenseNumber: 'RJ-1220100012300', licenseExpiry: daysAgo(-30), licenseCategory: ['Truck', 'Van', 'Bike'], status: 'Suspended', safetyScore: 55, totalTrips: 70, completedTrips: 58, cancelledTrips: 12, incidents: [{ date: daysAgo(7), description: 'Overspeeding violation', severity: 'High' }, { date: daysAgo(15), description: 'Failed to report vehicle damage', severity: 'Medium' }] },
        { name: 'Meera Joshi', email: 'meera@fleetflow.com', phone: '+91 98765 43215', licenseNumber: 'TN-0920150067890', licenseExpiry: daysAgo(-400), licenseCategory: ['Van', 'Bike'], status: 'On Duty', safetyScore: 96, totalTrips: 22, completedTrips: 22, cancelledTrips: 0, lastDutyDate: daysAgo(0) },
    ]);
    console.log(`👨‍✈️ Seeded ${drivers.length} drivers`);

    // === TRIPS ===
    const trips = await Trip.insertMany([
        { vehicle: vehicles[0]._id, driver: drivers[0]._id, origin: 'Mumbai Warehouse', destination: 'Delhi Distribution Center', cargoDescription: 'Electronics', cargoWeight: 8000, estimatedDistanceKm: 1420, actualDistanceKm: 1435, status: 'Completed', startOdometer: 76500, endOdometer: 77935, revenue: 85000, startTime: daysAgo(5), endTime: daysAgo(3), createdBy: users[0]._id },
        { vehicle: vehicles[1]._id, driver: drivers[1]._id, origin: 'Noida Hub', destination: 'Gurgaon Mall', cargoDescription: 'Fashion items', cargoWeight: 400, estimatedDistanceKm: 35, status: 'Dispatched', startOdometer: 41800, revenue: 3500, startTime: daysAgo(0), createdBy: users[1]._id },
        { vehicle: vehicles[4]._id, driver: drivers[3]._id, origin: 'Jaipur Factory', destination: 'Ahmedabad Depot', cargoDescription: 'Textiles', cargoWeight: 12000, estimatedDistanceKm: 670, actualDistanceKm: 685, status: 'Completed', startOdometer: 93500, endOdometer: 94185, revenue: 45000, startTime: daysAgo(8), endTime: daysAgo(7), createdBy: users[0]._id },
        { vehicle: vehicles[6]._id, driver: drivers[0]._id, origin: 'Lucknow Market', destination: 'Varanasi Store', cargoDescription: 'FMCG Products', cargoWeight: 5000, estimatedDistanceKm: 320, status: 'Draft', revenue: 18000, createdBy: users[1]._id },
        { vehicle: vehicles[0]._id, driver: drivers[4]._id, origin: 'Delhi Terminal', destination: 'Chandigarh Warehouse', cargoDescription: 'Auto Parts', cargoWeight: 15000, estimatedDistanceKm: 260, status: 'Cancelled', cancellationReason: 'Driver Unavailable', cancellationNote: 'Driver suspended due to safety incidents', createdBy: users[0]._id },
        { vehicle: vehicles[3]._id, driver: drivers[5]._id, origin: 'Chennai Central', destination: 'Pondicherry Outlet', cargoDescription: 'Groceries', cargoWeight: 150, estimatedDistanceKm: 155, actualDistanceKm: 158, status: 'Completed', startOdometer: 14600, endOdometer: 14758, revenue: 2800, startTime: daysAgo(2), endTime: daysAgo(2), createdBy: users[1]._id },
        { vehicle: vehicles[4]._id, driver: drivers[0]._id, origin: 'Udaipur Hub', destination: 'Jodhpur Center', cargoDescription: 'Construction material', cargoWeight: 14000, estimatedDistanceKm: 260, status: 'Dispatched', startOdometer: 94185, revenue: 22000, startTime: daysAgo(0), createdBy: users[0]._id },
        { vehicle: vehicles[6]._id, driver: drivers[3]._id, origin: 'Kanpur Depot', destination: 'Allahabad Store', cargoDescription: 'Pharmaceuticals', cargoWeight: 3000, estimatedDistanceKm: 200, actualDistanceKm: 210, status: 'Completed', startOdometer: 58000, endOdometer: 58210, revenue: 15000, startTime: daysAgo(6), endTime: daysAgo(5), createdBy: users[1]._id },
        { vehicle: vehicles[5]._id, driver: drivers[5]._id, origin: 'Surat Warehouse', destination: 'Vadodara Market', cargoDescription: 'Ceramics', cargoWeight: 800, estimatedDistanceKm: 135, status: 'Cancelled', cancellationReason: 'Client Cancelled', cancellationNote: 'Client postponed delivery to next week', createdBy: users[1]._id },
        { vehicle: vehicles[1]._id, driver: drivers[1]._id, origin: 'Greater Noida', destination: 'Faridabad Mall', cargoDescription: 'Furniture', cargoWeight: 600, estimatedDistanceKm: 45, actualDistanceKm: 48, status: 'Completed', startOdometer: 41400, endOdometer: 41448, revenue: 5000, startTime: daysAgo(3), endTime: daysAgo(3), createdBy: users[0]._id },
    ]);
    console.log(`🚚 Seeded ${trips.length} trips`);

    // === MAINTENANCE LOGS ===
    const maintenanceLogs = await MaintenanceLog.insertMany([
        { vehicle: vehicles[2]._id, type: 'Engine Repair', cost: 45000, description: 'Major engine overhaul — cylinder head gasket replacement', serviceProvider: 'AutoTech Service Center', status: 'Ongoing', serviceDate: daysAgo(3), odometerAtService: 120000 },
        { vehicle: vehicles[0]._id, type: 'Oil Change', cost: 3500, description: 'Routine oil and filter change', serviceProvider: 'QuickLube Express', status: 'Resolved', serviceDate: daysAgo(15), resolvedAt: daysAgo(15), odometerAtService: 73000 },
        { vehicle: vehicles[6]._id, type: 'Tire Replacement', cost: 28000, description: 'All 6 tires replaced with new Michelin set', serviceProvider: 'TirePro Workshop', status: 'Resolved', serviceDate: daysAgo(20), resolvedAt: daysAgo(19), odometerAtService: 55000 },
        { vehicle: vehicles[4]._id, type: 'Brake Service', cost: 12000, description: 'Front and rear brake pad replacement', serviceProvider: 'BrakeMax Service', status: 'Resolved', serviceDate: daysAgo(12), resolvedAt: daysAgo(11), odometerAtService: 90000 },
        { vehicle: vehicles[5]._id, type: 'Battery', cost: 8500, description: 'Battery replacement — old battery dead', serviceProvider: 'Exide Battery Center', status: 'Ongoing', serviceDate: daysAgo(1), odometerAtService: 33000 },
    ]);
    console.log(`🔧 Seeded ${maintenanceLogs.length} maintenance logs`);

    // === FUEL LOGS ===
    const completedTrips = trips.filter((t) => t.status === 'Completed');
    const fuelLogs = await FuelLog.insertMany([
        { vehicle: vehicles[0]._id, trip: completedTrips[0]._id, liters: 240, costPerLiter: 105, totalCost: 25200, kmDriven: 1435, fuelEfficiency: 5.98, date: daysAgo(4) },
        { vehicle: vehicles[4]._id, trip: completedTrips[1]._id, liters: 120, costPerLiter: 102, totalCost: 12240, kmDriven: 685, fuelEfficiency: 5.71, date: daysAgo(7) },
        { vehicle: vehicles[3]._id, trip: completedTrips[2]._id, liters: 12, costPerLiter: 102, totalCost: 1224, kmDriven: 158, fuelEfficiency: 13.17, date: daysAgo(2) },
        { vehicle: vehicles[6]._id, trip: completedTrips[3]._id, liters: 35, costPerLiter: 105, totalCost: 3675, kmDriven: 210, fuelEfficiency: 6.0, date: daysAgo(5) },
        { vehicle: vehicles[1]._id, trip: completedTrips[4]._id, liters: 8, costPerLiter: 102, totalCost: 816, kmDriven: 48, fuelEfficiency: 6.0, date: daysAgo(3) },
        { vehicle: vehicles[0]._id, liters: 80, costPerLiter: 105, totalCost: 8400, kmDriven: 565, fuelEfficiency: 7.06, date: daysAgo(10) },
        { vehicle: vehicles[5]._id, liters: 45, costPerLiter: 102, totalCost: 4590, kmDriven: 320, fuelEfficiency: 7.11, date: daysAgo(8) },
        { vehicle: vehicles[4]._id, liters: 65, costPerLiter: 105, totalCost: 6825, kmDriven: 400, fuelEfficiency: 6.15, date: daysAgo(14) },
    ]);
    console.log(`⛽ Seeded ${fuelLogs.length} fuel logs`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('┌─────────────────────────────────┬──────────────────┬─────────────────┐');
    console.log('│ Role                            │ Email            │ Password        │');
    console.log('├─────────────────────────────────┼──────────────────┼─────────────────┤');
    console.log('│ Fleet Manager (Admin)           │ admin@fleetflow  │ Admin@123       │');
    console.log('│ Dispatcher                      │ dispatch@fleet.. │ Dispatch@123    │');
    console.log('│ Safety Officer                  │ safety@fleet..   │ Safety@123      │');
    console.log('│ Financial Analyst               │ finance@fleet..  │ Finance@123     │');
    console.log('└─────────────────────────────────┴──────────────────┴─────────────────┘');

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB.');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
