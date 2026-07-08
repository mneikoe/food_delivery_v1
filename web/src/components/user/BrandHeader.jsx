import { Button, Typography, Space, Tag, Badge } from 'antd';
import { UserOutlined, LogoutOutlined, MenuOutlined, ShoppingCartOutlined, HomeOutlined } from '@ant-design/icons';
import logoImage from '../../assets/logo-chatora.png';

export default function BrandHeader({
  profile,
  openProfileModal,
  openVerificationModal,
  setMobileMenuOpen,
  navigate,
  cartCount,
  setCartDrawerOpen,
  handleLogout
}) {
  return (
    <header className="user-app-header">
      <button type="button" className="user-brand-btn" onClick={() => navigate('/')}>
        <img src={logoImage} alt="Chatora Adda Logo" className="user-brand-logo" />
        <div className="user-brand-copy">
          <Typography.Text strong className="brand-title" style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
            Chatora Adda
          </Typography.Text>
          <Typography.Text type="secondary" className="brand-tag" style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Night Online Cafe
          </Typography.Text>
        </div>
      </button>

      <Space wrap className="user-header-actions" size="middle">
        <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>Home</Button>
        <Button type="primary" onClick={() => navigate('/user/app')}>
          User App
        </Button>
        <Button icon={<UserOutlined />} onClick={openProfileModal}>
          {profile?.name || 'Profile'}
        </Button>
        
        {profile?.isEmailVerified ? (
          <Tag color="success" style={{ borderRadius: 6, padding: '3px 10px', border: 'none', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontWeight: 700 }}>
            ✓ Verified
          </Tag>
        ) : (
          <Tag color="error" onClick={openVerificationModal} style={{ borderRadius: 6, padding: '3px 10px', border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}>
            ⚠️ Verify Email
          </Tag>
        )}

        <Badge count={cartCount} offset={[-4, 4]}>
          <Button icon={<ShoppingCartOutlined />} onClick={() => setCartDrawerOpen(true)}>
            Cart
          </Button>
        </Badge>
        <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>
          Logout
        </Button>
      </Space>

      <Button
        className="user-menu-toggle"
        icon={<MenuOutlined />}
        onClick={() => setMobileMenuOpen(true)}
      />
    </header>
  );
}
