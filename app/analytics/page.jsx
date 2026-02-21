'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Fuel, Wrench, TrendingUp, Download, FileText, Award, Truck } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    ComposedChart, Line, Area,
    PieChart, Pie,
} from 'recharts';
import KPICard from '@/components/ui/KPICard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatNumber } from '@/lib/utils';
import styles from './analytics.module.css';

const PIE_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];
const PRESET_RANGES = [
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
    { label: '90 Days', days: 90 },
    { label: '6 Months', days: 180 },
];

export default function AnalyticsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [preset, setPreset] = useState(30);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [vehicleFilter, setVehicleFilter] = useState('');
    const [vehicles, setVehicles] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) { params.set('startDate', startDate); }
            else {
                const d = new Date(); d.setDate(d.getDate() - preset);
                params.set('startDate', d.toISOString().slice(0, 10));
            }
            if (endDate) params.set('endDate', endDate);
            if (vehicleFilter) params.set('vehicleId', vehicleFilter);

            const res = await fetch(`/api/analytics/reports?${params.toString()}`);
            if (res.ok) setData(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [preset, startDate, endDate, vehicleFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/vehicles');
                if (res.ok) { const d = await res.json(); setVehicles(d.vehicles || []); }
            } catch (e) { console.error(e); }
        })();
    }, []);

    const exportCSV = async () => {
        const Papa = (await import('papaparse')).default;
        const rows = (data?.vehicleROI || []).map((v) => ({
            Vehicle: v.name, Revenue: v.revenue, FuelCost: v.fuelCost,
            MaintenanceCost: v.maintenanceCost, AcquisitionCost: v.acquisitionCost, ROI: `${v.roi}%`,
        }));
        const csv = Papa.unparse(rows);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'fleet-analytics.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const exportPDF = async () => {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Fleet Analytics Report', 14, 20);
        doc.setFontSize(11);
        doc.text(`Period: ${startDate || 'Last ' + preset + ' days'} — ${endDate || 'Today'}`, 14, 30);

        const s = data?.summary || {};
        doc.setFontSize(12);
        doc.text('Summary', 14, 45);
        doc.setFontSize(10);
        doc.text(`Total Revenue: ${formatCurrency(s.totalRevenue)}`, 14, 55);
        doc.text(`Total Fuel Cost: ${formatCurrency(s.totalFuelCost)}`, 14, 62);
        doc.text(`Total Maintenance: ${formatCurrency(s.totalMaintCost)}`, 14, 69);
        doc.text(`Total Trips: ${s.totalTrips}`, 14, 76);

        let y = 90;
        doc.setFontSize(12);
        doc.text('Vehicle ROI', 14, y); y += 10;
        doc.setFontSize(9);
        (data?.vehicleROI || []).forEach((v) => {
            doc.text(`${v.name}: Revenue ${formatCurrency(v.revenue)} | Fuel ${formatCurrency(v.fuelCost)} | Maint ${formatCurrency(v.maintenanceCost)} | ROI ${v.roi}%`, 14, y);
            y += 7;
            if (y > 270) { doc.addPage(); y = 20; }
        });

        doc.save('fleet-analytics.pdf');
    };

    if (loading) return <LoadingSpinner />;
    if (!data) return null;

    const s = data.summary || {};

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Operational Analytics</h1>
                    <p className={styles.subtitle}>Fleet performance insights and reporting</p>
                </div>
            </div>

            {/* Filter bar */}
            <div className={styles.filterBar}>
                {PRESET_RANGES.map((r) => (
                    <button key={r.days} className={`${styles.dateBtn} ${preset === r.days && !startDate ? styles.active : ''}`}
                        onClick={() => { setPreset(r.days); setStartDate(''); setEndDate(''); }}>
                        {r.label}
                    </button>
                ))}
                <input className={styles.dateInput} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="From" />
                <input className={styles.dateInput} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="To" />
                <select className={styles.selectInput} value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
                    <option value="">All Vehicles</option>
                    {vehicles.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
                </select>
            </div>

            {/* Exports */}
            <div className={styles.exports}>
                <button className={styles.csvBtn} onClick={exportCSV}><Download size={14} /> Export CSV</button>
                <button className={styles.pdfBtn} onClick={exportPDF}><FileText size={14} /> Export PDF</button>
            </div>

            {/* KPIs */}
            <div className={styles.kpiRow}>
                <KPICard title="Total Revenue" value={formatCurrency(s.totalRevenue)} icon={DollarSign} color="#10B981" />
                <KPICard title="Fuel Cost" value={formatCurrency(s.totalFuelCost)} icon={Fuel} color="#F59E0B" />
                <KPICard title="Maintenance Cost" value={formatCurrency(s.totalMaintCost)} icon={Wrench} color="#EF4444" />
                <KPICard title="Total Trips" value={formatNumber(s.totalTrips)} icon={TrendingUp} color="#3B82F6" />
            </div>

            {/* Monthly Trend */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Monthly Cost Trend</h2>
                <div className={styles.chartCard}>
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={data.monthlyCostTrend || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                            <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.8125rem' }} />
                            <Area type="monotone" dataKey="revenue" fill="rgba(16,185,129,0.1)" stroke="#10B981" name="Revenue" />
                            <Bar dataKey="fuelCost" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Fuel" />
                            <Bar dataKey="maintenanceCost" fill="#EF4444" radius={[3, 3, 0, 0]} name="Maintenance" />
                            <Line type="monotone" dataKey="trips" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Trips" yAxisId={0} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Fuel Efficiency + ROI Table */}
            <div className={styles.twoCol}>
                <div>
                    <h2 className={styles.sectionTitle}>Fuel Efficiency</h2>
                    <div className={styles.chartCard}>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={data.fuelEfficiencyByVehicle || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} unit=" km/L" />
                                <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.8125rem' }} />
                                <Bar dataKey="avgKmPerLiter" radius={[4, 4, 0, 0]} name="Avg km/L">
                                    {(data.fuelEfficiencyByVehicle || []).map((_, i) => (
                                        <Cell key={i} fill={i % 2 === 0 ? '#10B981' : '#3B82F6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div>
                    <h2 className={styles.sectionTitle}>Vehicle ROI</h2>
                    <div className={styles.chartCard} style={{ padding: 0, overflow: 'auto' }}>
                        <table className={styles.roiTable}>
                            <thead><tr><th>Vehicle</th><th>Revenue</th><th>Expenses</th><th>ROI</th></tr></thead>
                            <tbody>
                                {(data.vehicleROI || []).map((v) => (
                                    <tr key={v.vehicleId}>
                                        <td>{v.name}</td>
                                        <td>{formatCurrency(v.revenue)}</td>
                                        <td>{formatCurrency(v.fuelCost + v.maintenanceCost)}</td>
                                        <td style={{ fontWeight: 700, color: v.roi > 20 ? 'var(--color-success)' : v.roi >= 0 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                                            {v.roi}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Cancellation Pie + Drivers Leaderboard */}
            <div className={styles.twoCol}>
                <div>
                    <h2 className={styles.sectionTitle}>Cancellation Reasons</h2>
                    <div className={styles.chartCard}>
                        {(data.cancellationReasons || []).length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie data={data.cancellationReasons} dataKey="count" nameKey="reason" cx="50%" cy="50%" outerRadius={100} label={({ reason, percentage }) => `${reason} (${percentage}%)`}>
                                        {(data.cancellationReasons || []).map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.8125rem' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No cancellations in this period</div>
                        )}
                    </div>
                </div>
                <div>
                    <h2 className={styles.sectionTitle}>Top Drivers</h2>
                    <div className={styles.leaderboard}>
                        {(data.topDrivers || []).map((d, i) => {
                            const rankClass = i === 0 ? styles.rank1 : i === 1 ? styles.rank2 : i === 2 ? styles.rank3 : styles.rankOther;
                            return (
                                <div key={d.driverId} className={styles.lbRow}>
                                    <div className={`${styles.rankBadge} ${rankClass}`}>{i + 1}</div>
                                    <div className={styles.lbInfo}>
                                        <div className={styles.lbName}>{d.name}</div>
                                        <div className={styles.lbMeta}>
                                            <span>{d.totalTrips} trips</span>
                                            <span>Safety: {d.safetyScore}</span>
                                        </div>
                                    </div>
                                    <div className={styles.lbBarWrap}>
                                        <div className={styles.lbBarFill} style={{ width: `${d.completionRate}%` }} />
                                    </div>
                                    <span className={styles.lbPct}>{d.completionRate}%</span>
                                </div>
                            );
                        })}
                        {(data.topDrivers || []).length === 0 && (
                            <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>No driver data</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cost per KM */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Cost per Kilometer</h2>
                <div className={styles.chartCard}>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.costPerKm || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} unit=" ₹" />
                            <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.8125rem' }} formatter={(v) => [`₹${v}/km`, 'Cost']} />
                            <Bar dataKey="costPerKm" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="₹/km" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Monthly Summary Widget */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Monthly Performance Summary</h2>
                <div className={styles.summaryGrid}>
                    <div className={styles.summaryItem}>
                        <div className={styles.summaryIconWrap} style={{ background: 'rgba(16,185,129,0.15)' }}>
                            <DollarSign size={20} style={{ color: '#10B981' }} />
                        </div>
                        <div>
                            <div className={styles.summaryLabel}>Net Profit</div>
                            <div className={styles.summaryValue}>{formatCurrency(s.totalRevenue - s.totalFuelCost - s.totalMaintCost)}</div>
                        </div>
                    </div>
                    <div className={styles.summaryItem}>
                        <div className={styles.summaryIconWrap} style={{ background: 'rgba(59,130,246,0.15)' }}>
                            <TrendingUp size={20} style={{ color: '#3B82F6' }} />
                        </div>
                        <div>
                            <div className={styles.summaryLabel}>Avg Utilization</div>
                            <div className={styles.summaryValue}>
                                {data.utilizationTrend?.length > 0 ? `${Math.round(data.utilizationTrend.reduce((s, u) => s + u.utilizationRate, 0) / data.utilizationTrend.length)}%` : '—'}
                            </div>
                        </div>
                    </div>
                    <div className={styles.summaryItem}>
                        <div className={styles.summaryIconWrap} style={{ background: 'rgba(251,191,36,0.15)' }}>
                            <Fuel size={20} style={{ color: '#F59E0B' }} />
                        </div>
                        <div>
                            <div className={styles.summaryLabel}>Cost per Trip</div>
                            <div className={styles.summaryValue}>{s.totalTrips > 0 ? formatCurrency((s.totalFuelCost + s.totalMaintCost) / s.totalTrips) : '—'}</div>
                        </div>
                    </div>
                    <div className={styles.summaryItem}>
                        <div className={styles.summaryIconWrap} style={{ background: 'rgba(139,92,246,0.15)' }}>
                            <Award size={20} style={{ color: '#8B5CF6' }} />
                        </div>
                        <div>
                            <div className={styles.summaryLabel}>Top Driver</div>
                            <div className={styles.summaryValue}>{data.topDrivers?.[0]?.name || '—'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
