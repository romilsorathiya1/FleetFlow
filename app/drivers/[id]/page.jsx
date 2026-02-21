'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, Shield } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, getDaysUntilExpiry } from '@/lib/utils';
import styles from './page.module.css';

const AVATAR_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
];
const getAvatarColor = (n) => AVATAR_COLORS[(n || 'U').charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (n) => (n || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

export default function DriverDetailPage() {
    const { id } = useParams();
    const [driver, setDriver] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('trips');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/drivers/${id}`);
                if (res.ok) setDriver(await res.json());
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [id]);

    if (loading) return <LoadingSpinner />;
    if (!driver) return <div className={styles.page}><div className={styles.empty}>Driver not found</div></div>;

    const daysLeft = getDaysUntilExpiry(driver.licenseExpiry);
    const expiryColor = driver.licenseExpiryStatus === 'expired' || driver.licenseExpiryStatus === 'critical'
        ? 'var(--color-danger)' : driver.licenseExpiryStatus === 'warning'
            ? 'var(--color-warning)' : 'var(--color-success)';

    // Build shift log chart data (last 7 trips as dummy hours)
    const shiftData = (driver.trips || []).slice(0, 7).reverse().map((t, i) => ({
        day: `Trip ${i + 1}`,
        hours: t.startTime && t.endTime
            ? Math.round((new Date(t.endTime) - new Date(t.startTime)) / 3600000 * 10) / 10
            : 0,
    }));

    return (
        <div className={styles.page}>
            <Link href="/drivers" className={styles.backLink}><ArrowLeft size={14} /> Back to Drivers</Link>

            {/* Profile Header */}
            <div className={styles.profile}>
                <div className={styles.avatar} style={{ background: getAvatarColor(driver.name) }}>
                    {getInitials(driver.name)}
                </div>
                <div className={styles.profileInfo}>
                    <h1 className={styles.profileName}>{driver.name}</h1>
                    <div className={styles.profileEmail}>
                        <Mail size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {driver.email}
                        <span style={{ margin: '0 8px', opacity: 0.3 }}>|</span>
                        <Phone size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {driver.phone}
                    </div>
                    <div className={styles.profileBadges}>
                        <StatusBadge status={driver.status} />
                        {(driver.licenseCategory || []).map((c) => (
                            <span key={c} style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>{c}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}><div className={styles.statLabel}>Safety Score</div><div className={styles.statValue} style={{ color: (driver.safetyScore ?? 100) > 80 ? 'var(--color-success)' : (driver.safetyScore ?? 100) >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{driver.safetyScore ?? 100}%</div></div>
                <div className={styles.statCard}><div className={styles.statLabel}>Completion</div><div className={styles.statValue}>{driver.completionRate}%</div></div>
                <div className={styles.statCard}><div className={styles.statLabel}>Total Trips</div><div className={styles.statValue}>{driver.totalTrips || 0}</div></div>
                <div className={styles.statCard}><div className={styles.statLabel}>License Expiry</div><div className={styles.statValue} style={{ color: expiryColor, fontSize: '0.875rem' }}>{driver.licenseExpiryStatus === 'expired' ? 'EXPIRED' : `${daysLeft} days`}</div></div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button className={`${styles.tab} ${tab === 'trips' ? styles.active : ''}`} onClick={() => setTab('trips')}>Trip Timeline</button>
                <button className={`${styles.tab} ${tab === 'incidents' ? styles.active : ''}`} onClick={() => setTab('incidents')}>Incidents</button>
                <button className={`${styles.tab} ${tab === 'shifts' ? styles.active : ''}`} onClick={() => setTab('shifts')}>Shift Log</button>
            </div>

            {/* Tab Content */}
            <div className={styles.card}>
                {tab === 'trips' && (
                    driver.trips?.length > 0 ? (
                        <div className={styles.timeline}>
                            {driver.trips.map((trip) => (
                                <div key={trip._id} className={styles.timelineItem}>
                                    <div className={`${styles.timelineDot} ${trip.status === 'Completed' ? styles.completed : trip.status === 'Cancelled' ? styles.cancelled : ''}`} />
                                    <div className={styles.timelineContent}>
                                        <div className={styles.timelineRoute}>{trip.origin} → {trip.destination}</div>
                                        <div className={styles.timelineMeta}>
                                            <span>{trip.vehicle?.name || '—'}</span>
                                            <span>{formatDate(trip.createdAt)}</span>
                                            <StatusBadge status={trip.status} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <div className={styles.empty}>No trips recorded</div>
                )}

                {tab === 'incidents' && (
                    (driver.incidents || []).length > 0 ? (
                        (driver.incidents || []).map((inc, i) => {
                            const sevColor = inc.severity === 'High' ? 'var(--color-danger)' : inc.severity === 'Medium' ? 'var(--color-warning)' : 'var(--color-accent)';
                            return (
                                <div key={i} className={styles.incidentItem}>
                                    <div className={styles.incidentDot} style={{ background: sevColor }} />
                                    <div className={styles.incidentInfo}>
                                        <div className={styles.incidentTitle}>{inc.description || 'Incident'}</div>
                                        <div className={styles.incidentDate}>{formatDate(inc.date)} · <span style={{ color: sevColor }}>{inc.severity}</span></div>
                                    </div>
                                </div>
                            );
                        })
                    ) : <div className={styles.empty}>No incidents recorded — excellent record!</div>
                )}

                {tab === 'shifts' && (
                    shiftData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={shiftData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis dataKey="day" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                                <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.8125rem' }} />
                                <Bar dataKey="hours" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className={styles.empty}>No shift data available</div>
                )}
            </div>
        </div>
    );
}
