import { dashboardData } from '../data/mockData';
import SectionHeader from '../components/SectionHeader';
import TrendChart from '../components/TrendChart';
import StatCard from '../components/StatCard';

export default function TrendsPage() {
  const data = dashboardData.overview;

  return (
    <>
      <SectionHeader eyebrow="Performance" title="Trends and momentum" />
      <div className="stats-row">
        <StatCard label="Avg. sleep" value="7.9h" delta="+0.6h" accent="blue" />
        <StatCard label="Avg. steps" value="12.1k" delta="+8.3%" accent="green" />
        <StatCard label="Readiness" value="84%" delta="Strong" accent="orange" />
        <StatCard label="Load" value="78/100" delta="Sustainable" accent="purple" />
      </div>

      <div className="panel">
        <TrendChart data={data} />
      </div>
    </>
  );
}
