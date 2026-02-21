'use client';

import { Inbox } from 'lucide-react';
import styles from './DataTable.module.css';

export default function DataTable({
    columns = [],
    data = [],
    loading = false,
    emptyMessage = 'No data found',
    emptyIcon: EmptyIcon = Inbox,
    onRowClick,
}) {
    if (loading) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.tableScroll}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                {columns.map((col) => (
                                    <th key={col.key}>{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className={styles.skeletonRow}>
                                    {columns.map((col) => (
                                        <td key={col.key}>
                                            <div
                                                className={styles.skeleton}
                                                style={{ width: `${60 + Math.random() * 40}%` }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (!data.length) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.empty}>
                    <EmptyIcon size={40} className={styles.emptyIcon} />
                    <p className={styles.emptyText}>{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.tableScroll}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr
                                key={row._id || idx}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                style={onRowClick ? { cursor: 'pointer' } : undefined}
                            >
                                {columns.map((col) => (
                                    <td key={col.key}>
                                        {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
