'use client';

import { useEffect } from 'react';
import styles from './error.module.css';

export default function GlobalError({ error, reset }) {
    useEffect(() => {
        console.error('[GlobalError]', error);
    }, [error]);

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.glowOrb} />
                <div className={styles.iconWrapper}>
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                </div>
                <h1 className={styles.title}>Something went wrong</h1>
                <p className={styles.message}>
                    {error?.message || 'An unexpected error occurred. Please try again.'}
                </p>
                <div className={styles.actions}>
                    <button className={styles.retryBtn} onClick={() => reset()}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        Try Again
                    </button>
                    <a href="/dashboard" className={styles.homeLink}>
                        Go to Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
}
