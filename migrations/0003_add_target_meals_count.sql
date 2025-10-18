-- Add target_meals_count to weekly_meals to capture user-requested count
alter table if exists weekly_meals
    add column if not exists target_meals_count integer;


