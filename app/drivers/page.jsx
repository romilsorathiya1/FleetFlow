'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    Search, Plus, Eye, Edit3, Trash2, Users, ToggleLeft, ToggleRight,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, getDaysUntilExpiry } from '@/lib/utils';
import styles from './drivers.module.css';

const AVATAR_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
];

const getAvatarColor = (name) => {
    const code = (name || 'U').charCodeAt(0);
    return AVATAR_COLORS[code % AVATAR_COLORS.length];
};

const getInitials = (name) =>
    (name || 'U')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

const SafetyRing = ({ score }) => {
    const r = 16;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    const color = score > 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
    return (
        <svg className={styles.scoreRing} viewBox="0 0 40 40">
            <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-border)" strokeWidth="3" />
            <circle
                cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 20 20)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <text x="20" y="21" textAnchor="middle" dominantBaseline="central"
                style={{ fontSize: '0.625rem', fontWeight: 700, fill: color }}>
                {score}
            </text>
        </svg>
    );
};

const EMPTY_FORM = {
    name: '', email: '', phone: '', licenseNumber: '', licenseExpiry: '',
    licenseCategory: [], safetyScore: 100, status: 'Off Duty',
};

export default function DriversPage() {
    const { data: session } = useSession();
    const canManage = ['fleet_manager', 'safety_officer'].includes(session?.user?.role);

    const [drivers, setDrivers] = useState([]);
    const [statusCounts, setStatusCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const fetchDrivers = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            if (categoryFilter) params.set('licenseCategory', categoryFilter);
            const res = await fetch(`/api/drivers?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setDrivers(data.drivers || []);
                setStatusCounts(data.statusCounts || {});
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [search, statusFilter, categoryFilter]);

    useEffect(() => {
        const t = setTimeout(fetchDrivers, 300);
        return () => clearTimeout(t);
    }, [fetchDrivers]);

    const openAdd = () => { setEditingDriver(null); setForm(EMPTY_FORM); setModalOpen(true); };
    const openEdit = (d) => {
        setEditingDriver(d);
        setForm({
            name: d.name || '', email: d.email || '', phone: d.phone || '',
            licenseNumber: d.licenseNumber || '',
            licenseExpiry: d.licenseExpiry ? d.licenseExpiry.slice(0, 10) : '',
            licenseCategory: d.licenseCategory || [],
            safetyScore: d.safetyScore ?? 100, status: d.status || 'Off Duty',
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editingDriver ? `/api/drivers/${editingDriver._id}` : '/api/drivers';
            const method = editingDriver ? 'PUT' : 'POST';
            const payload = {
                ...form,
                safetyScore: Number(form.safetyScore) || 100,
                licenseCategory: typeof form.licenseCategory === 'string'
                    ? form.licenseCategory.split(',').map((s) => {
                        const trimmed = s.trim();
                        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
                    }).filter(Boolean)
                    : form.licenseCategory,
            };
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) { setModalOpen(false); fetchDrivers(); }
            else { const err = await res.json(); alert(err.error || 'Failed'); }
        } catch (e) { alert('Network error'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
        if (res.ok) { fetchDrivers(); setConfirmDelete(null); }
        else { const err = await res.json(); alert(err.error); }
    };

    const toggleStatus = async (d) => {
        const newStatus = d.status === 'On Duty' ? 'Off Duty' : 'On Duty';
        await fetch(`/api/drivers/${d._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        fetchDrivers();
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Driver Management</h1>
                    <div className={styles.pills}>
                        <span className={styles.pill}>Total: <span className={styles.pillVal}>{statusCounts.total || 0}</span></span>
                        <span className={styles.pill}>On Duty: <span className={styles.pillVal}>{statusCounts['On Duty'] || 0}</span></span>
                        <span className={styles.pill}>Off Duty: <span className={styles.pillVal}>{statusCounts['Off Duty'] || 0}</span></span>
                        <span className={styles.pill}>Suspended: <span className={styles.pillVal}>{statusCounts.Suspended || 0}</span></span>
                        <span className={styles.pill}>Expired: <span className={styles.pillVal}>{statusCounts.expiredLicenses || 0}</span></span>
                    </div>
                </div>
                {canManage && <button className={styles.addBtn} onClick={openAdd}><Plus size={16} /> Add Driver</button>}
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.searchWrap}>
                    <Search size={16} className={styles.searchIcon} />
                    <input className={styles.searchInput} placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className={styles.selectInput} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="On Duty">On Duty</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                </select>
                <select className={styles.selectInput} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="">All Categories</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                    <option value="Bike">Bike</option>
                </select>
            </div>

            {/* Cards */}
            {drivers.length === 0 ? (
                <div className={styles.empty}>
                    <Users size={48} className={styles.emptyIcon} />
                    <div className={styles.emptyTitle}>No drivers found</div>
                    <div className={styles.emptyText}>Try adjusting your filters or add a new driver.</div>
                </div>
            ) : (
                <div className={styles.grid}>
                    {drivers.map((d) => {
                        const daysLeft = getDaysUntilExpiry(d.licenseExpiry);
                        const expiryColor = d.licenseExpiryStatus === 'expired' || d.licenseExpiryStatus === 'critical'
                            ? 'var(--color-danger)' : d.licenseExpiryStatus === 'warning'
                                ? 'var(--color-warning)' : 'var(--color-success)';
                        const hours = d.totalHoursToday || 0;
                        const hoursPercent = Math.min((hours / 10) * 100, 100);
                        const hoursColor = hours >= 10 ? 'var(--color-danger)' : hours >= 8 ? 'var(--color-warning)' : 'var(--color-accent)';
                        return (
                            <div key={d._id} className={styles.card}>
                                <div className={styles.cardTop}>
                                    <div className={styles.avatar} style={{ background: getAvatarColor(d.name) }}>
                                        {getInitials(d.name)}
                                    </div>
                                    <div className={styles.cardInfo}>
                                        <div className={styles.cardName}>{d.name}</div>
                                        <div className={styles.cardEmail}>{d.email}</div>
                                    </div>
                                    <StatusBadge status={d.status} />
                                </div>

                                <div className={styles.badges}>
                                    {(d.licenseCategory || []).map((cat) => (
                                        <span key={cat} className={styles.catBadge}>{cat}</span>
                                    ))}
                                </div>

                                <div className={styles.licenseRow}>
                                    <span className={styles.licenseLabel}>License Expiry</span>
                                    {d.licenseExpiryStatus === 'expired' ? (
                                        <span className={styles.expired}>EXPIRED</span>
                                    ) : (
                                        <span style={{ color: expiryColor, fontWeight: 600 }}>
                                            {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                <div className={styles.statsRow}>
                                    <div className={styles.statBox}>
                                        <SafetyRing score={d.safetyScore ?? 100} />
                                        <div className={styles.statInfo}>
                                            <div className={styles.statLabel}>Safety</div>
                                            <div className={styles.statValue}>{d.safetyScore ?? 100}%</div>
                                        </div>
                                    </div>
                                    <div className={styles.statBox}>
                                        <div className={styles.statInfo}>
                                            <div className={styles.statLabel}>Completion</div>
                                            <div className={styles.statValue}>
                                                {d.completionRate}%
                                                <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>
                                                    ({d.completedTrips || 0}/{d.totalTrips || 0})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.hoursBar}>
                                    <div className={styles.hoursLabel}>
                                        <span>Today&apos;s Hours</span>
                                        <span style={{ color: hoursColor }}>{hours.toFixed(1)}h / 10h</span>
                                    </div>
                                    <div className={styles.progressTrack}>
                                        <div className={styles.progressFill} style={{ width: `${hoursPercent}%`, background: hoursColor }} />
                                    </div>
                                </div>

                                <div className={styles.cardActions}>
                                    <Link href={`/drivers/${d._id}`}><button className={styles.iconBtn} title="View"><Eye size={14} /></button></Link>
                                    {canManage && <button className={styles.iconBtn} onClick={() => openEdit(d)} title="Edit"><Edit3 size={14} /></button>}
                                    {canManage && <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setConfirmDelete(d)} title="Suspend"><Trash2 size={14} /></button>}
                                    {canManage && (
                                        <button className={styles.statusBtn} onClick={() => toggleStatus(d)} title="Toggle status">
                                            {d.status === 'On Duty' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                            {d.status === 'On Duty' ? 'Off Duty' : 'On Duty'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingDriver ? 'Edit Driver' : 'Add Driver'} size="lg"
                footer={<><button className={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button><button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingDriver ? 'Update' : 'Create'}</button></>}
            >
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Full Name *</label><input className={styles.formInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rajesh Kumar" /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Email *</label><input className={styles.formInput} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. rajesh@fleet.com" /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Phone *</label><input className={styles.formInput} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +91 98765 43210" /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>License Number *</label><input className={styles.formInput} value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="e.g. GJ01XXXXXXX" /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>License Expiry *</label><input className={styles.formInput} type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>License Categories (comma-separated)</label><input className={styles.formInput} value={Array.isArray(form.licenseCategory) ? form.licenseCategory.join(', ') : form.licenseCategory} onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })} placeholder="e.g. Truck, Van, Bike" /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Safety Score</label><input className={styles.formInput} type="number" min="0" max="100" value={form.safetyScore} onChange={(e) => setForm({ ...form, safetyScore: e.target.value })} /></div>
                    {editingDriver && (
                        <div className={styles.formGroup}><label className={styles.formLabel}>Status</label>
                            <select className={styles.formInput} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                <option value="On Duty">On Duty</option><option value="Off Duty">Off Duty</option><option value="Suspended">Suspended</option>
                            </select>
                        </div>
                    )}
                </div>
            </Modal>

            <ConfirmDialog isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => handleDelete(confirmDelete?._id)}
                title="Suspend Driver?" message={`Are you sure you want to suspend "${confirmDelete?.name}"?`} confirmLabel="Suspend" variant="danger" />
        </div>
    );
}
