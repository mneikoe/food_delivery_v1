import { Card, Typography } from 'antd';
import QuantitySelector from './QuantitySelector';

const FALLBACK_FOOD_IMAGE = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1600&auto=format&fit=crop';

export default function FoodCard({ p, quantity, onAdd, onRemove, navigate, className = '' }) {
  const handleCardClick = () => {
    if (navigate) {
      navigate(`/user/food/${p._id}`);
    }
  };

  return (
    <Card
      className={`user-item-grid-card premium-food-card ${className}`}
      hoverable
      cover={
        <div className="food-card-img-container" onClick={handleCardClick} style={{ overflow: 'hidden', position: 'relative', height: 160, cursor: 'pointer' }}>
          <img
            src={p.image || FALLBACK_FOOD_IMAGE}
            alt={p.name}
            className="user-grid-card-image"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
            onError={(e) => { e.currentTarget.src = FALLBACK_FOOD_IMAGE; }}
          />
          <div className="time-badge" style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 2, backgroundColor: 'rgba(2, 6, 23, 0.85)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#f8fafc' }}>🕒 15-20 MIN</span>
          </div>
        </div>
      }
    >
      <div onClick={handleCardClick} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <Typography.Text strong className="user-item-name" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            {p.name}
          </Typography.Text>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 800 }}>★ 4.8</span>
        </div>
        <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginTop: 6, marginBottom: 12, fontSize: 12, minHeight: 36, color: 'var(--text-muted)' }}>
          {p.description || 'Prepared fresh on order with high-quality ingredients'}
        </Typography.Paragraph>
      </div>

      <div className="user-item-grid-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Typography.Text strong style={{ fontSize: 16, color: 'var(--primary)' }}>
          ₹{p.price}
        </Typography.Text>
        <QuantitySelector
          quantity={quantity}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      </div>
    </Card>
  );
}
