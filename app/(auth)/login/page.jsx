'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Truck,
    Mail,
    Lock,
    Eye,
    EyeOff,
    Check,
    AlertCircle,
    Shield,
} from 'lucide-react';
import styles from './login.module.css';

const QUICK_LOGINS = [
    { label: 'Admin', email: 'admin@fleetflow.com', password: 'Admin@123', role: 'Manager' },
    { label: 'Dispatcher', email: 'dispatch@fleetflow.com', password: 'Dispatch@123', role: 'Dispatch' },
    { label: 'Safety', email: 'safety@fleetflow.com', password: 'Safety@123', role: 'Safety' },
    { label: 'Finance', email: 'finance@fleetflow.com', password: 'Finance@123', role: 'Finance' },
];

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [seedLoading, setSeedLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError(res.error);
            } else {
                router.push('/dashboard');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = (credentials) => {
        setEmail(credentials.email);
        setPassword(credentials.password);
        setError('');
    };

    return (
        <div className={styles.container}>
            {/* Left Half — Branding */}
            <div className={styles.left}>
                <div className={styles.brand}>
                    <div className={styles.truckIcon}>
                        <Truck size={32} />
                    </div>
                    <h1 className={styles.brandTitle}>
                        Fleet<span>Flow</span>
                    </h1>
                    <p className={styles.tagline}>Intelligent Fleet Operations</p>

                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <span className={styles.checkIcon}>
                                <Check size={14} />
                            </span>
                            Real-time vehicle tracking
                        </div>
                        <div className={styles.feature}>
                            <span className={styles.checkIcon}>
                                <Check size={14} />
                            </span>
                            Automated compliance alerts
                        </div>
                        <div className={styles.feature}>
                            <span className={styles.checkIcon}>
                                <Check size={14} />
                            </span>
                            Financial performance insights
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Half — Login Form */}
            <div className={styles.right}>
                <div className={styles.formWrap}>
                    <h2 className={styles.heading}>Welcome Back</h2>
                    <p className={styles.subtitle}>Sign in to your account</p>

                    {error && (
                        <div className={styles.error}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.inputGroup}>
                            <span className={styles.inputIcon}>
                                <Mail size={18} />
                            </span>
                            <input
                                type="email"
                                className={styles.input}
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <span className={styles.inputIcon}>
                                <Lock size={18} />
                            </span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className={`${styles.input} ${styles.inputRight}`}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className={styles.eyeBtn}
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className={styles.forgotRow}>
                            <a href="#" className={styles.forgotLink}>
                                Forgot Password?
                            </a>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className={styles.spinner} />
                                    Signing In...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <span className={styles.dividerLine} />
                        <span className={styles.dividerText}>Quick Login</span>
                        <span className={styles.dividerLine} />
                    </div>

                    <div className={styles.quickLogins}>
                        {QUICK_LOGINS.map((cred) => (
                            <button
                                key={cred.email}
                                className={styles.chip}
                                onClick={() => handleQuickLogin(cred)}
                                type="button"
                            >
                                <Shield size={12} />
                                {cred.label}
                                <span className={styles.chipRole}>{cred.role}</span>
                            </button>
                        ))}
                    </div>

                    {process.env.NODE_ENV === 'development' && (
                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                                Demo Setup
                            </p>
                            <button
                                onClick={async () => {
                                    setSeedLoading(true);
                                    try {
                                        const res = await fetch('/api/seed');
                                        const data = await res.json();
                                        if (data.success) alert('✅ Database seeded! 10 vehicles, 8 drivers, 12 trips added.');
                                        else alert('❌ Seed failed: ' + data.error);
                                    } catch (err) {
                                        alert('❌ Seed failed: ' + err.message);
                                    }
                                    setSeedLoading(false);
                                }}
                                disabled={seedLoading}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: '1px dashed var(--color-border)',
                                    color: 'var(--color-text-muted)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '10px',
                                    cursor: seedLoading ? 'not-allowed' : 'pointer',
                                    fontSize: '13px',
                                    opacity: seedLoading ? 0.6 : 1,
                                }}
                            >
                                {seedLoading ? 'Seeding...' : '🌱 Seed Demo Data (Indian Fleet)'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
