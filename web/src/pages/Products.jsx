import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Switch, InputNumber, Select, message, Popconfirm, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories } from '../api/adminApi';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try { const r = await getProducts(); setProducts(r.data); }
    catch { message.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try { const r = await getCategories(); setCategories(r.data); }
    catch { /* silent */ }
  };

  const handleCreate = () => { setEditingProduct(null); form.resetFields(); setModalVisible(true); };
  const handleEdit = (record) => {
    setEditingProduct(record);
    form.setFieldsValue({ ...record, categoryId: record.categoryId?._id || record.categoryId });
    setModalVisible(true);
  };
  const handleDelete = async (id) => {
    try { await deleteProduct(id); message.success('Product deleted'); fetchProducts(); }
    catch (e) { message.error(e.response?.data?.error || 'Failed to delete'); }
  };
  const handleSubmit = async (values) => {
    try {
      if (editingProduct) { await updateProduct(editingProduct._id, values); message.success('Updated'); }
      else { await createProduct(values); message.success('Created'); }
      setModalVisible(false); form.resetFields(); fetchProducts();
    } catch (e) { message.error(e.response?.data?.error || 'Failed to save'); }
  };

  const columns = [
    {
      title: 'Item',
      key: 'item',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {r.image
            ? <Image src={r.image} width={40} height={40} style={{ borderRadius: 8, objectFit: 'cover' }} preview={false} />
            : <div style={{ width:40, height:40, borderRadius:8, background:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🍽️</div>
          }
          <div>
            <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: 13 }}>{r.name}</div>
            {r.description && <div style={{ fontSize: 11, color: '#4B6180', marginTop: 2, maxWidth: 200 }}>{r.description.slice(0, 60)}{r.description.length > 60 ? '…' : ''}</div>}
          </div>
        </div>
      ),
      width: 280,
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      width: 90,
      render: p => <span style={{ fontWeight: 700, color: '#22c55e', fontSize: 14 }}>₹{p}</span>,
    },
    {
      title: 'Category',
      dataIndex: ['categoryId', 'name'],
      key: 'category',
      render: cat => <span style={{ color: '#94A3B8', fontSize: 12 }}>{cat || '—'}</span>,
    },
    {
      title: 'Prep Time',
      dataIndex: 'preparationTime',
      key: 'prep',
      width: 100,
      render: t => <span style={{ color: '#4B6180', fontSize: 12 }}>⏱ {t || 15} min</span>,
    },
    {
      title: 'Status',
      dataIndex: 'isAvailable',
      key: 'isAvailable',
      width: 110,
      render: (av) => (
        <span style={{
          display:'inline-flex', alignItems:'center', gap:5,
          background: av ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: av ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)',
          color: av ? '#4ade80' : '#f87171',
          borderRadius:100, padding:'3px 10px', fontSize:10, fontWeight:700,
        }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background: av ? '#22c55e' : '#ef4444' }} />
          {av ? 'Available' : 'Unavailable'}
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
          <Popconfirm title="Delete this product?" onConfirm={() => handleDelete(record._id)} okText="Delete" cancelText="Cancel">
            <button style={iconBtn('#ef4444')} title="Delete"><DeleteOutlined /></button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'#2D4060', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Catalog</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#F1F5F9', letterSpacing:'-0.5px' }}>Menu Items</div>
          <div style={{ fontSize:13, color:'#4B6180', marginTop:2 }}>Manage your food products and pricing</div>
        </div>
        <button onClick={handleCreate} style={primaryBtn}><PlusOutlined /> Add Product</button>
      </div>

      <div className="admin-table-wrap">
        <Table
          columns={columns}
          dataSource={products}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize:10, showTotal:(t)=><span style={{color:'#4B6180',fontSize:12}}>{t} products</span> }}
          size="middle"
        />
      </div>

      <Modal
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop:16 }}>
          <Form.Item name="name" label="Name" rules={[{ required:true }]}><Input placeholder="Product name" /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} placeholder="Brief description..." /></Form.Item>
          <Form.Item name="price" label="Price (₹)" rules={[{ required:true }]}>
            <InputNumber min={0} style={{ width:'100%' }} prefix="₹" />
          </Form.Item>
          <Form.Item name="categoryId" label="Category" rules={[{ required:true }]}>
            <Select placeholder="Select category" options={categories.map(c => ({ label:c.name, value:c._id }))} />
          </Form.Item>
          <Form.Item name="image" label="Image URL"><Input placeholder="https://..." /></Form.Item>
          <Form.Item name="preparationTime" label="Preparation Time (min)" initialValue={15}>
            <InputNumber min={1} style={{ width:'100%' }} />
          </Form.Item>
          <Form.Item name="isAvailable" label="Available" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
          <Form.Item style={{ marginBottom:0 }}>
            <Space>
              <Button type="primary" htmlType="submit">{editingProduct ? 'Update' : 'Create'}</Button>
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
