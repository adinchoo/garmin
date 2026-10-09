type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  accent?: 'blue' | 'green' | 'orange' | 'purple';
};

export default function StatCard({ label, value, delta, accent = 'blue' }: StatCardProps) {
  return (
    <article className={`stat-card accent-${accent}`}>
      <div className="eyebrow">{label}</div>
      <div className="stat-value">{value}</div>
      {delta ? <div className="stat-delta">{delta}</div> : null}
    </article>
  );
}
