'use client';

import { useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger', // 'danger' | 'primary'
}) {
    const handleEscape = useCallback(
        (e) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    const iconBg =
        variant === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)';
    const iconColor =
        variant === 'danger' ? 'var(--color-warning)' : 'var(--color-accent)';

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                <div className={styles.iconWrap} style={{ background: iconBg }}>
                    <AlertTriangle size={28} style={{ color: iconColor }} />
                </div>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        {cancelLabel}
                    </button>
                    <button
                        className={`${styles.confirmBtn} ${styles[variant]}`}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
