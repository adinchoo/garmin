import CoachCard from '../components/CoachCard';
import SectionHeader from '../components/SectionHeader';
import { dashboardData } from '../data/mockData';

export default function CoachPage() {
  return (
    <>
      <SectionHeader eyebrow="AI coach" title="Recovery and performance suggestions" />
      <div className="coach-grid">
        {dashboardData.coach.map((insight) => (
          <CoachCard key={insight.id} insight={insight} />
        ))}
      </div>
    </>
  );
}
