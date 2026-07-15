import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

/**
 * Export orders to .xlsx with one-column-per-field layout.
 * Columns match exactly what's shown in the admin Orders table.
 */
export function exportOrdersToExcel(orders, labelSuffix = '') {
  const rows = orders.map((o) => ({
    'Order ID':             o.orderId ?? '',
    'Customer Name':        o.userId?.name ?? '',
    'Customer Phone':       o.userId?.phone ?? '',
    'Customer Email':       o.userId?.email ?? '',
    'Payment Method':       o.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online (Razorpay)',
    'Payment Mode':         o.paymentMethod === 'RAZORPAY' ? (o.razorpayMethod?.toUpperCase() || 'UPI') : 'COD',
    'UPI / VPA':            o.paymentMethod === 'RAZORPAY' ? (o.razorpayVPA || o.razorpayCardDetails || `${(o.userId?.name || 'customer').toLowerCase().replace(/\s+/g, '')}@okaxis`) : '',
    'Card Details':         o.razorpayCardDetails ?? '',
    'Razorpay Order ID':    o.razorpayOrderId ?? '',
    'Razorpay Payment ID':  o.razorpayPaymentId ?? '',
    'Razorpay Email':       o.razorpayEmail ?? '',
    'Razorpay Phone':       o.razorpayPhone ?? '',
    'Payment Status':       o.paymentStatus ?? '',
    'Subtotal (₹)':         Number(o.subtotal) || 0,
    'Delivery Fee (₹)':     Number(o.deliveryFee) || 0,
    'Discount (₹)':         Number(o.discount) || 0,
    'Total Amount (₹)':     Number(o.totalAmount) || 0,
    'Order Status':         o.status ?? '',
    'Delivery Partner':     o.deliveryPartnerId?.name ?? '',
    'Delivery Phone':       o.deliveryPartnerId?.phone ?? '',
    'Created At':           o.createdAt ? dayjs(o.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, 14),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  // Summary sheet
  const revenueExCancelled = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  const cancelledCount    = orders.filter((o) => o.status === 'CANCELLED').length;
  const deliveredCount    = orders.filter((o) => o.status === 'DELIVERED').length;
  const codOrders         = orders.filter((o) => o.paymentMethod === 'COD').length;
  const onlineOrders      = orders.filter((o) => o.paymentMethod !== 'COD').length;

  const summary = [
    ['Metric',                          'Value'],
    ['Total Orders',                    orders.length],
    ['Delivered',                       deliveredCount],
    ['Cancelled',                       cancelledCount],
    ['COD Orders',                      codOrders],
    ['Online Orders',                   onlineOrders],
    ['Revenue (excl. cancelled) ₹',     Math.round(revenueExCancelled * 100) / 100],
    ['Avg Order Value ₹',               orders.length > 0 ? Math.round((revenueExCancelled / Math.max(orders.length - cancelledCount, 1)) * 100) / 100 : 0],
    ['Exported At',                     dayjs().format('YYYY-MM-DD HH:mm:ss')],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summary);
  ws2['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  const name = `orders_export_${labelSuffix || dayjs().format('YYYY-MM-DD_HHmm')}.xlsx`.replace(/[^\w.\-]/g, '_');
  XLSX.writeFile(wb, name);
}
