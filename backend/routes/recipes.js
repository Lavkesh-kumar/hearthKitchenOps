const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/recipes
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.name, r.yield_per_batch, r.yield_unit,
            json_agg(json_build_object(
              'ingredient_id', i.id,
              'ingredient_name', i.name,
              'unit', i.unit,
              'quantity_per_batch', ri.quantity_per_batch
            ) ORDER BY i.name) AS ingredients
     FROM recipes r
     JOIN recipe_ingredients ri ON ri.recipe_id = r.id
     JOIN ingredients i ON i.id = ri.ingredient_id
     GROUP BY r.id ORDER BY r.name`
  );
  res.json(rows);
});

module.exports = router;
