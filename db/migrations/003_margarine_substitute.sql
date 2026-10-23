-- Add margarine ingredient
INSERT INTO ingredients (name, unit, on_hand) VALUES ('Margarine', 'kg', 5)
ON CONFLICT (name) DO NOTHING;

-- Substitutes table: substitute_id can replace primary_id
CREATE TABLE IF NOT EXISTS ingredient_substitutes (
  id SERIAL PRIMARY KEY,
  primary_ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  substitute_ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  UNIQUE(primary_ingredient_id, substitute_ingredient_id)
);

INSERT INTO ingredient_substitutes (primary_ingredient_id, substitute_ingredient_id)
SELECT p.id, s.id FROM ingredients p, ingredients s
WHERE p.name = 'Butter' AND s.name = 'Margarine'
ON CONFLICT DO NOTHING;

-- Tracks actual per-ingredient reservations per order (including substitutes)
CREATE TABLE IF NOT EXISTS order_reservations (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES production_orders(id),
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  quantity NUMERIC(12,3) NOT NULL,
  UNIQUE(order_id, ingredient_id)
);
