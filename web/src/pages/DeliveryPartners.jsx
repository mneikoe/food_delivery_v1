import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Switch, message, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import {
  getDeliveryPartners,
  createDeliveryPartner,
  updateDeliveryPartner,
  updateDeliveryPartnerStatus,
} from '../api/adminApi';
import dayjs from 'dayjs';

export default function DeliveryPartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const response = await getDeliveryPartners();
      setPartners(response.data);
    } catch (error) {
      message.error('Failed to load delivery partners');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPartner(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingPartner(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await updateDeliveryPartnerStatus(id, !currentStatus);
      message.success(`Delivery partner ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
      fetchPartners();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingPartner) {
        await updateDeliveryPartner(editingPartner._id, values);
        message.success('Delivery partner updated successfully');
      } else {
        await createDeliveryPartner(values);
        message.success('Delivery partner created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      fetchPartners();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to save delivery partner');
    }
  };

  const expandedRowRender = (record) => {
    const detailColumns = [
      {
        title: 'Order ID',
        dataIndex: 'orderId',
        key: 'orderId',
        render: (text) => <strong style={{ color: '#F1F5F9' }}>{text}</strong>,
      },
      {
        title: 'Assigned Date',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date) => dayjs(date).format('DD MMM YYYY, hh:mm A'),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status) => {
          let color = 'blue';
          if (status === 'DELIVERED') color = 'green';
          if (status === 'CANCELLED') color = 'red';
          return (
            <span style={{
              textTransform: 'capitalize',
              color: color === 'green' ? '#4ade80' : color === 'red' ? '#f87171' : '#60a5fa',
              fontWeight: 600,
            }}>
              {status.replace(/_/g, ' ')}
            </span>
          );
        },
      },
      {
        title: 'Amount',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        render: (amt) => `₹${amt.toFixed(2)}`,
      },
      {
        title: 'Delivered At',
        dataIndex: 'actualDeliveryTime',
        key: 'actualDeliveryTime',
        render: (date) => date ? dayjs(date).format('DD MMM YYYY, hh:mm A') : '—',
      },
    ];

    return (
      <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.015)', borderRadius: 10 }}>
        <div style={{ fontWeight: 700, color: '#94A3B8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Order Assignment History ({record.orders?.length || 0} orders)
        </div>
        <Table
          columns={detailColumns}
          dataSource={record.orders || []}
          pagination={{ pageSize: 5, size: 'small' }}
          rowKey="_id"
          size="small"
        />
      </div>
    );
  };

  const columns = [
    {
      title: 'Partner',
      key: 'partner',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: 13 }}>{r.name}</div>
          <div style={{ fontSize: 11, color: '#4B6180', marginTop: 2 }}>✉ {r.email || '—'}</div>
        </div>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (p) => <span style={{ fontSize: 12, color: '#94A3B8' }}>📞 {p || '—'}</span>,
    },
    {
      title: 'Total Assigned',
      key: 'totalAssigned',
      render: (_, r) => (
        <span style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 600 }}>
          {r.stats?.totalAssigned || 0}
        </span>
      ),
    },
    {
      title: 'Total Delivered',
      key: 'totalDelivered',
      render: (_, r) => (
        <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>
          {r.stats?.totalDelivered || 0}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: isActive ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)',
          color: isActive ? '#4ade80' : '#f87171',
          borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 700,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? '#22c55e' : '#ef4444' }} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => <span style={{ fontSize: 12, color: '#4B6180' }}>{dayjs(date).format('DD MMM YYYY')}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Edit">
            <button onClick={() => handleEdit(record)} style={iconBtn('#3b82f6')}><EditOutlined /></button>
          </Tooltip>
          <Tooltip title={record.isActive ? 'Disable' : 'Enable'}>
            <button
              onClick={() => handleToggleStatus(record._id, record.isActive)}
              style={iconBtn(record.isActive ? '#ef4444' : '#22c55e')}
            >{record.isActive ? '⛔' : '✅'}</button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#2D4060', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Fleet</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.5px' }}>Delivery Partners</div>
          <div style={{ fontSize: 13, color: '#4B6180', marginTop: 2 }}>Manage your delivery fleet and partner accounts</div>
        </div>
        <button onClick={handleCreate} style={primaryBtn}><PlusOutlined /> Add Partner</button>
      </div>
      <div className="admin-table-wrap">
        <Table
          columns={columns}
          dataSource={partners}
          loading={loading}
          rowKey="_id"
          expandable={{
            expandedRowRender,
            rowExpandable: (record) => record.orders && record.orders.length > 0,
          }}
          pagination={{ pageSize: 10, showTotal: (t) => <span style={{ color: '#4B6180', fontSize: 12 }}>{t} partners</span> }}
          size="middle"
        />
      </div>

      <Modal
        title={editingPartner ? 'Edit Delivery Partner' : 'Add Delivery Partner'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        footer={null}
        width={440}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop:16 }}>
          <Form.Item name="name" label="Name" rules={[{ required:true }]}><Input placeholder="Full name" /></Form.Item>
          {!editingPartner && (
            <Form.Item name="email" label="Email" rules={[{ required:true },{ type:'email' }]}><Input placeholder="email@example.com" /></Form.Item>
          )}
          <Form.Item name="phone" label="Phone"><Input placeholder="+91 XXXXXXXXXX" /></Form.Item>
          <Form.Item style={{ marginBottom:0 }}>
            <Space>
              <Button type="primary" htmlType="submit">{editingPartner ? 'Update' : 'Create'}</Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

const iconBtn = (color) => ({
  width:30, height:30, display:'inline-flex', alignItems:'center', justifyContent:'center',
  background:`${color}12`, border:`1px solid ${color}25`,
  borderRadius:7, color, cursor:'pointer', fontSize:13,
  transition:'all 0.15s', fontFamily:'Inter, sans-serif',
});

const primaryBtn = {
  display:'inline-flex', alignItems:'center', gap:6,
  background:'#FACC15', border:'1px solid #FACC15',
  borderRadius:8, padding:'8px 18px', color:'#080F1E',
  fontSize:13, fontWeight:700, cursor:'pointer',
  fontFamily:'Inter, sans-serif', transition:'all 0.15s',
};
