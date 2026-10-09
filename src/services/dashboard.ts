import { dashboardData } from '../data/mockData';
import type { DashboardData } from '../types';

export async function loadDashboardData(): Promise<DashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 250));

  return dashboardData;
}
