type StatusBadgeProps = {
  label: string;
  tone: 'positive' | 'neutral' | 'warning';
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`status-badge ${tone}`}>{label}</span>;
}

