import { Button } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';

export default function QuantitySelector({ quantity, onAdd, onRemove, size = 'small' }) {
  if (quantity > 0) {
    return (
      <div className="qty-selector" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <Button
          size={size}
          icon={<MinusOutlined />}
          onClick={onRemove}
          className="qty-btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
        <span className="qty-value" style={{ fontWeight: '700', minWidth: '16px', textAlign: 'center' }}>{quantity}</span>
        <Button
          size={size}
          icon={<PlusOutlined />}
          onClick={onAdd}
          className="qty-btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      </div>
    );
  }

  return (
    <Button
      type="primary"
      size={size}
      onClick={onAdd}
      className="add-btn"
      style={{ fontWeight: '600' }}
    >
      + Add
    </Button>
  );
}
