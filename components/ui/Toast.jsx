'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

const ToastContext = createContext(null);

const TYPE_CONFIG = {
    success: { icon: CheckCircle, className: styles.success },
    error: { icon: XCircle, className: styles.error },
    warning: { icon: AlertTriangle, className: styles.warning },
    info: { icon: Info, className: styles.info },
};

let toastId = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = ++toastId;
        setToasts((prev) => [...prev, { id, message, type, removing: false }]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, removing: true } : t))
        );
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 300);
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            {/* Toast Container */}
            <div className={styles.container}>
                {toasts.map((toast) => {
                    const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
                    const Icon = config.icon;
                    return (
                        <div
                            key={toast.id}
                            className={`${styles.toast} ${config.className} ${toast.removing ? styles.removing : ''}`}
                        >
                            <Icon size={18} className={styles.toastIcon} />
                            <span className={styles.toastMessage}>{toast.message}</span>
                            <button
                                className={styles.toastClose}
                                onClick={() => removeToast(toast.id)}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        // Return a no-op if outside provider
        return {
            addToast: () => { },
            removeToast: () => { },
        };
    }
    return ctx;
}
