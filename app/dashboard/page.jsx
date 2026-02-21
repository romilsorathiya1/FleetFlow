'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Truck,
    Wrench,
    Percent,
    Package,
    X,
    AlertTriangle,
    CheckCircle,
    Clock,
    IdCard,
    Gauge,
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import KPICard from '@/components/ui/KPICard';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, getDaysUntilExpiry, formatNumber } from '@/lib/utils';
import styles from './dashboard.module.css';

const DONUT_COLORS = {
    Available: '#10B981',
    'On Trip': '#3B82F6',
    'In Shop': '#F59E0B',
    Retired: '#94A3B8',
};

const TYPE_FILTERS = ['All Types', 'Truck', 'Van', 'Bike'];

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('All Types');
    const [regionFilter, setRegionFilter] = useState('');
    const [showBanner, setShowBanner] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (typeFilter && typeFilter !== 'All Types') params.set('type', typeFilter);
            if (regionFilter) params.set('region', regionFilter);
            const res = await fetch(`/api/analytics/summary?${params.toString()}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }, [typeFilter, regionFilter]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (loading || !data) {
        return <LoadingSpinner />;
    }

    // Donut chart data
    const donutData = Object.entries(data.vehiclesByStatus || {}).map(
        ([name, value]) => ({ name, value })
    );

    return (
        <div className={styles.page}>
            {/* Section 1: Alert Banner */}
            {showBanner && data.unreadAlerts > 0 && (
                <div className={styles.alertBanner}>
                    <span className={styles.alertBannerText}>
                        <AlertTriangle size={16} />
                        You have {data.unreadAlerts} unread alert{data.unreadAlerts !== 1 ? 's' : ''}
                        {data.licenseExpiringCount > 0 &&
                            ` — ${data.licenseExpiringCount} driver license${data.licenseExpiringCount !== 1 ? 's' : ''} expiring soon`}
                    </span>
                    <button
                        className={styles.alertDismiss}
                        onClick={() => setShowBanner(false)}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Section 2: KPI Cards */}
            <div className={styles.kpiGrid}>
                <KPICard
                    title="Active Fleet"
                    value={data.activeFleet}
                    icon={Truck}
                    color="#3B82F6"
                />
                <KPICard
                    title="Maintenance Alerts"
                    value={data.maintenanceAlerts}
                    icon={Wrench}
                    color="#F59E0B"
                />
                <KPICard
                    title="Utilization Rate"
                    value={`${data.utilizationRate}%`}
                    icon={Percent}
                    color="#10B981"
                />
                <KPICard
                    title="Pending Cargo"
                    value={data.pendingCargo}
                    icon={Package}
                    color="#8B5CF6"
                />
            </div>

            {/* Section 3: Filters */}
            <div className={styles.filtersRow}>
                {TYPE_FILTERS.map((type) => (
                    <button
                        key={type}
                        className={`${styles.filterBtn} ${typeFilter === type ? styles.active : ''}`}
                        onClick={() => setTypeFilter(type)}
                    >
                        {type}
                    </button>
                ))}
                <select className={styles.regionSelect} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                    <option value="">All Regions</option>
                    <option value="Central">Central</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                </select>
            </div>

            {/* Section 4: Donut chart + Recent Trips */}
            <div className={styles.twoCol}>
                {/* Vehicle Status Donut */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Vehicle Status</h3>
                    </div>
                    <div className={styles.chartWrap}>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {donutData.map((entry) => (
                                        <Cell
                                            key={entry.name}
                                            fill={DONUT_COLORS[entry.name] || '#94A3B8'}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 8,
                                        fontSize: '0.8125rem',
                                    }}
                                />
                                <text
                                    x="50%"
                                    y="47%"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    style={{
                                        fontSize: '1.75rem',
                                        fontWeight: 700,
                                        fill: 'var(--color-text-primary)',
                                        fontFamily: 'var(--font-heading)',
                                    }}
                                >
                                    {data.totalVehicles}
                                </text>
                                <text
                                    x="50%"
                                    y="60%"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    style={{
                                        fontSize: '0.6875rem',
                                        fill: 'var(--color-text-muted)',
                                    }}
                                >
                                    Total
                                </text>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className={styles.legend}>
                            {donutData.map((entry) => (
                                <div key={entry.name} className={styles.legendItem}>
                                    <span
                                        className={styles.legendDot}
                                        style={{
                                            background: DONUT_COLORS[entry.name] || '#94A3B8',
                                        }}
                                    />
                                    {entry.name}
                                    <span className={styles.legendValue}>{entry.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Trips */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Recent Trips</h3>
                        <Link href="/trips" className={styles.viewAll}>
                            View All →
                        </Link>
                    </div>
                    {data.recentTrips?.length > 0 ? (
                        <table className={styles.tripsTable}>
                            <thead>
                                <tr>
                                    <th>Route</th>
                                    <th>Vehicle</th>
                                    <th>Driver</th>
                                    <th>Cargo</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentTrips.map((trip) => (
                                    <tr key={trip._id}>
                                        <td>
                                            <div className={styles.routeCell}>
                                                <span className={styles.routeFrom}>{trip.origin}</span>
                                                <span className={styles.routeTo}>→ {trip.destination}</span>
                                            </div>
                                        </td>
                                        <td>{trip.vehicle?.name || '—'}</td>
                                        <td>{trip.driver?.name || '—'}</td>
                                        <td>{trip.cargoWeight ? `${formatNumber(trip.cargoWeight)} kg` : '—'}</td>
                                        <td>
                                            <StatusBadge status={trip.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className={styles.emptyState}>
                            <Package size={16} />
                            No trips yet
                        </div>
                    )}
                </div>
            </div>

            {/* Section 5: License Expiry + Idle Vehicles */}
            <div className={styles.twoCol}>
                {/* License Expiry Widget */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>License Expiry</h3>
                    </div>
                    {data.expiringDrivers?.length > 0 ? (
                        data.expiringDrivers.map((driver) => {
                            const days = getDaysUntilExpiry(driver.licenseExpiry);
                            const color =
                                days < 30
                                    ? 'var(--color-danger)'
                                    : days < 60
                                        ? 'var(--color-warning)'
                                        : 'var(--color-success)';
                            return (
                                <div key={driver._id} className={styles.listItem}>
                                    <div className={styles.listLeft}>
                                        <div
                                            className={styles.listIcon}
                                            style={{ background: `${color}20`, color }}
                                        >
                                            <IdCard size={18} />
                                        </div>
                                        <div>
                                            <div className={styles.listName}>{driver.name}</div>
                                            <div className={styles.listSub}>
                                                {(driver.licenseCategory || []).join(', ')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.listRight}>
                                        <div className={styles.countdown} style={{ color }}>
                                            {days} day{days !== 1 ? 's' : ''}
                                        </div>
                                        <div className={styles.listSub}>
                                            {formatDate(driver.licenseExpiry)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className={styles.emptyState}>
                            <CheckCircle size={16} />
                            All licenses valid
                        </div>
                    )}
                </div>

                {/* Idle Vehicles Widget */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Idle Vehicles</h3>
                    </div>
                    {data.idleVehicles?.length > 0 ? (
                        data.idleVehicles.map((vehicle) => {
                            const idleDays = vehicle.lastTripDate
                                ? Math.floor(
                                    (Date.now() - new Date(vehicle.lastTripDate).getTime()) /
                                    (1000 * 60 * 60 * 24)
                                )
                                : '—';
                            return (
                                <div key={vehicle._id} className={styles.listItem}>
                                    <div className={styles.listLeft}>
                                        <div
                                            className={styles.listIcon}
                                            style={{
                                                background: 'rgba(148,163,184,0.15)',
                                                color: 'var(--color-text-muted)',
                                            }}
                                        >
                                            <Clock size={18} />
                                        </div>
                                        <div>
                                            <div className={styles.listName}>{vehicle.name}</div>
                                            <div className={styles.listSub}>{vehicle.type}</div>
                                        </div>
                                    </div>
                                    <div className={styles.listRight}>
                                        <div className={styles.countdown} style={{ color: 'var(--color-text-muted)' }}>
                                            Idle {idleDays} day{idleDays !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className={styles.emptyState}>
                            <CheckCircle size={16} />
                            All vehicles active
                        </div>
                    )}
                </div>
            </div>

            {/* Section 6: Odometer-Based Maintenance Alerts */}
            {data.maintenanceDueVehicles?.length > 0 && (
                <div className={styles.odometerCard}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Odometer-Based Service Alerts</h3>
                    </div>
                    {data.maintenanceDueVehicles.map((vehicle) => {
                        const gap = vehicle.currentOdometer - vehicle.lastServiceOdometer;
                        const pct = Math.min((gap / 5000) * 100, 100);
                        const barColor = gap >= 5000 ? 'var(--color-danger)' : 'var(--color-warning)';
                        return (
                            <div key={vehicle._id} className={styles.odometerItem}>
                                <div
                                    className={styles.listIcon}
                                    style={{
                                        background: gap >= 5000 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                        color: barColor,
                                    }}
                                >
                                    <Gauge size={18} />
                                </div>
                                <div className={styles.odometerInfo}>
                                    <div className={styles.odometerName}>{vehicle.name}</div>
                                    <div className={styles.progressBar}>
                                        <div
                                            className={styles.progressFill}
                                            style={{ width: `${pct}%`, background: barColor }}
                                        />
                                    </div>
                                </div>
                                <span className={styles.odometerKm} style={{ color: barColor }}>
                                    {formatNumber(gap)} km
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Last Updated */}
            {lastUpdated && (
                <div className={styles.lastUpdated}>
                    Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 30s
                </div>
            )}
        </div>
    );
}
