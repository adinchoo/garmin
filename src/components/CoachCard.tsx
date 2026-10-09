import type { CoachInsight } from '../types';

type CoachCardProps = {
  insight: CoachInsight;
};

export default function CoachCard({ insight }: CoachCardProps) {
  return (
    <article className="coach-card">
      <div className="coach-header">
        <span className="coach-label">{insight.emphasis}</span>
        <span className="coach-confidence">{insight.confidence}%</span>
      </div>
      <h3>{insight.title}</h3>
      <p>{insight.summary}</p>
      <div className="coach-action">{insight.action}</div>
    </article>
  );
}
