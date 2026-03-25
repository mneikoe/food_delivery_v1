import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

/**
 * Export orders + summary to .xlsx (client-side, no API change).
 */
export function exportOrdersToExcel(orders, labelSuffix = '') {
  const rows = orders.map((o) => ({
    orderId: o.orderId,
    customer: o.userId?.name ?? '',
    phone: o.userId?.phone ?? '',
    totalAmount: Number(o.totalAmount) || 0,
    subtotal: Number(o.subtotal) || 0,
    deliveryFee: Number(o.deliveryFee) || 0,
    discount: Number(o.discount) || 0,
    status: o.status,
    deliveryPartner: o.deliveryPartnerId?.name ?? '',
    createdAt: o.createdAt ? dayjs(o.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  const revenueExCancelled = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;

  const summary = [
    ['Metric', 'Value'],
    ['Total orders (rows)', orders.length],
    ['Cancelled orders', cancelledCount],
    ['Revenue (excl. cancelled)', Math.round(revenueExCancelled * 100) / 100],
    ['Exported at', dayjs().format('YYYY-MM-DD HH:mm:ss')],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  const name = `orders_export_${labelSuffix || dayjs().format('YYYY-MM-DD_HHmm')}.xlsx`.replace(
    /[^\w.\-]/g,
    '_'
  );
  XLSX.writeFile(wb, name);
}
