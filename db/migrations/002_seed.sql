-- 002_seed.sql
INSERT INTO ingredients (name, unit, on_hand) VALUES
  ('Flour',     'kg',  50),
  ('Sugar',     'kg',  20),
  ('Butter',    'kg',   8),
  ('Eggs',      'pcs', 120),
  ('Milk',      'L',   15),
  ('Yeast',     'kg',   0.5),
  ('Salt',      'kg',   5),
  ('Tomatoes',  'kg',  30),
  ('Olive oil', 'L',    5),
  ('Garlic',    'kg',   2)
ON CONFLICT (name) DO NOTHING;

INSERT INTO recipes (name, yield_per_batch, yield_unit) VALUES
  ('Brioche loaf',    12,  'loaves'),
  ('Sponge cake',      8,  'cakes'),
  ('Marinara sauce',  10,  'L')
ON CONFLICT (name) DO NOTHING;

-- Brioche loaf ingredients (stored in base units matching ingredient unit)
-- Flour 3000g = 3kg, Butter 1200g = 1.2kg, Eggs 18pcs, Sugar 300g = 0.3kg,
-- Milk 600ml = 0.6L, Yeast 60g = 0.06kg, Salt 50g = 0.05kg
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_per_batch)
SELECT r.id, i.id, v.qty
FROM (VALUES
  ('Brioche loaf', 'Flour',  3),
  ('Brioche loaf', 'Butter', 1.2),
  ('Brioche loaf', 'Eggs',   18),
  ('Brioche loaf', 'Sugar',  0.3),
  ('Brioche loaf', 'Milk',   0.6),
  ('Brioche loaf', 'Yeast',  0.06),
  ('Brioche loaf', 'Salt',   0.05)
) AS v(recipe_name, ingredient_name, qty)
JOIN recipes r ON r.name = v.recipe_name
JOIN ingredients i ON i.name = v.ingredient_name
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

-- Sponge cake: Flour 1000g=1kg, Sugar 1000g=1kg, Eggs 20pcs, Butter 800g=0.8kg, Milk 300ml=0.3L
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_per_batch)
SELECT r.id, i.id, v.qty
FROM (VALUES
  ('Sponge cake', 'Flour',  1),
  ('Sponge cake', 'Sugar',  1),
  ('Sponge cake', 'Eggs',   20),
  ('Sponge cake', 'Butter', 0.8),
  ('Sponge cake', 'Milk',   0.3)
) AS v(recipe_name, ingredient_name, qty)
JOIN recipes r ON r.name = v.recipe_name
JOIN ingredients i ON i.name = v.ingredient_name
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

-- Marinara sauce: Tomatoes 8000g=8kg, Olive oil 400ml=0.4L, Garlic 250g=0.25kg, Salt 80g=0.08kg, Sugar 40g=0.04kg
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_per_batch)
SELECT r.id, i.id, v.qty
FROM (VALUES
  ('Marinara sauce', 'Tomatoes',  8),
  ('Marinara sauce', 'Olive oil', 0.4),
  ('Marinara sauce', 'Garlic',    0.25),
  ('Marinara sauce', 'Salt',      0.08),
  ('Marinara sauce', 'Sugar',     0.04)
) AS v(recipe_name, ingredient_name, qty)
JOIN recipes r ON r.name = v.recipe_name
JOIN ingredients i ON i.name = v.ingredient_name
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;
