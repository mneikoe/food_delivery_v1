import { useLocation } from 'react-router-dom';
import { Typography } from 'antd';

const TITLE_MAP = {
  '/admin': 'Dashboard',
  '/admin/categories': 'Categories',
  '/admin/products': 'Products',
  '/admin/coupons': 'Coupons',
  '/admin/offers': 'Offers',
  '/admin/orders': 'Orders',
  '/admin/delivery-partners': 'Delivery Partners',
  '/admin/app-settings': 'App Settings',
};

/**
 * Sticky top bar — page title only (presentation). Routing unchanged.
 */
export default function AdminHeader() {
  const { pathname } = useLocation();
  const title = TITLE_MAP[pathname] || 'Admin';

  return (
    <header className="admin-topbar" role="banner">
      <div className="admin-topbar-inner">
        <div className="admin-topbar-titles">
          <Typography.Text type="secondary" className="admin-section-label">
            Admin console
          </Typography.Text>
          <h1 className="admin-topbar-title">{title}</h1>
        </div>
      </div>
    </header>
  );
}
