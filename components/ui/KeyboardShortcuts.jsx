'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import styles from './KeyboardShortcuts.module.css';

const SHORTCUTS = [
    { keys: ['Ctrl', 'K'], description: 'Focus global search' },
    { keys: ['Ctrl', 'N'], description: 'Create new trip (Trips page)' },
    { keys: ['Esc'], description: 'Close any modal or drawer' },
    { keys: ['?'], description: 'Show this keyboard shortcuts' },
];

export default function KeyboardShortcuts() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in input
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.key === '?') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }

            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            <div className={styles.overlay} onClick={() => setIsOpen(false)} />
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Keyboard Shortcuts</h2>
                    <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                        <X size={18} />
                    </button>
                </div>
                <div className={styles.list}>
                    {SHORTCUTS.map((shortcut, i) => (
                        <div key={i} className={styles.shortcutRow}>
                            <div className={styles.keys}>
                                {shortcut.keys.map((key, j) => (
                                    <span key={j}>
                                        <kbd className={styles.kbd}>{key}</kbd>
                                        {j < shortcut.keys.length - 1 && (
                                            <span className={styles.plus}>+</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                            <span className={styles.desc}>{shortcut.description}</span>
                        </div>
                    ))}
                </div>
                <div className={styles.footer}>
                    Press <kbd className={styles.kbd}>?</kbd> again to close
                </div>
            </div>
        </>
    );
}
