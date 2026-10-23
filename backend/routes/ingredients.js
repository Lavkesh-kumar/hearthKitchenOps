const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/ingredients
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, unit, on_hand, reserved, (on_hand - reserved) AS available
     FROM ingredients ORDER BY name`
  );
  res.json(rows);
});

// GET /api/ingredients/:id/movements
router.get('/:id/movements', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT sm.id, sm.movement_type, sm.quantity, sm.created_at,
            po.id AS order_id, r.name AS recipe_name
     FROM stock_movements sm
     LEFT JOIN production_orders po ON po.id = sm.order_id
     LEFT JOIN recipes r ON r.id = po.recipe_id
     WHERE sm.ingredient_id = $1
     ORDER BY sm.created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

module.exports = router;
