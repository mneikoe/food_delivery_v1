import { useEffect, useState, useRef } from 'react';
import { Table, Button, Space, Modal, Form, Select, Tag, message, Descriptions } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { getOrders, getOrderDetails, updateOrderStatus, assignDeliveryPartner, getAvailableDeliveryPartners } from '../api/adminApi';
import { supabase } from '../services/supabase';
import dayjs from 'dayjs';

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

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  useEffect(() => {
    fetchOrders();
    fetchDeliveryPartners();

    // Subscribe to Supabase realtime for order updates
    const channel = supabase.channel('admin_orders');

    channel.on('broadcast', { event: 'order_update' }, (payload) => {
      console.log('Order update received:', payload);
      // Refetch orders when any order is updated
      fetchOrders();
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to admin_orders channel');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Error subscribing to admin_orders channel');
      }
    });

    // Cleanup subscription on unmount
    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await getOrders();
      setOrders(response.data);
    } catch (error) {
      message.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryPartners = async () => {
    try {
      const response = await getAvailableDeliveryPartners();
      setDeliveryPartners(response.data);
    } catch (error) {
      console.error('Failed to load delivery partners');
    }
  };

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
      fetchDeliveryPartners();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to assign delivery partner');
    }
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => record.userId?.name || 'N/A',
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => `₹${amount}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Delivery Partner',
      key: 'deliveryPartner',
      render: (_, record) => record.deliveryPartnerId?.name || 'Not assigned',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record._id)}
          >
            View
          </Button>
          <Button
            type="link"
            onClick={() => handleUpdateStatus(record)}
            disabled={record.status === 'DELIVERED' || record.status === 'CANCELLED'}
          >
            Update Status
          </Button>
          {!record.deliveryPartnerId && record.status === 'ACCEPTED_BY_ADMIN' && (
            <Button
              type="link"
              onClick={() => handleAssignDelivery(record)}
            >
              Assign Delivery
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>Orders</h1>
      <Table
        columns={columns}
        dataSource={orders}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 10 }}
      />

      {/* Order Details Modal */}
      <Modal
        title="Order Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <div>
            <Descriptions bordered column={2}>
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
              <Descriptions.Item label="Delivery Partner" span={2}>
                {selectedOrder.deliveryPartnerId?.name || 'Not assigned'}
              </Descriptions.Item>
              <Descriptions.Item label="Created At" span={2}>
                {dayjs(selectedOrder.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <h3>Items</h3>
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
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Update Status Modal */}
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

      {/* Assign Delivery Modal */}
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
