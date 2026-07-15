import { Layout } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo-chatora.png';

const { Sider } = Layout;

const NAV_ITEMS = [
  { key: '/admin', icon: '📊', label: 'Dashboard' },
  { key: '/admin/categories', icon: '🗂️', label: 'Categories' },
  { key: '/admin/products', icon: '🍽️', label: 'Products' },
  { key: '/admin/offers', icon: '🏷️', label: 'Offers' },
  { key: '/admin/coupons', icon: '🎟️', label: 'Coupons' },
  { key: '/admin/orders', icon: '📦', label: 'Orders' },
  { key: '/admin/payments', icon: '💳', label: 'Payments' },
  { key: '/admin/delivery-partners', icon: '🛵', label: 'Delivery Partners' },
  { key: '/admin/push-manager', icon: '🔔', label: 'Push Campaigns' },
  { key: '/admin/app-settings', icon: '⚙️', label: 'App Settings' },
];

export default function Sidebar({ collapsed, onCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (key) => { navigate(key); };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    navigate('/admin/login');
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={250}
      collapsedWidth={72}
      breakpoint="lg"
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        background: '#080F1E',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        zIndex: 100,
      }}
    >
      {/* Brand */}
      <div style={{
        padding: collapsed ? '16px 0' : '16px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: '#080F1E',
      }}>
        <div style={{
          width: collapsed ? 40 : 40, height: 40,
          borderRadius: 12,
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          <img src={logoImg} alt="Chatora Adda" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1, letterSpacing: '-0.3px' }}>
              Chatora Adda
            </div>
            <div style={{ fontSize: 10, color: '#FACC15', marginTop: 2, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin Panel</div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <div style={{ padding: '8px 10px', flex: 1, overflowY: 'auto' }}>
        {!collapsed && (
          <div style={{ fontSize: 10, color: '#2D4060', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', padding: '10px 8px 4px', marginBottom: 4 }}>
            Navigation
          </div>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.key ||
            (item.key !== '/admin' && location.pathname.startsWith(item.key));
          return (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              title={collapsed ? item.label : ''}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px 0' : '10px 12px',
                marginBottom: 2,
                background: isActive
                  ? 'linear-gradient(90deg, rgba(250,204,21,0.15), rgba(250,204,21,0.02))'
                  : 'transparent',
                border: isActive ? '1px solid rgba(250,204,21,0.25)' : '1px solid transparent',
                borderRadius: 10,
                color: isActive ? '#FACC15' : '#8EA2BF',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                justifyContent: collapsed ? 'center' : 'flex-start',
                transition: 'all 0.15s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = '#F8FAFC';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#8EA2BF';
                }
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: 0, top: '20%', bottom: '20%',
                  width: 3,
                  background: '#FACC15',
                  borderRadius: '0 3px 3px 0',
                }} />
              )}
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 4px' }} />

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : ''}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '10px 0' : '10px 12px',
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: 10,
            color: '#ef4444',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: 500,
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
            e.currentTarget.style.border = '1px solid rgba(239,68,68,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.border = '1px solid transparent';
          }}
        >
          <span style={{ fontSize: 16 }}>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Bottom version tag */}
      {!collapsed && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, color: '#2D4060', textAlign: 'center' }}>
            Chatora Adda v1.0
          </div>
        </div>
      )}
    </Sider>
  );
}
