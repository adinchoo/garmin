import MealCard from '../components/MealCard';
import SectionHeader from '../components/SectionHeader';
import { dashboardData } from '../data/mockData';

export default function NutritionPage() {
  const totalCalories = dashboardData.meals.reduce((sum, meal) => sum + meal.calories, 0);
  const protein = dashboardData.meals.reduce((sum, meal) => sum + meal.protein, 0);
  const carbs = dashboardData.meals.reduce((sum, meal) => sum + meal.carbs, 0);
  const fats = dashboardData.meals.reduce((sum, meal) => sum + meal.fats, 0);

  return (
    <>
      <SectionHeader eyebrow="Fuel" title="Nutrition and meal planning" />
      <div className="nutrition-summary panel">
        <div>
          <div className="eyebrow">Calories</div>
          <div className="metric-number">{totalCalories} kcal</div>
        </div>
        <div>
          <div className="eyebrow">Protein</div>
          <div className="metric-number">{protein} g</div>
        </div>
        <div>
          <div className="eyebrow">Carbs</div>
          <div className="metric-number">{carbs} g</div>
        </div>
        <div>
          <div className="eyebrow">Fats</div>
          <div className="metric-number">{fats} g</div>
        </div>
      </div>

      <div className="meal-grid">
        {dashboardData.meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} />
        ))}
      </div>
    </>
  );
}
