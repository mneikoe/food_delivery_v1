import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Badge, Button, Card, Empty, Input, Space, Typography, message } from 'antd';
import { addUserCartItem, getUserCart, getUserCategories, getUserProducts } from '../api/userApi';
import './UserApp.css';

export default function UserAllItemsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [categoriesRes, productsRes, cartRes] = await Promise.all([
          getUserCategories(),
          getUserProducts(),
          getUserCart(),
        ]);
        setCategories((categoriesRes.data || []).filter((item) => item?.isActive !== false));
        setProducts(productsRes.data || []);
        setCartCount((cartRes.data?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0));
      } catch (error) {
        message.error(error.response?.data?.error || 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    return (products || []).filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' ? true : item.categoryId?._id === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.categoryId?.name?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, selectedCategory]);

  const onAddToCart = async (productId) => {
    try {
      await addUserCartItem({ productId, quantity: 1 });
      setCartCount((prev) => prev + 1);
      message.success('Added to cart');
    } catch (error) {
      message.error(error.response?.data?.error || 'Unable to add to cart');
    }
  };

  return (
    <div className="user-app-shell">
      <div className="user-app-content user-catalog-content">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Button className="catalog-back-btn" icon={<ArrowLeftOutlined />} onClick={() => navigate('/user/app')}>
            Back to app
          </Button>
          <Card>
            <div className="user-catalog-header">
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  Full Menu
                </Typography.Title>
                <Typography.Text type="secondary">
                  Browse all available items and add directly to cart.
                </Typography.Text>
              </div>
              <Button onClick={() => navigate('/user/categories')}>View Full Categories</Button>
            </div>
            <Space direction="vertical" style={{ width: '100%', marginTop: 14 }}>
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="h-scroll-chips">
                <button
                  type="button"
                  className={`chip-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  <span className="chip-media">
                    <span className="chip-fallback">A</span>
                  </span>
                  <span>All Items</span>
                </button>
                {categories.map((category) => (
                  <button
                    key={category._id}
                    type="button"
                    className={`chip-btn ${selectedCategory === category._id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category._id)}
                  >
                    <span className="chip-media">
                      {category.image ? (
                        <img src={category.image} alt={category.name} className="chip-image" />
                      ) : (
                        <span className="chip-fallback">{(category.name || 'C').slice(0, 1).toUpperCase()}</span>
                      )}
                    </span>
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            </Space>
          </Card>
          {loading ? (
            <Card loading />
          ) : !filteredProducts.length ? (
            <Card>
              <Empty description="No items found" />
            </Card>
          ) : (
            <div className="user-menu-grid">
              {filteredProducts.map((item) => (
                <Card
                  key={item._id}
                  className="user-item-grid-card"
                  cover={
                    item.image ? (
                      <img src={item.image} alt={item.name} className="user-grid-card-image" />
                    ) : (
                      <div className="user-grid-card-image user-product-image-placeholder">No image</div>
                    )
                  }
                >
                  <Typography.Text strong className="user-item-name">
                    {item.name}
                  </Typography.Text>
                  <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginTop: 8 }}>
                    {item.description || 'Freshly prepared item.'}
                  </Typography.Paragraph>
                  <div className="user-item-grid-footer">
                    <Typography.Text strong>₹{item.price}</Typography.Text>
                    <Space size={8}>
                      <Button size="small" onClick={() => navigate(`/user/food/${item._id}`)}>
                        View
                      </Button>
                      <Button type="primary" size="small" onClick={() => onAddToCart(item._id)}>
                        Add
                      </Button>
                    </Space>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Space>
        {cartCount > 0 && (
          <Badge count={cartCount} className="floating-cart-badge">
            <Button
              type="primary"
              size="large"
              className="floating-cart-btn"
              icon={<ShoppingCartOutlined />}
              onClick={() => navigate('/user/app')}
            >
              Go to Cart
            </Button>
          </Badge>
        )}
      </div>
    </div>
  );
}
