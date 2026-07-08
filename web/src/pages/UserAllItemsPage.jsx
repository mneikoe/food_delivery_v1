import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Badge, Button, Card, Empty, Input, Space, Typography, message } from 'antd';
import { addUserCartItem, getUserCart, getUserCategories, getUserProducts, updateUserCartItem } from '../api/userApi';
import CategoryPill from '../components/user/CategoryPill';
import FoodCard from '../components/user/FoodCard';
import './UserApp.css';

const FALLBACK_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1600&auto=format&fit=crop';

export default function UserAllItemsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartCount, setCartCount] = useState(0);
  const [cartQtyMap, setCartQtyMap] = useState({});

  const syncCartState = (cartData) => {
    const items = cartData?.items || [];
    setCartCount(items.reduce((sum, item) => sum + (item.quantity || 0), 0));
    const nextMap = {};
    items.forEach((item) => {
      const key = item?.productId?._id || item?.productId || item?._id;
      if (!key) return;
      nextMap[key] = (nextMap[key] || 0) + (item.quantity || 0);
    });
    setCartQtyMap(nextMap);
  };

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
        syncCartState(cartRes.data || {});
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
      setCartQtyMap((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
      message.success('Added to cart');
    } catch (error) {
      message.error(error.response?.data?.error || 'Unable to add to cart');
    }
  };

  const onUpdateQuantity = async (productId, delta) => {
    const nextQty = (cartQtyMap[productId] || 0) + delta;
    try {
      await updateUserCartItem(productId, { quantity: nextQty });
      setCartQtyMap((prev) => ({ ...prev, [productId]: nextQty }));
      setCartCount((prev) => prev + delta);
    } catch (error) {
      message.error('Unable to update cart');
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
                <CategoryPill
                  category={{ name: 'All Items' }}
                  active={selectedCategory === 'all'}
                  onClick={() => setSelectedCategory('all')}
                />
                {categories.map((category) => (
                  <CategoryPill
                    key={category._id}
                    category={category}
                    active={selectedCategory === category._id}
                    onClick={() => setSelectedCategory(category._id)}
                  />
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
              {filteredProducts.map((item) => {
                const qty = cartQtyMap[item._id] || 0;
                return (
                  <FoodCard
                    key={item._id}
                    p={item}
                    quantity={qty}
                    onAdd={() => qty > 0 ? onUpdateQuantity(item._id, 1) : onAddToCart(item._id)}
                    onRemove={() => onUpdateQuantity(item._id, -1)}
                    navigate={navigate}
                  />
                );
              })}
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
