<div align="center">

# 🚛 FleetFlow

**Intelligent Fleet Management System**

A production-ready, full-stack fleet management platform built with Next.js 16, React 19, and MongoDB. Manage vehicles, drivers, trips, maintenance, fuel logs, and analytics — all from a single, beautifully designed dashboard.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?logo=mongodb)](https://mongoosejs.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Getting Started (Setup Guide)](how-to-run-project.md)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Seed Data](#-seed-data)
- [User Guide](#-user-guide)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Deployment](#-deployment)
- [Developer Guide](#-developer-guide)

---

## ✨ Features

### 🔐 Authentication & Authorization
- **Credential-based authentication** via NextAuth.js with JWT sessions
- **4 distinct user roles** with granular route-level access control:

| Role | Dashboard | Vehicles | Drivers | Trips | Maintenance | Fuel Logs | Analytics |
|------|:---------:|:--------:|:-------:|:-----:|:-----------:|:---------:|:---------:|
| Fleet Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dispatcher | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Safety Officer | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Financial Analyst | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

- Role-based middleware protection on all routes (`middleware.js`)
- Quick-login chips on the login page for fast demo access

### 📊 Dashboard
- Real-time KPI cards (total vehicles, active trips, alerts, fleet utilization)
- Alert banners for critical notifications
- Recent trips table with status indicators
- Filter controls for time-based views
- **Location**: `app/dashboard/`

### 🚗 Vehicle Management
- Full CRUD operations for fleet vehicles (Truck, Van, Bike)
- Card & list view toggle with search, status, type, and region filters
- Detailed vehicle profiles with maintenance cost & fuel cost aggregation
- Bulk selection with multi-vehicle operations
- Drawer-based forms for add/edit with validation
- **Location**: `app/vehicles/`

### 👨‍✈️ Driver Management
- Full CRUD with driver profiles, license tracking, and incident history
- Safety score visualization and completion rate calculation
- License expiry monitoring (OK, warning, critical, expired states)
- Detailed driver profiles with tabbed interface (Overview, Trips, Incidents)
- **Location**: `app/drivers/`, `app/drivers/[id]/`

### 🚚 Trip Management
- End-to-end trip lifecycle: Draft → Dispatched → Completed/Cancelled
- Smart validation chain on trip creation:
  - Vehicle availability check
  - Driver license category match
  - License expiry validation
  - Cargo weight vs vehicle capacity
  - Driver shift limit enforcement (10 hrs/day)
- Tab-based status filtering with live status counts
- Automatic vehicle/driver status updates on dispatch
- **Location**: `app/trips/`

### 🔧 Maintenance Tracking
- Log maintenance records linked to specific vehicles
- Types: Oil Change, Tire Replacement, Brake Service, Engine Repair, Battery, Other
- Status tracking: Ongoing → Resolved
- Monthly budget tracking per vehicle
- Service provider management
- **Location**: `app/maintenance/`

### ⛽ Fuel Log Management
- Per-trip and standalone fuel log entries
- Auto-calculated total cost and fuel efficiency (km/L)
- Operational cost table with per-vehicle breakdown
- Efficiency trend charts via Recharts
- **Location**: `app/fuel-logs/`

### 📈 Analytics & Reports
- Financial overview KPIs (total revenue, maintenance costs, fuel costs, net profit)
- Monthly cost trends chart
- Fuel efficiency by vehicle chart
- Vehicle ROI table with profit/loss calculations
- Top drivers leaderboard by completed trips
- Cancellation reasons breakdown
- Cost per kilometer analysis
- **CSV & PDF export** via PapaParse and jsPDF
- **Location**: `app/analytics/`

### 🔔 Alert System
- Automated alert generation via background checks:
  - **Service Due**: Triggered when odometer gap exceeds 5,000 km
  - **License Expiring**: Triggered within 30 days of expiry (severity: Critical < 7d, High < 14d, Medium < 30d)
  - **Idle Vehicle**: Triggered when available vehicles are idle for 7+ days
- Notification center drawer with tabs: All, Unread, By Type
- Mark as read and dismiss functionality
- Real-time unread count badge in the top bar
- **Location**: `components/ui/NotificationCenter.jsx`, `lib/alertChecks.js`

### 🔍 Global Search
- Unified search across vehicles, drivers, and trips from the top bar
- Categorized results with quick navigation
- Minimum 2-character query threshold
- **Location**: `app/api/search/route.js`, `components/ui/TopBar.jsx`

### 🎨 UI/UX Features
- **Dark/Light mode** with localStorage persistence
- **Keyboard shortcuts** for power users (press `?` to see all shortcuts)
- **Toast notification system** for user feedback
- **Print-ready styles** for trip sheets
- **Page transition animations**
- **Fully responsive design** across mobile, tablet, and desktop
- **Mobile hamburger menu** with sidebar overlay

### 🛡️ Production Features
- **Rate limiting**: 30 requests/minute per IP with automatic cleanup
- **Input validation & sanitization**: All API inputs validated and sanitized
- **Health check endpoint**: `/api/health` for monitoring
- **Custom error pages**: `error.jsx` and `not-found.jsx`
- **Vercel deployment config**: `vercel.json` with optimized function settings

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16.1.6 (App Router + Turbopack) |
| **Frontend** | React 19.2.3, Vanilla CSS Modules |
| **Database** | MongoDB with Mongoose 9.2.1 |
| **Authentication** | NextAuth.js 4.24 (Credentials + JWT) |
| **Charts** | Recharts 3.7 |
| **Icons** | Lucide React |
| **Exports** | jsPDF (PDF), PapaParse (CSV) |
| **Date Utilities** | date-fns 4.1 |
| **Password Hashing** | bcryptjs 3.0.3 |
| **Styling** | CSS Modules + CSS Custom Properties |
| **Deployment** | Vercel (configured) |

---


## 🌱 Seed Data

> [!IMPORTANT]
> For the **Forgot Password** (OTP email) functionality to work, all four initial users must be seeded with a **real email address** that you can access. By default, they are all set to `romilsorathiya9497@gmail.com` in the seed script.

FleetFlow includes two seed mechanisms:

### 1. CLI Script (Recommended)

```bash
node scripts/seedData.js
```

Seeds the database with:
- **4 users** (one per role)
- **8 vehicles** (Trucks, Vans, Bikes across Indian regions)
- **6 drivers** with license details and safety scores
- **10 trips** (completed, dispatched, draft, cancelled)
- **5 maintenance logs** (ongoing and resolved)
- **8 fuel logs** with efficiency data

### 2. In-App Seed Button

In development mode, a "🌱 Seed Demo Data" button appears on the login page, calling the `/api/seed` endpoint.

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Fleet Manager | `romilsorathiya9497@gmail.com` | `Admin@123` |
| Dispatcher | `romilsorathiya9497@gmail.com` | `Dispatch@123` |
| Safety Officer | `romilsorathiya9497@gmail.com` | `Safety@123` |
| Financial Analyst | `romilsorathiya9497@gmail.com` | `Finance@123` |

---

## 📖 User Guide

### Login
1. Navigate to `http://localhost:3000/login`
2. Enter email and password, or use the quick-login role chips for demo access
3. You'll be redirected to the Dashboard

### Dashboard
- View fleet-wide KPIs at a glance
- Monitor critical alerts in the banner area
- Review recent trips and fleet activity
- Use filter buttons to change the time window

### Managing Vehicles
1. Navigate to **Vehicles** from the sidebar
2. Use filters (status, type, region) or search to find vehicles
3. Click **+ Add Vehicle** to create a new entry
4. Click any vehicle card to view details, edit, or delete
5. Use bulk selection for multi-vehicle operations

### Managing Drivers
1. Navigate to **Drivers** from the sidebar
2. View driver cards with safety scores and license status
3. Click a driver to access their detailed profile (Overview, Trips, Incidents tabs)
4. Add new drivers with license category and expiry details

### Creating Trips
1. Navigate to **Trips** from the sidebar
2. Click **+ New Trip** to open the creation form
3. Select a vehicle (must be "Available") and driver (must be "Off Duty")
4. System automatically validates: license match, cargo capacity, shift limits
5. Trip starts as "Draft" — dispatch when ready

### Maintenance & Fuel
- **Maintenance**: Log service records against vehicles. Track ongoing vs resolved.
- **Fuel Logs**: Record refueling with liters, cost, and km driven. Efficiency auto-calculates.

### Analytics
1. Navigate to **Analytics** from the sidebar
2. View financial KPIs, cost trends, and efficiency charts
3. Use date range filters to customize the reporting period
4. Export reports as **CSV** or **PDF**

### Dark Mode & Shortcuts
- Toggle dark/light mode using the ☀️/🌙 icon in the top bar
- Press `?` to view all keyboard shortcuts

---

## 📁 Project Structure

```
fleetflow/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login)
│   │   └── login/                # Login page + CSS module
│   ├── api/                      # REST API routes
│   │   ├── alerts/               # Alert CRUD + read/dismiss
│   │   ├── analytics/            # Summary + reports endpoints
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   ├── drivers/              # Driver CRUD + detail
│   │   ├── fuel-logs/            # Fuel log CRUD
│   │   ├── health/               # Health check endpoint
│   │   ├── maintenance/          # Maintenance CRUD + resolve
│   │   ├── search/               # Global search endpoint
│   │   ├── seed/                 # In-app seed endpoint
│   │   ├── trips/                # Trip CRUD + status transitions
│   │   ├── users/                # User seed endpoint
│   │   └── vehicles/             # Vehicle CRUD + detail
│   ├── analytics/                # Analytics & Reports page
│   ├── dashboard/                # Dashboard page + layout
│   ├── drivers/                  # Drivers list + [id] detail page
│   ├── fuel-logs/                # Fuel Logs page
│   ├── maintenance/              # Maintenance page
│   ├── trips/                    # Trips page
│   ├── vehicles/                 # Vehicles page
│   ├── layout.jsx                # Root layout
│   ├── page.jsx                  # Root redirect
│   ├── error.jsx                 # Global error boundary
│   └── not-found.jsx             # Custom 404 page
├── components/
│   └── ui/                       # Reusable UI components
│       ├── Sidebar.jsx           # Navigation sidebar (mobile responsive)
│       ├── TopBar.jsx            # Top bar with search, theme toggle, alerts
│       ├── Modal.jsx             # Reusable modal component
│       ├── DataTable.jsx         # Sortable data table with sticky headers
│       ├── KPICard.jsx           # Metric card with trend indicator
│       ├── StatusBadge.jsx       # Color-coded status badge
│       ├── NotificationCenter.jsx # Alert drawer with tabs
│       ├── Toast.jsx             # Toast notification system
│       ├── KeyboardShortcuts.jsx  # Shortcut modal
│       ├── ConfirmDialog.jsx     # Confirmation dialog
│       ├── LoadingSpinner.jsx    # Loading indicator
│       └── ErrorBoundary.jsx     # Error boundary component
├── lib/                          # Shared utilities
│   ├── auth.js                   # NextAuth configuration
│   ├── mongodb.js                # MongoDB connection (cached)
│   ├── rateLimit.js              # IP-based rate limiting
│   ├── validation.js             # Input validation & sanitization
│   ├── alertChecks.js            # Automated alert generation logic
│   └── utils.js                  # Formatting helpers (currency, date, ROI)
├── models/                       # Mongoose schemas
│   ├── Alert.js
│   ├── Driver.js
│   ├── FuelLog.js
│   ├── MaintenanceLog.js
│   ├── Trip.js
│   ├── User.js
│   └── Vehicle.js
├── scripts/
│   └── seedData.js               # Database seed script
├── styles/
│   ├── globals.css               # Global styles & resets
│   ├── variables.css             # CSS custom properties (theme)
│   └── components.css            # Shared component styles
├── middleware.js                  # Auth + RBAC middleware
├── vercel.json                   # Vercel deployment config
├── next.config.mjs               # Next.js configuration
└── package.json
```

---

## 🗃️ Database Schema

### User
| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Full name |
| `email` | String (unique, lowercase) | Login email |
| `password` | String (hashed) | bcrypt-hashed password |
| `role` | String | `fleet_manager`, `dispatcher`, `safety_officer`, `financial_analyst` |
| `isActive` | Boolean | Account active status |

**Indexes**: `email` (unique), `role`

### Vehicle
| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Display name |
| `model` | String | Vehicle model |
| `licensePlate` | String (unique, uppercase) | Registration plate |
| `type` | Enum | `Truck`, `Van`, `Bike` |
| `maxCapacity` | Number | Max load capacity (kg) |
| `currentOdometer` | Number | Current odometer reading |
| `lastServiceOdometer` | Number | Odometer at last service |
| `acquisitionCost` | Number | Purchase cost (₹) |
| `region` | String | Operating region |
| `status` | Enum | `Available`, `On Trip`, `In Shop`, `Retired` |
| `yearOfManufacture` | Number | Manufacturing year |
| `averageFuelCostPerKm` | Number | Avg fuel cost per km |
| `monthlyBudget` | Number | Monthly maintenance budget |
| `lastTripDate` | Date | Date of last trip |

**Indexes**: `licensePlate` (unique), `status`, `type`

### Driver
| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Full name |
| `email` | String (unique, lowercase) | Contact email |
| `phone` | String | Phone number |
| `licenseNumber` | String (unique) | Driving license number |
| `licenseExpiry` | Date | License expiration date |
| `licenseCategory` | Array\<Enum\> | `Truck`, `Van`, `Bike` |
| `status` | Enum | `On Duty`, `Off Duty`, `Suspended` |
| `safetyScore` | Number (0–100) | Safety rating |
| `totalTrips` | Number | Total assigned trips |
| `completedTrips` | Number | Successfully completed trips |
| `cancelledTrips` | Number | Cancelled trips |
| `totalHoursToday` | Number | Hours worked today |
| `lastDutyDate` | Date | Last duty date |
| `incidents` | Array | Incident records (date, description, severity) |

**Indexes**: `email` (unique), `licenseNumber` (unique), `status`

### Trip
| Field | Type | Description |
|-------|------|-------------|
| `vehicle` | ObjectId → Vehicle | Assigned vehicle |
| `driver` | ObjectId → Driver | Assigned driver |
| `origin` | String | Start location |
| `destination` | String | End location |
| `cargoDescription` | String | Cargo details |
| `cargoWeight` | Number | Cargo weight (kg) |
| `estimatedDistanceKm` | Number | Estimated distance |
| `actualDistanceKm` | Number | Actual distance driven |
| `status` | Enum | `Draft`, `Dispatched`, `Completed`, `Cancelled` |
| `cancellationReason` | String | Reason for cancellation |
| `startOdometer` / `endOdometer` | Number | Odometer readings |
| `revenue` | Number | Trip revenue (₹) |
| `startTime` / `endTime` | Date | Trip timestamps |
| `createdBy` | ObjectId → User | User who created the trip |

**Relationships**: References `Vehicle`, `Driver`, `User`

### MaintenanceLog
| Field | Type | Description |
|-------|------|-------------|
| `vehicle` | ObjectId → Vehicle | Serviced vehicle |
| `type` | Enum | `Oil Change`, `Tire Replacement`, `Brake Service`, `Engine Repair`, `Battery`, `Other` |
| `cost` | Number | Service cost (₹) |
| `description` | String | Work description |
| `serviceProvider` | String | Service provider name |
| `status` | Enum | `Ongoing`, `Resolved` |
| `serviceDate` | Date | Date of service |
| `resolvedAt` | Date | Date resolved |
| `odometerAtService` | Number | Odometer at time of service |

### FuelLog
| Field | Type | Description |
|-------|------|-------------|
| `vehicle` | ObjectId → Vehicle | Fueled vehicle |
| `trip` | ObjectId → Trip | Associated trip (optional) |
| `liters` | Number | Fuel quantity |
| `costPerLiter` | Number | Unit cost |
| `totalCost` | Number | Auto-calculated total |
| `kmDriven` | Number | Km driven on this fuel |
| `fuelEfficiency` | Number | Auto-calculated km/L |
| `date` | Date | Refueling date |

**Pre-save hook**: Auto-calculates `totalCost` and `fuelEfficiency`

### Alert
| Field | Type | Description |
|-------|------|-------------|
| `type` | Enum | `Service Due`, `License Expiring`, `Idle Vehicle`, `Fuel Anomaly`, `Incident Report`, `Other` |
| `severity` | Enum | `Low`, `Medium`, `High`, `Critical` |
| `message` | String | Alert description |
| `vehicle` | ObjectId → Vehicle | Related vehicle (optional) |
| `driver` | ObjectId → Driver | Related driver (optional) |
| `isRead` | Boolean | Read status |
| `isDismissed` | Boolean | Dismiss status |

---

## 📡 API Documentation

All API routes are under `/api/`. Most mutation endpoints (POST, PUT, DELETE) include rate limiting and input validation.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/[...nextauth]` | NextAuth.js handler (sign in/out, session) |

### Vehicles

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| GET | `/api/vehicles` | List vehicles with filters (`status`, `type`, `region`, `search`) | ✅ |
| POST | `/api/vehicles` | Create a new vehicle | ✅ |
| GET | `/api/vehicles/[id]` | Get vehicle by ID with stats | ✅ |
| PUT | `/api/vehicles/[id]` | Update vehicle | ✅ |
| DELETE | `/api/vehicles/[id]` | Delete vehicle | ✅ |

**GET Response** includes `statusCounts` and aggregated `totalMaintenanceCost` / `totalFuelCost` per vehicle.

### Drivers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| GET | `/api/drivers` | List drivers with filters (`status`, `licenseCategory`, `search`) | ✅ |
| POST | `/api/drivers` | Create a new driver | ✅ |
| GET | `/api/drivers/[id]` | Get driver by ID with trips, maintenance, fuel stats | ✅ |
| PUT | `/api/drivers/[id]` | Update driver | ✅ |
| DELETE | `/api/drivers/[id]` | Delete driver | ✅ |

**GET Response** includes `licenseExpiryStatus`, `completionRate`, and `statusCounts`.

### Trips

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| GET | `/api/trips` | List trips with filters (`status`, `search`, `from`, `to`) | ✅ |
| POST | `/api/trips` | Create trip (6-step validation chain) | ✅ |
| GET | `/api/trips/[id]` | Get trip by ID | ✅ |
| PUT | `/api/trips/[id]` | Update trip | ✅ |
| DELETE | `/api/trips/[id]` | Delete trip | ✅ |
| PATCH | `/api/trips/[id]/status` | Change trip status (dispatch, complete, cancel) | ✅ |

**POST validation chain**: Vehicle availability → Driver existence → License match → Driver availability → License expiry → Cargo capacity → Shift limit.

### Maintenance

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| GET | `/api/maintenance` | List maintenance logs (filter by `status`, `type`, `vehicle`) | ✅ |
| POST | `/api/maintenance` | Create maintenance log | ✅ |
| PATCH | `/api/maintenance/[id]/resolve` | Mark as resolved | ✅ |

### Fuel Logs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| GET | `/api/fuel-logs` | List fuel logs (filter by `vehicle`, date range) | ✅ |
| POST | `/api/fuel-logs` | Create fuel log | ✅ |

### Alerts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| GET | `/api/alerts` | List non-dismissed alerts (optional `countOnly=true`, `type` filter) | ✅ |
| POST | `/api/alerts` | Create alert | ✅ |
| PATCH | `/api/alerts/[id]/read` | Mark alert as read | ✅ |
| PATCH | `/api/alerts/[id]/dismiss` | Dismiss alert | ✅ |

### Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| GET | `/api/analytics/summary` | Dashboard KPIs + auto-runs alert checks | ✅ |
| GET | `/api/analytics/reports` | Full analytics data (trends, ROI, top drivers, efficiency) | ✅ |

**Reports query params**: `months` (default: 6), `from`, `to`

### Utility

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| GET | `/api/health` | Health check (DB status, uptime, env) | ❌ |
| GET | `/api/search?q=term` | Global search across vehicles, drivers, trips | ✅ |
| GET | `/api/seed` | Seed database with demo data (dev only) | ❌ |

---

## 🔒 Security

### Authentication
- **NextAuth.js** with Credentials provider and JWT strategy
- Passwords hashed with **bcryptjs** (salt rounds: 12)
- JWT tokens signed with `NEXTAUTH_SECRET`
- Session data includes user ID and role

### Authorization
- **Middleware-level RBAC**: Routes are protected based on user roles
- Unauthorized users are redirected to the dashboard with an error parameter
- Each API route handles its own authentication via `getServerSession()`

### Rate Limiting
- **In-memory IP-based rate limiter**: 30 requests/minute per IP
- Returns `429 Too Many Requests` with `Retry-After` header
- Automatic memory cleanup every 5 minutes

### Input Validation
- All API inputs sanitized via `sanitizeBody()` (trimming, length capping)
- Required field validation via `validateRequired()`
- MongoDB ObjectId format validation via `validateObjectId()`
- Email format validation via `validateEmail()`
- Numeric range validation via `validateNumber()`

### Error Handling
- Structured error responses with `error`, `field`, and `code` properties
- Global error boundary component (`error.jsx`)
- Custom 404 page (`not-found.jsx`)
- Duplicate key errors return `409 Conflict`

### Recommendations for Production
- Replace `NEXTAUTH_SECRET` with a cryptographically secure random string
- Use MongoDB Atlas with TLS enabled
- Enable HTTPS
- Add CORS headers if needed
- Consider moving rate limiting to Redis for multi-instance deployments
- Add request logging and monitoring

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add environment variables in the Vercel dashboard:
   - `MONGODB_URI` → your MongoDB Atlas connection string
   - `NEXTAUTH_SECRET` → a strong random string
   - `NEXTAUTH_URL` → your production URL
4. Deploy — Vercel auto-detects Next.js

The included `vercel.json` configures:
- API function timeout: 30 seconds
- Environment variable references

### Manual Deployment

```bash
# Build the production bundle
npm run build

# Start the production server
npm start
```

---

## 🧑‍💻 Developer Guide

### Design Patterns

- **App Router**: All pages use Next.js 16 App Router with the `app/` directory
- **CSS Modules**: Each component/page has a co-located `.module.css` file
- **CSS Custom Properties**: Theme variables defined in `styles/variables.css` with `[data-theme="light"]` override
- **API Route Handlers**: RESTful route handlers using `export async function GET/POST/PUT/DELETE`
- **Shared Layout**: All protected pages re-export from `app/dashboard/layout.jsx` for consistent sidebar + top bar
- **Aggregation Pipelines**: MongoDB aggregation for analytics, cost calculations, and status counts

### Adding a New Feature

1. **Model**: Create a Mongoose schema in `models/NewModel.js`
2. **API Route**: Add route handlers in `app/api/new-feature/route.js`
3. **Page**: Create the page in `app/new-feature/page.jsx` with a co-located `.module.css`
4. **Layout**: Re-export the dashboard layout: `export { default } from '../dashboard/layout';`
5. **Sidebar**: Add the navigation entry in `components/ui/Sidebar.jsx` (navItems array)
6. **RBAC**: Add the route to `ROLE_ACCESS` in `middleware.js`

### Adding a New Role

1. Add the role string to the `ROLE_ACCESS` map in `middleware.js`
2. Add the role option to the `User` model's `role` enum
3. Add a label in `lib/utils.js` → `getRoleLabel()`
4. Seed a test user with the new role

### Scaling Considerations

- **Database**: Add compound indexes for frequently queried field combinations
- **Rate Limiting**: Move from in-memory to Redis for multi-instance deployments
- **Caching**: Add API response caching with `stale-while-revalidate` headers
- **File Uploads**: Integrate cloud storage (S3/GCS) for vehicle/driver documents
- **Real-time**: Add WebSocket support for live trip tracking and alerts
- **Internationalization**: Extend `lib/utils.js` formatters for multi-currency/locale support

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Built with ❤️ using Next.js, React, and MongoDB**

</div>
