import { useEffect, useState } from 'react';
import { Card, Statistic, Spin, message, Typography } from 'antd';
import {
  AppstoreOutlined,
  ShoppingOutlined,
  GiftOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { getCategories, getProducts, getCoupons, getOrders } from '../api/adminApi';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    categories: 0,
    products: 0,
    coupons: 0,
    orders: 0,
    pendingOrders: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [categoriesRes, productsRes, couponsRes, ordersRes] = await Promise.all([
        getCategories(),
        getProducts(),
        getCoupons(),
        getOrders(),
      ]);

      const pendingOrders = ordersRes.data.filter(
        (order) => order.status === 'CREATED' || order.status === 'ACCEPTED_BY_ADMIN'
      ).length;

      setStats({
        categories: categoriesRes.data.length,
        products: productsRes.data.length,
        coupons: couponsRes.data.length,
        orders: ordersRes.data.length,
        pendingOrders,
      });
    } catch (error) {
      message.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page" style={{ textAlign: 'center', padding: '3rem' }}>
        <Spin size="large" />
      </div>
    );
  }

  const metricCards = [
    {
      key: 'cat',
      title: 'Total Categories',
      value: stats.categories,
      prefix: <AppstoreOutlined />,
      valueStyle: { color: 'var(--ant-color-success, #3f8600)' },
    },
    {
      key: 'prod',
      title: 'Total Products',
      value: stats.products,
      prefix: <ShoppingOutlined />,
      valueStyle: { color: 'var(--ant-color-info, #1890ff)' },
    },
    {
      key: 'coup',
      title: 'Total Coupons',
      value: stats.coupons,
      prefix: <GiftOutlined />,
      valueStyle: { color: 'var(--ant-color-purple-6, #722ed1)' },
    },
    {
      key: 'ord',
      title: 'Total Orders',
      value: stats.orders,
      prefix: <FileTextOutlined />,
      valueStyle: { color: 'var(--ant-color-warning, #fa8c16)' },
    },
    {
      key: 'pend',
      title: 'Pending Orders',
      value: stats.pendingOrders,
      prefix: <ClockCircleOutlined />,
      valueStyle: { color: 'var(--ant-color-error, #cf1322)' },
    },
  ];

  return (
    <div className="admin-page">
      <Typography.Text type="secondary" className="admin-section-label" style={{ display: 'block', marginBottom: 12 }}>
        Overview
      </Typography.Text>
      <p style={{ margin: '0 0 1.5rem', color: 'var(--ant-color-text-secondary)' }}>
        Key counts across your catalog and orders.
      </p>
      <div className="admin-metrics-row">
        {metricCards.map((m) => (
          <div key={m.key} className="admin-metric-item">
            <Card className="admin-metric-card">
              <Statistic
                title={m.title}
                value={m.value}
                prefix={m.prefix}
                valueStyle={m.valueStyle}
              />
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
