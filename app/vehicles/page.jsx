'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
    Search,
    Plus,
    Grid3x3,
    List,
    Eye,
    Edit3,
    Trash2,
    X,
    Truck,
    MapPin,
    Gauge,
    Weight,
    Check,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import DataTable from '@/components/ui/DataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatNumber, formatDate, formatCurrency } from '@/lib/utils';
import styles from './vehicles.module.css';

const EMPTY_FORM = {
    name: '', model: '', licensePlate: '', type: 'Truck', capacity: '',
    currentOdometer: '', lastServiceOdometer: '', cost: '', region: 'Central', status: 'Available',
};

export default function VehiclesPage() {
    const { data: session } = useSession();
    const isManager = session?.user?.role === 'fleet_manager';

    const [vehicles, setVehicles] = useState([]);
    const [statusCounts, setStatusCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [regionFilter, setRegionFilter] = useState('');
    const [viewMode, setViewMode] = useState('card');

    const [modalOpen, setModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const [drawerVehicle, setDrawerVehicle] = useState(null);
    const [drawerTab, setDrawerTab] = useState('details');

    const [selected, setSelected] = useState(new Set());
    const [confirmDelete, setConfirmDelete] = useState(null);

    const fetchVehicles = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (typeFilter) params.set('type', typeFilter);
            if (statusFilter) params.set('status', statusFilter);
            if (regionFilter) params.set('region', regionFilter);
            const res = await fetch(`/api/vehicles?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setVehicles(data.vehicles || []);
                setStatusCounts(data.statusCounts || {});
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search, typeFilter, statusFilter, regionFilter]);

    useEffect(() => {
        const debounce = setTimeout(() => fetchVehicles(), 300);
        return () => clearTimeout(debounce);
    }, [fetchVehicles]);

    const openAdd = () => {
        setEditingVehicle(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (v) => {
        setEditingVehicle(v);
        setForm({
            name: v.name || '', model: v.model || '', licensePlate: v.licensePlate || '',
            type: v.type || 'Truck', capacity: v.capacity || '',
            currentOdometer: v.currentOdometer || '', lastServiceOdometer: v.lastServiceOdometer || '',
            cost: v.cost || '', region: v.region || 'Central', status: v.status || 'Available',
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editingVehicle ? `/api/vehicles/${editingVehicle._id}` : '/api/vehicles';
            const method = editingVehicle ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    capacity: Number(form.capacity) || 0,
                    currentOdometer: Number(form.currentOdometer) || 0,
                    lastServiceOdometer: Number(form.lastServiceOdometer) || 0,
                    cost: Number(form.cost) || 0,
                }),
            });
            if (res.ok) {
                setModalOpen(false);
                fetchVehicles();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchVehicles();
                setConfirmDelete(null);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to retire');
            }
        } catch (err) {
            alert('Network error');
        }
    };

    const toggleSelect = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const bulkRetire = async () => {
        for (const id of selected) {
            await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
        }
        setSelected(new Set());
        fetchVehicles();
    };

    const getRetireScore = (v) => {
        let score = 0;
        const odo = v.currentOdometer || 0;
        if (odo > 300000) score += 30;
        else if (odo > 200000) score += 20;
        else if (odo > 100000) score += 10;
        const mCost = v.totalMaintenanceCost || 0;
        const vCost = v.cost || 1;
        const ratio = mCost / vCost;
        if (ratio > 0.5) score += 30;
        else if (ratio > 0.3) score += 20;
        else if (ratio > 0.1) score += 10;
        if (v.status === 'In Shop') score += 20;
        const age = v.createdAt ? (Date.now() - new Date(v.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365) : 0;
        if (age > 8) score += 20;
        else if (age > 5) score += 10;
        return Math.min(score, 100);
    };

    const getRetireColor = (score) => {
        if (score < 40) return 'var(--color-success)';
        if (score < 70) return 'var(--color-warning)';
        return 'var(--color-danger)';
    };

    const tableColumns = [
        {
            key: 'name', label: 'Name', render: (_, v) => (
                <div><div style={{ fontWeight: 600 }}>{v.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{v.model}</div></div>
            )
        },
        { key: 'licensePlate', label: 'Plate', render: (val) => <span style={{ fontFamily: 'monospace' }}>{val}</span> },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status', render: (_, v) => <StatusBadge status={v.status} /> },
        { key: 'region', label: 'Region' },
        { key: 'currentOdometer', label: 'Odometer', render: (val) => `${formatNumber(val)} km` },
        { key: 'capacity', label: 'Capacity', render: (val) => `${formatNumber(val)} kg` },
        {
            key: 'actions', label: '', render: (_, v) => (
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className={styles.iconBtn} onClick={() => setDrawerVehicle(v)} title="View"><Eye size={14} /></button>
                    {isManager && <button className={styles.iconBtn} onClick={() => openEdit(v)} title="Edit"><Edit3 size={14} /></button>}
                    {isManager && <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setConfirmDelete(v)} title="Retire"><Trash2 size={14} /></button>}
                </div>
            )
        },
    ];

    if (loading) return <LoadingSpinner />;

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleArea}>
                    <h1 className={styles.title}>Vehicle Registry</h1>
                    <div className={styles.pills}>
                        <span className={styles.pill}>Total: <span className={styles.pillValue}>{statusCounts.total || 0}</span></span>
                        <span className={styles.pill}>Available: <span className={styles.pillValue}>{statusCounts.Available || 0}</span></span>
                        <span className={styles.pill}>On Trip: <span className={styles.pillValue}>{statusCounts['On Trip'] || 0}</span></span>
                        <span className={styles.pill}>In Shop: <span className={styles.pillValue}>{statusCounts['In Shop'] || 0}</span></span>
                        <span className={styles.pill}>Retired: <span className={styles.pillValue}>{statusCounts.Retired || 0}</span></span>
                    </div>
                </div>
                {isManager && (
                    <button className={styles.addBtn} onClick={openAdd}>
                        <Plus size={16} /> Add Vehicle
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.searchWrap}>
                    <Search size={16} className={styles.searchIcon} />
                    <input className={styles.searchInput} placeholder="Search vehicles..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className={styles.selectInput} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                    <option value="Bike">Bike</option>
                </select>
                <select className={styles.selectInput} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
                </select>
                <select className={styles.selectInput} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                    <option value="">All Regions</option>
                    <option value="Central">Central</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                </select>
                <div className={styles.viewToggle}>
                    <button className={`${styles.viewBtn} ${viewMode === 'card' ? styles.active : ''}`} onClick={() => setViewMode('card')} title="Card view"><Grid3x3 size={16} /></button>
                    <button className={`${styles.viewBtn} ${viewMode === 'table' ? styles.active : ''}`} onClick={() => setViewMode('table')} title="Table view"><List size={16} /></button>
                </div>
            </div>

            {/* Content */}
            {vehicles.length === 0 ? (
                <div className={styles.empty}>
                    <Truck size={48} className={styles.emptyIcon} />
                    <div className={styles.emptyTitle}>No vehicles found</div>
                    <div className={styles.emptyText}>Try adjusting your filters or add a new vehicle.</div>
                </div>
            ) : viewMode === 'table' ? (
                <DataTable columns={tableColumns} data={vehicles} />
            ) : (
                <div className={styles.cardGrid}>
                    {vehicles.map((v) => {
                        const rScore = getRetireScore(v);
                        const rColor = getRetireColor(rScore);
                        return (
                            <div key={v._id} className={styles.card}>
                                {isManager && (
                                    <button className={`${styles.cardCheck} ${selected.has(v._id) ? styles.checked : ''}`} onClick={() => toggleSelect(v._id)}>
                                        {selected.has(v._id) && <Check size={12} color="#fff" />}
                                    </button>
                                )}
                                <div className={styles.cardTop}>
                                    <div>
                                        <div className={styles.cardName}>{v.name}</div>
                                        <div className={styles.cardModel}>{v.model}</div>
                                        <div className={styles.cardPlate}>{v.licensePlate}</div>
                                    </div>
                                </div>
                                <div className={styles.cardBadges}>
                                    <StatusBadge status={v.status} />
                                    <span className={styles.typeBadge}>{v.type}</span>
                                </div>
                                <div className={styles.cardStats}>
                                    <div className={styles.statItem}>
                                        <div className={styles.statLabel}>Capacity</div>
                                        <div className={styles.statValue}>{formatNumber(v.capacity)} kg</div>
                                    </div>
                                    <div className={styles.statItem}>
                                        <div className={styles.statLabel}>Odometer</div>
                                        <div className={styles.statValue}>{formatNumber(v.currentOdometer)} km</div>
                                    </div>
                                    <div className={styles.statItem}>
                                        <div className={styles.statLabel}>Region</div>
                                        <div className={styles.statValue}>{v.region || '—'}</div>
                                    </div>
                                </div>
                                <div className={styles.retireSection}>
                                    <div className={styles.retireLabel}>
                                        <span>Retirement Score</span>
                                        <span style={{ color: rColor, fontWeight: 600 }}>{rScore}%</span>
                                    </div>
                                    <div className={styles.retireBar}>
                                        <div className={styles.retireFill} style={{ width: `${rScore}%`, background: rColor }} />
                                    </div>
                                    {rScore > 80 && <div className={styles.retireWarn}>⚠ Recommend Retirement</div>}
                                </div>
                                <div className={styles.cardActions}>
                                    <button className={styles.iconBtn} onClick={() => setDrawerVehicle(v)} title="View"><Eye size={14} /></button>
                                    {isManager && <button className={styles.iconBtn} onClick={() => openEdit(v)} title="Edit"><Edit3 size={14} /></button>}
                                    {isManager && <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setConfirmDelete(v)} title="Retire"><Trash2 size={14} /></button>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Bulk Action Bar */}
            {selected.size > 0 && (
                <div className={styles.bulkBar}>
                    <span className={styles.bulkText}><span className={styles.bulkCount}>{selected.size}</span> selected</span>
                    <button className={`${styles.bulkBtn} ${styles.danger}`} onClick={bulkRetire}>
                        <Trash2 size={14} /> Retire
                    </button>
                    <button className={styles.bulkClear} onClick={() => setSelected(new Set())}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
                size="lg"
                footer={
                    <>
                        <button className={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
                        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : editingVehicle ? 'Update' : 'Create'}
                        </button>
                    </>
                }
            >
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Vehicle Name *</label>
                        <input className={styles.formInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. TN-Hauler-01" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Model *</label>
                        <input className={styles.formInput} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. Tata Prima LX" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>License Plate *</label>
                        <input className={styles.formInput} value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} placeholder="e.g. TN-01-AB-1234" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Type *</label>
                        <select className={styles.formInput} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                            <option value="Truck">Truck</option>
                            <option value="Van">Van</option>
                            <option value="Bike">Bike</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Max Capacity (kg)</label>
                        <input className={styles.formInput} type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="e.g. 8000" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Acquisition Cost (₹)</label>
                        <input className={styles.formInput} type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="e.g. 2500000" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Current Odometer (km)</label>
                        <input className={styles.formInput} type="number" value={form.currentOdometer} onChange={(e) => setForm({ ...form, currentOdometer: e.target.value })} placeholder="e.g. 45000" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Last Service Odometer (km)</label>
                        <input className={styles.formInput} type="number" value={form.lastServiceOdometer} onChange={(e) => setForm({ ...form, lastServiceOdometer: e.target.value })} placeholder="e.g. 40000" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Region</label>
                        <select className={styles.formInput} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                            <option value="Central">Central</option>
                            <option value="North">North</option>
                            <option value="South">South</option>
                            <option value="East">East</option>
                            <option value="West">West</option>
                        </select>
                    </div>
                    {editingVehicle && (
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Status</label>
                            <select className={styles.formInput} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                <option value="Available">Available</option>
                                <option value="On Trip">On Trip</option>
                                <option value="In Shop">In Shop</option>
                                <option value="Retired">Retired</option>
                            </select>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Detail Drawer */}
            {drawerVehicle && (
                <>
                    <div className={styles.drawerOverlay} onClick={() => setDrawerVehicle(null)} />
                    <aside className={styles.drawer}>
                        <div className={styles.drawerHeader}>
                            <h2 className={styles.drawerTitle}>{drawerVehicle.name}</h2>
                            <button className={styles.drawerClose} onClick={() => setDrawerVehicle(null)}><X size={16} /></button>
                        </div>
                        <div className={styles.tabs}>
                            <button className={`${styles.tab} ${drawerTab === 'details' ? styles.activeTab : ''}`} onClick={() => setDrawerTab('details')}>Details</button>
                            <button className={`${styles.tab} ${drawerTab === 'costs' ? styles.activeTab : ''}`} onClick={() => setDrawerTab('costs')}>Costs</button>
                        </div>
                        <div className={styles.drawerBody}>
                            {drawerTab === 'details' && (
                                <div className={styles.detailGrid}>
                                    <div className={styles.detailItem}><div className={styles.detailLabel}>Model</div><div className={styles.detailValue}>{drawerVehicle.model}</div></div>
                                    <div className={styles.detailItem}><div className={styles.detailLabel}>License Plate</div><div className={styles.detailValue} style={{ fontFamily: 'monospace' }}>{drawerVehicle.licensePlate}</div></div>
                                    <div className={styles.detailItem}><div className={styles.detailLabel}>Type</div><div className={styles.detailValue}>{drawerVehicle.type}</div></div>
                                    <div className={styles.detailItem}><div className={styles.detailLabel}>Status</div><div className={styles.detailValue}><StatusBadge status={drawerVehicle.status} /></div></div>
                                    <div className={styles.detailItem}><div className={styles.detailLabel}>Capacity</div><div className={styles.detailValue}>{formatNumber(drawerVehicle.capacity)} kg</div></div>
                                    <div className={styles.detailItem}><div className={styles.detailLabel}>Odometer</div><div className={styles.detailValue}>{formatNumber(drawerVehicle.currentOdometer)} km</div></div>
                                    <div className={styles.detailItem}><div className={styles.detailLabel}>Region</div><div className={styles.detailValue}>{drawerVehicle.region || '—'}</div></div>
                                    <div className={styles.detailItem}><div className={styles.detailLabel}>Added</div><div className={styles.detailValue}>{formatDate(drawerVehicle.createdAt)}</div></div>
                                </div>
                            )}
                            {drawerTab === 'costs' && (
                                <div className={styles.detailGrid}>
                                    <div className={styles.detailItem}><div className={styles.detailLabel}>Acquisition Cost</div><div className={styles.detailValue}>{formatCurrency(drawerVehicle.cost)}</div></div>
                                    <div className={styles.detailItem}><div className={styles.detailLabel}>Maintenance Cost</div><div className={styles.detailValue}>{formatCurrency(drawerVehicle.totalMaintenanceCost)}</div></div>
                                    <div className={styles.detailItem}><div className={styles.detailLabel}>Fuel Cost</div><div className={styles.detailValue}>{formatCurrency(drawerVehicle.totalFuelCost)}</div></div>
                                    <div className={styles.detailItem}><div className={styles.detailLabel}>Total Cost</div><div className={styles.detailValue} style={{ color: 'var(--color-warning)' }}>{formatCurrency((drawerVehicle.cost || 0) + (drawerVehicle.totalMaintenanceCost || 0) + (drawerVehicle.totalFuelCost || 0))}</div></div>
                                </div>
                            )}
                        </div>
                    </aside>
                </>
            )}

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => handleDelete(confirmDelete?._id)}
                title="Retire Vehicle?"
                message={`Are you sure you want to retire "${confirmDelete?.name}"? This will mark it as retired.`}
                confirmLabel="Retire"
                variant="danger"
            />
        </div>
    );
}
