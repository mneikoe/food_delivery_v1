import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtp, login, adminLoginWithPassword } from '../api/adminApi';

export default function Login() {
  const [authMode, setAuthMode] = useState('otp'); // 'otp' | 'password'
  const [otpStep, setOtpStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const clearMessages = () => { setError(''); setSuccess(''); };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!email) { setError('Please enter your email address'); return; }
    setLoading(true);
    try {
      await sendOtp(email);
      setSuccess('OTP sent! Check your email inbox.');
      setOtpStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!otp || otp.length < 4) { setError('Enter the 4-digit OTP from your email'); return; }
    setLoading(true);
    try {
      const res = await login(email, otp);
      if (res?.token) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => navigate('/admin'), 500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!email) { setError('Please enter your email address'); return; }
    if (!password) { setError('Please enter your password'); return; }
    setLoading(true);
    try {
      const res = await adminLoginWithPassword(email, password);
      if (res?.token) {
        if (res.user?.role !== 'ADMIN') {
          setError('Access denied. Admin accounts only.');
          localStorage.removeItem('admin_token');
          return;
        }
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => navigate('/admin'), 500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="al-root">
      {/* Background */}
      <div className="al-bg">
        <div className="al-bg-orb al-bg-orb1" />
        <div className="al-bg-orb al-bg-orb2" />
        <div className="al-bg-orb al-bg-orb3" />
      </div>

      <div className="al-card">
        {/* Left Panel */}
        <div className="al-left">
          <div className="al-left-content">
            <div className="al-logo">
              <span className="al-logo-icon">🍽️</span>
              <span className="al-logo-text">Chatora Adda</span>
            </div>
            <h1 className="al-headline">
              Admin Control<br />
              <span className="al-headline-accent">Center</span>
            </h1>
            <p className="al-subtext">
              Manage your restaurant, orders, delivery partners, and more from one powerful dashboard.
            </p>
            <div className="al-stats">
              {[
                { icon: '📦', label: 'Orders Managed', value: 'Real-time' },
                { icon: '🛵', label: 'Delivery Fleet', value: 'Live Tracking' },
                { icon: '📊', label: 'Analytics', value: 'Full Reports' },
              ].map((s) => (
                <div className="al-stat" key={s.label}>
                  <span className="al-stat-icon">{s.icon}</span>
                  <div>
                    <div className="al-stat-val">{s.value}</div>
                    <div className="al-stat-lbl">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="al-right">
          <div className="al-form-wrap">
            <div className="al-form-header">
              <h2 className="al-form-title">Welcome back</h2>
              <p className="al-form-sub">Sign in to your admin account</p>
            </div>

            {/* Tab Toggle */}
            <div className="al-tabs">
              <button
                className={`al-tab ${authMode === 'otp' ? 'active' : ''}`}
                onClick={() => { setAuthMode('otp'); setOtpStep('email'); clearMessages(); }}
                type="button"
              >
                📧 Email OTP
              </button>
              <button
                className={`al-tab ${authMode === 'password' ? 'active' : ''}`}
                onClick={() => { setAuthMode('password'); clearMessages(); }}
                type="button"
              >
                🔒 Password
              </button>
            </div>

            {/* Messages */}
            {error && (
              <div className="al-alert al-alert-error">
                <span>⚠️</span> {error}
              </div>
            )}
            {success && (
              <div className="al-alert al-alert-success">
                <span>✅</span> {success}
              </div>
            )}

            {/* OTP Mode */}
            {authMode === 'otp' && (
              <>
                {otpStep === 'email' ? (
                  <form onSubmit={handleSendOtp} className="al-form">
                    <div className="al-field">
                      <label className="al-label">Email Address</label>
                      <div className="al-input-wrap">
                        <span className="al-input-icon">✉️</span>
                        <input
                          type="email"
                          className="al-input"
                          placeholder="admin@chatoraadda.in"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoFocus
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="al-btn-primary" disabled={loading}>
                      {loading ? <span className="al-spinner" /> : ''}
                      {loading ? 'Sending OTP...' : 'Send OTP →'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="al-form">
                    <div className="al-otp-info">
                      OTP sent to <strong>{email}</strong>
                      <button
                        type="button"
                        className="al-link"
                        onClick={() => { setOtpStep('email'); clearMessages(); }}
                      >
                        Change
                      </button>
                    </div>
                    <div className="al-field">
                      <label className="al-label">4-Digit OTP</label>
                      <div className="al-input-wrap">
                        <span className="al-input-icon">🔑</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="al-input al-input-otp"
                          placeholder="• • • •"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          maxLength={4}
                          autoFocus
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="al-btn-primary" disabled={loading || otp.length < 4}>
                      {loading ? <span className="al-spinner" /> : ''}
                      {loading ? 'Verifying...' : 'Verify & Login →'}
                    </button>
                    <button
                      type="button"
                      className="al-btn-ghost"
                      onClick={handleSendOtp}
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Password Mode */}
            {authMode === 'password' && (
              <form onSubmit={handlePasswordLogin} className="al-form">
                <div className="al-field">
                  <label className="al-label">Email Address</label>
                  <div className="al-input-wrap">
                    <span className="al-input-icon">✉️</span>
                    <input
                      type="email"
                      className="al-input"
                      placeholder="admin@chatoraadda.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <div className="al-field">
                  <label className="al-label">Password</label>
                  <div className="al-input-wrap">
                    <span className="al-input-icon">🔒</span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="al-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="al-pass-toggle"
                      onClick={() => setShowPass(!showPass)}
                    >
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button type="submit" className="al-btn-primary" disabled={loading}>
                  {loading ? <span className="al-spinner" /> : ''}
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
              </form>
            )}

            <p className="al-footer-note">
              Protected admin area. Unauthorized access is prohibited.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .al-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #070b14;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
          padding: 16px;
        }
        .al-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .al-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
        }
        .al-bg-orb1 { width: 600px; height: 600px; top: -200px; left: -200px; background: #10b981; }
        .al-bg-orb2 { width: 500px; height: 500px; bottom: -150px; right: -100px; background: #6366f1; }
        .al-bg-orb3 { width: 300px; height: 300px; top: 50%; left: 50%; transform: translate(-50%,-50%); background: #f59e0b; opacity: 0.08; }

        .al-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1000px;
          display: flex;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 40px 120px rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.06);
        }

        /* Left */
        .al-left {
          flex: 1;
          background: linear-gradient(145deg, #0d1f17 0%, #0a3d26 50%, #0d1f17 100%);
          padding: 48px;
          display: flex;
          align-items: center;
          border-right: 1px solid rgba(16,185,129,0.15);
        }
        .al-left-content { width: 100%; }
        .al-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 40px;
        }
        .al-logo-icon { font-size: 28px; }
        .al-logo-text { font-size: 20px; font-weight: 700; color: #10b981; letter-spacing: -0.5px; }
        .al-headline {
          font-size: 36px;
          font-weight: 800;
          color: #f1f5f9;
          line-height: 1.2;
          margin: 0 0 16px;
          letter-spacing: -1px;
        }
        .al-headline-accent { color: #10b981; }
        .al-subtext {
          font-size: 15px;
          color: #94a3b8;
          line-height: 1.7;
          margin: 0 0 40px;
        }
        .al-stats { display: flex; flex-direction: column; gap: 16px; }
        .al-stat {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.15);
          border-radius: 12px;
        }
        .al-stat-icon { font-size: 20px; }
        .al-stat-val { font-size: 13px; font-weight: 600; color: #10b981; }
        .al-stat-lbl { font-size: 12px; color: #64748b; margin-top: 1px; }

        /* Right */
        .al-right {
          flex: 0 0 440px;
          background: #0d1117;
          padding: 48px;
          display: flex;
          align-items: center;
        }
        .al-form-wrap { width: 100%; }
        .al-form-title {
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 4px;
          letter-spacing: -0.5px;
        }
        .al-form-sub { font-size: 14px; color: #64748b; margin: 0 0 28px; }

        .al-tabs {
          display: flex;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
          gap: 4px;
        }
        .al-tab {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: #64748b;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .al-tab.active {
          background: rgba(16,185,129,0.15);
          color: #10b981;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }

        .al-alert {
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .al-alert-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.2); color: #fca5a5; }
        .al-alert-success { background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.2); color: #6ee7b7; }

        .al-form { display: flex; flex-direction: column; gap: 16px; }
        .al-field { display: flex; flex-direction: column; gap: 6px; }
        .al-label { font-size: 13px; font-weight: 500; color: #94a3b8; }
        .al-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .al-input-icon {
          position: absolute;
          left: 14px;
          font-size: 16px;
          pointer-events: none;
        }
        .al-input {
          width: 100%;
          padding: 13px 14px 13px 42px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .al-input:focus {
          border-color: rgba(16,185,129,0.5);
          background: rgba(16,185,129,0.05);
        }
        .al-input::placeholder { color: #475569; }
        .al-input-otp {
          font-size: 20px;
          letter-spacing: 8px;
          text-align: center;
          padding-left: 14px;
          font-weight: 700;
          color: #10b981;
        }
        .al-pass-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
        }

        .al-btn-primary {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.2s, transform 0.1s;
          margin-top: 4px;
        }
        .al-btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .al-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .al-btn-ghost {
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 14px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s;
        }
        .al-btn-ghost:hover { border-color: rgba(16,185,129,0.3); color: #10b981; }

        .al-otp-info {
          font-size: 13px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .al-otp-info strong { color: #94a3b8; }
        .al-link {
          background: none;
          border: none;
          color: #10b981;
          font-size: 13px;
          cursor: pointer;
          text-decoration: underline;
          font-family: 'Inter', sans-serif;
          padding: 0;
        }

        .al-footer-note {
          margin-top: 24px;
          font-size: 12px;
          color: #334155;
          text-align: center;
          line-height: 1.5;
        }

        .al-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .al-left { display: none; }
          .al-right { flex: 1; padding: 32px 24px; }
          .al-card { max-width: 460px; border-radius: 20px; }
        }
        @media (max-width: 480px) {
          .al-right { padding: 28px 20px; }
        }
      `}</style>
    </div>
  );
}
