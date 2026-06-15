import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { getCategories, getProducts, getCoupons, getOrders } from '../api/adminApi';

const StatCard = ({ icon, label, value, sub, gradient, delay = 0 }) => (
  <div className="dash-stat-card" style={{ '--gradient': gradient, animationDelay: `${delay}ms` }}>
    <div className="dash-stat-icon">{icon}</div>
    <div className="dash-stat-body">
      <div className="dash-stat-value">{value}</div>
      <div className="dash-stat-label">{label}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
    <div className="dash-stat-glow" />
  </div>
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    categories: 0, products: 0, coupons: 0,
    totalOrders: 0, pendingOrders: 0, deliveredOrders: 0,
    cancelledOrders: 0, totalRevenue: 0, todayOrders: 0,
  });

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const [catRes, prodRes, cupRes, ordRes] = await Promise.all([
        getCategories(), getProducts(), getCoupons(), getOrders(),
      ]);
      const orders = ordRes.data || [];
      const today = new Date().toDateString();
      const pending = orders.filter(o => ['CREATED', 'ACCEPTED_BY_ADMIN'].includes(o.status)).length;
      const delivered = orders.filter(o => o.status === 'DELIVERED').length;
      const cancelled = orders.filter(o => o.status === 'CANCELLED').length;
      const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today).length;
      const totalRevenue = orders
        .filter(o => o.status === 'DELIVERED')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      setStats({
        categories: catRes.data.length,
        products: prodRes.data.length,
        coupons: cupRes.data.length,
        totalOrders: orders.length,
        pendingOrders: pending,
        deliveredOrders: delivered,
        cancelledOrders: cancelled,
        totalRevenue,
        todayOrders,
      });
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const revenueFormatted = stats.totalRevenue >= 1000
    ? `₹${(stats.totalRevenue / 1000).toFixed(1)}k`
    : `₹${stats.totalRevenue}`;

  return (
    <div className="dash-root">
      {/* Header */}
      <div className="dash-header">
        <div>
          <div className="dash-greeting">Good {getTimeGreeting()}, Admin 👋</div>
          <div className="dash-subtitle">Here's what's happening with your restaurant today</div>
        </div>
        <div className="dash-date">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>

      {/* Revenue highlight */}
      <div className="dash-revenue-card">
        <div className="dash-rev-left">
          <div className="dash-rev-label">Total Revenue (Delivered Orders)</div>
          <div className="dash-rev-value">{revenueFormatted}</div>
          <div className="dash-rev-sub">
            <span className="dash-rev-badge">📦 {stats.totalOrders} total orders</span>
            <span className="dash-rev-badge">📅 {stats.todayOrders} today</span>
          </div>
        </div>
        <div className="dash-rev-icon">💰</div>
      </div>

      {/* Order Status Row */}
      <div className="dash-section-title">Order Status</div>
      <div className="dash-stats-grid">
        <StatCard icon="⏳" label="Pending" value={stats.pendingOrders}
          gradient="linear-gradient(135deg,#f59e0b,#d97706)" sub="Needs attention" delay={0} />
        <StatCard icon="✅" label="Delivered" value={stats.deliveredOrders}
          gradient="linear-gradient(135deg,#10b981,#059669)" sub="Completed" delay={80} />
        <StatCard icon="❌" label="Cancelled" value={stats.cancelledOrders}
          gradient="linear-gradient(135deg,#ef4444,#dc2626)" sub="Refund eligible" delay={160} />
        <StatCard icon="📋" label="Total Orders" value={stats.totalOrders}
          gradient="linear-gradient(135deg,#6366f1,#4f46e5)" sub="All time" delay={240} />
      </div>

      {/* Catalog Row */}
      <div className="dash-section-title" style={{ marginTop: 32 }}>Catalog Overview</div>
      <div className="dash-stats-grid dash-catalog-grid">
        <StatCard icon="🗂️" label="Categories" value={stats.categories}
          gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)" delay={0} />
        <StatCard icon="🍽️" label="Menu Items" value={stats.products}
          gradient="linear-gradient(135deg,#f97316,#ea580c)" delay={80} />
        <StatCard icon="🎟️" label="Coupons" value={stats.coupons}
          gradient="linear-gradient(135deg,#06b6d4,#0891b2)" delay={160} />
      </div>

      {/* Quick Tips */}
      <div className="dash-tips">
        <div className="dash-tips-title">💡 Quick Actions</div>
        <div className="dash-tips-row">
          {[
            { icon: '📦', text: 'Check pending orders', hint: 'Orders → Filter Pending' },
            { icon: '🛵', text: 'Assign delivery partners', hint: 'Orders → Assign' },
            { icon: '🎁', text: 'Create new offer', hint: 'Offers → Add New' },
          ].map(t => (
            <div className="dash-tip" key={t.text}>
              <span className="dash-tip-icon">{t.icon}</span>
              <div>
                <div className="dash-tip-text">{t.text}</div>
                <div className="dash-tip-hint">{t.hint}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .dash-root { max-width: 1200px; margin: 0 auto; font-family: 'Inter', sans-serif; }

        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .dash-greeting { font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
        .dash-subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
        .dash-date { font-size: 13px; color: #94a3b8; font-weight: 500; padding: 6px 12px;
          background: #f1f5f9; border-radius: 8px; border: 1px solid #e2e8f0; align-self: flex-start; }

        /* Revenue Card */
        .dash-revenue-card {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%);
          border-radius: 20px;
          padding: 28px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          position: relative;
          overflow: hidden;
        }
        .dash-revenue-card::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(16,185,129,0.2), transparent);
          border-radius: 50%;
        }
        .dash-rev-label { font-size: 13px; color: #94a3b8; font-weight: 500; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
        .dash-rev-value { font-size: 44px; font-weight: 800; color: #10b981; letter-spacing: -2px; margin-bottom: 12px; }
        .dash-rev-sub { display: flex; gap: 10px; flex-wrap: wrap; }
        .dash-rev-badge {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 100px;
          padding: 4px 12px;
        }
        .dash-rev-icon { font-size: 64px; opacity: 0.4; }

        /* Section Title */
        .dash-section-title {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 14px;
        }

        /* Stats Grid */
        .dash-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 8px;
        }
        .dash-catalog-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }

        /* Stat Card */
        .dash-stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          position: relative;
          overflow: hidden;
          animation: slideIn 0.4s ease both;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .dash-stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-stat-icon {
          font-size: 28px;
          width: 52px; height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient);
          flex-shrink: 0;
        }
        .dash-stat-value { font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -1px; line-height: 1; }
        .dash-stat-label { font-size: 13px; color: #64748b; font-weight: 500; margin-top: 3px; }
        .dash-stat-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
        .dash-stat-glow {
          position: absolute;
          top: -30px; right: -30px;
          width: 100px; height: 100px;
          background: var(--gradient);
          border-radius: 50%;
          opacity: 0.06;
          filter: blur(20px);
        }

        /* Tips */
        .dash-tips {
          margin-top: 28px;
          background: #f8fafc;
          border-radius: 16px;
          padding: 20px 24px;
          border: 1px solid #e2e8f0;
        }
        .dash-tips-title { font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 14px; }
        .dash-tips-row { display: flex; gap: 16px; flex-wrap: wrap; }
        .dash-tip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          flex: 1;
          min-width: 200px;
        }
        .dash-tip-icon { font-size: 22px; }
        .dash-tip-text { font-size: 13px; font-weight: 600; color: #374151; }
        .dash-tip-hint { font-size: 11px; color: #94a3b8; margin-top: 2px; }

        @media (max-width: 600px) {
          .dash-stats-grid { grid-template-columns: 1fr 1fr; }
          .dash-revenue-card { flex-direction: column; text-align: center; }
          .dash-rev-icon { font-size: 40px; }
          .dash-rev-value { font-size: 36px; }
        }
      `}</style>
    </div>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
