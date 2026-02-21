import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.glowOrb} />
                <h1 className={styles.code}>404</h1>
                <h2 className={styles.title}>Page Not Found</h2>
                <p className={styles.message}>
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Link href="/dashboard" className={styles.homeBtn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
