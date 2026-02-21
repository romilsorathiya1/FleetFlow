'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
    Search, Plus, Edit3, Trash2, UserCheck, UserX, Users, ToggleLeft, ToggleRight,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import styles from './users.module.css';

const ROLE_LABELS = {
    fleet_manager: 'Fleet Manager',
    dispatcher: 'Dispatcher',
    safety_officer: 'Safety Officer',
    financial_analyst: 'Financial Analyst',
};

const EMPTY_FORM = {
    name: '', email: '', password: '', role: 'dispatcher',
};

export default function UsersPage() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === 'fleet_manager';

    const [users, setUsers] = useState([]);
    const [roleCounts, setRoleCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [confirmDeactivate, setConfirmDeactivate] = useState(null);

    const fetchUsers = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (roleFilter) params.set('role', roleFilter);
            const res = await fetch(`/api/users?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
                setRoleCounts(data.roleCounts || {});
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter]);

    useEffect(() => {
        const t = setTimeout(fetchUsers, 300);
        return () => clearTimeout(t);
    }, [fetchUsers]);

    const openAdd = () => {
        setEditingUser(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (u) => {
        setEditingUser(u);
        setForm({
            name: u.name || '',
            email: u.email || '',
            password: '',
            role: u.role || 'dispatcher',
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editingUser ? `/api/users/${editingUser._id}` : '/api/users';
            const method = editingUser ? 'PUT' : 'POST';
            const payload = { ...form };

            // For edits, don't send empty password
            if (editingUser && !payload.password) {
                delete payload.password;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setModalOpen(false);
                fetchUsers();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save');
            }
        } catch (e) {
            alert('Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async (id) => {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchUsers();
            setConfirmDeactivate(null);
        } else {
            const err = await res.json();
            alert(err.error);
        }
    };

    const toggleActive = async (u) => {
        const newStatus = !u.isActive;
        await fetch(`/api/users/${u._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: newStatus }),
        });
        fetchUsers();
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>User Management</h1>
                    <div className={styles.pills}>
                        <span className={styles.pill}>Total: <span className={styles.pillVal}>{roleCounts.total || 0}</span></span>
                        <span className={styles.pill}>Active: <span className={styles.pillVal}>{roleCounts.active || 0}</span></span>
                        <span className={styles.pill}>Inactive: <span className={styles.pillVal}>{roleCounts.inactive || 0}</span></span>
                    </div>
                </div>
                {isAdmin && (
                    <button className={styles.addBtn} onClick={openAdd}>
                        <Plus size={16} /> Add User
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.searchWrap}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        className={styles.searchInput}
                        placeholder="Search users by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select className={styles.selectInput} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="">All Roles</option>
                    <option value="fleet_manager">Fleet Manager</option>
                    <option value="dispatcher">Dispatcher</option>
                    <option value="safety_officer">Safety Officer</option>
                    <option value="financial_analyst">Financial Analyst</option>
                </select>
            </div>

            {/* Users Table */}
            {users.length === 0 ? (
                <div className={styles.empty}>
                    <Users size={48} className={styles.emptyIcon} />
                    <div className={styles.emptyTitle}>No users found</div>
                    <div className={styles.emptyText}>Try adjusting your filters or add a new user.</div>
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u._id}>
                                    <td>
                                        <div className={styles.userName}>{u.name}</div>
                                        <div className={styles.userEmail}>{u.email}</div>
                                    </td>
                                    <td>
                                        <span className={`${styles.roleBadge} ${styles[`role_${u.role}`]}`}>
                                            {ROLE_LABELS[u.role] || u.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`${styles.activeBadge} ${u.isActive ? styles.active : styles.inactive}`}>
                                            {u.isActive ? <UserCheck size={12} /> : <UserX size={12} />}
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                                        {formatDate(u.createdAt)}
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            {isAdmin && (
                                                <>
                                                    <button className={styles.iconBtn} onClick={() => openEdit(u)} title="Edit">
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button
                                                        className={styles.statusBtn}
                                                        onClick={() => toggleActive(u)}
                                                        title={u.isActive ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {u.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                                        {u.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add / Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingUser ? 'Edit User' : 'Add New User'}
                size="md"
                footer={
                    <>
                        <button className={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
                        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                        </button>
                    </>
                }
            >
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Full Name *</label>
                        <input
                            className={styles.formInput}
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Rajesh Kumar"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email *</label>
                        <input
                            className={styles.formInput}
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="e.g. rajesh@fleetflow.com"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                            {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                        </label>
                        <input
                            className={styles.formInput}
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder={editingUser ? 'Leave blank to keep current' : 'Min 6 characters'}
                        />
                        {!editingUser && <span className={styles.formHint}>Minimum 6 characters</span>}
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Role *</label>
                        <select
                            className={styles.formInput}
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                        >
                            <option value="dispatcher">Dispatcher</option>
                            <option value="safety_officer">Safety Officer</option>
                            <option value="financial_analyst">Financial Analyst</option>
                            <option value="fleet_manager">Fleet Manager</option>
                        </select>
                    </div>
                </div>
            </Modal>

            {/* Confirm Deactivate */}
            <ConfirmDialog
                isOpen={!!confirmDeactivate}
                onClose={() => setConfirmDeactivate(null)}
                onConfirm={() => handleDeactivate(confirmDeactivate?._id)}
                title="Deactivate User?"
                message={`Are you sure you want to deactivate "${confirmDeactivate?.name}"? They will no longer be able to log in.`}
                confirmLabel="Deactivate"
                variant="danger"
            />
        </div>
    );
}
