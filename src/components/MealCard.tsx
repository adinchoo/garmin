import type { Meal } from '../types';

type MealCardProps = {
  meal: Meal;
};

export default function MealCard({ meal }: MealCardProps) {
  return (
    <article className="meal-card">
      <div className="meal-topline">
        <span className="meal-type-badge" style={{ background: `${meal.color}22`, color: meal.color }}>
          {meal.type}
        </span>
        <span className="meal-time">{meal.time}</span>
      </div>
      <div className="meal-name">{meal.name}</div>
      <div className="meal-macros">
        <span>{meal.calories} kcal</span>
        <span>{meal.protein}P</span>
        <span>{meal.carbs}C</span>
        <span>{meal.fats}F</span>
      </div>
    </article>
  );
}
