'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
    Search, Plus, Wrench, CheckCircle2, Clock,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, formatCurrency } from '@/lib/utils';
import styles from './maintenance.module.css';

const TYPE_CLASSES = {
    'Engine Repair': styles.cardEngine,
    'Tire Replacement': styles.cardTire,
    'Oil Change': styles.cardOil,
    'Brake Service': styles.cardBrake,
    'Battery': styles.cardBattery,
    'Other': styles.cardOther,
};

const getBudgetColor = (pct) => {
    if (pct > 100) return 'var(--color-danger)';
    if (pct >= 80) return 'var(--color-warning)';
    return 'var(--color-success)';
};

export default function MaintenancePage() {
    const { data: session } = useSession();
    const isManager = session?.user?.role === 'fleet_manager';

    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({});
    const [budgetData, setBudgetData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const [logOpen, setLogOpen] = useState(false);
    const [form, setForm] = useState({ vehicle: '', type: 'Oil Change', cost: '', description: '', serviceProvider: '' });
    const [vehicles, setVehicles] = useState([]);
    const [saving, setSaving] = useState(false);

    const [resolveLog, setResolveLog] = useState(null);
    const [resolveForm, setResolveForm] = useState({ finalCost: '' });

    const fetchLogs = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            if (typeFilter) params.set('type', typeFilter);
            const res = await fetch(`/api/maintenance?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setStats(data.stats || {});
                setBudgetData(data.budgetComparison || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [search, statusFilter, typeFilter]);

    useEffect(() => {
        const t = setTimeout(fetchLogs, 300);
        return () => clearTimeout(t);
    }, [fetchLogs]);

    const openLog = async () => {
        setForm({ vehicle: '', type: 'Oil Change', cost: '', description: '', serviceProvider: '' });
        setLogOpen(true);
        try {
            const res = await fetch('/api/vehicles');
            if (res.ok) {
                const data = await res.json();
                setVehicles((data.vehicles || []).filter((v) => v.status !== 'On Trip'));
            }
        } catch (e) { console.error(e); }
    };

    const handleLog = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, cost: Number(form.cost) || 0 }),
            });
            if (res.ok) { setLogOpen(false); fetchLogs(); }
            else { const err = await res.json(); alert(err.error || 'Failed'); }
        } catch (e) { alert('Network error'); }
        finally { setSaving(false); }
    };

    const handleResolve = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/maintenance/${resolveLog._id}/resolve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ finalCost: Number(resolveForm.finalCost) || resolveLog.cost }),
            });
            if (res.ok) { setResolveLog(null); fetchLogs(); }
            else { const err = await res.json(); alert(err.error || 'Failed'); }
        } catch (e) { alert('Network error'); }
        finally { setSaving(false); }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Maintenance &amp; Service</h1>
                    <div className={styles.pills}>
                        <span className={styles.pill}>Ongoing: <span className={styles.pillVal}>{stats.ongoing || 0}</span></span>
                        <span className={styles.pill}>Resolved (Month): <span className={styles.pillVal}>{stats.resolvedThisMonth || 0}</span></span>
                        <span className={styles.pill}>Cost (Month): <span className={styles.pillVal}>{formatCurrency(stats.totalCostThisMonth)}</span></span>
                    </div>
                </div>
                {isManager && <button className={styles.addBtn} onClick={openLog}><Plus size={16} /> Log Maintenance</button>}
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.searchWrap}>
                    <Search size={16} className={styles.searchIcon} />
                    <input className={styles.searchInput} placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className={styles.selectInput} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Resolved">Resolved</option>
                </select>
                <select className={styles.selectInput} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="Oil Change">Oil Change</option>
                    <option value="Tire Replacement">Tire Replacement</option>
                    <option value="Brake Service">Brake Service</option>
                    <option value="Engine Repair">Engine Repair</option>
                    <option value="Battery">Battery</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            {/* Cards */}
            {logs.length === 0 ? (
                <div className={styles.empty}>
                    <Wrench size={48} className={styles.emptyIcon} />
                    <div className={styles.emptyTitle}>No maintenance logs</div>
                    <div className={styles.emptyText}>All vehicles are in good shape!</div>
                </div>
            ) : (
                <div className={styles.grid}>
                    {logs.map((log) => (
                        <div key={log._id} className={`${styles.card} ${TYPE_CLASSES[log.type] || styles.cardOther}`}>
                            <div className={styles.cardTop}>
                                <span className={styles.cardType}>{log.type}</span>
                                {log.status === 'Ongoing' ? (
                                    <span className={styles.ongoingDot}><span className={styles.pulseDot} /> Ongoing</span>
                                ) : (
                                    <span className={styles.resolved}>✓ Resolved</span>
                                )}
                            </div>
                            <div className={styles.vehicleName}>{log.vehicle?.name || '—'}</div>
                            <span className={styles.vehiclePlate}>{log.vehicle?.licensePlate || '—'}</span>
                            {log.description && <div className={styles.description}>{log.description}</div>}

                            <div className={styles.cardStats}>
                                <div className={styles.statItem}>
                                    <div className={styles.statLabel}>Cost</div>
                                    <div className={styles.statValue}>{formatCurrency(log.cost)}</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statLabel}>Odometer</div>
                                    <div className={styles.statValue}>{(log.odometerAtService || 0).toLocaleString()} km</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statLabel}>Date</div>
                                    <div className={styles.statValue}>{formatDate(log.serviceDate)}</div>
                                </div>
                            </div>

                            {log.serviceProvider && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>Provider: {log.serviceProvider}</div>
                            )}

                            {log.status === 'Ongoing' && isManager && (
                                <div className={styles.cardActions}>
                                    <button className={styles.resolveBtn} onClick={() => { setResolveLog(log); setResolveForm({ finalCost: log.cost }); }}>
                                        <CheckCircle2 size={14} /> Resolve
                                    </button>
                                </div>
                            )}
                            {log.status === 'Resolved' && log.resolvedAt && (
                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={10} /> Resolved: {formatDate(log.resolvedAt)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Budget vs Actual */}
            {budgetData.length > 0 && (
                <div className={styles.budgetSection}>
                    <h2 className={styles.sectionTitle}>Budget vs Actual (This Month)</h2>
                    <div className={styles.budgetCard}>
                        {budgetData.map((b) => {
                            const pct = b.percentage;
                            const color = getBudgetColor(pct);
                            return (
                                <div key={b.vehicleId} className={styles.budgetRow}>
                                    <span className={styles.budgetName}>{b.vehicleName}</span>
                                    <div className={styles.budgetBarWrap}>
                                        <div className={styles.budgetBarFill} style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                                    </div>
                                    <span className={styles.budgetPct} style={{ color }}>{pct}%</span>
                                    <span className={styles.budgetAmounts}>
                                        {formatCurrency(b.spent)} / {formatCurrency(b.budget)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Log Modal */}
            <Modal isOpen={logOpen} onClose={() => setLogOpen(false)} title="Log Maintenance" size="lg"
                footer={<><button className={styles.cancelBtn} onClick={() => setLogOpen(false)}>Cancel</button><button className={styles.saveBtn} onClick={handleLog} disabled={saving || !form.vehicle}>{saving ? 'Saving...' : 'Log'}</button></>}
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
                        <label className={styles.formLabel}>Type *</label>
                        <select className={styles.formInput} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                            <option value="Oil Change">Oil Change</option>
                            <option value="Tire Replacement">Tire Replacement</option>
                            <option value="Brake Service">Brake Service</option>
                            <option value="Engine Repair">Engine Repair</option>
                            <option value="Battery">Battery</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Estimated Cost (₹)</label>
                        <input className={styles.formInput} type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="e.g. 15000" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Service Provider</label>
                        <input className={styles.formInput} value={form.serviceProvider} onChange={(e) => setForm({ ...form, serviceProvider: e.target.value })} placeholder="e.g. Tata Motors Service" />
                    </div>
                    <div className={styles.formGroupFull}>
                        <label className={styles.formLabel}>Description</label>
                        <textarea className={styles.formTextarea} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details about the maintenance..." />
                    </div>
                </div>
            </Modal>

            {/* Resolve Modal */}
            <Modal isOpen={!!resolveLog} onClose={() => setResolveLog(null)} title="Resolve Maintenance" size="sm"
                footer={<><button className={styles.cancelBtn} onClick={() => setResolveLog(null)}>Cancel</button><button className={styles.saveBtn} onClick={handleResolve} disabled={saving}>{saving ? 'Saving...' : 'Resolve'}</button></>}
            >
                <div className={styles.noticeBox}>
                    ✓ Vehicle will be set back to &quot;Available&quot; after resolving.
                </div>
                {resolveLog && (
                    <div className={styles.formGrid}>
                        <div className={styles.formGroupFull}>
                            <label className={styles.formLabel}>Final Cost (₹)</label>
                            <input className={styles.formInput} type="number" value={resolveForm.finalCost}
                                onChange={(e) => setResolveForm({ ...resolveForm, finalCost: e.target.value })}
                                placeholder={`Estimated: ${resolveLog.cost}`} />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
