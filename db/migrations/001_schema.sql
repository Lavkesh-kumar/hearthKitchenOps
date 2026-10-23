-- 001_schema.sql
CREATE TABLE IF NOT EXISTS ingredients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  unit VARCHAR(20) NOT NULL,
  on_hand NUMERIC(12,3) NOT NULL DEFAULT 0,
  reserved NUMERIC(12,3) NOT NULL DEFAULT 0,
  CHECK (on_hand >= 0),
  CHECK (reserved >= 0),
  CHECK (on_hand >= reserved)
);

CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  yield_per_batch NUMERIC(10,3) NOT NULL,
  yield_unit VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  quantity_per_batch NUMERIC(12,3) NOT NULL,
  UNIQUE(recipe_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS production_orders (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  batches NUMERIC(8,2) NOT NULL CHECK (batches > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','released','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  order_id INTEGER REFERENCES production_orders(id),
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('reserve','consume','release')),
  quantity NUMERIC(12,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
