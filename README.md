# 🚛 FleetFlow

**Enterprise Fleet Management Dashboard** — A modern, full-featured fleet management system built with Next.js 14, MongoDB, and NextAuth.js.

![FleetFlow Dashboard](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Auth](https://img.shields.io/badge/NextAuth.js-000?style=for-the-badge&logo=next.js)
![CSS](https://img.shields.io/badge/Vanilla%20CSS-1572B6?style=for-the-badge&logo=css3&logoColor=white)

---

## ✨ Features

- ✅ **Role-Based Dashboard** — Fleet Manager, Dispatcher, Safety Officer, Financial Analyst
- ✅ **Vehicle Management** — CRUD, status tracking, odometer, capacity, regional assignment
- ✅ **Driver Management** — License tracking, safety scores, incident logs, duty status
- ✅ **Trip Lifecycle** — Draft → Dispatch → Complete/Cancel with cargo & route details
- ✅ **Fuel Log Tracking** — Per-trip/vehicle fuel records with efficiency calculations
- ✅ **Maintenance Logs** — Service tracking with cost, provider, and status
- ✅ **Analytics & Reports** — Financial overview, trends, ROI, utilization charts
- ✅ **Alerts System** — Auto-generated alerts for service due, license expiry, idle vehicles
- ✅ **Notification Center** — Real-time notification drawer with filter tabs
- ✅ **Dark / Light Mode** — Theme toggle with localStorage persistence
- ✅ **Global Search** — Search across vehicles, drivers, and trips (Ctrl+K)
- ✅ **Keyboard Shortcuts** — Ctrl+K (search), ? (help), Escape (close modals)
- ✅ **Toast Notifications** — Success, error, warning, info toasts
- ✅ **Print-Ready Trip Sheets** — Clean A4 print layout
- ✅ **Responsive Design** — Works on desktop, tablet, and mobile
- ✅ **CSV & PDF Export** — Export analytics reports

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Database** | MongoDB + Mongoose |
| **Auth** | NextAuth.js (Credentials) |
| **Styling** | Vanilla CSS (CSS Modules + Variables) |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Dates** | date-fns |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **MongoDB** (local or Atlas)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/fleetflow.git
cd fleetflow

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and NextAuth secret

# 4. Seed the database with demo data
node scripts/seedData.js

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file:

```env
MONGODB_URI=mongodb://localhost:27017/fleetflow
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

---

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Fleet Manager** (Admin) | admin@fleetflow.com | Admin@123 |
| **Dispatcher** | dispatch@fleetflow.com | Dispatch@123 |
| **Safety Officer** | safety@fleetflow.com | Safety@123 |
| **Financial Analyst** | finance@fleetflow.com | Finance@123 |

---

## 📁 Architecture

```
fleetflow/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── alerts/         # Alert endpoints
│   │   ├── analytics/      # Summary + reports
│   │   ├── auth/           # NextAuth handler
│   │   ├── drivers/        # Driver CRUD
│   │   ├── fuel-logs/      # Fuel log CRUD
│   │   ├── maintenance/    # Maintenance CRUD
│   │   ├── search/         # Global search
│   │   ├── trips/          # Trip CRUD + lifecycle
│   │   ├── users/          # User management
│   │   └── vehicles/       # Vehicle CRUD
│   ├── dashboard/          # Protected layout
│   ├── (pages)/            # Feature pages
│   └── login/              # Auth page
├── components/ui/          # Reusable UI components
│   ├── Sidebar.jsx         # Navigation sidebar
│   ├── TopBar.jsx          # Top bar + search
│   ├── NotificationCenter.jsx
│   ├── Toast.jsx           # Toast notifications
│   ├── KeyboardShortcuts.jsx
│   └── LoadingSpinner.jsx
├── lib/                    # Utilities
│   ├── mongodb.js          # DB connection
│   ├── utils.js            # Helper functions
│   └── alertChecks.js      # Auto alert checks
├── models/                 # Mongoose models
│   ├── User.js
│   ├── Vehicle.js
│   ├── Driver.js
│   ├── Trip.js
│   ├── FuelLog.js
│   ├── MaintenanceLog.js
│   └── Alert.js
├── scripts/
│   └── seedData.js         # Database seeder
└── styles/                 # Global CSS
    ├── variables.css        # Design tokens
    ├── globals.css          # Reset + utilities
    └── components.css       # Shared component styles
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + K` | Focus global search |
| `Ctrl/⌘ + N` | New trip (Trips page) |
| `Escape` | Close modal/drawer |
| `?` | Show shortcuts help |

---

## 📄 License

This project is for educational and portfolio purposes.
