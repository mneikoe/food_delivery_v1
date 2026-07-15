import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Switch, InputNumber, DatePicker, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getOffers, createOffer, updateOffer, deleteOffer } from '../api/adminApi';

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const response = await getOffers();
      setOffers(response.data);
    } catch (error) {
      message.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingOffer(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingOffer(record);
    form.setFieldsValue({
      ...record,
      validFrom: record.validFrom ? dayjs(record.validFrom) : null,
      validUntil: record.validUntil ? dayjs(record.validUntil) : null,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteOffer(id);
      message.success('Offer deleted successfully');
      fetchOffers();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete offer');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const data = {
        ...values,
        validFrom: values.validFrom ? values.validFrom.toISOString() : undefined,
        validUntil: values.validUntil ? values.validUntil.toISOString() : undefined,
      };
      if (editingOffer) {
        await updateOffer(editingOffer._id, data);
        message.success('Offer updated successfully');
      } else {
        await createOffer(data);
        message.success('Offer created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      fetchOffers();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to save offer');
    }
  };

  const columns = [
    {
      title: 'Image',
      dataIndex: 'image',
      key: 'image',
      render: (image) => (
        image ? (
          <img src={image} alt="Offer" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <span>-</span>
        )
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Discount Text',
      dataIndex: 'discountText',
      key: 'discountText',
    },
    {
      title: 'Coupon Code',
      dataIndex: 'couponCode',
      key: 'couponCode',
      render: (code) => code || '-',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
    },
    {
      title: 'Valid Until',
      dataIndex: 'validUntil',
      key: 'validUntil',
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v) => (
        <span style={{
          display:'inline-flex', alignItems:'center', gap:5,
          background: v ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: v ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)',
          color: v ? '#4ade80' : '#f87171',
          borderRadius:100, padding:'3px 10px', fontSize:10, fontWeight:700,
        }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background: v ? '#22c55e' : '#ef4444' }} />
          {v ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size={6}>
          <button onClick={() => handleEdit(record)} style={iconBtn('#3b82f6')} title="Edit"><EditOutlined /></button>
          <Popconfirm title="Delete this offer?" onConfirm={() => handleDelete(record._id)} okText="Delete" cancelText="Cancel">
            <button style={iconBtn('#ef4444')} title="Delete"><DeleteOutlined /></button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page" style={{ fontFamily:'Inter, sans-serif' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'#2D4060', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Marketing</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#F1F5F9', letterSpacing:'-0.5px' }}>Offers</div>
          <div style={{ fontSize:13, color:'#4B6180', marginTop:2 }}>Create and manage promotional banners</div>
        </div>
        <button onClick={handleCreate} style={primaryBtn}><PlusOutlined /> Add Offer</button>
      </div>
      <div className="admin-table-wrap">
        <Table
          columns={columns}
          dataSource={offers}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize:10, showTotal:(t)=><span style={{color:'#4B6180',fontSize:12}}>{t} offers</span> }}
          size="middle"
        />
      </div>
      <Modal
        title={editingOffer ? 'Edit Offer' : 'Add Offer'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter offer title' }]}
          >
            <Input placeholder="e.g., Special Weekend Offer" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="Offer description (optional)" />
          </Form.Item>
          <Form.Item
            name="image"
            label="Image URL"
            rules={[{ required: true, message: 'Please enter image URL' }]}
          >
            <Input placeholder="https://example.com/image.jpg" />
          </Form.Item>
          <Form.Item
            name="discountText"
            label="Discount Text"
            rules={[{ required: true, message: 'Please enter discount text' }]}
          >
            <Input placeholder="e.g., 25% OFF, Flat ₹100 OFF" />
          </Form.Item>
          <Form.Item
            name="couponCode"
            label="Coupon Code (Optional)"
          >
            <Input placeholder="e.g., WEEKEND25" />
          </Form.Item>
          <Form.Item
            name="priority"
            label="Priority"
            initialValue={0}
            tooltip="Higher priority offers appear first"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="validFrom" label="Valid From">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="validUntil" label="Valid Until">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingOffer ? 'Update' : 'Create'}
              </Button>
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
