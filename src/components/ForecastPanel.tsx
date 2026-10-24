type ForecastPanelProps = {
  recurringRevenue: number;
  inventoryOnHand: number;
};

function pointsFor(values: number[], minimum: number, maximum: number, startX = 8, endX = 192) {
  const range = Math.max(1, maximum - minimum);
  return values.map((value, index) => {
    const x = startX + (index / (values.length - 1)) * (endX - startX);
    const y = 88 - ((value - minimum) / range) * 76;
    return `${x},${y}`;
  }).join(' ');
}

function ProjectionChart({ title, unit, history, projection, threshold }: {
  title: string;
  unit: string;
  history: number[];
  projection: number[];
  threshold?: number;
}) {
  const values = [...history, ...projection];
  const minimum = Math.min(...values, ...(threshold === undefined ? [] : [threshold]));
  const maximum = Math.max(...values, ...(threshold === undefined ? [] : [threshold]));
  const historyPoints = pointsFor(history, minimum, maximum, 8, 104);
  const projectedPoints = pointsFor([history[history.length - 1], ...projection], minimum, maximum, 104, 192);
  const thresholdY = threshold === undefined
    ? undefined
    : 88 - ((threshold - minimum) / Math.max(1, maximum - minimum)) * 76;

  return <article className="forecast-chart">
    <div className="forecast-chart-heading"><strong>{title}</strong><small>{unit}</small></div>
    <svg viewBox="0 0 200 100" role="img" aria-label={`${title}: historical sample and projected demo trend`}>
      <path className="forecast-grid-line" d="M8 12H192M8 50H192M8 88H192" />
      {thresholdY !== undefined && <line className="forecast-threshold" x1="8" x2="192" y1={thresholdY} y2={thresholdY} />}
      <polyline className="forecast-history-line" points={historyPoints} />
      <polyline className="forecast-projection-line" points={projectedPoints} />
    </svg>
    <div className="forecast-periods"><span>حالي</span><span>توقع تجريبي</span></div>
    {threshold !== undefined && <small className="forecast-threshold-label">حد إعادة الطلب: {threshold} وحدة</small>}
  </article>;
}

export function ForecastPanel({ recurringRevenue, inventoryOnHand }: ForecastPanelProps) {
  const revenueHistory = [
    Math.round(recurringRevenue * 0.88),
    Math.round(recurringRevenue * 0.93),
    Math.round(recurringRevenue * 0.97),
    recurringRevenue,
  ];
  const revenueProjection = [
    Math.round(recurringRevenue * 1.025),
    Math.round(recurringRevenue * 1.05),
    Math.round(recurringRevenue * 1.075),
    Math.round(recurringRevenue * 1.1),
  ];
  const inventoryHistory = [
    inventoryOnHand + 5,
    inventoryOnHand + 3,
    inventoryOnHand + 2,
    inventoryOnHand,
  ];
  const inventoryProjection = [
    Math.max(0, inventoryOnHand - 1),
    Math.max(0, inventoryOnHand - 2),
    Math.max(0, inventoryOnHand - 3),
    Math.max(0, inventoryOnHand - 4),
  ];

  return <section className="forecast-panel" lang="ar" dir="rtl" aria-label="توقعات تشغيلية تجريبية">
    <header className="forecast-heading"><div><h2>توقعات تشغيلية تجريبية</h2><p>إسقاطات مبسطة من مؤشرات العرض الحالية، وليست تنبؤاً تشغيلياً موثوقاً.</p></div><span>بيانات توضيحية</span></header>
    <div className="forecast-grid">
      <ProjectionChart title="الإيراد الشهري المتكرر" unit="دولار · إسقاط ٤ فترات" history={revenueHistory} projection={revenueProjection} />
      <ProjectionChart title="مخزون العنصر منخفض الرصيد" unit="وحدات · اتجاه افتراضي" history={inventoryHistory} projection={inventoryProjection} threshold={15} />
    </div>
  </section>;
}
