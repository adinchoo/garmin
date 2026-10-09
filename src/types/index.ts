export type ActivityType = 'Run' | 'Ride' | 'Swim' | 'Strength' | 'Hike' | 'Recovery';

export type Activity = {
  id: string;
  name: string;
  type: ActivityType;
  date: string;
  duration: number;
  distanceKm: number;
  calories: number;
  avgHeartRate: number;
  effort: number;
  elevationGain: number;
  status: 'Completed' | 'Planned' | 'Recovery';
};

export type Meal = {
  id: string;
  name: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  color: string;
};

export type CoachInsight = {
  id: string;
  title: string;
  summary: string;
  confidence: number;
  action: string;
  emphasis: 'Recovery' | 'Intensity' | 'Fuel' | 'Sleep';
};

export type OverviewPoint = {
  date: string;
  steps: number;
  sleep: number;
  stress: number;
  readiness: number;
};

export type DashboardData = {
  athlete: {
    name: string;
    readiness: number;
    recovery: number;
    sleepHours: number;
    bodyBattery: number;
    restingHeartRate: number;
    weeklySteps: number;
    activeMinutes: number;
  };
  activities: Activity[];
  meals: Meal[];
  coach: CoachInsight[];
  overview: OverviewPoint[];
};
