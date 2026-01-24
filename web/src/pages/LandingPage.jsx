import { useState, useEffect, useRef } from 'react';
import { Button, Row, Col, Card, Typography, Space, message, Divider } from 'antd';
import {
  ShoppingOutlined,
  RocketOutlined,
  SafetyOutlined,
  HeartOutlined,
  AndroidOutlined,
  DownloadOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
  GlobalOutlined,
  PhoneOutlined,
  MailOutlined,
  MenuOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LandingPage.css';

const { Title, Paragraph, Text } = Typography;

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [apkInfo, setApkInfo] = useState(null);
  const heroRef = useRef(null);

  // Elegant color theme for a new brand
  const theme = {
    primary: '#2D6A4F', // Elegant Forest Green
    secondary: '#40916C', // Softer Green
    accent: '#74C69D', // Light Mint
    neutral: '#1B4332', // Dark Green
    light: '#F8F9FA',
    dark: '#0F1A1C',
    gradient: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)',
    gradientLight: 'linear-gradient(135deg, #74C69D 0%, #95D5B2 100%)'
  };

  useEffect(() => {
    // Fetch APK info from backend
    fetchApkInfo();
    
    // Scroll progress tracking
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchApkInfo = async () => {
    try {
      console.log('🔍 Fetching APK info from /api/public/apk-info');
      const response = await axios.get('/api/public/apk-info');
      console.log('✅ APK info response:', response.data);
      if (response.data && response.data.available) {
        setApkInfo(response.data);
      }
    } catch (error) {
      console.error('❌ Failed to fetch APK info:', error);
    }
  };

  const handleDownloadApp = () => {
    if (apkInfo && apkInfo.available && apkInfo.url) {
      console.log('🔽 Starting APK download:', apkInfo);
      console.log('📥 Download URL:', apkInfo.url);
      
      // Direct download using relative URL (Vite will proxy it)
      window.location.href = apkInfo.url;
      
      console.log('✅ Download initiated');
      
      setTimeout(() => {
        message.success({
          content: 'Download started! Thank you for choosing Chatora Adda.',
          duration: 3,
          style: { 
            borderRadius: '8px'
          }
        });
      }, 500);
    } else {
      console.log('❌ APK not available:', apkInfo);
      message.info({
        content: 'The app will be available soon. Thank you for your interest!',
        duration: 3,
        style: { 
          borderRadius: '8px'
        }
      });
    }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const features = [
    {
      icon: <RocketOutlined />,
      title: 'Fast Delivery',
      description: 'Quick and reliable delivery service'
    },
    {
      icon: <SafetyOutlined />,
      title: 'Safe & Hygienic',
      description: 'Highest standards of food safety'
    },
    {
      icon: <HeartOutlined />,
      title: 'Fresh Ingredients',
      description: 'Daily sourced, quality ingredients'
    },
    {
      icon: <ClockCircleOutlined />,
      title: '24/7 Service',
      description: 'Order anytime, we are always here'
    }
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Browse',
      description: 'Explore our carefully curated menu'
    },
    {
      step: '2',
      title: 'Select',
      description: 'Choose your favorite dishes'
    },
    {
      step: '3',
      title: 'Order',
      description: 'Place your order securely'
    },
    {
      step: '4',
      title: 'Enjoy',
      description: 'Receive and enjoy your meal'
    }
  ];

  // Simple, elegant menu preview
  const menuPreview = [
    {
      name: 'Classic Biryani',
      category: 'Rice Dishes'
    },
    {
      name: 'Butter Chicken',
      category: 'Main Course'
    },
    {
      name: 'Paneer Tikka',
      category: 'Starters'
    },
    {
      name: 'Gulab Jamun',
      category: 'Desserts'
    }
  ];

  return (
    <div className="landing-page">
      {/* Simple Back to Top Button */}
      {showScrollTop && (
        <button className="back-to-top" onClick={scrollToTop}>
          <ArrowDownOutlined style={{ transform: 'rotate(180deg)' }} />
        </button>
      )}

      {/* Clean Navigation */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-logo" onClick={() => scrollToSection('hero')}>
            <div className="logo-icon" style={{ background: theme.gradient }}>
              C
            </div>
            <span className="brand-name">
              <span className="brand-main">Chatora</span>
              <span className="brand-sub">Adda</span>
            </span>
          </div>
          
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <MenuOutlined />
          </button>

          <div className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
            <a onClick={() => scrollToSection('hero')} className="nav-link">Home</a>
            <a onClick={() => scrollToSection('about')} className="nav-link">About</a>
            <a onClick={() => scrollToSection('features')} className="nav-link">Why Us</a>
            <a onClick={() => scrollToSection('download')} className="nav-link">Download</a>
          </div>
        </div>
      </nav>

      {/* Hero Section - Clean & Elegant */}
      <section id="hero" className="hero-section" ref={heroRef}>
        <div className="hero-container">
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <div className="hero-content">
                <div className="hero-badge">
                  <span>🌟 Launching Soon</span>
                </div>
                <Title level={1} className="hero-title">
                  Welcome to
                  <br />
                  <span className="brand-highlight">Chatora Adda</span>
                </Title>
                <Paragraph className="hero-description">
                  A new beginning in food delivery. We're bringing you fresh, 
                  delicious meals with care and attention to quality.
                </Paragraph>
                <Space size="large" className="hero-actions">
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadApp}
                    style={{ background: theme.gradient }}
                    className="download-btn"
                  >
                    Download App
                  </Button>
                  <Button 
                    size="large"
                    onClick={() => scrollToSection('about')}
                    className="learn-more-btn"
                  >
                    Learn More
                  </Button>
                </Space>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div className="hero-visual">
                <div className="hero-image-container">
                  <div className="hero-image-frame">
                    <img 
                      src="https://img.freepik.com/premium-photo/food-photography-delicious-food-presentation-images_1301985-137.jpg" 
                      alt="Delicious food presentation" 
                      className="hero-image"
                    />
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* About Section - Building Trust */}
      <section id="about" className="about-section">
        <div className="section-container">
          <div className="section-header">
            <Title level={2} className="section-title">
              Our Story
            </Title>
            <Paragraph className="section-subtitle">
              A fresh approach to food delivery
            </Paragraph>
          </div>
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <div className="about-content">
                <Paragraph className="about-text">
                  We are Chatora Adda - a new venture born from the passion for 
                  good food and great service. As we begin our journey, we're 
                  committed to bringing you the best dining experience.
                </Paragraph>
                <div className="about-values">
                  <div className="value-item">
                    <CheckCircleOutlined style={{ color: theme.primary }} />
                    <span>Quality First</span>
                  </div>
                  <div className="value-item">
                    <CheckCircleOutlined style={{ color: theme.primary }} />
                    <span>Customer Focus</span>
                  </div>
                  <div className="value-item">
                    <CheckCircleOutlined style={{ color: theme.primary }} />
                    <span>Sustainable Growth</span>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div className="about-visual">
                <div className="stat-cards">
                  <div className="stat-card">
                    <div className="stat-number">New</div>
                    <div className="stat-label">Brand</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">Fresh</div>
                    <div className="stat-label">Start</div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Features Section - Clean & Simple */}
      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header">
            <Title level={2} className="section-title">
              Why Choose Us
            </Title>
            <Paragraph className="section-subtitle">
              What makes us different
            </Paragraph>
          </div>
          <Row gutter={[32, 32]}>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card className="feature-card" bordered={false}>
                  <div className="feature-icon" style={{ color: theme.primary }}>
                    {feature.icon}
                  </div>
                  <Title level={4} className="feature-title">{feature.title}</Title>
                  <Paragraph className="feature-description">
                    {feature.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Simple How It Works */}
      <section className="how-it-works-section">
        <div className="section-container">
          <div className="section-header">
            <Title level={2} className="section-title">
              How It Works
            </Title>
            <Paragraph className="section-subtitle">
              Simple steps to get your food
            </Paragraph>
          </div>
          <div className="steps-container">
            {howItWorks.map((step, index) => (
              <div key={index} className="step-item">
                <div className="step-number" style={{ background: theme.gradient }}>
                  {step.step}
                </div>
                <div className="step-content">
                  <Title level={4} className="step-title">{step.title}</Title>
                  <Paragraph className="step-description">
                    {step.description}
                  </Paragraph>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Preview - Simple & Elegant */}
      <section className="menu-section">
        <div className="section-container">
          <div className="section-header">
            <Title level={2} className="section-title">
              Our Menu Preview
            </Title>
            <Paragraph className="section-subtitle">
              A glimpse of what we offer
            </Paragraph>
          </div>
          <div className="menu-preview">
            {menuPreview.map((item, index) => (
              <div key={index} className="menu-item">
                <div className="menu-item-content">
                  <Title level={5} className="menu-item-name">{item.name}</Title>
                  <Text className="menu-item-category">{item.category}</Text>
                </div>
                <Divider className="menu-divider" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Download CTA Section */}
      <section id="download" className="download-section">
        <div className="section-container">
          <div className="download-content">
            <Title level={2} className="download-title">
              Be Among the First
            </Title>
            <Paragraph className="download-description">
              Download our app and be part of our journey from the beginning. 
              Get early access and special launch offers.
            </Paragraph>
            <div className="download-benefits">
              <div className="benefit-item">
                <StarOutlined />
                <span>Early Access</span>
              </div>
              <div className="benefit-item">
                <StarOutlined />
                <span>Launch Offers</span>
              </div>
              <div className="benefit-item">
                <StarOutlined />
                <span>Priority Support</span>
              </div>
            </div>
            <Button 
              type="primary" 
              size="large" 
              icon={<DownloadOutlined />}
              onClick={handleDownloadApp}
              style={{ 
                background: theme.gradient,
                marginTop: '40px'
              }}
              className="main-download-btn"
            >
              Download App
            </Button>
            <div className="download-note">
              <Text type="secondary">
                Available soon on the Play Store
              </Text>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="footer">
        <div className="footer-container">
          <Row gutter={[32, 32]}>
            <Col xs={24} md={12} lg={6}>
              <div className="footer-section">
                <div className="footer-logo">
                  <div className="logo-small" style={{ background: theme.gradient }}>
                    C
                  </div>
                  <div className="footer-brand">
                    <div className="footer-brand-main">Chatora</div>
                    <div className="footer-brand-sub">Adda</div>
                  </div>
                </div>
                <Paragraph className="footer-text">
                  Bringing fresh food to your doorstep.
                </Paragraph>
              </div>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <div className="footer-section">
                <Title level={5} className="footer-heading">Quick Links</Title>
                <ul className="footer-links">
                  <li><a onClick={() => scrollToSection('hero')}>Home</a></li>
                  <li><a onClick={() => scrollToSection('about')}>About</a></li>
                  <li><a onClick={() => scrollToSection('features')}>Why Us</a></li>
                  <li><a onClick={() => scrollToSection('download')}>Download</a></li>
                </ul>
              </div>
            </Col>
            
            <Col xs={24} md={12} lg={6}>
              <div className="footer-section">
                <Title level={5} className="footer-heading">Contact</Title>
                <div className="contact-info">
                  <div className="contact-item">
                    <MailOutlined /> contact@chatoraadda.in
                  </div>
                  <div className="contact-item">
                    <GlobalOutlined /> Coming Soon
                  </div>
                </div>
              </div>
            </Col>
          </Row>
          <Divider className="footer-divider" />
          <div className="footer-bottom">
            <Text className="footer-copyright">
              Chatora Adda. All rights reserved.
            </Text>
          </div>
        </div>
      </footer>
    </div>
  );
}