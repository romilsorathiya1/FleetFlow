'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import Sidebar from '@/components/ui/Sidebar';
import TopBar from '@/components/ui/TopBar';
import NotificationCenter from '@/components/ui/NotificationCenter';
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts';
import { ToastProvider } from '@/components/ui/Toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function ProtectedContent({ children }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [alertCount, setAlertCount] = useState(0);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const { data: session, status } = useSession();
    const router = useRouter();

    // Detect mobile viewport
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e) => {
            setIsMobile(e.matches);
            if (e.matches) setMobileOpen(false);
        };
        setIsMobile(mq.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    // Fetch unread alert count
    const fetchAlertCount = useCallback(async () => {
        try {
            const res = await fetch('/api/alerts?countOnly=true');
            if (res.ok) {
                const data = await res.json();
                setAlertCount(data.count || 0);
            }
        } catch (err) {
            console.error('Failed to fetch alert count:', err);
        }
    }, []);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchAlertCount();
            const interval = setInterval(fetchAlertCount, 30000);
            return () => clearInterval(interval);
        }
    }, [status, fetchAlertCount]);

    if (status === 'loading') {
        return <LoadingSpinner fullscreen />;
    }

    if (!session) {
        return null;
    }

    return (
        <ToastProvider>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar
                    collapsed={isMobile ? false : sidebarCollapsed}
                    onToggle={() => {
                        if (isMobile) {
                            setMobileOpen(!mobileOpen);
                        } else {
                            setSidebarCollapsed(!sidebarCollapsed);
                        }
                    }}
                    alertCount={alertCount}
                    isMobile={isMobile}
                    mobileOpen={mobileOpen}
                    onMobileClose={() => setMobileOpen(false)}
                />
                <div
                    style={{
                        flex: 1,
                        marginLeft: isMobile ? 0 : (sidebarCollapsed ? 64 : 260),
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflow: 'hidden',
                    }}
                >
                    <TopBar
                        alertCount={alertCount}
                        onBellClick={() => setNotificationOpen(true)}
                        onMenuClick={() => setMobileOpen(true)}
                        isMobile={isMobile}
                    />
                    <main style={{ flex: 1, overflowY: 'auto' }}>
                        {children}
                    </main>
                </div>

                {/* Notification Center Drawer */}
                <NotificationCenter
                    isOpen={notificationOpen}
                    onClose={() => setNotificationOpen(false)}
                    onUpdate={fetchAlertCount}
                />

                {/* Keyboard Shortcuts Modal */}
                <KeyboardShortcuts />
            </div>
        </ToastProvider>
    );
}

export default function DashboardLayout({ children }) {
    return (
        <SessionProvider>
            <ProtectedContent>{children}</ProtectedContent>
        </SessionProvider>
    );
}

