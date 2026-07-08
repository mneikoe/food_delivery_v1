import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { addUserCartItem, getUserCart, getUserCategories, getUserProducts, getPublicHeroSlides } from '../api/userApi';
import logoImage from '../assets/logo-chatora.png';
import CategoryPill from '../components/user/CategoryPill';
import FoodCard from '../components/user/FoodCard';
import './LandingPage.css';

const FALLBACK = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&auto=format&fit=crop';

export default function LandingPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [cartMap, setCartMap] = useState({});
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const isLoggedIn = Boolean(localStorage.getItem('user_token'));

  useEffect(() => {
    loadMenu();
    // Load hero slides
    const loadSlides = async () => {
      try {
        const res = await getPublicHeroSlides();
        if (res.data?.slides && res.data.slides.length > 0) {
          setHeroSlides(res.data.slides);
        }
      } catch (_) {}
    };
    loadSlides();
  }, []);

  // Auto rotate hero slides every 4s
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const t = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(t);
  }, [heroSlides]);

  useEffect(() => {
    loadMenu();
    // eslint-disable-next-line
  }, []);

  const loadMenu = async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([getUserCategories(), getUserProducts()]);
      const cats = catRes.data || [];
      setCategories(cats);
      setProducts(prodRes.data || []);
      if (cats.length) setSelectedCat(cats[0]._id);
      if (isLoggedIn) {
        const cartRes = await getUserCart();
        syncCart(cartRes.data);
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  const syncCart = (cartData) => {
    const items = cartData?.items || [];
    setCartCount(items.reduce((s, i) => s + (i.quantity || 0), 0));
    const m = {};
    items.forEach(i => {
      const k = i?.productId?._id || i?.productId || i?._id;
      if (k) m[k] = (m[k] || 0) + (i.quantity || 0);
    });
    setCartMap(m);
  };

  const filtered = useMemo(() =>
    selectedCat ? products.filter(p => p.categoryId?._id === selectedCat) : products.slice(0, 12),
    [products, selectedCat]
  );

  const handleAddToCart = async (productId) => {
    if (!isLoggedIn) {
      navigate('/user/login');
      return;
    }
    setAddingId(productId);
    try {
      await addUserCartItem({ productId, quantity: 1 });
      setCartCount(p => p + 1);
      setCartMap(p => ({ ...p, [productId]: (p[productId] || 0) + 1 }));
      message.success('Added to cart! 🛒');
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to add');
    } finally { setAddingId(null); }
  };

  return (
    <div className="lp-root">
      {/* NAVBAR */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-brand" onClick={() => navigate('/')}>
            <img src={logoImage} alt="Chatora Adda" className="lp-brand-logo" />
            <div>
              <div className="lp-brand-name">Chatora Adda</div>
              <div className="lp-brand-tag">Night Online Cafe</div>
            </div>
          </div>

          {/* Desktop nav links */}
          <div className="lp-nav-links">
            <a href="#menu" className="lp-nav-link">Menu</a>
            <a href="#features" className="lp-nav-link">Why Us</a>
            <a href="#app" className="lp-nav-link">App</a>
            <button className="lp-btn-outline" onClick={() => navigate('/privacypolicy')}>Privacy</button>
            {isLoggedIn ? (
              <button className="lp-btn-primary" onClick={() => navigate('/user/app')}>
                🍽️ My Orders
              </button>
            ) : (
              <>
                <button className="lp-btn-ghost" onClick={() => navigate('/user/login')}>Sign In</button>
                <button className="lp-btn-primary" onClick={() => navigate('/user/login')}>
                  Get Started →
                </button>
              </>
            )}
            {cartCount > 0 && (
              <button className="lp-cart-pill" onClick={() => navigate('/user/app')}>
                🛒 {cartCount}
              </button>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="lp-hamburger" onClick={() => setMobileMenu(!mobileMenu)}>
            <span /><span /><span />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="lp-mobile-menu">
            <a href="#menu" className="lp-mobile-link" onClick={() => setMobileMenu(false)}>Menu</a>
            <a href="#features" className="lp-mobile-link" onClick={() => setMobileMenu(false)}>Why Us</a>
            {isLoggedIn ? (
              <button className="lp-btn-primary lp-btn-block" onClick={() => navigate('/user/app')}>
                🍽️ Go to App
              </button>
            ) : (
              <>
                <button className="lp-btn-ghost lp-btn-block" onClick={() => navigate('/user/login')}>Sign In</button>
                <button className="lp-btn-primary lp-btn-block" onClick={() => navigate('/user/login')}>Sign Up Free</button>
              </>
            )}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          <div className="lp-hero-orb lp-orb1" />
          <div className="lp-hero-orb lp-orb2" />
          <div className="lp-hero-orb lp-orb3" />
        </div>
        <div className="lp-hero-content">
          <div className="lp-hero-text">
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot" />
              Now serving online · Fast delivery
            </div>
            <h1 className="lp-hero-title">
              {heroSlides[currentSlideIndex]?.headline ? (
                heroSlides[currentSlideIndex].headline
              ) : (
                <>
                  Cravings?<br />
                  <span className="lp-hero-accent">We've got you.</span>
                </>
              )}
            </h1>
            <p className="lp-hero-desc">
              {heroSlides[currentSlideIndex]?.text || 'Order from our freshly curated menu — biryani, burgers, chai, and so much more. Delivered hot to your doorstep.'}
            </p>
            <div className="lp-hero-actions">
              <button className="lp-cta-primary" onClick={() => navigate(isLoggedIn ? '/user/app' : '/user/login')}>
                {isLoggedIn ? '🍽️ Start Ordering' : '🚀 Order Now — Free'}
              </button>
              <a href="#menu" className="lp-cta-secondary">Explore Menu ↓</a>
            </div>
            <div className="lp-hero-stats">
              {[
                { num: '100+', label: 'Menu Items' },
                { num: '⚡', label: 'Fast Delivery' },
                { num: '🌙', label: 'Night Cafe' },
              ].map(s => (
                <div key={s.label} className="lp-hero-stat">
                  <div className="lp-hero-stat-num">{s.num}</div>
                  <div className="lp-hero-stat-lbl">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-hero-image-wrap">
            <div className="lp-hero-image-ring" />
            <img
              src={heroSlides[currentSlideIndex]?.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop"}
              alt="Delicious food spread"
              className="lp-hero-image"
              key={currentSlideIndex}
              style={{ animation: 'lpFadeIn 0.6s ease-in-out' }}
              onError={e => e.currentTarget.src = FALLBACK}
            />
            <div className="lp-hero-float-1">⭐ 4.9 Rating</div>
            <div className="lp-hero-float-2">🛵 Fast Delivery</div>
          </div>
        </div>
      </section>

      {/* FEATURES STRIP */}
      <section className="lp-features-strip">
        <div className="lp-features-inner">
          {[
            { icon: '⚡', title: 'Quick Dispatch', desc: 'Your order moves fast from kitchen to your door' },
            { icon: '🌙', title: 'Night Friendly', desc: 'Open late when you need food the most' },
            { icon: '🥗', title: 'Fresh Food', desc: 'Made fresh every time, no compromises' },
            { icon: '💳', title: 'Easy Payment', desc: 'COD, UPI, Cards — pay your way' },
          ].map(f => (
            <div key={f.title} className="lp-feature-item">
              <div className="lp-feature-icon">{f.icon}</div>
              <div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MENU SECTION */}
      <section className="lp-menu-section" id="menu">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-section-badge">Our Menu</span>
            <h2 className="lp-section-title">What's on the table?</h2>
            <p className="lp-section-desc">Browse by category and add your favourites directly to cart.</p>
          </div>

          {/* Category pills */}
          <div className="lp-cat-pills">
            {loading && !categories.length
              ? [1,2,3,4].map(i => <div key={i} className="lp-cat-pill lp-skeleton" style={{ width: 90 }} />)
              : categories.map(cat => (
                <CategoryPill
                  key={cat._id}
                  category={cat}
                  active={selectedCat === cat._id}
                  onClick={() => setSelectedCat(cat._id)}
                />
              ))
            }
          </div>

          {/* Items Grid */}
          <div className="lp-food-grid">
            {loading && !filtered.length
              ? [1,2,3,4,5,6].map(i => <div key={i} className="lp-food-card lp-skeleton" style={{ height: 310 }} />)
              : filtered.map(food => (
                <FoodCard
                  key={food._id}
                  p={food}
                  quantity={cartMap[food._id] || 0}
                  onAdd={() => handleAddToCart(food._id)}
                  onRemove={() => navigate('/user/login')}
                  navigate={navigate}
                />
              ))
            }
          </div>

          {!loading && filtered.length === 0 && categories.length > 0 && (
            <div className="lp-empty">
              <div style={{ fontSize: 48 }}>🍽️</div>
              <p>No items in this category yet</p>
            </div>
          )}

          {cartCount > 0 && (
            <div className="lp-view-cart-banner">
              <span>🛒 {cartCount} item{cartCount > 1 ? 's' : ''} in cart</span>
              <button className="lp-btn-primary" onClick={() => navigate('/user/app')}>
                View Cart & Checkout →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* WHY US */}
      <section className="lp-why-section" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-section-badge">Why Choose Us</span>
            <h2 className="lp-section-title">The Chatora Adda Promise</h2>
            <p className="lp-section-desc">Real food. Real speed. Real support.</p>
          </div>
          <div className="lp-why-grid">
            {[
              { icon: '🚀', title: 'Quick Dispatch', desc: 'Orders move from kitchen to delivery queue instantly. No delays, no excuses.' },
              { icon: '🛡️', title: 'Hygiene First', desc: "Standardized prep and handling every single time. We don't cut corners." },
              { icon: '🌙', title: 'Late Night Friendly', desc: 'When everyone else is closed, we deliver. Built for real-world cravings.' },
              { icon: '💬', title: 'Real Support', desc: 'Talk to a real person, not a bot. We respond when it matters.' },
            ].map(w => (
              <div key={w.title} className="lp-why-card">
                <div className="lp-why-icon">{w.icon}</div>
                <div className="lp-why-title">{w.title}</div>
                <div className="lp-why-desc">{w.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-how-section">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-section-badge">How It Works</span>
            <h2 className="lp-section-title">3 simple steps</h2>
          </div>
          <div className="lp-steps">
            {[
              { step: '01', icon: '📱', title: 'Browse & Pick', desc: 'Explore our full menu, pick your favourites' },
              { step: '02', icon: '🛒', title: 'Add to Cart', desc: 'Add items, apply coupons, choose payment' },
              { step: '03', icon: '🛵', title: 'Fast Delivery', desc: 'We deliver hot food right to your door' },
            ].map((s, i) => (
              <div key={s.step} className="lp-step">
                <div className="lp-step-num">{s.step}</div>
                <div className="lp-step-icon">{s.icon}</div>
                <div className="lp-step-title">{s.title}</div>
                <div className="lp-step-desc">{s.desc}</div>
                {i < 2 && <div className="lp-step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APP SECTION */}
      <section className="lp-app-section" id="app">
        <div className="lp-section-inner">
          <div className="lp-app-card">
            <div className="lp-app-text">
              <span className="lp-section-badge">Mobile Apps</span>
              <h2 className="lp-app-title">Android & iOS Apps Coming Soon</h2>
              <p className="lp-app-desc">
                We're polishing a native experience for both platforms. Until then, use our web app — same account, same menu, smooth checkout.
              </p>
              <div className="lp-app-roadmap">
                <div className="lp-roadmap-item">✅ Core ordering system live</div>
                <div className="lp-roadmap-item">✅ Web app with full features</div>
                <div className="lp-roadmap-item">🔄 Native Android app in QA</div>
                <div className="lp-roadmap-item">🔄 iOS app in design</div>
              </div>
              <button className="lp-cta-primary" style={{ marginTop: 24 }} onClick={() => navigate(isLoggedIn ? '/user/app' : '/user/login')}>
                {isLoggedIn ? 'Order on Web Now →' : 'Sign Up & Order Now →'}
              </button>
            </div>
            <div className="lp-app-platforms">
              <div className="lp-platform-card android">
                <div className="lp-platform-icon">🤖</div>
                <div className="lp-platform-name">Android</div>
                <div className="lp-platform-status">In QA Testing</div>
              </div>
              <div className="lp-platform-card ios">
                <div className="lp-platform-icon">🍎</div>
                <div className="lp-platform-name">iOS</div>
                <div className="lp-platform-status">Design Phase</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="lp-cta-section">
        <div className="lp-section-inner">
          <div className="lp-cta-banner">
            <div>
              <h2 className="lp-cta-title">Ready to order?</h2>
              <p className="lp-cta-sub">Join thousands of happy customers. Sign up takes 30 seconds.</p>
            </div>
            <div className="lp-cta-actions">
              <button className="lp-cta-primary" onClick={() => navigate('/user/login')}>
                {isLoggedIn ? '🍽️ Go to App' : '🚀 Order Now — Free'}
              </button>
              {!isLoggedIn && (
                <button className="lp-cta-secondary-white" onClick={() => navigate('/user/login')}>
                  Sign In →
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src={logoImage} alt="Chatora Adda" className="lp-footer-logo" />
            <div>
              <div className="lp-footer-brand-name">Chatora Adda</div>
              <div className="lp-footer-brand-tag">Night Online Cafe</div>
            </div>
          </div>
          <div className="lp-footer-links">
            <a href="#menu" className="lp-footer-link">Menu</a>
            <a href="#features" className="lp-footer-link">Features</a>
            <span className="lp-footer-link" onClick={() => navigate('/privacypolicy')} style={{ cursor:'pointer' }}>Privacy</span>
          </div>
          <div className="lp-footer-right">
            <p className="lp-footer-copy">© 2025 Chatora Adda. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating cart */}
      {cartCount > 0 && (
        <button className="lp-floating-cart" onClick={() => navigate('/user/app')}>
          🛒 {cartCount} — View Cart
        </button>
      )}
    </div>
  );
}