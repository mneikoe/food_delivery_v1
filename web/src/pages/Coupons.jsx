import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Switch, InputNumber, Select, DatePicker, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../api/adminApi';

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const response = await getCoupons();
      setCoupons(response.data);
    } catch (error) {
      message.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCoupon(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingCoupon(record);
    form.setFieldsValue({
      ...record,
      validFrom: record.validFrom ? dayjs(record.validFrom) : null,
      validUntil: record.validUntil ? dayjs(record.validUntil) : null,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteCoupon(id);
      message.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete coupon');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const data = {
        ...values,
        validFrom: values.validFrom ? values.validFrom.toISOString() : undefined,
        validUntil: values.validUntil ? values.validUntil.toISOString() : undefined,
      };
      if (editingCoupon) {
        await updateCoupon(editingCoupon._id, data);
        message.success('Coupon updated successfully');
      } else {
        await createCoupon(data);
        message.success('Coupon created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      fetchCoupons();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to save coupon');
    }
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Discount Type',
      dataIndex: 'discountType',
      key: 'discountType',
    },
    {
      title: 'Discount Value',
      dataIndex: 'discountValue',
      key: 'discountValue',
      render: (value, record) =>
        record.discountType === 'PERCENTAGE' ? `${value}%` : `₹${value}`,
    },
    {
      title: 'Min Order',
      dataIndex: 'minOrderValue',
      key: 'minOrderValue',
      render: (value) => `₹${value || 0}`,
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
      render: (isActive) => (isActive ? 'Yes' : 'No'),
    },
    {
      title: 'Used',
      dataIndex: 'usedCount',
      key: 'usedCount',
      render: (used, record) => `${used || 0}${record.usageLimit ? ` / ${record.usageLimit}` : ''}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this coupon?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Coupon
        </Button>
      </div>
      <div className="admin-table-wrap">
        <Table
          columns={columns}
          dataSource={coupons}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </div>
      <Modal
        title={editingCoupon ? 'Edit Coupon' : 'Add Coupon'}
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
            name="code"
            label="Coupon Code"
            rules={[{ required: true, message: 'Please enter coupon code' }]}
          >
            <Input placeholder="e.g., SAVE20" />
          </Form.Item>
          <Form.Item
            name="discountType"
            label="Discount Type"
            rules={[{ required: true, message: 'Please select discount type' }]}
            initialValue="PERCENTAGE"
          >
            <Select>
              <Select.Option value="PERCENTAGE">Percentage</Select.Option>
              <Select.Option value="FLAT">Flat Amount</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="discountValue"
            label="Discount Value"
            rules={[{ required: true, message: 'Please enter discount value' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="minOrderValue" label="Minimum Order Value" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} prefix="₹" />
          </Form.Item>
          <Form.Item name="maxDiscount" label="Maximum Discount (for percentage)">
            <InputNumber min={0} style={{ width: '100%' }} prefix="₹" />
          </Form.Item>
          <Form.Item name="validFrom" label="Valid From">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="validUntil" label="Valid Until">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="usageLimit" label="Usage Limit">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Leave empty for unlimited" />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingCoupon ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
