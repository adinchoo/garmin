import { useMemo, useState } from 'react';
import { dashboardData } from '../data/mockData';
import SectionHeader from '../components/SectionHeader';
import ActivityList from '../components/ActivityList';

export default function ActivitiesPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'All' | 'Run' | 'Ride' | 'Swim' | 'Strength' | 'Hike' | 'Recovery'>('All');

  const filtered = useMemo(() => {
    return dashboardData.activities.filter((activity) => {
      const matchesType = type === 'All' || activity.type === type;
      const haystack = `${activity.name} ${activity.type}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      return matchesType && matchesQuery;
    });
  }, [query, type]);

  return (
    <>
      <SectionHeader eyebrow="Training log" title="Activity analytics" />
      <div className="toolbar">
        <input
          aria-label="Search activities"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or type"
          className="search-input"
        />
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="select-input">
          <option value="All">All types</option>
          <option value="Run">Run</option>
          <option value="Ride">Ride</option>
          <option value="Swim">Swim</option>
          <option value="Strength">Strength</option>
          <option value="Recovery">Recovery</option>
        </select>
      </div>

      <div className="panel padded-panel">
        <ActivityList items={filtered} />
      </div>
    </>
  );
}
