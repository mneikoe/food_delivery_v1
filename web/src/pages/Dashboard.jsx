import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getCategories, getProducts, getCoupons, getOrders } from '../api/adminApi';
import dayjs from 'dayjs';

/* ─── Mini stat badge ─────────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#112036',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: '20px 22px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, transform 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; }}}
    >
      {/* bg glow */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80,
        borderRadius: '50%',
        background: color,
        opacity: 0.08,
        filter: 'blur(24px)',
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4B6180', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            {label}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#F1F5F9', lineHeight: 1, letterSpacing: '-1px', marginBottom: 6 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 12, color: '#4B6180', fontWeight: 500 }}>{sub}</div>}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: color + '18',
          border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>{icon}</div>
      </div>
    </div>
  );
}

/* ─── Status pill ─────────────────────────────────────────────────────────── */
function StatusPill({ label, count, color, bg }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: bg, border: `1px solid ${color}30`,
      borderRadius: 10, padding: '10px 16px', flex: '1 1 140px',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#F1F5F9', lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: 11, color: '#4B6180', fontWeight: 600, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Recent order row ────────────────────────────────────────────────────── */
const STATUS_COLOR = {
  CREATED: { dot: '#FACC15', bg: 'rgba(250,204,21,0.08)', text: '#FACC15' },
  ACCEPTED_BY_ADMIN: { dot: '#3b82f6', bg: 'rgba(59,130,246,0.08)', text: '#60a5fa' },
  ASSIGNED_TO_DELIVERY: { dot: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', text: '#a78bfa' },
  PICKED_UP: { dot: '#f97316', bg: 'rgba(249,115,22,0.08)', text: '#fb923c' },
  OUT_FOR_DELIVERY: { dot: '#06b6d4', bg: 'rgba(6,182,212,0.08)', text: '#22d3ee' },
  ARRIVED_AT_LOCATION: { dot: '#10b981', bg: 'rgba(16,185,129,0.08)', text: '#34d399' },
  OTP_VERIFIED: { dot: '#10b981', bg: 'rgba(16,185,129,0.08)', text: '#34d399' },
  DELIVERED: { dot: '#22c55e', bg: 'rgba(34,197,94,0.08)', text: '#4ade80' },
  CANCELLED: { dot: '#ef4444', bg: 'rgba(239,68,68,0.08)', text: '#f87171' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_COLOR[status] || { dot: '#94A3B8', bg: 'rgba(148,163,184,0.08)', text: '#94A3B8' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, border: `1px solid ${cfg.dot}25`,
      borderRadius: 100, padding: '3px 10px',
      fontSize: 10, fontWeight: 700, color: cfg.text,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot }} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

/* ─── Section header ──────────────────────────────────────────────────────── */
function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: '#2D4060',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 12, marginTop: 28,
    }}>{children}</div>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    categories: 0, products: 0, coupons: 0,
    totalOrders: 0, pendingOrders: 0, deliveredOrders: 0,
    cancelledOrders: 0, totalRevenue: 0, todayOrders: 0,
    todayRevenue: 0, activeOrders: 0,
  });

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const [catRes, prodRes, cupRes, ordRes] = await Promise.all([
        getCategories(), getProducts(), getCoupons(), getOrders(),
      ]);
      const allOrders = ordRes.data || [];
      const today = new Date().toDateString();
      const pending  = allOrders.filter(o => ['CREATED', 'ACCEPTED_BY_ADMIN'].includes(o.status)).length;
      const active   = allOrders.filter(o => !['DELIVERED', 'CANCELLED', 'CREATED'].includes(o.status)).length;
      const delivered = allOrders.filter(o => o.status === 'DELIVERED').length;
      const cancelled = allOrders.filter(o => o.status === 'CANCELLED').length;
      const todayOrders = allOrders.filter(o => new Date(o.createdAt).toDateString() === today);
      const totalRevenue = allOrders.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + (o.totalAmount || 0), 0);
      const todayRevenue = todayOrders.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + (o.totalAmount || 0), 0);
      setOrders(allOrders);
      setStats({
        categories: catRes.data.length, products: prodRes.data.length, coupons: cupRes.data.length,
        totalOrders: allOrders.length, pendingOrders: pending, deliveredOrders: delivered,
        cancelledOrders: cancelled, totalRevenue, todayOrders: todayOrders.length, todayRevenue, activeOrders: active,
      });
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid rgba(250,204,21,0.3)', borderTopColor: '#FACC15',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <div style={{ fontSize: 13, color: '#4B6180' }}>Loading dashboard…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const revenue = stats.totalRevenue >= 100000
    ? `₹${(stats.totalRevenue / 100000).toFixed(1)}L`
    : stats.totalRevenue >= 1000
    ? `₹${(stats.totalRevenue / 1000).toFixed(1)}k`
    : `₹${stats.totalRevenue}`;

  const todayRev = stats.todayRevenue >= 1000
    ? `₹${(stats.todayRevenue / 1000).toFixed(1)}k`
    : `₹${stats.todayRevenue}`;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            Good {getTimeGreeting()}, Admin 👋
          </div>
          <div style={{ fontSize: 13, color: '#4B6180', marginTop: 4 }}>
            Here's what's happening at Chatora Adda
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            fontSize: 12, color: '#94A3B8', fontWeight: 500,
            background: '#112036', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '6px 12px',
          }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <button
            onClick={fetchStats}
            style={{
              background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.2)',
              borderRadius: 8, padding: '6px 14px', color: '#FACC15',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,204,21,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,204,21,0.1)'; }}
          >↻ Refresh</button>
        </div>
      </div>

      {/* ── Hero Revenue Card ─────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #112036 0%, #0D1B2E 60%, #0a1828 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 20,
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* decorative circles */}
        <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(250,204,21,0.12),transparent)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, right:120, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle,rgba(34,197,94,0.08),transparent)', pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#4B6180', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
              Total Revenue · Delivered Orders
            </div>
            <div style={{ fontSize:48, fontWeight:900, color:'#FACC15', letterSpacing:'-2px', lineHeight:1, marginBottom:12 }}>
              {revenue}
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[
                { icon:'📦', text:`${stats.totalOrders} total orders` },
                { icon:'📅', text:`${stats.todayOrders} today` },
                { icon:'💵', text:`${todayRev} today's rev` },
              ].map(b => (
                <span key={b.text} style={{
                  fontSize:12, fontWeight:600, color:'#94A3B8',
                  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
                  borderRadius:100, padding:'4px 12px', display:'inline-flex', alignItems:'center', gap:5,
                }}>
                  {b.icon} {b.text}
                </span>
              ))}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#4B6180', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Active Riders</div>
            <div style={{ fontSize:32, fontWeight:800, color:'#F1F5F9', lineHeight:1 }}>{stats.activeOrders}</div>
            <div style={{ fontSize:11, color:'#4B6180', marginTop:4 }}>orders in transit</div>
          </div>
        </div>
      </div>

      {/* ── KPI Row ───────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:8 }}>
        <KpiCard icon="⏳" label="Pending Orders" value={stats.pendingOrders} sub="Needs attention" color="#FACC15" onClick={() => navigate('/admin/orders')} />
        <KpiCard icon="✅" label="Delivered" value={stats.deliveredOrders} sub="All time" color="#22c55e" onClick={() => navigate('/admin/orders')} />
        <KpiCard icon="❌" label="Cancelled" value={stats.cancelledOrders} sub="All time" color="#ef4444" onClick={() => navigate('/admin/orders')} />
        <KpiCard icon="📋" label="Total Orders" value={stats.totalOrders} sub="All time" color="#6366f1" onClick={() => navigate('/admin/orders')} />
      </div>

      {/* ── Catalog + Status row ──────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:14 }}>
        {/* Catalog */}
        <div style={{
          background:'#112036', border:'1px solid rgba(255,255,255,0.06)',
          borderRadius:16, padding:'18px 20px',
        }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#2D4060', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Catalog Overview</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { label:'Categories', value:stats.categories, icon:'🗂️', nav:'/admin/categories' },
              { label:'Menu Items', value:stats.products, icon:'🍽️', nav:'/admin/products' },
              { label:'Coupons', value:stats.coupons, icon:'🎟️', nav:'/admin/coupons' },
            ].map(item => (
              <div
                key={item.label}
                onClick={() => navigate(item.nav)}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 14px', borderRadius:10,
                  background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)',
                  cursor:'pointer', transition:'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
              >
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18 }}>{item.icon}</span>
                  <span style={{ fontSize:13, color:'#94A3B8', fontWeight:500 }}>{item.label}</span>
                </div>
                <span style={{ fontSize:18, fontWeight:800, color:'#F1F5F9' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Status */}
        <div style={{
          background:'#112036', border:'1px solid rgba(255,255,255,0.06)',
          borderRadius:16, padding:'18px 20px',
        }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#2D4060', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Live Order Status</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
            <StatusPill label="Pending" count={stats.pendingOrders} color="#FACC15" bg="rgba(250,204,21,0.06)" />
            <StatusPill label="In Transit" count={stats.activeOrders} color="#3b82f6" bg="rgba(59,130,246,0.06)" />
            <StatusPill label="Delivered" count={stats.deliveredOrders} color="#22c55e" bg="rgba(34,197,94,0.06)" />
            <StatusPill label="Cancelled" count={stats.cancelledOrders} color="#ef4444" bg="rgba(239,68,68,0.06)" />
          </div>
          {/* Quick actions */}
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#2D4060', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Quick Actions</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[
                { label:'View Orders', nav:'/admin/orders', icon:'📦' },
                { label:'Payments', nav:'/admin/payments', icon:'💳' },
                { label:'Settings', nav:'/admin/app-settings', icon:'⚙️' },
              ].map(a => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.nav)}
                  style={{
                    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                    borderRadius:8, padding:'7px 14px', color:'#94A3B8',
                    fontSize:12, fontWeight:600, cursor:'pointer',
                    fontFamily:'Inter, sans-serif', transition:'all 0.15s',
                    display:'flex', alignItems:'center', gap:5,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(250,204,21,0.08)'; e.currentTarget.style.color='#FACC15'; e.currentTarget.style.borderColor='rgba(250,204,21,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.color='#94A3B8'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}
                >
                  <span>{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Orders ─────────────────────────────────────────────────── */}
      <SectionTitle>Recent Orders</SectionTitle>
      <div style={{
        background:'#112036', border:'1px solid rgba(255,255,255,0.06)',
        borderRadius:16, overflow:'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display:'grid', gridTemplateColumns:'140px 1fr 1fr 100px 180px',
          padding:'10px 20px',
          background:'rgba(255,255,255,0.025)',
          borderBottom:'1px solid rgba(255,255,255,0.05)',
        }}>
          {['Order ID','Customer','Payment','Amount','Status'].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight:700, color:'#2D4060', textTransform:'uppercase', letterSpacing:'0.07em' }}>{h}</div>
          ))}
        </div>
        {recentOrders.length === 0 ? (
          <div style={{ padding:'40px 20px', textAlign:'center', color:'#2D4060', fontSize:13 }}>No orders yet</div>
        ) : recentOrders.map((order, i) => (
          <div
            key={order._id}
            style={{
              display:'grid', gridTemplateColumns:'140px 1fr 1fr 100px 180px',
              padding:'13px 20px', alignItems:'center',
              borderBottom: i < recentOrders.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              transition:'background 0.12s',
              cursor:'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.025)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
            onClick={() => navigate('/admin/orders')}
          >
            <div style={{ fontSize:12, fontWeight:700, color:'#F1F5F9', fontFamily:'monospace' }}>{order.orderId}</div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'#F1F5F9' }}>{order.userId?.name || '—'}</div>
              <div style={{ fontSize:11, color:'#4B6180' }}>{order.userId?.phone || ''}</div>
            </div>
            <div style={{ fontSize:11, color:'#94A3B8' }}>
              {order.paymentMethod === 'COD' ? '💵 Cash' : '💳 Online'}
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:'#22c55e' }}>₹{order.totalAmount}</div>
            <div><StatusBadge status={order.status} /></div>
          </div>
        ))}
        {/* Footer */}
        <div style={{
          padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.05)',
          display:'flex', justifyContent:'flex-end',
        }}>
          <button
            onClick={() => navigate('/admin/orders')}
            style={{
              background:'transparent', border:'none', color:'#FACC15',
              fontSize:12, fontWeight:700, cursor:'pointer',
              fontFamily:'Inter, sans-serif',
              display:'flex', alignItems:'center', gap:4,
            }}
          >View all orders →</button>
        </div>
      </div>
    </div>
  );
}
