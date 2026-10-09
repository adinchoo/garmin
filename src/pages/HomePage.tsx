import { useEffect, useState } from 'react';
import { loadDashboardData } from '../services/dashboard';
import type { DashboardData } from '../types';
import StatCard from '../components/StatCard';
import SectionHeader from '../components/SectionHeader';
import ActivityList from '../components/ActivityList';
import TrendChart from '../components/TrendChart';

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    loadDashboardData().then(setData);
  }, []);

  if (!data) {
    return <div className="loading-card">Loading performance data…</div>;
  }

  return (
    <>
      <section className="hero-panel">
        <div>
          <div className="eyebrow">Today</div>
          <h2>Good morning, {data.athlete.name.split(' ')[0]}.</h2>
          <p>Recovery is trending upward and your weekly load is pacing well for the next block.</p>
        </div>
        <div className="hero-score">
          <div className="score-ring">{data.athlete.readiness}%</div>
          <div className="muted">Readiness score</div>
        </div>
      </section>

      <section className="stats-row">
        <StatCard label="Sleep" value={`${data.athlete.sleepHours.toFixed(1)}h`} delta="+0.9h vs last week" accent="blue" />
        <StatCard label="Body battery" value={`${data.athlete.bodyBattery}%`} delta="Peak at 6pm" accent="green" />
        <StatCard label="Weekly steps" value={`${(data.athlete.weeklySteps / 1000).toFixed(1)}k`} delta="70% of target" accent="orange" />
        <StatCard label="Active minutes" value={`${data.athlete.activeMinutes}`} delta="2.4h training" accent="purple" />
      </section>

      <section className="main-grid">
        <div className="panel large-panel">
          <SectionHeader eyebrow="Overview" title="Weekly recovery and fitness trend" />
          <TrendChart data={data.overview.map((entry) => ({
            date: entry.date,
            steps: entry.steps,
            sleep: entry.sleep,
            readiness: entry.readiness,
          }))} />
        </div>

        <div className="panel side-panel">
          <SectionHeader eyebrow="Recovery" title="Daily snapshot" />
          <div className="mini-metrics">
            <div>
              <div className="eyebrow">Resting HR</div>
              <div className="metric-number">{data.athlete.restingHeartRate} bpm</div>
            </div>
            <div>
              <div className="eyebrow">Recovery</div>
              <div className="metric-number">{data.athlete.recovery}%</div>
            </div>
            <div>
              <div className="eyebrow">Body battery</div>
              <div className="metric-number">{data.athlete.bodyBattery}%</div>
            </div>
          </div>
        </div>
      </section>

      <section className="split-grid">
        <div className="panel">
          <SectionHeader eyebrow="Training" title="Recent activity" action={<button className="ghost-button" type="button">View all</button>} />
          <ActivityList items={data.activities.slice(0, 3)} />
        </div>

        <div className="panel">
          <SectionHeader eyebrow="Nutrition" title="Most recent meals" action={<button className="ghost-button" type="button">Log meal</button>} />
          <div className="meal-stack">
            {data.meals.slice(0, 3).map((meal) => (
              <div key={meal.id} className="mini-meal-row">
                <span className="mini-pill" style={{ background: `${meal.color}22`, color: meal.color }}>{meal.type}</span>
                <span>{meal.name}</span>
                <strong>{meal.calories} kcal</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
