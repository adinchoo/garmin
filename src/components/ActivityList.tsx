import type { Activity } from '../types';

type ActivityListProps = {
  items: Activity[];
};

const typeColors: Record<Activity['type'], string> = {
  Run: '#7cc8ff',
  Ride: '#8f90ff',
  Swim: '#7ae7c7',
  Strength: '#ffb36d',
  Hike: '#d6b5ff',
  Recovery: '#7be0ff',
};

export default function ActivityList({ items }: ActivityListProps) {
  return (
    <div className="activity-list">
      {items.map((activity) => (
        <article key={activity.id} className="activity-row">
          <div
            className="activity-type-badge"
            style={{ background: `${typeColors[activity.type]}22`, color: typeColors[activity.type] }}
          >
            {activity.type}
          </div>
          <div className="activity-copy">
            <div className="activity-name">{activity.name}</div>
            <div className="muted">
              {new Date(activity.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {activity.duration} min
            </div>
          </div>
          <div className="activity-metrics">
            <div>{activity.distanceKm || 0} km</div>
            <div>{activity.avgHeartRate} bpm</div>
          </div>
        </article>
      ))}
    </div>
  );
}
