'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
    Search, Plus, ArrowRight, MapPin, Truck, User, Weight, CheckCircle2, XCircle,
    Send, Clock, Package,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, formatCurrency, formatNumber } from '@/lib/utils';
import styles from './trips.module.css';

const STEPS = ['Draft', 'Dispatched', 'Completed'];

export default function TripsPage() {
    const { data: session } = useSession();
    const canCreate = ['fleet_manager', 'dispatcher'].includes(session?.user?.role);

    const [trips, setTrips] = useState([]);
    const [statusCounts, setStatusCounts] = useState({});
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [statusTab, setStatusTab] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Create modal
    const [createOpen, setCreateOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ vehicle: '', driver: '', origin: '', destination: '', cargoDescription: '', cargoWeight: '', estimatedDistanceKm: '', notes: '' });
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [validation, setValidation] = useState(null);
    const [saving, setSaving] = useState(false);

    // Complete modal
    const [completeTrip, setCompleteTrip] = useState(null);
    const [completeForm, setCompleteForm] = useState({ endOdometer: '', revenue: '' });

    // Cancel modal
    const [cancelTrip, setCancelTrip] = useState(null);
    const [cancelForm, setCancelForm] = useState({ cancellationReason: '', cancellationNote: '' });

    const fetchTrips = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (statusTab) params.set('status', statusTab);
            if (fromDate) params.set('from', fromDate);
            if (toDate) params.set('to', toDate);
            const res = await fetch(`/api/trips?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setTrips(data.trips || []);
                setStatusCounts(data.statusCounts || {});
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [search, statusTab, fromDate, toDate]);

    useEffect(() => {
        const t = setTimeout(fetchTrips, 300);
        return () => clearTimeout(t);
    }, [fetchTrips]);

    // Fetch vehicles and drivers for create form
    const openCreate = async () => {
        setStep(1);
        setForm({ vehicle: '', driver: '', origin: '', destination: '', cargoDescription: '', cargoWeight: '', estimatedDistanceKm: '', notes: '' });
        setValidation(null);
        setCreateOpen(true);
        try {
            const [vRes, dRes] = await Promise.all([
                fetch('/api/vehicles?status=Available'),
                fetch('/api/drivers?status=Off Duty'),
            ]);
            if (vRes.ok) { const d = await vRes.json(); setVehicles(d.vehicles || []); }
            if (dRes.ok) { const d = await dRes.json(); setDrivers(d.drivers || []); }
        } catch (e) { console.error(e); }
    };

    // Validate step 3
    const runValidation = () => {
        const v = vehicles.find((x) => x._id === form.vehicle);
        const d = drivers.find((x) => x._id === form.driver);
        const checks = [];

        checks.push({ label: 'Vehicle is available', ok: !!v && v.status === 'Available' });
        checks.push({ label: `Driver licensed for ${v?.type || 'vehicle type'}`, ok: !!d && (d.licenseCategory || []).includes(v?.type) });
        checks.push({ label: 'Driver is off duty', ok: !!d && d.status === 'Off Duty' });
        checks.push({ label: 'Driver license valid', ok: !!d && new Date(d.licenseExpiry) > new Date() });
        const cw = Number(form.cargoWeight) || 0;
        checks.push({ label: `Cargo ${cw}kg ≤ ${v?.maxCapacity || 0}kg capacity`, ok: cw <= (v?.maxCapacity || 0) });
        checks.push({ label: 'Driver under 10hr shift limit', ok: !!d && (d.totalHoursToday || 0) < 10 });

        setValidation(checks);
        setStep(3);
    };

    const allValid = validation?.every((c) => c.ok);

    const handleCreate = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/trips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    cargoWeight: Number(form.cargoWeight) || 0,
                    estimatedDistanceKm: Number(form.estimatedDistanceKm) || 0,
                }),
            });
            if (res.ok) {
                setCreateOpen(false);
                fetchTrips();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create trip');
            }
        } catch (e) { alert('Network error'); }
        finally { setSaving(false); }
    };

    const handleDispatch = async (id) => {
        await fetch(`/api/trips/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Dispatched' }),
        });
        fetchTrips();
    };

    const handleComplete = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/trips/${completeTrip._id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'Completed',
                    endOdometer: Number(completeForm.endOdometer) || 0,
                    revenue: Number(completeForm.revenue) || 0,
                }),
            });
            if (res.ok) { setCompleteTrip(null); fetchTrips(); }
            else { const err = await res.json(); alert(err.error); }
        } catch (e) { alert('Network error'); }
        finally { setSaving(false); }
    };

    const handleCancel = async () => {
        if (!cancelForm.cancellationReason) { alert('Cancellation reason is required'); return; }
        setSaving(true);
        try {
            const res = await fetch(`/api/trips/${cancelTrip._id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Cancelled', ...cancelForm }),
            });
            if (res.ok) { setCancelTrip(null); fetchTrips(); }
            else { const err = await res.json(); alert(err.error); }
        } catch (e) { alert('Network error'); }
        finally { setSaving(false); }
    };

    const getLifecycleIndex = (status) => {
        if (status === 'Cancelled') return -1;
        return STEPS.indexOf(status);
    };

    const getCargoColor = (weight, capacity) => {
        if (!capacity) return 'var(--color-accent)';
        const ratio = weight / capacity;
        if (ratio > 0.95) return 'var(--color-danger)';
        if (ratio > 0.8) return 'var(--color-warning)';
        return 'var(--color-success)';
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Trip Dispatcher</h1>
                    <div className={styles.pills}>
                        <span className={styles.pill}>Total: <span className={styles.pillVal}>{statusCounts.total || 0}</span></span>
                        <span className={styles.pill}>Draft: <span className={styles.pillVal}>{statusCounts.Draft || 0}</span></span>
                        <span className={styles.pill}>Dispatched: <span className={styles.pillVal}>{statusCounts.Dispatched || 0}</span></span>
                        <span className={styles.pill}>Completed: <span className={styles.pillVal}>{statusCounts.Completed || 0}</span></span>
                        <span className={styles.pill}>Cancelled: <span className={styles.pillVal}>{statusCounts.Cancelled || 0}</span></span>
                    </div>
                </div>
                {canCreate && <button className={styles.addBtn} onClick={openCreate}><Plus size={16} /> Create Trip</button>}
            </div>

            {/* Tabs */}
            <div className={styles.tabBar}>
                {['', 'Draft', 'Dispatched', 'Completed', 'Cancelled'].map((s) => (
                    <button key={s} className={`${styles.tab} ${statusTab === s ? styles.active : ''}`} onClick={() => setStatusTab(s)}>
                        {s || 'All'}
                        <span className={styles.tabCount}>{s ? statusCounts[s] || 0 : statusCounts.total || 0}</span>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.searchWrap}>
                    <Search size={16} className={styles.searchIcon} />
                    <input className={styles.searchInput} placeholder="Search routes, cargo..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <input className={styles.dateInput} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="From date" />
                <input className={styles.dateInput} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} title="To date" />
            </div>

            {/* Cards */}
            {trips.length === 0 ? (
                <div className={styles.empty}>
                    <Package size={48} className={styles.emptyIcon} />
                    <div className={styles.emptyTitle}>No trips found</div>
                    <div className={styles.emptyText}>Create a trip or adjust your filters.</div>
                </div>
            ) : (
                <div className={styles.grid}>
                    {trips.map((trip) => {
                        const lcIdx = getLifecycleIndex(trip.status);
                        const capacity = trip.vehicle?.maxCapacity || 1;
                        const cargoRatio = Math.min(((trip.cargoWeight || 0) / capacity) * 100, 100);
                        return (
                            <div key={trip._id} className={styles.card}>
                                {/* Route */}
                                <div className={styles.routeRow}>
                                    <MapPin size={14} style={{ color: 'var(--color-success)' }} />
                                    <span className={styles.routePoint}>{trip.origin}</span>
                                    <ArrowRight size={14} className={styles.routeArrow} />
                                    <span className={styles.routePoint}>{trip.destination}</span>
                                </div>

                                <div className={styles.cardMeta}>
                                    <StatusBadge status={trip.status} />
                                    <span className={styles.metaChip}><Truck size={12} /> {trip.vehicle?.name || '—'}</span>
                                    <span className={styles.metaChip}><User size={12} /> {trip.driver?.name || '—'}</span>
                                    <span className={styles.metaChip}><Clock size={12} /> {formatDate(trip.createdAt)}</span>
                                </div>

                                {/* Lifecycle */}
                                <div className={styles.lifecycle}>
                                    {STEPS.map((s, i) => (
                                        <div key={s} className={styles.lcStep}>
                                            <div className={`${styles.lcDot} ${trip.status === 'Cancelled' && i === 0 ? styles.cancelled :
                                                    i < lcIdx ? styles.done : i === lcIdx ? styles.current : ''
                                                }`} />
                                            {i < STEPS.length - 1 && (
                                                <div className={`${styles.lcLine} ${i < lcIdx ? styles.done : ''}`} />
                                            )}
                                            <span className={styles.lcLabel}>{s}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Cargo bar */}
                                <div className={styles.cargoSection}>
                                    <div className={styles.cargoLabel}>
                                        <span>Cargo: {formatNumber(trip.cargoWeight)} kg</span>
                                        <span>{Math.round(cargoRatio)}%</span>
                                    </div>
                                    <div className={styles.cargoTrack}>
                                        <div className={styles.cargoFill} style={{ width: `${cargoRatio}%`, background: getCargoColor(trip.cargoWeight, capacity) }} />
                                    </div>
                                </div>

                                {trip.revenue > 0 && (
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-success)', marginBottom: 8 }}>
                                        Revenue: {formatCurrency(trip.revenue)}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className={styles.cardActions}>
                                    {trip.status === 'Draft' && canCreate && (
                                        <>
                                            <button className={styles.primaryBtn} onClick={() => handleDispatch(trip._id)}><Send size={14} /> Dispatch</button>
                                            <button className={styles.dangerBtn} onClick={() => { setCancelTrip(trip); setCancelForm({ cancellationReason: '', cancellationNote: '' }); }}><XCircle size={14} /> Cancel</button>
                                        </>
                                    )}
                                    {trip.status === 'Dispatched' && canCreate && (
                                        <>
                                            <button className={`${styles.primaryBtn} ${styles.success}`} onClick={() => { setCompleteTrip(trip); setCompleteForm({ endOdometer: '', revenue: '' }); }}><CheckCircle2 size={14} /> Complete</button>
                                            <button className={styles.dangerBtn} onClick={() => { setCancelTrip(trip); setCancelForm({ cancellationReason: '', cancellationNote: '' }); }}><XCircle size={14} /> Cancel</button>
                                        </>
                                    )}
                                    {(trip.status === 'Completed' || trip.status === 'Cancelled') && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            {trip.status === 'Completed' ? `✓ ${formatDate(trip.endTime)}` : `✗ ${trip.cancellationReason || 'Cancelled'}`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CREATE TRIP MODAL — Multi-step */}
            <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Trip" size="lg"
                footer={
                    <>
                        {step > 1 && <button className={styles.cancelBtn} onClick={() => setStep(step - 1)}>Back</button>}
                        <button className={styles.cancelBtn} onClick={() => setCreateOpen(false)}>Cancel</button>
                        {step === 1 && <button className={styles.saveBtn} onClick={() => setStep(2)} disabled={!form.vehicle || !form.driver}>Next</button>}
                        {step === 2 && <button className={styles.saveBtn} onClick={runValidation} disabled={!form.origin || !form.destination || !form.cargoWeight}>Validate</button>}
                        {step === 3 && <button className={styles.saveBtn} onClick={handleCreate} disabled={!allValid || saving}>{saving ? 'Creating...' : 'Create Trip'}</button>}
                    </>
                }
            >
                {/* Stepper */}
                <div className={styles.stepper}>
                    <div className={`${styles.stepCircle} ${step >= 1 ? styles.activeStep : ''} ${step > 1 ? styles.completedStep : ''}`}>1</div>
                    <div className={`${styles.stepLine} ${step > 1 ? styles.completedLine : ''}`} />
                    <div className={`${styles.stepCircle} ${step >= 2 ? styles.activeStep : ''} ${step > 2 ? styles.completedStep : ''}`}>2</div>
                    <div className={`${styles.stepLine} ${step > 2 ? styles.completedLine : ''}`} />
                    <div className={`${styles.stepCircle} ${step >= 3 ? styles.activeStep : ''}`}>3</div>
                </div>

                {step === 1 && (
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Vehicle *</label>
                            <select className={styles.formInput} value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}>
                                <option value="">Select vehicle</option>
                                {vehicles.map((v) => <option key={v._id} value={v._id}>{v.name} — {v.licensePlate} ({v.type})</option>)}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Driver *</label>
                            <select className={styles.formInput} value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })}>
                                <option value="">Select driver</option>
                                {drivers.map((d) => <option key={d._id} value={d._id}>{d.name} — {(d.licenseCategory || []).join(', ')}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Origin *</label>
                            <input className={styles.formInput} value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="e.g. Chennai Warehouse" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Destination *</label>
                            <input className={styles.formInput} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Bangalore Hub" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Cargo Weight (kg) *</label>
                            <input className={styles.formInput} type="number" value={form.cargoWeight} onChange={(e) => setForm({ ...form, cargoWeight: e.target.value })} placeholder="e.g. 5000" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Est. Distance (km)</label>
                            <input className={styles.formInput} type="number" value={form.estimatedDistanceKm} onChange={(e) => setForm({ ...form, estimatedDistanceKm: e.target.value })} placeholder="e.g. 350" />
                        </div>
                        <div className={styles.formGroupFull}>
                            <label className={styles.formLabel}>Cargo Description</label>
                            <textarea className={styles.formTextarea} value={form.cargoDescription} onChange={(e) => setForm({ ...form, cargoDescription: e.target.value })} placeholder="e.g. Electronics — fragile" />
                        </div>
                        {/* Live cargo validation */}
                        {form.cargoWeight && (() => {
                            const v = vehicles.find((x) => x._id === form.vehicle);
                            const cw = Number(form.cargoWeight);
                            const cap = v?.maxCapacity || 0;
                            if (cw > cap) return <div className={styles.validationFail}>⚠ Cargo {cw}kg exceeds capacity {cap}kg</div>;
                            return <div className={styles.validationOk}>✓ Cargo {cw}kg within capacity {cap}kg</div>;
                        })()}
                    </div>
                )}

                {step === 3 && validation && (
                    <div className={styles.checkList}>
                        {validation.map((c, i) => (
                            <div key={i} className={styles.checkItem}>
                                {c.ok ? <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} /> : <XCircle size={16} style={{ color: 'var(--color-danger)' }} />}
                                <span style={{ color: c.ok ? 'var(--color-text-primary)' : 'var(--color-danger)' }}>{c.label}</span>
                            </div>
                        ))}
                        {allValid && <div className={styles.validationOk} style={{ marginTop: 12 }}>✓ All validations passed — ready to create trip</div>}
                        {!allValid && <div className={styles.validationFail} style={{ marginTop: 12 }}>⚠ Fix the issues above before creating the trip</div>}
                    </div>
                )}
            </Modal>

            {/* COMPLETE TRIP MODAL */}
            <Modal isOpen={!!completeTrip} onClose={() => setCompleteTrip(null)} title="Complete Trip" size="sm"
                footer={
                    <>
                        <button className={styles.cancelBtn} onClick={() => setCompleteTrip(null)}>Cancel</button>
                        <button className={styles.saveBtn} onClick={handleComplete} disabled={saving}>{saving ? 'Saving...' : 'Complete'}</button>
                    </>
                }
            >
                {completeTrip && (
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>End Odometer (km)</label>
                            <input className={styles.formInput} type="number" value={completeForm.endOdometer}
                                onChange={(e) => setCompleteForm({ ...completeForm, endOdometer: e.target.value })}
                                placeholder={`Start was ${completeTrip.startOdometer || 0}`} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Revenue (₹)</label>
                            <input className={styles.formInput} type="number" value={completeForm.revenue}
                                onChange={(e) => setCompleteForm({ ...completeForm, revenue: e.target.value })} placeholder="e.g. 25000" />
                        </div>
                    </div>
                )}
            </Modal>

            {/* CANCEL TRIP MODAL */}
            <Modal isOpen={!!cancelTrip} onClose={() => setCancelTrip(null)} title="Cancel Trip" size="sm"
                footer={
                    <>
                        <button className={styles.cancelBtn} onClick={() => setCancelTrip(null)}>Keep Trip</button>
                        <button className={styles.saveBtn} style={{ background: 'var(--color-danger)' }} onClick={handleCancel} disabled={saving}>{saving ? 'Cancelling...' : 'Cancel Trip'}</button>
                    </>
                }
            >
                <div className={styles.warningBox}>
                    ⚠ Cancelling a trip will reduce the driver&apos;s safety score by 2 points and release the vehicle/driver.
                </div>
                <div className={styles.formGrid}>
                    <div className={styles.formGroupFull}>
                        <label className={styles.formLabel}>Reason *</label>
                        <select className={styles.formInput} value={cancelForm.cancellationReason} onChange={(e) => setCancelForm({ ...cancelForm, cancellationReason: e.target.value })}>
                            <option value="">Select reason</option>
                            <option value="Vehicle Breakdown">Vehicle Breakdown</option>
                            <option value="Driver Unavailable">Driver Unavailable</option>
                            <option value="Client Cancelled">Client Cancelled</option>
                            <option value="Cargo Issue">Cargo Issue</option>
                            <option value="Weather">Weather</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className={styles.formGroupFull}>
                        <label className={styles.formLabel}>Note</label>
                        <textarea className={styles.formTextarea} value={cancelForm.cancellationNote} onChange={(e) => setCancelForm({ ...cancelForm, cancellationNote: e.target.value })} placeholder="Optional details..." />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
