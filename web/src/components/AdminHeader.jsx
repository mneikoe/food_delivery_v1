import { useLocation, useNavigate } from 'react-router-dom';

const PAGE_META = {
  '/admin':                  { title: 'Dashboard',         icon: '📊', desc: 'Overview of your restaurant' },
  '/admin/categories':       { title: 'Categories',        icon: '🗂️', desc: 'Manage menu categories' },
  '/admin/products':         { title: 'Menu Items',        icon: '🍽️', desc: 'Manage food items and pricing' },
  '/admin/offers':           { title: 'Offers',            icon: '🏷️', desc: 'Manage promotional banners' },
  '/admin/coupons':          { title: 'Coupons',           icon: '🎟️', desc: 'Manage discount codes' },
  '/admin/orders':           { title: 'Orders',            icon: '📦', desc: 'Review and track all orders' },
  '/admin/delivery-partners':{ title: 'Delivery Partners', icon: '🛵', desc: 'Manage your delivery fleet' },
  '/admin/app-settings':     { title: 'App Settings',      icon: '⚙️', desc: 'Configure app, APK and gamification' },
  '/admin/push-manager':     { title: 'Push Manager',      icon: '🔔', desc: 'Send push notifications' },
  '/admin/payments':         { title: 'Payment Dashboard', icon: '💳', desc: 'Payment analytics and reconciliation' },
};

export default function AdminHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = PAGE_META[location.pathname] || { title: 'Admin', icon: '🍽️', desc: 'Chatora Adda' };

  const adminData = (() => {
    try { return JSON.parse(localStorage.getItem('admin_data') || '{}'); } catch { return {}; }
  })();

  const initials = (adminData.name || 'A').charAt(0).toUpperCase();

  return (
    <div style={{
      height: 64,
      background: '#080F1E',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
      fontFamily: 'Inter, sans-serif',
      position: 'sticky',
      top: 0,
      zIndex: 90,
      boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
    }}>
      {/* Page info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: '#112036', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>{meta.icon}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', lineHeight: 1.2 }}>
            {meta.title}
          </div>
          <div style={{ fontSize: 11, color: '#4B6180', marginTop: 2 }}>{meta.desc}</div>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Live indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 100, padding: '4px 10px',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 0 2px rgba(34,197,94,0.3)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Live</span>
        </div>

        {/* Admin avatar */}
        <div
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #FACC15, #EAB308)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#111827', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(250,204,21,0.3)',
          }}
          title={adminData.name || adminData.email || 'Admin'}
        >
          {initials}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
