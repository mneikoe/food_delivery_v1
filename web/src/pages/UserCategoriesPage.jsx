import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, RightOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Badge, Button, Card, Empty, Skeleton, Space, Typography, message } from 'antd';
import { getUserCart, getUserCategories } from '../api/userApi';
import './UserApp.css';

export default function UserCategoriesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [categoriesRes, cartRes] = await Promise.all([getUserCategories(), getUserCart()]);
        setCategories((categoriesRes.data || []).filter((item) => item?.isActive !== false));
        setCartCount((cartRes.data?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0));
      } catch (error) {
        message.error(error.response?.data?.error || 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
                  Full Categories
                </Typography.Title>
                <Typography.Text type="secondary">
                  Select a category to view all items.
                </Typography.Text>
              </div>
              <Button type="primary" onClick={() => navigate('/user/items')}>
                View Full Menu
              </Button>
            </div>
          </Card>
          {loading ? (
            <Card>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          ) : !categories.length ? (
            <Card>
              <Empty description="No categories found" />
            </Card>
          ) : (
            <div className="user-categories-grid">
              {categories.map((category) => (
                <Card key={category._id} className="user-category-card" hoverable>
                  <div className="user-category-media">
                    {category.image ? (
                      <img src={category.image} alt={category.name} className="user-category-image" />
                    ) : (
                      <span className="user-category-fallback">
                        {(category.name || 'C').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <Typography.Title level={5} style={{ marginBottom: 4 }}>
                    {category.name}
                  </Typography.Title>
                  <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>
                    {category.description || 'Browse all items in this category.'}
                  </Typography.Paragraph>
                  <Button
                    block
                    type="primary"
                    icon={<RightOutlined />}
                    onClick={() => navigate(`/user/category/${category._id}/items`)}
                  >
                    View Items
                  </Button>
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
