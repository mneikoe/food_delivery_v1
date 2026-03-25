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

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await getProducts();
      setProducts(response.data);
    } catch (error) {
      message.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data);
    } catch (error) {
      message.error('Failed to load categories');
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingProduct(record);
    form.setFieldsValue({
      ...record,
      categoryId: record.categoryId?._id || record.categoryId,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      message.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete product');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct._id, values);
        message.success('Product updated successfully');
      } else {
        await createProduct(values);
        message.success('Product created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      fetchProducts();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to save product');
    }
  };

  const columns = [
    {
      title: 'Image',
      dataIndex: 'image',
      key: 'image',
      render: (image) => image ? <Image src={image} width={50} height={50} style={{ objectFit: 'cover' }} /> : '-',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => `₹${price}`,
    },
    {
      title: 'Category',
      dataIndex: ['categoryId', 'name'],
      key: 'category',
    },
    {
      title: 'Veg',
      dataIndex: 'isVeg',
      key: 'isVeg',
      render: (isVeg) => (isVeg ? 'Yes' : 'No'),
    },
    {
      title: 'Available',
      dataIndex: 'isAvailable',
      key: 'isAvailable',
      render: (isAvailable) => (isAvailable ? 'Yes' : 'No'),
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
            title="Are you sure you want to delete this product?"
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
          Add Product
        </Button>
      </div>
      <div className="admin-table-wrap">
        <Table
          columns={columns}
          dataSource={products}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </div>
      <Modal
        title={editingProduct ? 'Edit Product' : 'Add Product'}
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
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter product name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="price"
            label="Price"
            rules={[{ required: true, message: 'Please enter price' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} prefix="₹" />
          </Form.Item>
          <Form.Item
            name="categoryId"
            label="Category"
            rules={[{ required: true, message: 'Please select category' }]}
          >
            <Select placeholder="Select category">
              {categories.map((cat) => (
                <Select.Option key={cat._id} value={cat._id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="image" label="Image URL">
            <Input />
          </Form.Item>
          <Form.Item name="isVeg" label="Vegetarian" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item name="isAvailable" label="Available" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item name="preparationTime" label="Preparation Time (minutes)" initialValue={15}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingProduct ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
