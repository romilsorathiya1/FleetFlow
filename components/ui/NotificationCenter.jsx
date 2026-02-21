'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    X,
    Bell,
    BellOff,
    Wrench,
    IdCard,
    Clock,
    AlertTriangle,
    DollarSign,
    CheckCheck,
} from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import styles from './NotificationCenter.module.css';

const FILTER_TABS = [
    { key: 'All', label: 'All' },
    { key: 'Service Due', label: 'Service' },
    { key: 'License Expiring', label: 'License' },
    { key: 'Idle Vehicle', label: 'Idle' },
    { key: 'Budget Exceeded', label: 'Budget' },
];

const TYPE_ICONS = {
    'Service Due': Wrench,
    'License Expiring': IdCard,
    'Idle Vehicle': Clock,
    'Shift Limit': AlertTriangle,
    'Budget Exceeded': DollarSign,
};

const SEVERITY_COLORS = {
    Critical: 'var(--color-danger)',
    High: 'var(--color-warning)',
    Medium: 'var(--color-accent)',
    Low: 'var(--color-border)',
};

export default function NotificationCenter({ isOpen, onClose, onUpdate }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

    const fetchAlerts = useCallback(async () => {
        try {
            setLoading(true);
            const params = activeTab !== 'All' ? `?type=${encodeURIComponent(activeTab)}` : '';
            const res = await fetch(`/api/alerts${params}`);
            if (res.ok) {
                const data = await res.json();
                setAlerts(data);
            }
        } catch (err) {
            console.error('Failed to fetch alerts:', err);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        if (isOpen) {
            fetchAlerts();
        }
    }, [isOpen, fetchAlerts]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleMarkAllRead = async () => {
        try {
            await fetch('/api/alerts/all/read', { method: 'PUT' });
            setAlerts((prev) =>
                prev.map((a) => ({ ...a, isRead: true }))
            );
            onUpdate?.();
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const handleMarkRead = async (alertId) => {
        try {
            await fetch(`/api/alerts/${alertId}/read`, { method: 'PUT' });
            setAlerts((prev) =>
                prev.map((a) => (a._id === alertId ? { ...a, isRead: true } : a))
            );
            onUpdate?.();
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const handleDismiss = async (alertId) => {
        try {
            await fetch(`/api/alerts/${alertId}/dismiss`, { method: 'PUT' });
            setAlerts((prev) => prev.filter((a) => a._id !== alertId));
            onUpdate?.();
        } catch (err) {
            console.error('Failed to dismiss alert:', err);
        }
    };

    if (!isOpen) return null;

    const unreadCount = alerts.filter((a) => !a.isRead).length;

    return (
        <>
            {/* Backdrop */}
            <div className={styles.overlay} onClick={onClose} />

            {/* Drawer */}
            <div className={styles.drawer}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <Bell size={18} />
                        <h2 className={styles.headerTitle}>Notifications</h2>
                        {unreadCount > 0 && (
                            <span className={styles.unreadBadge}>{unreadCount}</span>
                        )}
                    </div>
                    <div className={styles.headerActions}>
                        {unreadCount > 0 && (
                            <button
                                className={styles.markAllBtn}
                                onClick={handleMarkAllRead}
                            >
                                <CheckCheck size={14} />
                                Mark all read
                            </button>
                        )}
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className={styles.tabs}>
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Alert List */}
                <div className={styles.alertList}>
                    {loading ? (
                        <div className={styles.emptyState}>
                            <div className={styles.spinner} />
                            <span>Loading alerts...</span>
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className={styles.emptyState}>
                            <BellOff size={36} />
                            <span className={styles.emptyTitle}>All clear!</span>
                            <span className={styles.emptySub}>
                                No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} alerts to show
                            </span>
                        </div>
                    ) : (
                        alerts.map((alert) => {
                            const Icon = TYPE_ICONS[alert.type] || AlertTriangle;
                            const severityColor = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.Low;

                            return (
                                <div
                                    key={alert._id}
                                    className={`${styles.alertItem} ${!alert.isRead ? styles.unread : ''}`}
                                    style={{ borderLeftColor: severityColor }}
                                    onClick={() => handleMarkRead(alert._id)}
                                >
                                    <div className={styles.alertIcon}>
                                        <Icon size={16} />
                                    </div>
                                    <div className={styles.alertContent}>
                                        <div className={styles.alertType}>
                                            <span className={styles.typeBadge}>{alert.type}</span>
                                            <span
                                                className={styles.severityDot}
                                                style={{ background: severityColor }}
                                                title={alert.severity}
                                            />
                                        </div>
                                        <p className={styles.alertMessage}>{alert.message}</p>
                                        <div className={styles.alertMeta}>
                                            {alert.vehicle && (
                                                <span className={styles.metaTag}>
                                                    🚛 {alert.vehicle.name}
                                                </span>
                                            )}
                                            {alert.driver && (
                                                <span className={styles.metaTag}>
                                                    👤 {alert.driver.name}
                                                </span>
                                            )}
                                            <span className={styles.alertTime}>
                                                {formatRelativeDate(alert.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        className={styles.dismissBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDismiss(alert._id);
                                        }}
                                        title="Dismiss"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
}
