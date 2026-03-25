import { useMemo } from 'react';
import { Card, Col, Empty, Row, Spin, Typography } from 'antd';
import { Column, Line } from '@ant-design/plots';
import dayjs from 'dayjs';

function buildSeries(orders) {
  if (!orders?.length) {
    return { lineData: [], columnData: [], pieData: [], note: '' };
  }

  const byDay = new Map();
  orders.forEach((o) => {
    const d = dayjs(o.createdAt).format('YYYY-MM-DD');
    if (!byDay.has(d)) {
      byDay.set(d, { date: d, revenue: 0, bookings: 0 });
    }
    const row = byDay.get(d);
    row.bookings += 1;
    if (o.status !== 'CANCELLED') {
      row.revenue += Number(o.totalAmount) || 0;
    }
  });

  let series = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
  let note = '';

  if (series.length > 50) {
    const byWeek = new Map();
    series.forEach((row) => {
      const wk = dayjs(row.date).startOf('week').format('YYYY-MM-DD');
      if (!byWeek.has(wk)) {
        byWeek.set(wk, { period: wk, revenue: 0, bookings: 0 });
      }
      const z = byWeek.get(wk);
      z.revenue += row.revenue;
      z.bookings += row.bookings;
    });
    series = Array.from(byWeek.values()).sort((a, b) => a.period.localeCompare(b.period));
    note = 'Chart grouped by week (long date range).';
  }

  const lineData = series.map((r) => ({
    period: r.period || r.date,
    revenue: Math.round(r.revenue * 100) / 100,
  }));
  const columnData = series.map((r) => ({
    period: r.period || r.date,
    bookings: r.bookings,
  }));

  const statusCount = {};
  orders.forEach((o) => {
    const s = o.status || 'UNKNOWN';
    statusCount[s] = (statusCount[s] || 0) + 1;
  });
  const pieData = Object.entries(statusCount).map(([type, value]) => ({ type, value }));

  return { lineData, columnData, pieData, note };
}

/**
 * Presentation only — data comes from parent (already API-filtered).
 * @param {boolean} [embedded] — tighter spacing when nested inside another Card
 */
export default function OrderReportsCharts({ orders, loading, embedded }) {
  const { lineData, columnData, pieData, note } = useMemo(() => buildSeries(orders), [orders]);

  const lineConfig = useMemo(
    () => ({
      data: lineData,
      xField: 'period',
      yField: 'revenue',
      height: 280,
      smooth: true,
      style: {
        lineWidth: 2,
      },
      axis: {
        x: {
          labelAutoRotate: true,
          labelAutoHide: true,
        },
      },
      tooltip: {
        title: (d) => String(d.period),
      },
    }),
    [lineData]
  );

  const columnConfig = useMemo(
    () => ({
      data: columnData,
      xField: 'period',
      yField: 'bookings',
      height: 280,
      axis: {
        x: {
          labelAutoRotate: true,
          labelAutoHide: true,
        },
      },
      tooltip: {
        title: (d) => String(d.period),
      },
    }),
    [columnData]
  );

  const statusColumnConfig = useMemo(
    () => ({
      data: pieData.map((d) => ({ status: d.type, count: d.value })),
      xField: 'status',
      yField: 'count',
      height: 300,
      axis: {
        x: {
          labelAutoRotate: true,
          labelAutoHide: true,
        },
      },
    }),
    [pieData]
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!orders.length) {
    return <Empty description="No orders match the current filters" style={{ margin: '24px 0' }} />;
  }

  return (
    <div className={embedded ? 'order-reports-charts order-reports-charts--embedded' : 'order-reports-charts'}>
      {note ? (
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {note}
        </Typography.Text>
      ) : null}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Revenue (excl. cancelled)" size="small" className="admin-chart-card">
            {lineData.length ? <Line {...lineConfig} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Bookings per period" size="small" className="admin-chart-card">
            {columnData.length ? <Column {...columnConfig} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Orders by status" size="small" className="admin-chart-card">
            {pieData.length ? <Column {...statusColumnConfig} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
