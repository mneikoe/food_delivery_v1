import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Badge, Button, Card, Empty, Input, Space, Typography, message } from 'antd';
import { addUserCartItem, getUserCart, getUserCategories, getUserProducts } from '../api/userApi';
import './UserApp.css';

const FALLBACK_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1600&auto=format&fit=crop';

export default function UserCategoryItemsPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
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
        setCategories(categoriesRes.data || []);
        setProducts(productsRes.data || []);
        syncCartState(cartRes.data || {});
      } catch (error) {
        message.error(error.response?.data?.error || 'Failed to load category items');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const category = useMemo(
    () => (categories || []).find((item) => item._id === categoryId),
    [categories, categoryId]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products || []).filter((item) => {
      if (item.categoryId?._id !== categoryId) return false;
      if (!q) return true;
      return item.name?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    });
  }, [products, categoryId, search]);

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

  return (
    <div className="user-app-shell">
      <div className="user-app-content user-catalog-content">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Button className="catalog-back-btn" icon={<ArrowLeftOutlined />} onClick={() => navigate('/user/categories')}>
              Back to categories
            </Button>
            <Button onClick={() => navigate('/user/items')}>View Full Menu</Button>
          </Space>
          <Card>
            <div className="user-catalog-header">
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {category?.name || 'Category'} Items
                </Typography.Title>
                <Typography.Text type="secondary">
                  All items from this category in one place.
                </Typography.Text>
              </div>
            </div>
            <Input
              style={{ marginTop: 14 }}
              placeholder="Search items in this category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Card>
          {loading ? (
            <Card loading />
          ) : !filteredProducts.length ? (
            <Card>
              <Empty description="No items found in this category" />
            </Card>
          ) : (
            <div className="user-menu-grid">
              {filteredProducts.map((item) => (
                <Card
                  key={item._id}
                  className="user-item-grid-card"
                  cover={
                    item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="user-grid-card-image"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_FOOD_IMAGE;
                        }}
                      />
                    ) : (
                      <img src={FALLBACK_FOOD_IMAGE} alt={item.name || 'Item'} className="user-grid-card-image" />
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
                        {cartQtyMap[item._id] ? `Add (${cartQtyMap[item._id]})` : 'Add'}
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
