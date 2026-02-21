'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Fuel } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, formatCurrency } from '@/lib/utils';
import styles from './fuel-logs.module.css';

export default function FuelLogsPage() {
    const { data: session } = useSession();
    const canLog = ['fleet_manager', 'dispatcher'].includes(session?.user?.role);

    const [logs, setLogs] = useState([]);
    const [perVehicle, setPerVehicle] = useState([]);
    const [fleetTotals, setFleetTotals] = useState({});
    const [operationalCost, setOperationalCost] = useState([]);
    const [loading, setLoading] = useState(true);

    const [vehicleFilter, setVehicleFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [logOpen, setLogOpen] = useState(false);
    const [form, setForm] = useState({ vehicle: '', liters: '', costPerLiter: '', kmDriven: '', trip: '', date: '' });
    const [vehicles, setVehicles] = useState([]);
    const [trips, setTrips] = useState([]);
    const [saving, setSaving] = useState(false);

    const fetchLogs = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (vehicleFilter) params.set('vehicleId', vehicleFilter);
            if (fromDate) params.set('from', fromDate);
            if (toDate) params.set('to', toDate);
            const res = await fetch(`/api/fuel-logs?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setPerVehicle(data.perVehicle || []);
                setFleetTotals(data.fleetTotals || {});
                setOperationalCost(data.operationalCost || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [vehicleFilter, fromDate, toDate]);

    useEffect(() => {
        const t = setTimeout(fetchLogs, 300);
        return () => clearTimeout(t);
    }, [fetchLogs]);

    const openLog = async () => {
        setForm({ vehicle: '', liters: '', costPerLiter: '', kmDriven: '', trip: '', date: '' });
        setLogOpen(true);
        try {
            const [vRes, tRes] = await Promise.all([
                fetch('/api/vehicles'),
                fetch('/api/trips?status=Completed'),
            ]);
            if (vRes.ok) { const d = await vRes.json(); setVehicles(d.vehicles || []); }
            if (tRes.ok) { const d = await tRes.json(); setTrips(d.trips || []); }
        } catch (e) { console.error(e); }
    };

    const handleLog = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/fuel-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    liters: Number(form.liters),
                    costPerLiter: Number(form.costPerLiter),
                    kmDriven: Number(form.kmDriven) || 0,
                }),
            });
            if (res.ok) { setLogOpen(false); fetchLogs(); }
            else { const err = await res.json(); alert(err.error || 'Failed'); }
        } catch (e) { alert('Network error'); }
        finally { setSaving(false); }
    };

    // Live calculations
    const liters = Number(form.liters) || 0;
    const costPerLiter = Number(form.costPerLiter) || 0;
    const kmDriven = Number(form.kmDriven) || 0;
    const totalCost = liters * costPerLiter;
    const efficiency = liters > 0 ? (kmDriven / liters).toFixed(2) : '—';
    const costPerKm = kmDriven > 0 ? (totalCost / kmDriven).toFixed(2) : '—';

    // DataTable columns
    const columns = [
        { key: 'vehicle', label: 'Vehicle', render: (_, row) => row.vehicle?.name || '—' },
        { key: 'date', label: 'Date', render: (v) => formatDate(v) },
        { key: 'liters', label: 'Liters', render: (v) => `${v?.toFixed(1) || 0} L` },
        { key: 'costPerLiter', label: '₹/L', render: (v) => `₹${v?.toFixed(2) || 0}` },
        { key: 'totalCost', label: 'Total Cost', render: (v) => formatCurrency(v) },
        { key: 'kmDriven', label: 'Km Driven', render: (v) => v ? `${v} km` : '—' },
        { key: 'fuelEfficiency', label: 'Efficiency', render: (v) => v ? `${v} km/L` : '—' },
        { key: 'trip', label: 'Trip', render: (_, row) => row.trip ? `${row.trip.origin} → ${row.trip.destination}` : '—' },
    ];

    // Chart data
    const chartData = perVehicle.map((v) => ({
        name: v.vehicleName,
        efficiency: v.avgEfficiency || 0,
    }));

    // Get unique vehicles from logs for filter
    const uniqueVehicles = [...new Map(logs.map((l) => [l.vehicle?._id, l.vehicle]).filter(([id]) => id)).values()];

    if (loading) return <LoadingSpinner />;

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Fuel &amp; Expense Logs</h1>
                    <div className={styles.pills}>
                        <span className={styles.pill}>Total Liters: <span className={styles.pillVal}>{(fleetTotals.totalLiters || 0).toFixed(1)} L</span></span>
                        <span className={styles.pill}>Total Cost: <span className={styles.pillVal}>{formatCurrency(fleetTotals.totalCost)}</span></span>
                        <span className={styles.pill}>Avg Efficiency: <span className={styles.pillVal}>{fleetTotals.avgEfficiency || 0} km/L</span></span>
                        <span className={styles.pill}>Vehicles: <span className={styles.pillVal}>{perVehicle.length}</span></span>
                    </div>
                </div>
                {canLog && <button className={styles.addBtn} onClick={openLog}><Plus size={16} /> Log Fuel</button>}
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <select className={styles.selectInput} value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
                    <option value="">All Vehicles</option>
                    {uniqueVehicles.map((v) => v && <option key={v._id} value={v._id}>{v.name}</option>)}
                </select>
                <input className={styles.dateInput} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="From" />
                <input className={styles.dateInput} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} title="To" />
            </div>

            {/* Logs Table */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Fuel Logs</h2>
                <DataTable columns={columns} data={logs} loading={loading} emptyMessage="No fuel logs yet" emptyIcon={Fuel} />
            </div>

            {/* Efficiency Chart */}
            {chartData.length > 0 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Fuel Efficiency Comparison</h2>
                    <div className={styles.chartCard}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} unit=" km/L" />
                                <Tooltip
                                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.8125rem' }}
                                    formatter={(val) => [`${val} km/L`, 'Efficiency']}
                                />
                                <ReferenceLine y={fleetTotals.avgEfficiency || 0} stroke="#888" strokeDasharray="5 5" label={{ value: `Fleet Avg: ${fleetTotals.avgEfficiency}`, position: 'right', fill: '#888', fontSize: 11 }} />
                                <Bar dataKey="efficiency" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.efficiency >= (fleetTotals.avgEfficiency || 0) ? '#10B981' : '#EF4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Operational Cost */}
            {operationalCost.length > 0 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Total Operational Cost</h2>
                    <table className={styles.costTable}>
                        <thead>
                            <tr>
                                <th>Vehicle</th>
                                <th>Fuel Cost</th>
                                <th>Maintenance</th>
                                <th>Total Expense</th>
                                <th>Revenue</th>
                                <th>Profit / Loss</th>
                            </tr>
                        </thead>
                        <tbody>
                            {operationalCost.map((row) => (
                                <tr key={row.vehicleId}>
                                    <td>{row.vehicleName} <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>({row.licensePlate})</span></td>
                                    <td>{formatCurrency(row.fuelCost)}</td>
                                    <td>{formatCurrency(row.maintenanceCost)}</td>
                                    <td>{formatCurrency(row.totalExpense)}</td>
                                    <td>{formatCurrency(row.revenue)}</td>
                                    <td className={row.profit >= 0 ? styles.profit : styles.loss}>
                                        {row.profit >= 0 ? '+' : ''}{formatCurrency(row.profit)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Log Fuel Modal */}
            <Modal isOpen={logOpen} onClose={() => setLogOpen(false)} title="Log Fuel" size="lg"
                footer={<><button className={styles.cancelBtn} onClick={() => setLogOpen(false)}>Cancel</button><button className={styles.saveBtn} onClick={handleLog} disabled={saving || !form.vehicle || !form.liters || !form.costPerLiter}>{saving ? 'Saving...' : 'Log'}</button></>}
            >
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Vehicle *</label>
                        <select className={styles.formInput} value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}>
                            <option value="">Select vehicle</option>
                            {vehicles.map((v) => <option key={v._id} value={v._id}>{v.name} — {v.licensePlate}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Trip (optional)</label>
                        <select className={styles.formInput} value={form.trip} onChange={(e) => setForm({ ...form, trip: e.target.value })}>
                            <option value="">No trip linked</option>
                            {trips.map((t) => <option key={t._id} value={t._id}>{t.origin} → {t.destination}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Liters *</label>
                        <input className={styles.formInput} type="number" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} placeholder="e.g. 50" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Cost per Liter (₹) *</label>
                        <input className={styles.formInput} type="number" value={form.costPerLiter} onChange={(e) => setForm({ ...form, costPerLiter: e.target.value })} placeholder="e.g. 105.5" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Km Driven</label>
                        <input className={styles.formInput} type="number" value={form.kmDriven} onChange={(e) => setForm({ ...form, kmDriven: e.target.value })} placeholder="e.g. 450" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Date</label>
                        <input className={styles.formInput} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                    </div>
                </div>

                {/* Live calculation */}
                {(liters > 0 || costPerLiter > 0) && (
                    <div className={styles.calcBox}>
                        <div className={styles.calcRow}>
                            <span className={styles.calcLabel}>Total Cost</span>
                            <span className={styles.calcValue}>{formatCurrency(totalCost)}</span>
                        </div>
                        <div className={styles.calcRow}>
                            <span className={styles.calcLabel}>Fuel Efficiency</span>
                            <span className={styles.calcValue}>{efficiency} km/L</span>
                        </div>
                        <div className={styles.calcRow}>
                            <span className={styles.calcLabel}>Cost per Km</span>
                            <span className={styles.calcValue}>₹{costPerKm}/km</span>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
