'use client';

import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import {
    LayoutDashboard,
    Truck,
    Route,
    Users,
    Wrench,
    Fuel,
    BarChart3,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { getRoleLabel } from '@/lib/utils';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'],
    },
    {
        label: 'Vehicles',
        href: '/vehicles',
        icon: Truck,
        roles: ['fleet_manager', 'dispatcher', 'safety_officer'],
    },
    {
        label: 'Trips',
        href: '/trips',
        icon: Route,
        roles: ['fleet_manager', 'dispatcher'],
    },
    {
        label: 'Drivers',
        href: '/drivers',
        icon: Users,
        roles: ['fleet_manager', 'safety_officer', 'dispatcher'],
    },
    {
        label: 'Maintenance',
        href: '/maintenance',
        icon: Wrench,
        roles: ['fleet_manager', 'safety_officer'],
    },
    {
        label: 'Fuel Logs',
        href: '/fuel-logs',
        icon: Fuel,
        roles: ['fleet_manager', 'financial_analyst'],
    },
    {
        label: 'Analytics',
        href: '/analytics',
        icon: BarChart3,
        roles: ['fleet_manager', 'financial_analyst'],
    },
];

export default function Sidebar({ collapsed, onToggle, alertCount = 0, isMobile = false, mobileOpen = false, onMobileClose }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userRole = session?.user?.role || 'dispatcher';
    const userName = session?.user?.name || 'User';

    const initials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const visibleItems = NAV_ITEMS.filter((item) =>
        item.roles.includes(userRole)
    );

    return (
        <>
            {/* Mobile backdrop overlay */}
            {isMobile && mobileOpen && (
                <div className={styles.backdrop} onClick={onMobileClose} />
            )}
            <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${isMobile && mobileOpen ? styles.mobileOpen : ''}`}>
                <button
                    className={styles.collapseBtn}
                    onClick={onToggle}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* Logo */}
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <Truck size={20} />
                    </div>
                    {!collapsed && (
                        <div className={styles.logoText}>
                            Fleet<span>Flow</span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className={styles.nav}>
                    {!collapsed && <div className={styles.sectionLabel}>Navigation</div>}
                    {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                title={collapsed ? item.label : undefined}
                                onClick={() => { if (isMobile && onMobileClose) onMobileClose(); }}
                            >
                                <span className={styles.navIcon}>
                                    <Icon size={18} />
                                </span>
                                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                                {item.href === '/dashboard' && alertCount > 0 && (
                                    <span className={styles.badge}>{alertCount > 99 ? '99+' : alertCount}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className={styles.userSection}>
                    <div className={styles.avatar}>{initials}</div>
                    {!collapsed && (
                        <>
                            <div className={styles.userInfo}>
                                <div className={styles.userName}>{userName}</div>
                                <div className={styles.userRole}>{getRoleLabel(userRole)}</div>
                            </div>
                            <button
                                className={styles.logoutBtn}
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                title="Logout"
                            >
                                <LogOut size={16} />
                            </button>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}
