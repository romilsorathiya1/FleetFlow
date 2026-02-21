'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Truck, Mail, Lock, Eye, EyeOff, Check, AlertCircle,
    Shield, ArrowLeft, KeyRound, CheckCircle,
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

    // Forgot password state
    const [forgotMode, setForgotMode] = useState(false); // show forgot password flow
    const [fpStep, setFpStep] = useState(1); // 1=enter email, 2=enter OTP, 3=new password, 4=success
    const [fpEmail, setFpEmail] = useState('');
    const [fpOtp, setFpOtp] = useState('');
    const [fpNewPassword, setFpNewPassword] = useState('');
    const [fpConfirmPassword, setFpConfirmPassword] = useState('');
    const [fpLoading, setFpLoading] = useState(false);
    const [fpError, setFpError] = useState('');
    const [fpSuccess, setFpSuccess] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);

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

    // ── Forgot Password Handlers ──

    const handleForgotOpen = (e) => {
        e.preventDefault();
        setForgotMode(true);
        setFpStep(1);
        setFpEmail('');
        setFpOtp('');
        setFpNewPassword('');
        setFpConfirmPassword('');
        setFpError('');
        setFpSuccess('');
    };

    const handleForgotClose = () => {
        setForgotMode(false);
        setFpStep(1);
        setFpError('');
        setFpSuccess('');
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setFpError('');
        setFpLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: fpEmail }),
            });
            const data = await res.json();

            if (res.ok) {
                setFpSuccess('OTP sent to your email!');
                setFpStep(2);
            } else {
                setFpError(data.error);
            }
        } catch {
            setFpError('Network error. Please try again.');
        } finally {
            setFpLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setFpError('');
        setFpSuccess('');
        setFpLoading(true);

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: fpEmail, otp: fpOtp }),
            });
            const data = await res.json();

            if (res.ok) {
                setFpSuccess('OTP verified!');
                setFpStep(3);
            } else {
                setFpError(data.error);
            }
        } catch {
            setFpError('Network error. Please try again.');
        } finally {
            setFpLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setFpError('');
        setFpSuccess('');

        if (fpNewPassword !== fpConfirmPassword) {
            setFpError('Passwords do not match');
            return;
        }

        if (fpNewPassword.length < 6) {
            setFpError('Password must be at least 6 characters');
            return;
        }

        setFpLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: fpEmail,
                    password: fpNewPassword,
                    confirmPassword: fpConfirmPassword,
                }),
            });
            const data = await res.json();

            if (res.ok) {
                setFpStep(4);
                setFpSuccess(data.message);
            } else {
                setFpError(data.error);
            }
        } catch {
            setFpError('Network error. Please try again.');
        } finally {
            setFpLoading(false);
        }
    };

    // ── Forgot Password UI ──

    const renderForgotPassword = () => {
        const stepTitles = {
            1: 'Forgot Password',
            2: 'Enter OTP',
            3: 'Reset Password',
            4: 'Password Reset!',
        };

        const stepDescriptions = {
            1: 'Enter your registered email address to receive an OTP',
            2: `We sent a 6-digit code to ${fpEmail}`,
            3: 'Create a strong new password for your account',
            4: 'Your password has been reset successfully',
        };

        return (
            <div className={styles.formWrap}>
                <button className={styles.backBtn} onClick={handleForgotClose} type="button">
                    <ArrowLeft size={16} /> Back to Login
                </button>

                {/* Step indicator */}
                <div className={styles.stepIndicator}>
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`${styles.stepDot} ${fpStep >= s ? styles.stepActive : ''} ${fpStep > s ? styles.stepDone : ''}`}>
                            {fpStep > s ? <Check size={12} /> : s}
                        </div>
                    ))}
                </div>

                <h2 className={styles.heading}>{stepTitles[fpStep]}</h2>
                <p className={styles.subtitle}>{stepDescriptions[fpStep]}</p>

                {fpError && (
                    <div className={styles.error}>
                        <AlertCircle size={16} />
                        {fpError}
                    </div>
                )}

                {fpSuccess && fpStep !== 4 && (
                    <div className={styles.success}>
                        <CheckCircle size={16} />
                        {fpSuccess}
                    </div>
                )}

                {/* Step 1: Enter Email */}
                {fpStep === 1 && (
                    <form className={styles.form} onSubmit={handleSendOTP}>
                        <div className={styles.inputGroup}>
                            <span className={styles.inputIcon}><Mail size={18} /></span>
                            <input
                                type="email"
                                className={styles.input}
                                placeholder="Enter your email"
                                value={fpEmail}
                                onChange={(e) => setFpEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={fpLoading}>
                            {fpLoading ? (
                                <><span className={styles.spinner} /> Sending OTP...</>
                            ) : (
                                'Send OTP'
                            )}
                        </button>
                    </form>
                )}

                {/* Step 2: Enter OTP */}
                {fpStep === 2 && (
                    <form className={styles.form} onSubmit={handleVerifyOTP}>
                        <div className={styles.inputGroup}>
                            <span className={styles.inputIcon}><KeyRound size={18} /></span>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="Enter 6-digit OTP"
                                value={fpOtp}
                                onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                maxLength={6}
                                autoFocus
                                style={{ letterSpacing: '4px', fontWeight: 600, fontSize: '1.125rem' }}
                            />
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={fpLoading || fpOtp.length !== 6}>
                            {fpLoading ? (
                                <><span className={styles.spinner} /> Verifying...</>
                            ) : (
                                'Verify OTP'
                            )}
                        </button>
                        <button type="button" className={styles.resendBtn} onClick={handleSendOTP} disabled={fpLoading}>
                            Didn&apos;t receive code? Resend OTP
                        </button>
                    </form>
                )}

                {/* Step 3: New Password */}
                {fpStep === 3 && (
                    <form className={styles.form} onSubmit={handleResetPassword}>
                        <div className={styles.inputGroup}>
                            <span className={styles.inputIcon}><Lock size={18} /></span>
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                className={`${styles.input} ${styles.inputRight}`}
                                placeholder="New Password"
                                value={fpNewPassword}
                                onChange={(e) => setFpNewPassword(e.target.value)}
                                required
                                minLength={6}
                                autoFocus
                            />
                            <button
                                type="button"
                                className={styles.eyeBtn}
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                tabIndex={-1}
                            >
                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <div className={styles.inputGroup}>
                            <span className={styles.inputIcon}><Lock size={18} /></span>
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                className={styles.input}
                                placeholder="Confirm New Password"
                                value={fpConfirmPassword}
                                onChange={(e) => setFpConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={fpLoading}>
                            {fpLoading ? (
                                <><span className={styles.spinner} /> Resetting...</>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>
                )}

                {/* Step 4: Success */}
                {fpStep === 4 && (
                    <div className={styles.successBlock}>
                        <div className={styles.successCircle}>
                            <CheckCircle size={40} />
                        </div>
                        <p className={styles.successText}>{fpSuccess}</p>
                        <button className={styles.submitBtn} onClick={handleForgotClose}>
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        );
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

            {/* Right Half — Login or Forgot Password */}
            <div className={styles.right}>
                {forgotMode ? renderForgotPassword() : (
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
                                <a href="#" className={styles.forgotLink} onClick={handleForgotOpen}>
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
                )}
            </div>
        </div>
    );
}
