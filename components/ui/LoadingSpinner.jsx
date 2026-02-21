import styles from './LoadingSpinner.module.css';

export default function LoadingSpinner({ size = 'md', fullscreen = false }) {
    if (fullscreen) {
        return (
            <div className={styles.fullscreen}>
                <div className={`${styles.spinner} ${styles.lg}`} />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={`${styles.spinner} ${styles[size]}`} />
        </div>
    );
}
