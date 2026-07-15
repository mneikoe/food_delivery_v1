import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Select,
  Tag,
  message,
  Descriptions,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Segmented,
  DatePicker,
  Divider,
  Drawer,
  Badge,
  Grid,
} from 'antd';
import {
  EyeOutlined,
  DownloadOutlined,
  LineChartOutlined,
  DollarOutlined,
  ShoppingOutlined,
  FilterOutlined,
  BarChartOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';
import { getOrders, getOrderDetails, updateOrderStatus, assignDeliveryPartner, getAvailableDeliveryPartners } from '../api/adminApi';
import { supabase } from '../services/supabase';
import dayjs from 'dayjs';
import OrderReportsCharts from '../components/OrderReportsCharts';
import { exportOrdersToExcel } from '../utils/exportOrdersExcel';

const ORDER_STATUSES = [
  'CREATED',
  'ACCEPTED_BY_ADMIN',
  'ASSIGNED_TO_DELIVERY',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'ARRIVED_AT_LOCATION',
  'OTP_VERIFIED',
  'DELIVERED',
  'CANCELLED',
];

const PRESETS = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Custom', value: 'custom' },
];

const getStatusColor = (status) => {
  const colors = {
    CREATED: 'default',
    ACCEPTED_BY_ADMIN: 'processing',
    ASSIGNED_TO_DELIVERY: 'warning',
    PICKED_UP: 'warning',
    OUT_FOR_DELIVERY: 'processing',
    ARRIVED_AT_LOCATION: 'processing',
    OTP_VERIFIED: 'success',
    DELIVERED: 'success',
    CANCELLED: 'error',
  };
  return colors[status] || 'default';
};

const normalizePhoneNumber = (phone = '') => String(phone).replace(/[^\d]/g, '');

function getFilterSummaryText(datePreset, customRange, statusFilter) {
  const presetLabels = {
    all: 'All time',
    today: 'Today',
    week: 'This week',
    month: 'This month',
    custom: 'Custom range',
  };
  let datePart = presetLabels[datePreset] || datePreset;
  if (datePreset === 'custom' && customRange?.[0] && customRange?.[1]) {
    datePart = `${customRange[0].format('MMM D')} – ${customRange[1].format('MMM D, YYYY')}`;
  }
  const statusPart = statusFilter ? `Status: ${statusFilter}` : 'Any status';
  return `${datePart} · ${statusPart}`;
}

function countActiveFilterDeviations(datePreset, statusFilter) {
  let n = 0;
  if (datePreset !== 'all') n += 1;
  if (statusFilter) n += 1;
  return n;
}

function buildQueryParams(preset, customRange, statusFilter) {
  const params = {};
  if (statusFilter) {
    params.status = statusFilter;
  }
  if (preset === 'all') {
    return params;
  }
  if (preset === 'today') {
    params.startDate = dayjs().startOf('day').toISOString();
    params.endDate = dayjs().endOf('day').toISOString();
    return params;
  }
  if (preset === 'week') {
    params.startDate = dayjs().startOf('week').toISOString();
    params.endDate = dayjs().endOf('week').toISOString();
    return params;
  }
  if (preset === 'month') {
    params.startDate = dayjs().startOf('month').toISOString();
    params.endDate = dayjs().endOf('month').toISOString();
    return params;
  }
  if (preset === 'custom' && customRange?.[0] && customRange?.[1]) {
    params.startDate = customRange[0].startOf('day').toISOString();
    params.endDate = customRange[1].endOf('day').toISOString();
    return params;
  }
  return params;
}

export default function Orders() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  const [datePreset, setDatePreset] = useState('all');
  const [customRange, setCustomRange] = useState(() => [dayjs().subtract(7, 'day'), dayjs()]);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [chartsVisible, setChartsVisible] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildQueryParams(datePreset, customRange, statusFilter);
      const response = await getOrders(params);
      setOrders(response.data);
    } catch (error) {
      message.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [datePreset, customRange, statusFilter]);

  const fetchOrdersRef = useRef(fetchOrders);
  fetchOrdersRef.current = fetchOrders;

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const loadPartners = async () => {
      try {
        const response = await getAvailableDeliveryPartners();
        setDeliveryPartners(response.data);
      } catch (error) {
        console.error('Failed to load delivery partners');
      }
    };
    loadPartners();

    const channel = supabase.channel('admin_orders');

    channel.on('broadcast', { event: 'order_update' }, () => {
      fetchOrdersRef.current();
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to admin_orders channel');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Error subscribing to admin_orders channel');
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const nonCancelledOrders = orders.filter((o) => o.status !== 'CANCELLED');
  const revenueExCancelled = nonCancelledOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;
  const avgOrderValue =
    nonCancelledOrders.length > 0 ? Math.round((revenueExCancelled / nonCancelledOrders.length) * 100) / 100 : 0;

  const handleViewDetails = async (orderId) => {
    try {
      const response = await getOrderDetails(orderId);
      setSelectedOrder(response.data);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('Failed to load order details');
    }
  };

  const handleUpdateStatus = (order) => {
    setSelectedOrder(order);
    form.setFieldsValue({ status: order.status });
    setStatusModalVisible(true);
  };

  const handleAssignDelivery = (order) => {
    setSelectedOrder(order);
    assignForm.resetFields();
    setAssignModalVisible(true);
  };

  const onStatusUpdate = async (values) => {
    try {
      await updateOrderStatus(selectedOrder._id, values.status);
      message.success('Order status updated successfully');
      setStatusModalVisible(false);
      fetchOrders();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update order status');
    }
  };

  const onAssignDelivery = async (values) => {
    try {
      await assignDeliveryPartner(selectedOrder._id, values.deliveryPartnerId);
      message.success('Delivery partner assigned successfully');
      setAssignModalVisible(false);
      fetchOrders();
      const response = await getAvailableDeliveryPartners();
      setDeliveryPartners(response.data);
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to assign delivery partner');
    }
  };

  const filterSummary = getFilterSummaryText(datePreset, customRange, statusFilter);
  const filterBadgeCount = countActiveFilterDeviations(datePreset, statusFilter);

  const resetFilters = () => {
    setDatePreset('all');
    setStatusFilter(undefined);
    setCustomRange([dayjs().subtract(7, 'day'), dayjs()]);
    message.info('Filters reset');
  };

  const handleExportExcel = () => {
    if (!orders.length) {
      message.warning('No orders to export for the current filters');
      return;
    }
    try {
      const tag = `${datePreset}_${dayjs().format('HHmmss')}`;
      exportOrdersToExcel(orders, tag);
      message.success('Excel file downloaded');
    } catch (e) {
      message.error('Export failed');
      console.error(e);
    }
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 120,
      fixed: isMobile ? false : 'left',
    },
    {
      title: 'Customer',
      key: 'customer',
      ellipsis: true,
      responsive: ['sm'],
      render: (_, record) => record.userId?.name || 'N/A',
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 110,
      render: (amount) => `₹${amount}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Delivery Partner',
      key: 'deliveryPartner',
      ellipsis: true,
      responsive: ['lg'],
      render: (_, record) =>
        record.deliveryPartnerId?.name
          ? `${record.deliveryPartnerId.name}${record.deliveryPartnerId?.phone ? ` (${record.deliveryPartnerId.phone})` : ''}`
          : '—',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      responsive: ['md'],
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: isMobile ? 160 : 220,
      fixed: isMobile ? false : 'right',
      render: (_, record) => (
        <Space size="small" wrap className="orders-actions-cell">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record._id)}
          >
            View
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleUpdateStatus(record)}
            disabled={record.status === 'DELIVERED' || record.status === 'CANCELLED'}
          >
            Status
          </Button>
          {!record.deliveryPartnerId && record.status === 'ACCEPTED_BY_ADMIN' && (
            <Button type="link" size="small" onClick={() => handleAssignDelivery(record)}>
              Assign
            </Button>
          )}
          {record.userId?.phone && (
            <Button
              type="link"
              size="small"
              icon={<WhatsAppOutlined />}
              onClick={() => {
                const phone = normalizePhoneNumber(record.userId?.phone);
                if (!phone) return;
                const text = encodeURIComponent(
                  `Hi ${record.userId?.name || 'Customer'}, your order ${record.orderId} is currently ${record.status}.`
                );
                window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
              }}
            >
              WhatsApp
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page orders-page">
      <div className="orders-page-header">
        <div>
          <Typography.Text type="secondary" className="admin-section-label" style={{ display: 'block', marginBottom: 4 }}>
            Orders
          </Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 520, fontSize: 13 }}>
            Review, filter, and export. Open filters or charts only when you need them.
          </Typography.Paragraph>
        </div>
      </div>

      <Card className="orders-toolbar-card" size="small" bordered={false}>
        <div className="orders-toolbar">
          <div className="orders-toolbar-summary">
            <Typography.Text type="secondary" className="orders-summary-label">
              Active view
            </Typography.Text>
            <div className="orders-summary-value" title={filterSummary}>
              {filterSummary}
            </div>
          </div>
          <Space size={10} wrap className="orders-toolbar-actions">
            {filterBadgeCount > 0 ? (
              <Badge count={filterBadgeCount} size="small" offset={[-2, 2]}>
                <span>
                  <Button icon={<FilterOutlined />} onClick={() => setFiltersDrawerOpen(true)} type="default">
                    Filters
                  </Button>
                </span>
              </Badge>
            ) : (
              <Button icon={<FilterOutlined />} onClick={() => setFiltersDrawerOpen(true)} type="default">
                Filters
              </Button>
            )}
            <Button
              type={chartsVisible ? 'primary' : 'default'}
              icon={<BarChartOutlined />}
              onClick={() => setChartsVisible((v) => !v)}
            >
              {chartsVisible ? 'Hide charts' : 'Show charts'}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>
              Export Excel
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[16, 16]} className="orders-kpi-row">
        <Col xs={24} sm={8}>
          <Card size="small" bordered className="admin-kpi-card orders-kpi-tile">
            <Statistic
              title="Orders (filtered)"
              value={orders.length}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: 'var(--ant-color-primary)', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" bordered className="admin-kpi-card orders-kpi-tile">
            <Statistic
              title="Revenue (excl. cancelled)"
              value={Math.round(revenueExCancelled * 100) / 100}
              prefix="₹"
              suffix={<DollarOutlined style={{ opacity: 0.75 }} />}
              valueStyle={{ fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" bordered className="admin-kpi-card orders-kpi-tile">
            <Statistic title="Avg order (excl. cancelled)" value={avgOrderValue} prefix="₹" valueStyle={{ fontWeight: 600 }} />
            <Typography.Text type="secondary" className="orders-kpi-sub">
              {cancelledCount} cancelled in range
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      {chartsVisible && (
        <Card
          className="orders-charts-card"
          size="small"
          title={
            <Space>
              <LineChartOutlined />
              <span>Analytics</span>
            </Space>
          }
          extra={
            <Button type="text" size="small" onClick={() => setChartsVisible(false)}>
              Collapse
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <OrderReportsCharts orders={orders} loading={loading} embedded />
        </Card>
      )}

      <Drawer
        title={
          <Space>
            <FilterOutlined />
            <span>Filter orders</span>
          </Space>
        }
        placement="right"
        width={Math.min(420, typeof window !== 'undefined' ? window.innerWidth - 24 : 420)}
        onClose={() => setFiltersDrawerOpen(false)}
        open={filtersDrawerOpen}
        destroyOnClose={false}
        className="orders-filters-drawer"
        footer={
          <div className="orders-drawer-footer">
            <Button onClick={resetFilters}>Reset to defaults</Button>
            <Button type="primary" onClick={() => setFiltersDrawerOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Text strong className="orders-drawer-section-title">
              Date range
            </Typography.Text>
            <div style={{ marginTop: 10 }}>
              <Segmented
                block
                options={PRESETS}
                value={datePreset}
                onChange={(v) => setDatePreset(v)}
              />
            </div>
          </div>
          {datePreset === 'custom' && (
            <div>
              <Typography.Text strong className="orders-drawer-section-title">
                Calendar
              </Typography.Text>
              <div style={{ marginTop: 10 }}>
                <DatePicker.RangePicker
                  value={customRange}
                  onChange={(v) => setCustomRange(v || [dayjs().subtract(7, 'day'), dayjs()])}
                  format="YYYY-MM-DD"
                  allowClear={false}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
          <div>
            <Typography.Text strong className="orders-drawer-section-title">
              Order status
            </Typography.Text>
            <div style={{ marginTop: 10 }}>
              <Select
                allowClear
                placeholder="All statuses"
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={ORDER_STATUSES.map((s) => ({ label: s, value: s }))}
              />
            </div>
          </div>
          <Divider style={{ margin: 0 }} />
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.6 }}>
              Changes apply immediately. Use Export from the main toolbar to download the current result as Excel.
            </Typography.Text>
          </div>
        </Space>
      </Drawer>

      <div className="admin-table-wrap orders-table-section">
        <Table
          columns={columns}
          dataSource={orders}
          loading={loading}
          rowKey="_id"
          scroll={{ x: isMobile ? 680 : 960 }}
          size={isMobile ? 'small' : 'middle'}
          tableLayout="fixed"
          sticky
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showQuickJumper: !isMobile,
            size: isMobile ? 'small' : 'default',
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
            hideOnSinglePage: false,
          }}
        />
      </div>

      <Modal
        title="Order Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Order ID">{selectedOrder.orderId}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Customer">{selectedOrder.userId?.name}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedOrder.userId?.phone || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Subtotal">₹{selectedOrder.subtotal}</Descriptions.Item>
              <Descriptions.Item label="Delivery Fee">₹{selectedOrder.deliveryFee}</Descriptions.Item>
              <Descriptions.Item label="Discount">₹{selectedOrder.discount || 0}</Descriptions.Item>
              <Descriptions.Item label="Total Amount">₹{selectedOrder.totalAmount}</Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                {selectedOrder.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online (Razorpay)'}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <Tag color={selectedOrder.paymentStatus === 'PAID' ? 'success' : selectedOrder.paymentStatus === 'FAILED' ? 'error' : 'warning'}>
                  {selectedOrder.paymentStatus || 'PENDING'}
                </Tag>
              </Descriptions.Item>
              {selectedOrder.paymentMethod === 'RAZORPAY' && (
                <>
                  <Descriptions.Item label="Razorpay Order ID">{selectedOrder.razorpayOrderId || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Transaction ID">{selectedOrder.razorpayPaymentId || 'N/A'}</Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Delivery Partner" span={2}>
                {selectedOrder.deliveryPartnerId?.name || 'Not assigned'}
              </Descriptions.Item>
              <Descriptions.Item label="Created At" span={2}>
                {dayjs(selectedOrder.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <Typography.Title level={5} style={{ marginBottom: 12 }}>
                Items
              </Typography.Title>
              <div className="admin-table-wrap">
                <Table
                  dataSource={selectedOrder.items}
                  columns={[
                    { title: 'Name', dataIndex: 'name', key: 'name' },
                    { title: 'Price', dataIndex: 'price', key: 'price', render: (p) => `₹${p}` },
                    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
                    {
                      title: 'Total',
                      key: 'total',
                      render: (_, record) => `₹${record.price * record.quantity}`,
                    },
                  ]}
                  pagination={false}
                  rowKey={(record, index) => index}
                  size="small"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Update Order Status"
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onStatusUpdate}>
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select>
              {ORDER_STATUSES.map((status) => (
                <Select.Option key={status} value={status}>
                  {status}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Update
              </Button>
              <Button onClick={() => setStatusModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Assign Delivery Partner"
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={null}
      >
        <Form form={assignForm} layout="vertical" onFinish={onAssignDelivery}>
          <Form.Item
            name="deliveryPartnerId"
            label="Delivery Partner"
            rules={[{ required: true, message: 'Please select delivery partner' }]}
          >
            <Select placeholder="Select delivery partner">
              {deliveryPartners.map((partner) => (
                <Select.Option key={partner._id} value={partner._id}>
                  {partner.name} - {partner.phone}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Assign
              </Button>
              <Button onClick={() => setAssignModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
