import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from './KPICard.module.css';

export default function KPICard({ title, value, icon: Icon, color = '#3B82F6', trend, trendLabel }) {
    const bgColor = `${color}20`;

    const trendClass = trend > 0 ? styles.trendUp : trend < 0 ? styles.trendDown : styles.trendNeutral;
    const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

    return (
        <div className={styles.card}>
            <div className={styles.top}>
                <div className={styles.info}>
                    <div className={styles.label}>{title}</div>
                    <div className={styles.value}>{value}</div>
                </div>
                {Icon && (
                    <div className={styles.iconWrap} style={{ background: bgColor }}>
                        <Icon size={22} style={{ color }} />
                    </div>
                )}
            </div>
            {trend !== undefined && (
                <div className={`${styles.trend} ${trendClass}`}>
                    <TrendIcon size={14} />
                    <span>{Math.abs(trend)}%</span>
                    {trendLabel && <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>{trendLabel}</span>}
                </div>
            )}
        </div>
    );
}
