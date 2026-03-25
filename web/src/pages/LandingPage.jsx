import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Col, Drawer, Empty, Row, Space, Tag, Typography, message } from 'antd';
import {
  AppstoreOutlined,
  AndroidOutlined,
  AppleOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  LoginOutlined,
  MenuOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { addUserCartItem, getUserCart, getUserCategories, getUserProducts } from '../api/userApi';
import logoImage from '../assets/logo-chatora.png';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const userToken = localStorage.getItem('user_token');
  const isLoggedIn = Boolean(userToken);

  useEffect(() => {
    if (!isLoggedIn) return;
    const loadMenu = async () => {
      setLoading(true);
      try {
        const [catRes, productRes, cartRes] = await Promise.all([
          getUserCategories(),
          getUserProducts(),
          getUserCart(),
        ]);
        const catData = catRes.data || [];
        setCategories(catData);
        setProducts(productRes.data || []);
        setCartCount((cartRes.data?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0));
        if (catData.length) {
          setSelectedCategory(catData[0]._id);
        }
      } catch (error) {
        message.error(error.response?.data?.error || 'Unable to load menu');
      } finally {
        setLoading(false);
      }
    };
    loadMenu();
  }, [isLoggedIn]);

  const selectedFoods = useMemo(() => {
    if (!selectedCategory) return products.slice(0, 12);
    return products.filter((p) => p.categoryId?._id === selectedCategory);
  }, [products, selectedCategory]);

  const onAddToCart = async (productId) => {
    if (!isLoggedIn) {
      message.info('Please login first to add items in cart');
      navigate('/user/login');
      return;
    }
    try {
      await addUserCartItem({ productId, quantity: 1 });
      setCartCount((prev) => prev + 1);
      message.success('Added to cart');
    } catch (error) {
      message.error(error.response?.data?.error || 'Unable to add to cart');
    }
  };

  return (
    <div className="landing-v2">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="brand-block" onClick={() => navigate('/')}>
            <img src={logoImage} alt="Chatora Adda Logo" className="brand-logo-image" />
            <div className="brand-copy">
              <h1>Chatora Adda</h1>
              <p>Night Online Cafe</p>
            </div>
          </div>
          <Space wrap className="landing-header-actions">
            <Button onClick={() => navigate('/privacypolicy')}>Privacy</Button>
            {isLoggedIn ? (
              <Button type="primary" onClick={() => navigate('/user/app')}>
                User App
              </Button>
            ) : (
              <Button icon={<LoginOutlined />} type="primary" onClick={() => navigate('/user/login')}>
                Login to Order
              </Button>
            )}
          </Space>
          <Button
            className="landing-menu-toggle"
            icon={<MenuOutlined />}
            onClick={() => setMobileMenuOpen(true)}
          />
        </div>
      </header>

      <Drawer
        title="Menu"
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        className="landing-mobile-drawer"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Button block onClick={() => { navigate('/'); setMobileMenuOpen(false); }}>
            Home
          </Button>
          <Button block onClick={() => { navigate('/privacypolicy'); setMobileMenuOpen(false); }}>
            Privacy
          </Button>
          {isLoggedIn ? (
            <Button type="primary" block onClick={() => { navigate('/user/app'); setMobileMenuOpen(false); }}>
              User App
            </Button>
          ) : (
            <Button type="primary" icon={<LoginOutlined />} block onClick={() => { navigate('/user/login'); setMobileMenuOpen(false); }}>
              Login to Order
            </Button>
          )}
        </Space>
      </Drawer>

      <section className="hero-v2">
        <div className="hero-copy">
          <Tag color="green">Now serving on web</Tag>
          <h2>Discover tasty food, explore categories, order in minutes.</h2>
          <p>
            You can browse from home page freely. To place order and manage cart, login is required.
          </p>
          <Space wrap>
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate(isLoggedIn ? '/user/app' : '/user/login')}
            >
              {isLoggedIn ? 'Start Ordering' : 'Login & Order'}
            </Button>
            <Button size="large" onClick={() => navigate(isLoggedIn ? '/user/items' : '/user/login')}>
              Explore Full Menu
            </Button>
          </Space>
        </div>
        <div className="hero-image-v2">
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1400&auto=format&fit=crop"
            alt="Food spread"
          />
        </div>
      </section>

      <section className="menu-section-v2">
        <div className="section-head">
          <h3>Categories</h3>
          <p>Select a category and see matching items below.</p>
        </div>

        {!isLoggedIn ? (
          <Card className="login-required-card">
            <Typography.Title level={5}>Menu preview requires user login</Typography.Title>
            <Typography.Paragraph type="secondary">
              Backend serves menu data through secure user APIs. Login once to view real live menu and order.
            </Typography.Paragraph>
            <Button type="primary" onClick={() => navigate('/user/login')}>
              Login to View Menu
            </Button>
          </Card>
        ) : (
          <>
            <div className="landing-menu-links">
              <Button
                icon={<AppstoreOutlined />}
                onClick={() => navigate('/user/categories')}
              >
                View Full Categories
              </Button>
              <Button
                icon={<UnorderedListOutlined />}
                onClick={() => navigate('/user/items')}
              >
                View Full Menu
              </Button>
            </div>
            <div className="h-scroll-chips">
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  className={`chip-btn ${selectedCategory === cat._id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat._id)}
                >
                  <span className="chip-media" aria-hidden="true">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="chip-image" />
                    ) : (
                      <span className="chip-fallback">{(cat.name || 'C').slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            <div className="section-head" style={{ marginTop: 18 }}>
              <h3>Items in selected category</h3>
            </div>
            {loading ? (
              <Card loading />
            ) : selectedFoods.length ? (
              <div className="h-scroll-list">
                {selectedFoods.map((food) => (
                  <article className="h-scroll-card food-card" key={food._id}>
                    <div className="food-image-wrap">
                      {food.image ? <img src={food.image} alt={food.name} /> : <div className="food-image-empty">No image</div>}
                    </div>
                    <div className="food-card-body">
                      <Typography.Text strong>{food.name}</Typography.Text>
                      <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 36 }}>
                        {food.description || 'Delicious item'}
                      </Typography.Paragraph>
                      <div className="food-card-actions">
                        <span className="price">₹{food.price}</span>
                        <Space size={6}>
                          <Button size="small" onClick={() => navigate(`/user/food/${food._id}`)}>
                            Details
                          </Button>
                          <Button
                            size="small"
                            type="primary"
                            icon={<ShoppingCartOutlined />}
                            onClick={() => onAddToCart(food._id)}
                          >
                            Add
                          </Button>
                        </Space>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty description="No items found in this category" />
            )}
          </>
        )}
      </section>

      <section className="why-us-v2">
        <div className="section-head">
          <h3>Why customers choose us</h3>
          <p>Consistent quality, simple ordering, and support that actually responds.</p>
        </div>
        <Row gutter={[14, 14]}>
          <Col xs={24} md={8}>
            <Card className="why-card-v2" bordered={false}>
              <RocketOutlined className="why-card-icon" />
              <Typography.Title level={5} style={{ marginBottom: 6 }}>
                Quick dispatch
              </Typography.Title>
              <Typography.Text type="secondary">
                Orders move fast from kitchen to delivery queue with real operational visibility.
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="why-card-v2" bordered={false}>
              <SafetyCertificateOutlined className="why-card-icon" />
              <Typography.Title level={5} style={{ marginBottom: 6 }}>
                Hygiene focused
              </Typography.Title>
              <Typography.Text type="secondary">
                Standardized prep and handling process for better reliability every single time.
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="why-card-v2" bordered={false}>
              <ClockCircleOutlined className="why-card-icon" />
              <Typography.Title level={5} style={{ marginBottom: 6 }}>
                Late-night friendly
              </Typography.Title>
              <Typography.Text type="secondary">
                Built for real-world convenience when customers want food beyond usual timings.
              </Typography.Text>
            </Card>
          </Col>
        </Row>
      </section>

      <section className="coming-soon-apps">
        <div className="apps-coming-shell">
          <div className="apps-coming-head">
            <Tag color="blue" className="apps-coming-badge">
              MOBILE APPS
            </Tag>
            <Typography.Title level={3} style={{ margin: '8px 0 6px' }}>
              Android & iOS applications are coming soon
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              We are polishing native experience for both platforms. Until launch, you can use the website with the same account and smooth COD checkout.
            </Typography.Paragraph>
          </div>

          <div className="apps-platform-grid">
            <Card className="apps-platform-card" bordered={false}>
              <div className="platform-icon android">
                <AndroidOutlined />
              </div>
              <Typography.Title level={5} style={{ margin: '10px 0 4px' }}>
                Android App
              </Typography.Title>
              <Typography.Text type="secondary">In QA and release optimization</Typography.Text>
            </Card>

            <Card className="apps-platform-card" bordered={false}>
              <div className="platform-icon ios">
                <AppleOutlined />
              </div>
              <Typography.Title level={5} style={{ margin: '10px 0 4px' }}>
                iOS App
              </Typography.Title>
              <Typography.Text type="secondary">Design system and feature parity in progress</Typography.Text>
            </Card>
          </div>

          <div className="apps-roadmap">
            <div className="roadmap-item">
              <CheckCircleOutlined />
              <span>Core ordering system completed</span>
            </div>
            <div className="roadmap-item">
              <RocketOutlined />
              <span>Native app launch is the next milestone</span>
            </div>
          </div>

          <div className="apps-coming-actions">
            <Button type="primary" size="large" onClick={() => navigate(isLoggedIn ? '/user/app' : '/user/login')}>
              {isLoggedIn ? 'Order on Web Now' : 'Login & Order on Web'}
            </Button>
            <Button size="large" onClick={() => navigate(isLoggedIn ? '/user/items' : '/user/login')}>
              View Full Menu
            </Button>
          </div>
        </div>
      </section>

      <footer className="landing-footer-v2">
        <div className="landing-footer-inner">
          <div className="footer-brand-v2">
            <img src={logoImage} alt="Chatora Adda Logo" className="footer-brand-logo" />
            <div>
              <Typography.Title level={5} style={{ margin: 0, color: '#fff' }}>
                Chatora Adda
              </Typography.Title>
              <Typography.Text style={{ color: 'rgba(255,255,255,0.72)' }}>
                Night Online Cafe
              </Typography.Text>
            </div>
          </div>
          <Space wrap>
            <Button onClick={() => navigate('/privacypolicy')}>Privacy Policy</Button>
            <Button type="primary" onClick={() => navigate(isLoggedIn ? '/user/app' : '/user/login')}>
              {isLoggedIn ? 'Go to User App' : 'Login to Order'}
            </Button>
          </Space>
        </div>
      </footer>
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
  );
}