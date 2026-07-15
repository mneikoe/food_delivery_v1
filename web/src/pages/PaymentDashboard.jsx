import React, { useEffect, useState, useCallback } from 'react';
import {
  Table,
  Button,
  Card,
  Row,
  Col,
  Statistic,
  Input,
  Select,
  Tag,
  Modal,
  Timeline,
  Space,
  message,
  Grid,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { getPaymentDashboard, getPaymentLogs, getPaymentTimeline } from '../api/adminApi';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;

export default function PaymentDashboard() {
  const screens = useBreakpoint();
  const [metrics, setMetrics] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [eventFilter, setEventFilter] = useState(undefined);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Timeline Modal
  const [timelineVisible, setTimelineVisible] = useState(false);
  const [timelineData, setTimelineData] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await getPaymentDashboard();
      setMetrics(res.data.metrics);
      setRecentPayments(res.data.recentPayments || []);
    } catch (err) {
      message.error('Failed to load dashboard metrics');
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await getPaymentLogs({
        page,
        limit,
        search,
        status: statusFilter,
        eventName: eventFilter,
      });
      setLogs(res.data.logs || []);
      setTotalLogs(res.data.total || 0);
    } catch (err) {
      message.error('Failed to load webhook logs');
    } finally {
      setLoadingLogs(false);
    }
  }, [page, limit, search, statusFilter, eventFilter]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Connect to Socket.io to listen for live updates
  useEffect(() => {
    const socketUrl = import.meta.env.DEV ? '/' : window.location.origin;
    // Dynamic import to prevent bundler errors
    import('socket.io-client').then(({ io }) => {
      const socket = io(socketUrl);
      
      socket.on('payment_update', (data) => {
        message.info(`⚡ Live Payment Update: Order #${data.orderId} transition to ${data.newStatus}`);
        fetchDashboard();
        fetchLogs();
      });

      return () => {
        socket.disconnect();
      };
    }).catch(() => {
      console.warn('Socket.io library not available or failed to connect.');
    });
  }, [fetchDashboard, fetchLogs]);

  const viewTimeline = async (record) => {
    setLoadingTimeline(true);
    setTimelineVisible(true);
    try {
      // Find the corresponding database Payment object ID to show timeline
      // Webhook payload contains order_id which matches razorpayOrderId
      const paymentQuery = record.razorpayOrderId;
      const res = await getPaymentTimeline(record.razorpayOrderId);
      setTimelineData(res.data);
    } catch (err) {
      message.error('Timeline record could not be located or does not exist yet');
      setTimelineVisible(false);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const exportLogs = () => {
    try {
      const headers = ['Date', 'Event Name', 'Status', 'Gateway Order ID', 'Gateway Payment ID', 'Latency (ms)'];
      const rows = logs.map(l => [
        dayjs(l.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        l.eventName,
        l.status,
        l.razorpayOrderId || 'N/A',
        l.razorpayPaymentId || 'N/A',
        l.latency || 0,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `payment_logs_${dayjs().format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Exported successfully');
    } catch (err) {
      message.error('Export failed');
    }
  };

  const getStatusTag = (status) => {
    const maps = {
      SUCCESS: <Tag color="success"><CheckCircleOutlined /> SUCCESS</Tag>,
      FAILED: <Tag color="error"><CloseCircleOutlined /> FAILED</Tag>,
      DUPLICATE: <Tag color="warning"><SyncOutlined spin /> DUPLICATE</Tag>,
      INVALID_SIGNATURE: <Tag color="magenta">BAD SIGNATURE</Tag>,
    };
    return maps[status] || <Tag>{status}</Tag>;
  };

  const recentColumns = [
    {
      title: 'Date & Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => dayjs(val).format('DD MMM, hh:mm A'),
    },
    {
      title: 'Customer',
      dataIndex: 'userId',
      key: 'userId',
      render: (user) => (
        <div>
          <div><strong>{user?.name || 'User'}</strong></div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{user?.phone || 'N/A'}</div>
        </div>
      ),
    },
    {
      title: 'Gateway Order ID',
      dataIndex: 'razorpayOrderId',
      key: 'razorpayOrderId',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => `₹${val}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'CAPTURED' || status === 'SUCCESS') color = 'success';
        if (status === 'FAILED') color = 'error';
        if (status === 'AUTHORIZED') color = 'processing';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  const logColumns = [
    {
      title: 'Date/Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'Webhook Event',
      dataIndex: 'eventName',
      key: 'eventName',
      render: (val) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Gateway Order ID',
      dataIndex: 'razorpayOrderId',
      key: 'razorpayOrderId',
    },
    {
      title: 'Latency',
      dataIndex: 'latency',
      key: 'latency',
      render: (val) => `${val || 0} ms`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="primary" 
          ghost 
          size="small" 
          icon={<InfoCircleOutlined />} 
          onClick={() => viewTimeline(record)}
        >
          Timeline
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: screens.xs ? '10px' : '24px', background: '#0b0f19', minHeight: '100vh', color: '#f8fafc' }}>
      
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f8fafc' }}>💳 Live Payment Audit Dashboard</h1>
          <p style={{ margin: 0, color: '#94a3b8' }}>Realtime payment state engine event monitor</p>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => { fetchDashboard(); fetchLogs(); }} style={{ background: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}>Refresh</Button>
            <Button type="primary" icon={<ExportOutlined />} onClick={exportLogs} style={{ background: '#10b981', borderColor: '#10b981' }}>Export CSV</Button>
          </Space>
        </Col>
      </Row>

      {/* Metrics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#111827', borderColor: '#1f2937' }} bodyStyle={{ padding: 20 }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Total Transactions</span>}
              value={metrics?.totalPayments || 0}
              valueStyle={{ color: '#f8fafc', fontSize: 28, fontWeight: 700 }}
              loading={loadingMetrics}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#111827', borderColor: '#1f2937' }} bodyStyle={{ padding: 20 }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Success Rate</span>}
              value={metrics?.successRate || 0}
              suffix="%"
              valueStyle={{ color: '#10b981', fontSize: 28, fontWeight: 700 }}
              loading={loadingMetrics}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#111827', borderColor: '#1f2937' }} bodyStyle={{ padding: 20 }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Avg Latency</span>}
              value={metrics?.avgLatency || 0}
              suffix=" ms"
              valueStyle={{ color: '#38bdf8', fontSize: 28, fontWeight: 700 }}
              loading={loadingMetrics}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#111827', borderColor: '#1f2937' }} bodyStyle={{ padding: 20 }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Duplicate Webhooks</span>}
              value={metrics?.webhooksDuplicate || 0}
              valueStyle={{ color: '#fb923c', fontSize: 28, fontWeight: 700 }}
              loading={loadingMetrics}
            />
          </Card>
        </Col>
      </Row>

      {/* Webhook logs Filters */}
      <Card title={<span style={{ color: '#f8fafc' }}>🔍 Audit Filter Logs</span>} style={{ background: '#111827', borderColor: '#1f2937', marginBottom: 24 }} bodyStyle={{ padding: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={10}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Search by Payment ID, Order ID, Webhook ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
            />
          </Col>
          <Col xs={12} md={7}>
            <Select
              placeholder="Filter Status"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Select.Option value="SUCCESS">SUCCESS</Select.Option>
              <Select.Option value="FAILED">FAILED</Select.Option>
              <Select.Option value="DUPLICATE">DUPLICATE</Select.Option>
              <Select.Option value="INVALID_SIGNATURE">INVALID SIGNATURE</Select.Option>
            </Select>
          </Col>
          <Col xs={12} md={7}>
            <Select
              placeholder="Filter Webhook Event"
              allowClear
              style={{ width: '100%' }}
              value={eventFilter}
              onChange={setEventFilter}
            >
              <Select.Option value="payment.authorized">payment.authorized</Select.Option>
              <Select.Option value="payment.captured">payment.captured</Select.Option>
              <Select.Option value="payment.failed">payment.failed</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Logs and Dashboard Main Tables */}
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={14}>
          <Card title={<span style={{ color: '#f8fafc' }}>⚡ Webhook Log events</span>} style={{ background: '#111827', borderColor: '#1f2937' }} bodyStyle={{ padding: 0 }}>
            <Table
              dataSource={logs}
              columns={logColumns}
              rowKey="_id"
              loading={loadingLogs}
              pagination={{
                current: page,
                pageSize: limit,
                total: totalLogs,
                onChange: setPage,
              }}
              rowClassName={() => 'dark-table-row'}
              style={{ background: '#111827' }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title={<span style={{ color: '#f8fafc' }}>📋 Recent Core Transactions</span>} style={{ background: '#111827', borderColor: '#1f2937' }} bodyStyle={{ padding: 0 }}>
            <Table
              dataSource={recentPayments}
              columns={recentColumns}
              rowKey="_id"
              loading={loadingMetrics}
              pagination={false}
              rowClassName={() => 'dark-table-row'}
              style={{ background: '#111827' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Timeline Modal Detail view */}
      <Modal
        title={<span style={{ color: '#f8fafc' }}>🔍 Transaction Timeline Audit Log</span>}
        visible={timelineVisible}
        onCancel={() => setTimelineVisible(false)}
        footer={null}
        width={700}
        bodyStyle={{ background: '#0b0f19', color: '#f8fafc' }}
        style={{ top: 40 }}
      >
        {loadingTimeline ? (
          <p>Retrieving transaction audits...</p>
        ) : (
          <div>
            <div style={{ marginBottom: 20, padding: 12, borderRadius: 8, background: '#111827' }}>
              <Row gutter={[16, 8]}>
                <Col span={12}><strong>Gateway Order ID:</strong> {timelineData?.payment?.razorpayOrderId}</Col>
                <Col span={12}><strong>Amount:</strong> ₹{timelineData?.payment?.amount}</Col>
                <Col span={12}><strong>Current Status:</strong> <Tag color="success">{timelineData?.payment?.status}</Tag></Col>
                <Col span={12}><strong>Date Initiated:</strong> {dayjs(timelineData?.payment?.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Col>
              </Row>
            </div>

            <h3 style={{ color: '#f8fafc', marginBottom: 16 }}>State Machine Transitions</h3>
            <Timeline mode="left">
              {timelineData?.events?.map((evt, idx) => (
                <Timeline.Item 
                  key={evt._id} 
                  label={<span style={{ color: '#94a3b8' }}>{dayjs(evt.createdAt).format('HH:mm:ss')}</span>}
                  color={evt.newStatus === 'FAILED' ? 'red' : 'green'}
                >
                  <div style={{ color: '#f8fafc' }}>
                    <strong>{evt.eventName}</strong>: <Tag>{evt.oldStatus}</Tag> → <Tag color="blue">{evt.newStatus}</Tag>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Latency: {evt.processingDuration}ms | IP: {evt.ipAddress || 'N/A'}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        )}
      </Modal>
    </div>
  );
}
