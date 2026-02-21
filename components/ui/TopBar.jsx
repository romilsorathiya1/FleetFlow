'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bell, Moon, Sun, Shield, Search, Command, Truck, Users, Route as RouteIcon, Menu } from 'lucide-react';
import { getRoleLabel } from '@/lib/utils';
import styles from './TopBar.module.css';

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/vehicles': 'Vehicles',
    '/trips': 'Trips',
    '/drivers': 'Drivers',
    '/maintenance': 'Maintenance',
    '/fuel-logs': 'Fuel Logs',
    '/analytics': 'Analytics',
};

const RESULT_ICONS = {
    vehicles: Truck,
    drivers: Users,
    trips: RouteIcon,
};

export default function TopBar({ alertCount = 0, onBellClick, onMenuClick, isMobile }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const [isDark, setIsDark] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [searchFocused, setSearchFocused] = useState(false);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef(null);
    const dropdownRef = useRef(null);
    const searchTimerRef = useRef(null);

    const pageTitle = PAGE_TITLES[pathname] || 'FleetFlow';
    const userRole = session?.user?.role || '';

    // Restore theme from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('fleetflow-theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
            setIsDark(saved === 'dark');
        } else {
            setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        }
    }, []);

    const toggleTheme = () => {
        const next = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('fleetflow-theme', next);
        setIsDark(!isDark);
    };

    // Keyboard shortcut: Ctrl/Cmd+K to focus search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target) &&
                !searchRef.current?.contains(e.target)
            ) {
                setSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    const handleSearch = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setSearchResults(null);
            return;
        }
        setSearching(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setSearching(false);
        }
    }, []);

    const onSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => handleSearch(val), 300);
    };

    const navigateToResult = (type, id) => {
        setSearchFocused(false);
        setSearchQuery('');
        setSearchResults(null);
        router.push(`/${type}${id ? `?highlight=${id}` : ''}`);
    };

    const showDropdown = searchFocused && (searchResults || searching);

    return (
        <header className={styles.topbar}>
            <div className={styles.left}>
                <button className={styles.menuBtn} onClick={onMenuClick} title="Open menu">
                    <Menu size={20} />
                </button>
                <h1 className={styles.title}>{pageTitle}</h1>
                <div className={styles.breadcrumb}>
                    <a href="/dashboard">Home</a>
                    <span className={styles.breadcrumbSep}>/</span>
                    <span>{pageTitle}</span>
                </div>
            </div>

            <div className={styles.right}>
                {/* Global Search */}
                <div className={styles.searchWrapper}>
                    <Search size={14} className={styles.searchIcon} />
                    <input
                        ref={searchRef}
                        type="text"
                        className={`${styles.searchInput} ${searchFocused ? styles.searchFocused : ''}`}
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={onSearchChange}
                        onFocus={() => setSearchFocused(true)}
                    />
                    <kbd className={styles.searchKbd}>
                        <Command size={10} />K
                    </kbd>

                    {/* Search Results Dropdown */}
                    {showDropdown && (
                        <div className={styles.searchDropdown} ref={dropdownRef}>
                            {searching ? (
                                <div className={styles.searchLoading}>Searching...</div>
                            ) : searchResults ? (
                                <>
                                    {['vehicles', 'drivers', 'trips'].map((type) => {
                                        const items = searchResults[type];
                                        if (!items || items.length === 0) return null;
                                        const Icon = RESULT_ICONS[type];
                                        return (
                                            <div key={type}>
                                                <div className={styles.resultSection}>{type.charAt(0).toUpperCase() + type.slice(1)}</div>
                                                {items.map((item) => (
                                                    <div
                                                        key={item._id}
                                                        className={styles.resultItem}
                                                        onClick={() => navigateToResult(type, item._id)}
                                                    >
                                                        <Icon size={14} />
                                                        <span>{item.name || item.origin + ' → ' + item.destination}</span>
                                                        {item.licensePlate && <span className={styles.resultMeta}>{item.licensePlate}</span>}
                                                        {item.status && <span className={styles.resultMeta}>{item.status}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                    {searchResults.vehicles?.length === 0 &&
                                        searchResults.drivers?.length === 0 &&
                                        searchResults.trips?.length === 0 && (
                                            <div className={styles.searchLoading}>No results found</div>
                                        )}
                                </>
                            ) : null}
                        </div>
                    )}
                </div>

                <button className={styles.iconBtn} onClick={toggleTheme} title="Toggle theme">
                    {isDark ? <Moon size={16} /> : <Sun size={16} />}
                </button>

                <button className={styles.iconBtn} title="Alerts" onClick={onBellClick}>
                    <Bell size={16} />
                    {alertCount > 0 && (
                        <span className={styles.alertBadge}>
                            {alertCount > 99 ? '99+' : alertCount}
                        </span>
                    )}
                </button>

                {userRole && (
                    <div className={styles.roleChip}>
                        <Shield size={12} />
                        {getRoleLabel(userRole)}
                    </div>
                )}
            </div>
        </header>
    );
}
