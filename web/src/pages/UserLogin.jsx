import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendUserOtp, verifyUserOtp, loginUser, registerUser } from '../api/userApi';

export default function UserLogin() {
  const [authMode, setAuthMode] = useState('otp'); // 'otp' | 'password' | 'register'
  const [otpStep, setOtpStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [otp, setOtp] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const clearMessages = () => { setError(''); setSuccess(''); };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!email) { setError('Enter your email address'); return; }
    setLoading(true);
    try {
      await sendUserOtp(email);
      setSuccess('OTP sent to your inbox!');
      setOtpStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    if (otp.length < 4) { setError('Enter the 4-digit OTP'); return; }
    setLoading(true);
    try {
      await verifyUserOtp(email, otp);
      setSuccess('Login successful! 🎉');
      setTimeout(() => navigate('/user/app', { replace: true }), 400);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password) { setError('Enter email and password'); return; }
    setLoading(true);
    try {
      await loginUser(email, password);
      setSuccess('Welcome back! 🎉');
      setTimeout(() => navigate('/user/app', { replace: true }), 400);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!name.trim()) { setError('Enter your name'); return; }
    if (!email || !email.includes('@')) { setError('Enter valid email'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPass) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await registerUser(email, password, name);
      setSuccess('Account created! Welcome 🎉');
      setTimeout(() => navigate('/user/app', { replace: true }), 400);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="ul-root">
      {/* Animated background */}
      <div className="ul-bg">
        <div className="ul-blob ul-blob1" />
        <div className="ul-blob ul-blob2" />
        <div className="ul-blob ul-blob3" />
      </div>

      <div className="ul-card">
        {/* Left: Branding */}
        <div className="ul-left">
          <div className="ul-left-inner">
            <div className="ul-brand">
              <span className="ul-brand-emoji">🍽️</span>
              <div>
                <div className="ul-brand-name">Chatora Adda</div>
                <div className="ul-brand-tagline">Night Online Cafe</div>
              </div>
            </div>
            <h2 className="ul-hero-title">
              Delicious food,<br />
              <span className="ul-hero-accent">delivered fast</span>
            </h2>
            <p className="ul-hero-desc">
              Order from our curated menu and get fresh food at your doorstep. Quick, easy, yummy!
            </p>
            <div className="ul-features">
              {['⚡ Fast Delivery', '🔥 Fresh Food', '💳 Easy Payment', '🎁 Great Offers'].map(f => (
                <span className="ul-feature-chip" key={f}>{f}</span>
              ))}
            </div>
            <div className="ul-food-grid">
              {['🍕','🍜','🥗','🍔','🍣','🧆'].map((e, i) => (
                <div className="ul-food-emoji" key={i} style={{ animationDelay: `${i * 0.15}s` }}>{e}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="ul-right">
          <div className="ul-form-wrap">
            <div className="ul-form-header">
              <h2 className="ul-form-title">
                {authMode === 'register' ? 'Create Account' : 'Sign In'}
              </h2>
              <p className="ul-form-sub">
                {authMode === 'register'
                  ? 'Join Chatora Adda today'
                  : 'to your Chatora Adda account'}
              </p>
            </div>

            {/* Alerts */}
            {error && <div className="ul-alert ul-alert-error">⚠️ {error}</div>}
            {success && <div className="ul-alert ul-alert-success">✅ {success}</div>}

            {/* OTP Form Only */}
            {otpStep === 'email' ? (
              <form onSubmit={handleSendOtp} className="ul-form">
                <div className="ul-field">
                  <label className="ul-label">Email Address</label>
                  <div className="ul-input-wrap">
                    <span className="ul-input-pfx">✉️</span>
                    <input type="email" className="ul-input" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
                  </div>
                </div>
                <button type="submit" className="ul-btn" disabled={loading}>
                  {loading && <span className="ul-spin" />}
                  {loading ? 'Sending OTP...' : 'Send OTP →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="ul-form">
                <div className="ul-otp-sent-info">
                  OTP sent to <strong>{email}</strong>
                  <button type="button" className="ul-text-btn"
                    onClick={() => { setOtpStep('email'); clearMessages(); }}>Change</button>
                </div>
                <div className="ul-field">
                  <label className="ul-label">Enter OTP</label>
                  <input type="text" inputMode="numeric" className="ul-otp-input"
                    placeholder="• • • •" maxLength={4}
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,4))}
                    autoFocus required />
                </div>
                <button type="submit" className="ul-btn" disabled={loading || otp.length < 4}>
                  {loading && <span className="ul-spin" />}
                  {loading ? 'Verifying...' : 'Verify & Login →'}
                </button>
                <button type="button" className="ul-btn-outline" onClick={handleSendOtp} disabled={loading}>
                  Resend OTP
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .ul-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff8f0;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
          padding: 16px;
        }
        .ul-bg { position: fixed; inset: 0; pointer-events: none; }
        .ul-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.35;
          animation: blobMove 8s ease-in-out infinite alternate;
        }
        .ul-blob1 { width: 500px; height: 500px; top: -100px; left: -100px; background: #fdba74; }
        .ul-blob2 { width: 400px; height: 400px; bottom: -100px; right: -80px; background: #86efac; animation-delay: -3s; }
        .ul-blob3 { width: 300px; height: 300px; top: 40%; left: 40%; background: #fde68a; opacity: 0.2; animation-delay: -1.5s; }
        @keyframes blobMove {
          0% { transform: translate(0,0) scale(1); }
          100% { transform: translate(30px, 20px) scale(1.05); }
        }

        .ul-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 980px;
          display: flex;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 32px 100px rgba(0,0,0,0.15);
          border: 1px solid rgba(255,255,255,0.8);
        }

        /* Left */
        .ul-left {
          flex: 1;
          background: linear-gradient(145deg, #f97316 0%, #ea580c 40%, #dc2626 100%);
          padding: 48px;
          display: flex;
          align-items: center;
        }
        .ul-left-inner { width: 100%; }
        .ul-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 36px; }
        .ul-brand-emoji { font-size: 36px; }
        .ul-brand-name { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
        .ul-brand-tagline { font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 2px; }
        .ul-hero-title { font-size: 34px; font-weight: 800; color: #fff; line-height: 1.2; margin: 0 0 16px; letter-spacing: -1px; }
        .ul-hero-accent { color: #fde68a; }
        .ul-hero-desc { font-size: 15px; color: rgba(255,255,255,0.8); line-height: 1.7; margin: 0 0 28px; }
        .ul-features { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px; }
        .ul-feature-chip {
          padding: 6px 12px;
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          backdrop-filter: blur(4px);
        }
        .ul-food-grid { display: flex; gap: 12px; flex-wrap: wrap; }
        .ul-food-emoji {
          font-size: 36px;
          animation: floatEmoji 3s ease-in-out infinite alternate;
        }
        @keyframes floatEmoji {
          0% { transform: translateY(0) rotate(-5deg); }
          100% { transform: translateY(-8px) rotate(5deg); }
        }

        /* Right */
        .ul-right {
          flex: 0 0 420px;
          background: #fff;
          padding: 48px 40px;
          display: flex;
          align-items: center;
        }
        .ul-form-wrap { width: 100%; }
        .ul-form-title { font-size: 26px; font-weight: 700; color: #111827; margin: 0 0 4px; letter-spacing: -0.5px; }
        .ul-form-sub { font-size: 14px; color: #9ca3af; margin: 0 0 24px; }

        .ul-tabs {
          display: flex;
          background: #f3f4f6;
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
          margin-bottom: 20px;
        }
        .ul-tab {
          flex: 1;
          padding: 9px 4px;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: #9ca3af;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .ul-tab.active {
          background: #fff;
          color: #f97316;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .ul-alert {
          padding: 11px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 16px;
          font-weight: 500;
        }
        .ul-alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
        .ul-alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; }

        .ul-form { display: flex; flex-direction: column; gap: 14px; }
        .ul-field { display: flex; flex-direction: column; gap: 5px; }
        .ul-label { font-size: 13px; font-weight: 600; color: #374151; }
        .ul-input-wrap { position: relative; display: flex; align-items: center; }
        .ul-input-pfx { position: absolute; left: 13px; font-size: 15px; pointer-events: none; }
        .ul-input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          color: #111827;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .ul-input:focus { border-color: #f97316; background: #fff; }
        .ul-input::placeholder { color: #9ca3af; }
        .ul-eye {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 15px;
          padding: 4px;
        }
        .ul-otp-input {
          width: 100%;
          padding: 16px;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          color: #f97316;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 10px;
          text-align: center;
          font-family: monospace;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .ul-otp-input:focus { border-color: #f97316; }

        .ul-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #f97316, #ea580c);
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
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(249,115,22,0.4);
          margin-top: 4px;
        }
        .ul-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(249,115,22,0.5); }
        .ul-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .ul-btn-outline {
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          color: #6b7280;
          font-size: 14px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s;
        }
        .ul-btn-outline:hover { border-color: #f97316; color: #f97316; }

        .ul-otp-sent-info {
          font-size: 13px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 8px;
        }
        .ul-otp-sent-info strong { color: #374151; }
        .ul-text-btn {
          background: none;
          border: none;
          color: #f97316;
          font-size: 13px;
          cursor: pointer;
          text-decoration: underline;
          font-family: 'Inter', sans-serif;
          padding: 0;
          font-weight: 600;
        }
        .ul-switch-hint {
          text-align: center;
          font-size: 13px;
          color: #9ca3af;
          margin: 0;
        }

        .ul-spin {
          display: inline-block;
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .ul-left { display: none; }
          .ul-right { flex: 1; padding: 32px 24px; }
          .ul-card { max-width: 440px; border-radius: 20px; }
        }
        @media (max-width: 480px) {
          .ul-right { padding: 28px 20px; }
        }
      `}</style>
    </div>
  );
}
