import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Switch, message, Popconfirm, Tag } from 'antd';
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

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
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
          <Button
            type="link"
            onClick={() => handleToggleStatus(record._id, record.isActive)}
          >
            {record.isActive ? 'Disable' : 'Enable'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Delivery Partner
        </Button>
      </div>
      <div className="admin-table-wrap">
        <Table
          columns={columns}
          dataSource={partners}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </div>
      <Modal
        title={editingPartner ? 'Edit Delivery Partner' : 'Add Delivery Partner'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter name' }]}
          >
            <Input />
          </Form.Item>
          {!editingPartner && (
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input />
            </Form.Item>
          )}
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingPartner ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
