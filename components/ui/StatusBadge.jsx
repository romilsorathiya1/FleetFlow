import styles from './StatusBadge.module.css';

const STATUS_COLORS = {
    Available: { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
    'On Trip': { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
    'In Shop': { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    Retired: { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8' },
    Draft: { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8' },
    Dispatched: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
    Completed: { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
    Cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
    'On Duty': { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
    'Off Duty': { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8' },
    Suspended: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
    Ongoing: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    Resolved: { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
    Low: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
    Medium: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    High: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
    Critical: { bg: 'rgba(220,38,38,0.15)', color: '#DC2626' },
};

export default function StatusBadge({ status, showDot = true }) {
    const colors = STATUS_COLORS[status] || { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8' };

    return (
        <span
            className={styles.badge}
            style={{ background: colors.bg, color: colors.color }}
        >
            {showDot && (
                <span className={styles.dot} style={{ background: colors.color }} />
            )}
            {status}
        </span>
    );
}
