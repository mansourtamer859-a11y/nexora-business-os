import type { DashboardMetric } from '../types';

type MetricCardProps = {
  metric: DashboardMetric;
};

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <article className="metric-card glass-panel">
      <div className="metric-header">
        <p>{metric.label}</p>
        <span className={`delta ${metric.tone}`}>{metric.delta}</span>
      </div>
      <strong>{metric.value}</strong>
    </article>
  );
}

