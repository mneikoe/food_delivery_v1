import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Switch, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/adminApi';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const r = await getCategories();
      setCategories(r.data);
    } catch { message.error('Failed to load categories'); }
    finally { setLoading(false); }
  };

  const handleCreate = () => { setEditingCategory(null); form.resetFields(); setModalVisible(true); };

  const handleEdit = (record) => {
    setEditingCategory(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      message.success('Category deleted');
      fetchCategories();
    } catch (error) { message.error(error.response?.data?.error || 'Failed to delete'); }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory._id, values);
        message.success('Category updated');
      } else {
        await createCategory(values);
        message.success('Category created');
      }
      setModalVisible(false);
      form.resetFields();
      fetchCategories();
    } catch (error) { message.error(error.response?.data?.error || 'Failed to save'); }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span style={{ fontWeight: 600, color: '#F1F5F9' }}>{name}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (d) => <span style={{ color: '#94A3B8', fontSize: 12 }}>{d || '—'}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: isActive ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)',
          color: isActive ? '#4ade80' : '#f87171',
          borderRadius: 100, padding: '3px 10px',
          fontSize: 10, fontWeight: 700,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? '#22c55e' : '#ef4444' }} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      title: 'Order',
      dataIndex: 'displayOrder',
      key: 'displayOrder',
      width: 80,
      render: (n) => <span style={{ color: '#4B6180', fontSize: 12 }}>#{n ?? 0}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_, record) => (
        <Space size={6}>
          <button
            onClick={() => handleEdit(record)}
            style={iconBtn('#3b82f6')}
            title="Edit"
          ><EditOutlined /></button>
          <Popconfirm
            title="Delete this category?"
            onConfirm={() => handleDelete(record._id)}
            okText="Delete"
            cancelText="Cancel"
          >
            <button style={iconBtn('#ef4444')} title="Delete"><DeleteOutlined /></button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#2D4060', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Catalog</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.5px' }}>Categories</div>
          <div style={{ fontSize: 13, color: '#4B6180', marginTop: 2 }}>Organize your menu into sections</div>
        </div>
        <button onClick={handleCreate} style={primaryBtn}>
          <PlusOutlined /> Add Category
        </button>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <Table
          columns={columns}
          dataSource={categories}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10, showTotal: (t) => <span style={{ color: '#4B6180', fontSize: 12 }}>{t} categories</span> }}
          size="middle"
        />
      </div>

      {/* Modal */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        footer={null}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Enter category name' }]}>
            <Input placeholder="e.g. Starters" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Brief description..." />
          </Form.Item>
          <Form.Item name="image" label="Image URL">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item name="displayOrder" label="Display Order" initialValue={0}>
            <Input type="number" min={0} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">{editingCategory ? 'Update' : 'Create'}</Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

const iconBtn = (color) => ({
  width: 30, height: 30,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: `${color}12`, border: `1px solid ${color}25`,
  borderRadius: 7, color, cursor: 'pointer', fontSize: 13,
  transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
});

const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: '#FACC15', border: '1px solid #FACC15',
  borderRadius: 8, padding: '8px 18px', color: '#080F1E',
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
};
