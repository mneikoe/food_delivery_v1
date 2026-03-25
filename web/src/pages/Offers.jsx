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
      render: (isActive) => (isActive ? 'Yes' : 'No'),
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
            title="Are you sure you want to delete this offer?"
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
          Add Offer
        </Button>
      </div>
      <div className="admin-table-wrap">
        <Table
          columns={columns}
          dataSource={offers}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
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
