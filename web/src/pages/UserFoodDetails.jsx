import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, Col, Empty, Row, Skeleton, Space, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { addUserCartItem, getUserCart, getUserProducts } from '../api/userApi';
import './UserApp.css';

export default function UserFoodDetails() {
  const { foodId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [productsRes, cartRes] = await Promise.all([getUserProducts(), getUserCart()]);
        setProducts(productsRes.data || []);
        setCartCount((cartRes.data?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0));
      } catch (error) {
        message.error(error.response?.data?.error || 'Failed to load item details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const food = useMemo(() => products.find((p) => p._id === foodId), [products, foodId]);
  const related = useMemo(() => {
    if (!food) return [];
    return products
      .filter((p) => p.categoryId?._id === food.categoryId?._id && p._id !== food._id)
      .slice(0, 8);
  }, [products, food]);

  const onAddToCart = async (id) => {
    try {
      await addUserCartItem({ productId: id, quantity: 1 });
      setCartCount((prev) => prev + 1);
      message.success('Added to cart');
    } catch (error) {
      message.error(error.response?.data?.error || 'Unable to add to cart');
    }
  };

  return (
    <div className="user-app-shell">
      <div className="user-app-content" style={{ paddingTop: 16 }}>
        <Button className="catalog-back-btn" icon={<ArrowLeftOutlined />} onClick={() => navigate('/user/app')}>
          Back to menu
        </Button>

        <Card style={{ marginTop: 14 }}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : !food ? (
            <Empty description="Item not found" />
          ) : (
            <Row gutter={[20, 20]}>
              <Col xs={24} md={10}>
                <div className="user-product-image-wrap" style={{ height: 280, borderRadius: 12, overflow: 'hidden' }}>
                  {food.image ? (
                    <img className="user-product-image" src={food.image} alt={food.name} />
                  ) : (
                    <div className="user-product-image-placeholder">No image</div>
                  )}
                </div>
              </Col>
              <Col xs={24} md={14}>
                <Tag color="green" style={{ marginBottom: 10 }}>
                  {food.categoryId?.name || 'Item'}
                </Tag>
                <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>
                  {food.name}
                </Typography.Title>
                <Typography.Paragraph type="secondary" style={{ fontSize: 15 }}>
                  {food.description || 'Freshly prepared and delivered hot.'}
                </Typography.Paragraph>
                <Typography.Title level={4} style={{ marginTop: 4 }}>
                  ₹{food.price}
                </Typography.Title>
                <Space style={{ marginTop: 12 }}>
                  <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => onAddToCart(food._id)}>
                    Add to Cart
                  </Button>
                  <Button onClick={() => navigate('/user/app')}>Continue Browsing</Button>
                </Space>
              </Col>
            </Row>
          )}
        </Card>

        {!!related.length && (
          <Card title="More items in this category" style={{ marginTop: 16 }}>
            <div className="h-scroll-list">
              {related.map((item) => (
                <div className="h-scroll-card user-product-card" key={item._id}>
                  <div className="user-product-image-wrap">
                    {item.image ? (
                      <img className="user-product-image" src={item.image} alt={item.name} />
                    ) : (
                      <div className="user-product-image-placeholder">No image</div>
                    )}
                  </div>
                  <div style={{ padding: 10 }}>
                    <Typography.Text strong>{item.name}</Typography.Text>
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography.Text>₹{item.price}</Typography.Text>
                      <Button size="small" onClick={() => navigate(`/user/food/${item._id}`)}>
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
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
