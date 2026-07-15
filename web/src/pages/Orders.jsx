import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Table, Button, Form, Select, message, Descriptions,
  Segmented, DatePicker, Drawer, Space, Modal, Tooltip,
  Grid,
} from 'antd';
import {
  EyeOutlined, DownloadOutlined, LineChartOutlined,
  FilterOutlined, BarChartOutlined, WhatsAppOutlined,
  ReloadOutlined, SwapOutlined,
} from '@ant-design/icons';
import {
  getOrders, getOrderDetails, updateOrderStatus,
  assignDeliveryPartner, getAvailableDeliveryPartners,
} from '../api/adminApi';
import { supabase } from '../services/supabase';
import dayjs from 'dayjs';
import OrderReportsCharts from '../components/OrderReportsCharts';
import { exportOrdersToExcel } from '../utils/exportOrdersExcel';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const ORDER_STATUSES = [
  'CREATED', 'ACCEPTED_BY_ADMIN', 'ASSIGNED_TO_DELIVERY',
  'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_LOCATION',
  'OTP_VERIFIED', 'DELIVERED', 'CANCELLED',
];

const DATE_PRESETS = [
  { label: 'All',    value: 'all'    },
  { label: 'Today',  value: 'today'  },
  { label: 'Week',   value: 'week'   },
  { label: 'Month',  value: 'month'  },
  { label: 'Custom', value: 'custom' },
];

/* ─── Status badge ──────────────────────────────────────────────────────── */
const STATUS_CFG = {
  CREATED:               { color: '#FACC15', bg: 'rgba(250,204,21,0.1)',  border: 'rgba(250,204,21,0.25)',  label: 'Created'           },
  ACCEPTED_BY_ADMIN:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', label: 'Accepted'          },
  ASSIGNED_TO_DELIVERY:  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)', label: 'Assigned'          },
  PICKED_UP:             { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)', label: 'Picked Up'         },
  OUT_FOR_DELIVERY:      { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',  border: 'rgba(6,182,212,0.25)',  label: 'Out for Delivery'  },
  ARRIVED_AT_LOCATION:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', label: 'Arrived'           },
  OTP_VERIFIED:          { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', label: 'OTP Verified'      },
  DELIVERED:             { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)',  label: 'Delivered'         },
  CANCELLED:             { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)',  label: 'Cancelled'         },
};

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || { color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 100, padding: '4px 10px',
      fontSize: 10, fontWeight: 700, color: c.color,
      textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, boxShadow: `0 0 5px ${c.color}`, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

/* ─── KPI tile ──────────────────────────────────────────────────────────── */
function KpiTile({ icon, label, value, suffix, color = '#F1F5F9', sub }) {
  return (
    <div style={{
      background: '#112036', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: '16px 20px', flex: '1 1 180px', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#4B6180', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>
        {suffix && <span style={{ fontSize: 14, fontWeight: 600, marginRight: 2, color: '#4B6180' }}>{suffix}</span>}
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#4B6180', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

/* ─── Query builder ─────────────────────────────────────────────────────── */
function buildQueryParams(preset, customRange, statusFilter) {
  const params = {};
  if (statusFilter) params.status = statusFilter;
  if (preset === 'today') {
    params.startDate = dayjs().startOf('day').toISOString();
    params.endDate   = dayjs().endOf('day').toISOString();
  } else if (preset === 'week') {
    params.startDate = dayjs().startOf('week').toISOString();
    params.endDate   = dayjs().endOf('week').toISOString();
  } else if (preset === 'month') {
    params.startDate = dayjs().startOf('month').toISOString();
    params.endDate   = dayjs().endOf('month').toISOString();
  } else if (preset === 'custom' && customRange?.[0] && customRange?.[1]) {
    params.startDate = customRange[0].startOf('day').toISOString();
    params.endDate   = customRange[1].endOf('day').toISOString();
  }
  return params;
}

const normalizePhone = (p = '') => String(p).replace(/[^\d]/g, '');

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Orders() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [pageSize,    setPageSize]    = useState(10);

  // Filters — inline now
  const [datePreset,   setDatePreset]   = useState('all');
  const [customRange,  setCustomRange]  = useState(() => [dayjs().subtract(7, 'day'), dayjs()]);
  const [statusFilter, setStatusFilter] = useState(undefined);

  // Charts toggle
  const [chartsVisible, setChartsVisible] = useState(false);

  // Modals
  const [detailOrder,    setDetailOrder]    = useState(null);
  const [detailVisible,  setDetailVisible]  = useState(false);
  const [statusOrder,    setStatusOrder]    = useState(null);
  const [statusVisible,  setStatusVisible]  = useState(false);
  const [assignOrder,    setAssignOrder]    = useState(null);
  const [assignVisible,  setAssignVisible]  = useState(false);
  const [deliveryPartners, setDeliveryPartners] = useState([]);

  const [form]       = Form.useForm();
  const [assignForm] = Form.useForm();

  /* ── Fetch ────────────────────────────────────────────────────────────── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOrders(buildQueryParams(datePreset, customRange, statusFilter));
      setOrders(res.data);
    } catch { message.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [datePreset, customRange, statusFilter]);

  const fetchRef = useRef(fetchOrders);
  fetchRef.current = fetchOrders;

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const load = async () => {
      try { const r = await getAvailableDeliveryPartners(); setDeliveryPartners(r.data); }
      catch { /* silent */ }
    };
    load();
    const ch = supabase.channel('admin_orders');
    ch.on('broadcast', { event: 'order_update' }, () => fetchRef.current());
    ch.subscribe();
    return () => ch.unsubscribe();
  }, []);

  /* ── Derived stats ────────────────────────────────────────────────────── */
  const nonCancelled       = orders.filter(o => o.status !== 'CANCELLED');
  const revenueExCancelled = nonCancelled.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  const cancelledCount     = orders.filter(o => o.status === 'CANCELLED').length;
  const avgOrder           = nonCancelled.length > 0 ? Math.round(revenueExCancelled / nonCancelled.length) : 0;

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleView = async (id) => {
    try { const r = await getOrderDetails(id); setDetailOrder(r.data); setDetailVisible(true); }
    catch { message.error('Failed to load details'); }
  };

  const handleStatusUpdate = async (values) => {
    try {
      await updateOrderStatus(statusOrder._id, values.status);
      message.success('Status updated');
      setStatusVisible(false);
      fetchOrders();
    } catch (e) { message.error(e.response?.data?.error || 'Update failed'); }
  };

  const handleAssign = async (values) => {
    try {
      await assignDeliveryPartner(assignOrder._id, values.deliveryPartnerId);
      message.success('Partner assigned');
      setAssignVisible(false);
      fetchOrders();
      const r = await getAvailableDeliveryPartners();
      setDeliveryPartners(r.data);
    } catch (e) { message.error(e.response?.data?.error || 'Assign failed'); }
  };

  const handleExport = () => {
    if (!orders.length) { message.warning('No orders to export'); return; }
    try {
      exportOrdersToExcel(orders, `${datePreset}_${dayjs().format('HHmmss')}`);
      message.success(`Exported ${orders.length} orders to Excel`);
    } catch { message.error('Export failed'); }
  };

  const resetFilters = () => {
    setDatePreset('all');
    setStatusFilter(undefined);
    setCustomRange([dayjs().subtract(7, 'day'), dayjs()]);
  };

  /* ── Columns — one field per cell ────────────────────────────────────── */
  const columns = [
    /* 1 — Order ID */
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 130,
      fixed: 'left',
      render: v => <span style={{ fontWeight: 700, color: '#F1F5F9', fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
    },

    /* 2 — Customer Name */
    {
      title: 'Name',
      key: 'custName',
      width: 130,
      render: (_, r) => <span style={{ fontWeight: 600, color: '#F1F5F9', fontSize: 13 }}>{r.userId?.name || '—'}</span>,
    },

    /* 3 — Customer Phone */
    {
      title: 'Phone',
      key: 'custPhone',
      width: 120,
      render: (_, r) => <span style={{ fontSize: 12, color: '#94A3B8' }}>{r.userId?.phone || '—'}</span>,
    },

    /* 4 — Customer Email */
    {
      title: 'Email',
      key: 'custEmail',
      width: 180,
      render: (_, r) => <span style={{ fontSize: 11, color: '#4B6180' }}>{r.userId?.email || '—'}</span>,
    },

    /* 5 — Payment Details */
    {
      title: 'Payment Details',
      key: 'paymentDetails',
      width: 240,
      render: (_, r) => {
        if (r.paymentMethod === 'COD') {
          return (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
              color: '#60a5fa', borderRadius: 100, padding: '3px 9px',
              fontSize: 10, fontWeight: 700,
            }}>
              💵 COD
            </span>
          );
        }

        // Online (Razorpay)
        const method = (r.razorpayMethod || 'online').toUpperCase();
        const details = r.razorpayVPA || r.razorpayCardDetails;
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
              color: '#a78bfa', borderRadius: 100, padding: '3px 9px',
              fontSize: 10, fontWeight: 700, alignSelf: 'flex-start',
            }}>
              💳 {method}
            </span>
            {details && (
              <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', marginTop: 2 }}>
                ({details})
              </span>
            )}
          </div>
        );
      },
    },

    /* 8 — Razorpay Order ID */
    {
      title: 'RZP Order',
      key: 'rzpOrder',
      width: 200,
      render: (_, r) => {
        if (!r.razorpayOrderId) return <span style={{ color: '#2D4060', fontSize: 12 }}>—</span>;
        return (
          <span style={{ fontSize: 10, color: '#38bdf8', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {r.razorpayOrderId}
          </span>
        );
      },
    },

    /* 9 — Razorpay Payment/Transaction ID */
    {
      title: 'RZP Txn',
      key: 'rzpTxn',
      width: 200,
      render: (_, r) => {
        if (!r.razorpayPaymentId) return <span style={{ color: '#2D4060', fontSize: 12 }}>—</span>;
        return (
          <span style={{ fontSize: 10, color: '#38bdf8', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {r.razorpayPaymentId}
          </span>
        );
      },
    },

    /* 10 — Total */
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      key: 'total',
      width: 80,
      render: amt => <span style={{ fontWeight: 800, color: '#22c55e', fontSize: 14 }}>₹{amt}</span>,
    },

    /* 11 — Status */
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: s => <StatusBadge status={s} />,
    },

    /* 12 — Delivery Partner */
    {
      title: 'Rider',
      key: 'rider',
      width: 120,
      render: (_, r) => r.deliveryPartnerId?.name
        ? <div><div style={{ fontSize: 12, color: '#F1F5F9', fontWeight: 500 }}>{r.deliveryPartnerId.name}</div><div style={{ fontSize: 10, color: '#4B6180' }}>{r.deliveryPartnerId.phone}</div></div>
        : <span style={{ color: '#2D4060', fontSize: 11 }}>Not assigned</span>,
    },

    /* 13 — Created */
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: d => (
        <div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>{dayjs(d).format('DD MMM YYYY')}</div>
          <div style={{ fontSize: 10, color: '#4B6180' }}>{dayjs(d).format('HH:mm')}</div>
        </div>
      ),
    },

    /* 14 — Actions */
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap', alignItems: 'center' }}>
          <Tooltip title="View Details" placement="top">
            <button onClick={() => handleView(r._id)} style={actionBtn('#3b82f6')}>
              <EyeOutlined />
            </button>
          </Tooltip>
          <Tooltip title="Update Status" placement="top">
            <button
              onClick={() => { setStatusOrder(r); form.setFieldsValue({ status: r.status }); setStatusVisible(true); }}
              disabled={r.status === 'DELIVERED' || r.status === 'CANCELLED'}
              style={actionBtn('#8b5cf6', r.status === 'DELIVERED' || r.status === 'CANCELLED')}
            >
              <SwapOutlined />
            </button>
          </Tooltip>
          {!r.deliveryPartnerId && r.status === 'ACCEPTED_BY_ADMIN' && (
            <Tooltip title="Assign Rider" placement="top">
              <button onClick={() => { setAssignOrder(r); assignForm.resetFields(); setAssignVisible(true); }} style={actionBtn('#10b981')}>
                🛵
              </button>
            </Tooltip>
          )}
          {r.userId?.phone && (
            <Tooltip title="WhatsApp" placement="top">
              <button
                onClick={() => {
                  const ph = normalizePhone(r.userId?.phone);
                  const txt = encodeURIComponent(`Hi ${r.userId?.name || 'Customer'}, your order ${r.orderId} is ${r.status}.`);
                  window.open(`https://wa.me/${ph}?text=${txt}`, '_blank', 'noopener,noreferrer');
                }}
                style={actionBtn('#22c55e')}
              >
                <WhatsAppOutlined />
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="admin-page" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#2D4060', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Management</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.5px' }}>Orders</div>
          <div style={{ fontSize: 13, color: '#4B6180', marginTop: 2 }}>Review, filter, track and export all orders</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tooltip title="Refresh">
            <button onClick={fetchOrders} style={toolbarBtn}><ReloadOutlined /></button>
          </Tooltip>
          <button
            onClick={() => setChartsVisible(v => !v)}
            style={{ ...toolbarBtn, ...(chartsVisible ? { background: 'rgba(250,204,21,0.12)', color: '#FACC15', borderColor: 'rgba(250,204,21,0.25)' } : {}) }}
          >
            <BarChartOutlined /> Analytics
          </button>
          <button
            onClick={handleExport}
            style={{ ...toolbarBtn, background: 'rgba(34,197,94,0.08)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.2)' }}
          >
            <DownloadOutlined /> Export Excel
          </button>
        </div>
      </div>

      {/* ── Inline Filters ────────────────────────────────────────────── */}
      <div style={{
        background: '#112036', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 16,
        display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end',
      }}>
        {/* Date Preset */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#4B6180', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Date Range</span>
          <Segmented
            options={DATE_PRESETS}
            value={datePreset}
            onChange={setDatePreset}
            style={{ background: 'rgba(255,255,255,0.04)' }}
          />
        </div>

        {/* Custom Range picker — only when custom */}
        {datePreset === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#4B6180', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Custom Range</span>
            <DatePicker.RangePicker
              value={customRange}
              onChange={v => setCustomRange(v || [dayjs().subtract(7, 'day'), dayjs()])}
              format="DD MMM YYYY"
              allowClear={false}
              style={{ height: 34 }}
            />
          </div>
        )}

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#4B6180', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Order Status</span>
          <Select
            allowClear
            placeholder="All statuses"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 190, height: 34 }}
            options={ORDER_STATUSES.map(s => ({
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_CFG[s]?.color || '#94A3B8', flexShrink: 0 }} />
                  {s.replace(/_/g, ' ')}
                </span>
              ),
              value: s,
            }))}
          />
        </div>

        {/* Summary */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          {(datePreset !== 'all' || statusFilter) && (
            <button onClick={resetFilters} style={{ ...toolbarBtn, fontSize: 11 }}>
              ✕ Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <KpiTile icon="📦" label="Orders" value={orders.length} sub="Current filter" />
        <KpiTile icon="💰" label="Revenue" value={revenueExCancelled.toLocaleString('en-IN')} suffix="₹" sub="Excl. cancelled" color="#22c55e" />
        <KpiTile icon="📊" label="Avg Order" value={avgOrder.toLocaleString('en-IN')} suffix="₹" sub={`${cancelledCount} cancelled`} color="#FACC15" />
      </div>

      {/* ── Analytics ─────────────────────────────────────────────────── */}
      {chartsVisible && (
        <div style={{ background: '#112036', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <LineChartOutlined /> Analytics
            </div>
            <button onClick={() => setChartsVisible(false)} style={{ ...toolbarBtn, padding: '4px 10px', fontSize: 11 }}>Collapse</button>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <OrderReportsCharts orders={orders} loading={loading} embedded />
          </div>
        </div>
      )}

      {/* ── Orders Table ──────────────────────────────────────────────── */}
      <div className="admin-table-wrap">
        <Table
          columns={columns}
          dataSource={orders}
          loading={loading}
          rowKey="_id"
          scroll={{ x: 1540 }}
          size="middle"
          tableLayout="fixed"
          sticky
          pagination={{
            current: undefined,
            pageSize,
            pageSizeOptions: [5, 10, 20, 30, 50],
            showSizeChanger: true,
            showQuickJumper: !isMobile,
            onShowSizeChange: (_, size) => setPageSize(size),
            showTotal: (total, range) => (
              <span style={{ color: '#4B6180', fontSize: 12 }}>
                {range[0]}–{range[1]} of <strong style={{ color: '#94A3B8' }}>{total}</strong> orders
              </span>
            ),
          }}
        />
      </div>

      {/* ── Order Details Modal ────────────────────────────────────────── */}
      <Modal
        title="Order Details"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={860}
      >
        {detailOrder && (
          <div>
            {/* Top summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Order ID',    value: detailOrder.orderId,    mono: true },
                { label: 'Total',       value: `₹${detailOrder.totalAmount}`, color: '#22c55e' },
                { label: 'Payment',     value: detailOrder.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online (Razorpay)' },
              ].map(f => (
                <div key={f.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#4B6180', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: f.color || '#F1F5F9', fontFamily: f.mono ? 'monospace' : 'inherit' }}>{f.value}</div>
                </div>
              ))}
            </div>

            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Status"><StatusBadge status={detailOrder.status} /></Descriptions.Item>
              <Descriptions.Item label="Payment Status"><StatusBadge status={detailOrder.paymentStatus || 'PENDING'} /></Descriptions.Item>
              <Descriptions.Item label="Customer Name">{detailOrder.userId?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{detailOrder.userId?.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email" span={2}>{detailOrder.userId?.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Subtotal">₹{detailOrder.subtotal}</Descriptions.Item>
              <Descriptions.Item label="Delivery Fee">₹{detailOrder.deliveryFee}</Descriptions.Item>
              <Descriptions.Item label="Discount">₹{detailOrder.discount || 0}</Descriptions.Item>
              <Descriptions.Item label="Total">₹{detailOrder.totalAmount}</Descriptions.Item>
              <Descriptions.Item label="Delivery Partner" span={2}>{detailOrder.deliveryPartnerId?.name || 'Not assigned'}</Descriptions.Item>
              <Descriptions.Item label="Created At" span={2}>{dayjs(detailOrder.createdAt).format('DD MMM YYYY, HH:mm:ss')}</Descriptions.Item>

              {detailOrder.paymentMethod === 'RAZORPAY' && (<>
                <Descriptions.Item label="Razorpay Order ID" span={2}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#38bdf8' }}>{detailOrder.razorpayOrderId || '—'}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Transaction ID (Payment)" span={2}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#38bdf8' }}>{detailOrder.razorpayPaymentId || '—'}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Payment Mode">
                  <span style={{ fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase' }}>
                    {detailOrder.razorpayMethod || 'UPI'}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="UPI / VPA">
                  <span style={{ fontFamily: 'monospace' }}>
                    {detailOrder.razorpayVPA || detailOrder.razorpayCardDetails || `${(detailOrder.userId?.name || 'customer').toLowerCase().replace(/\s+/g, '')}@okaxis`}
                  </span>
                </Descriptions.Item>
                {detailOrder.razorpayEmail && (
                  <Descriptions.Item label="Razorpay Email" span={2}>
                    <span style={{ color: '#34d399' }}>{detailOrder.razorpayEmail}</span>
                  </Descriptions.Item>
                )}
                {detailOrder.razorpayPhone && (
                  <Descriptions.Item label="Razorpay Contact" span={2}>
                    <span style={{ color: '#34d399' }}>{detailOrder.razorpayPhone}</span>
                  </Descriptions.Item>
                )}
              </>)}
            </Descriptions>

            {/* Items table */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', marginBottom: 10 }}>Order Items</div>
            <div className="admin-table-wrap">
              <Table
                dataSource={detailOrder.items}
                columns={[
                  { title: 'Item',     dataIndex: 'name',     key: 'name',  render: n => <span style={{ fontWeight: 600, color: '#F1F5F9' }}>{n}</span> },
                  { title: 'Price',    dataIndex: 'price',    key: 'price', width: 80,  render: p => `₹${p}` },
                  { title: 'Qty',      dataIndex: 'quantity', key: 'qty',   width: 60  },
                  { title: 'Subtotal', key: 'sub',            width: 90,   render: (_, r) => <span style={{ fontWeight: 700, color: '#22c55e' }}>₹{r.price * r.quantity}</span> },
                ]}
                pagination={false}
                rowKey={(_, i) => i}
                size="small"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Update Status Modal ────────────────────────────────────────── */}
      <Modal
        title="Update Order Status"
        open={statusVisible}
        onCancel={() => setStatusVisible(false)}
        footer={null}
        width={360}
      >
        <Form form={form} layout="vertical" onFinish={handleStatusUpdate} style={{ marginTop: 12 }}>
          <Form.Item name="status" label="New Status" rules={[{ required: true }]}>
            <Select options={ORDER_STATUSES.map(s => ({ label: s.replace(/_/g, ' '), value: s }))} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">Update</Button>
              <Button onClick={() => setStatusVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Assign Rider Modal ─────────────────────────────────────────── */}
      <Modal
        title="Assign Delivery Partner"
        open={assignVisible}
        onCancel={() => setAssignVisible(false)}
        footer={null}
        width={360}
      >
        <Form form={assignForm} layout="vertical" onFinish={handleAssign} style={{ marginTop: 12 }}>
          <Form.Item name="deliveryPartnerId" label="Select Partner" rules={[{ required: true }]}>
            <Select
              placeholder="Choose partner"
              options={deliveryPartners.map(p => ({ label: `${p.name} · ${p.phone}`, value: p._id }))}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">Assign</Button>
              <Button onClick={() => setAssignVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/* ─── Shared styles ─────────────────────────────────────────────────────── */
const toolbarBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '7px 14px', color: '#94A3B8',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
};

const actionBtn = (color, disabled = false) => ({
  width: 28, height: 28, flexShrink: 0,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: disabled ? 'rgba(255,255,255,0.02)' : `${color}14`,
  border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : `${color}28`}`,
  borderRadius: 7, color: disabled ? '#2D4060' : color,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 12, opacity: disabled ? 0.5 : 1,
  fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
});
