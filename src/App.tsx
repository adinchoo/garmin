import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import HomePage from './pages/HomePage';
import ActivitiesPage from './pages/ActivitiesPage';
import TrendsPage from './pages/TrendsPage';
import NutritionPage from './pages/NutritionPage';
import CoachPage from './pages/CoachPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/coach" element={<CoachPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AppShell>
  );
}
