import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  GiftOutlined,
  TagOutlined,
  FileTextOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

export default function Sidebar({ collapsed, onCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/admin/categories',
      icon: <AppstoreOutlined />,
      label: 'Categories',
    },
    {
      key: '/admin/products',
      icon: <ShoppingOutlined />,
      label: 'Products',
    },
    {
      key: '/admin/coupons',
      icon: <GiftOutlined />,
      label: 'Coupons',
    },
    {
      key: '/admin/offers',
      icon: <TagOutlined />,
      label: 'Offers',
    },
    {
      key: '/admin/orders',
      icon: <FileTextOutlined />,
      label: 'Orders',
    },
    {
      key: '/admin/delivery-partners',
      icon: <UserOutlined />,
      label: 'Delivery Partners',
    },
    {
      key: '/admin/app-settings',
      icon: <SettingOutlined />,
      label: 'App Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      localStorage.removeItem('admin_token');
      navigate('/admin/login');
    } else {
      navigate(key);
    }
  };

  return (
    <Sider
      className="admin-sidebar"
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={250}
      breakpoint="lg"
      collapsedWidth={80}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div className="admin-sidebar-brand">
        {collapsed ? 'AD' : 'Admin Dashboard'}
      </div>
      <Menu
        theme="dark"
        selectedKeys={[location.pathname]}
        mode="inline"
        items={menuItems}
        onClick={handleMenuClick}
        className="admin-sidebar-menu"
      />
    </Sider>
  );
}
