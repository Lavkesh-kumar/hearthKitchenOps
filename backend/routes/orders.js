const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/orders?status=draft
router.get('/', async (req, res) => {
  const { status } = req.query;
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = 'WHERE po.status = $1';
  }
  const { rows } = await pool.query(
    `SELECT po.id, po.batches, po.status, po.created_at, po.updated_at,
            r.id AS recipe_id, r.name AS recipe_name
     FROM production_orders po
     JOIN recipes r ON r.id = po.recipe_id
     ${where}
     ORDER BY po.created_at DESC`,
    params
  );
  res.json(rows);
});

// POST /api/orders — create draft
router.post('/', async (req, res) => {
  const { recipe_id, batches } = req.body;
  if (!recipe_id || !batches || batches <= 0)
    return res.status(400).json({ error: 'recipe_id and batches > 0 required' });

  const { rows } = await pool.query(
    `INSERT INTO production_orders (recipe_id, batches) VALUES ($1, $2) RETURNING *`,
    [recipe_id, batches]
  );
  res.status(201).json(rows[0]);
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT po.id, po.batches, po.status, po.created_at, po.updated_at,
            r.id AS recipe_id, r.name AS recipe_name,
            r.yield_per_batch, r.yield_unit
     FROM production_orders po
     JOIN recipes r ON r.id = po.recipe_id
     WHERE po.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });

  const order = rows[0];

  // ingredient requirements for this order
  const { rows: reqs } = await pool.query(
    `SELECT i.id AS ingredient_id, i.name, i.unit,
            ri.quantity_per_batch,
            ri.quantity_per_batch * $1 AS total_required,
            i.on_hand,
            i.reserved,
            (i.on_hand - i.reserved) AS available
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = $2`,
    [order.batches, order.recipe_id]
  );
  order.requirements = reqs;

  // stock movements linked to this order
  const { rows: movements } = await pool.query(
    `SELECT sm.id, sm.movement_type, sm.quantity, sm.created_at,
            i.name AS ingredient_name, i.unit
     FROM stock_movements sm
     JOIN ingredients i ON i.id = sm.ingredient_id
     WHERE sm.order_id = $1
     ORDER BY sm.created_at DESC`,
    [req.params.id]
  );
  order.movements = movements;

  res.json(order);
});

// POST /api/orders/:id/release
router.post('/:id/release', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the order row
    const { rows: orderRows } = await client.query(
      `SELECT po.*, r.id AS recipe_id FROM production_orders po
       JOIN recipes r ON r.id = po.recipe_id
       WHERE po.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (!orderRows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    const order = orderRows[0];
    if (order.status !== 'draft') { await client.query('ROLLBACK'); return res.status(400).json({ error: `Cannot release an order with status '${order.status}'` }); }

    // Get ingredient requirements with row-level locks
    const { rows: reqs } = await client.query(
      `SELECT i.id, i.name, i.unit,
              ri.quantity_per_batch * $1 AS total_required,
              i.on_hand,
              i.reserved,
              (i.on_hand - i.reserved) AS available
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = $2
       FOR UPDATE OF i`,
      [order.batches, order.recipe_id]
    );

    // Load substitutes for ingredients in this order and lock them
    const { rows: substitutes } = await client.query(
      `SELECT s.primary_ingredient_id, i.id AS sub_id, i.name AS sub_name, i.unit AS sub_unit,
              (i.on_hand - i.reserved) AS available
       FROM ingredient_substitutes s
       JOIN ingredients i ON i.id = s.substitute_ingredient_id
       WHERE s.primary_ingredient_id = ANY($1::int[])
       FOR UPDATE OF i`,
      [reqs.map(r => r.id)]
    );
    const subMap = {};
    for (const s of substitutes) subMap[s.primary_ingredient_id] = s;

    // Determine what to reserve; use substitute to cover butter shortfall
    const toReserve = [];
    const shortfalls = [];

    for (const r of reqs) {
      const required = parseFloat(r.total_required);
      const available = parseFloat(r.available);
      if (available >= required) {
        toReserve.push({ id: r.id, name: r.name, unit: r.unit, quantity: required });
      } else {
        const gap = required - available;
        const sub = subMap[r.id];
        if (sub && parseFloat(sub.available) >= gap) {
          if (available > 0) toReserve.push({ id: r.id, name: r.name, unit: r.unit, quantity: available });
          toReserve.push({ id: sub.sub_id, name: sub.sub_name, unit: sub.sub_unit, quantity: gap });
        } else {
          shortfalls.push({ ingredient: r.name, unit: r.unit, required, available, shortfall: gap });
        }
      }
    }

    if (shortfalls.length > 0) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'Insufficient stock', shortfalls });
    }

    // Reserve stock, record movements and order_reservations
    for (const item of toReserve) {
      await client.query(
        `UPDATE ingredients SET reserved = reserved + $1 WHERE id = $2`,
        [item.quantity, item.id]
      );
      await client.query(
        `INSERT INTO stock_movements (ingredient_id, order_id, movement_type, quantity)
         VALUES ($1, $2, 'reserve', $3)`,
        [item.id, order.id, item.quantity]
      );
      await client.query(
        `INSERT INTO order_reservations (order_id, ingredient_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (order_id, ingredient_id) DO UPDATE
         SET quantity = order_reservations.quantity + EXCLUDED.quantity`,
        [order.id, item.id, item.quantity]
      );
    }

    const { rows: updated } = await client.query(
      `UPDATE production_orders SET status = 'released', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [order.id]
    );

    await client.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/orders/:id/complete
router.post('/:id/complete', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: orderRows } = await client.query(
      `SELECT po.*, r.id AS recipe_id FROM production_orders po
       JOIN recipes r ON r.id = po.recipe_id
       WHERE po.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (!orderRows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    const order = orderRows[0];
    if (order.status !== 'released') { await client.query('ROLLBACK'); return res.status(400).json({ error: `Cannot complete an order with status '${order.status}'` }); }

    // Use order_reservations so we consume exactly what was reserved (incl. substitutes)
    const { rows: reservations } = await client.query(
      `SELECT ingredient_id, quantity FROM order_reservations WHERE order_id = $1`,
      [order.id]
    );
    await client.query(
      `SELECT id FROM ingredients WHERE id = ANY($1::int[]) FOR UPDATE`,
      [reservations.map(r => r.ingredient_id)]
    );
    for (const res_ of reservations) {
      await client.query(
        `UPDATE ingredients SET on_hand = on_hand - $1, reserved = reserved - $1 WHERE id = $2`,
        [res_.quantity, res_.ingredient_id]
      );
      await client.query(
        `INSERT INTO stock_movements (ingredient_id, order_id, movement_type, quantity)
         VALUES ($1, $2, 'consume', $3)`,
        [res_.ingredient_id, order.id, res_.quantity]
      );
    }

    const { rows: updated } = await client.query(
      `UPDATE production_orders SET status = 'completed', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [order.id]
    );

    await client.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: orderRows } = await client.query(
      `SELECT po.*, r.id AS recipe_id FROM production_orders po
       JOIN recipes r ON r.id = po.recipe_id
       WHERE po.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (!orderRows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    const order = orderRows[0];
    if (!['draft', 'released'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot cancel an order with status '${order.status}'` });
    }

    // Only free reserved stock if it was released
    if (order.status === 'released') {
      // Use order_reservations so we free exactly what was reserved (incl. substitutes)
      const { rows: reservations } = await client.query(
        `SELECT ingredient_id, quantity FROM order_reservations WHERE order_id = $1`,
        [order.id]
      );
      await client.query(
        `SELECT id FROM ingredients WHERE id = ANY($1::int[]) FOR UPDATE`,
        [reservations.map(r => r.ingredient_id)]
      );
      for (const res_ of reservations) {
        await client.query(
          `UPDATE ingredients SET reserved = reserved - $1 WHERE id = $2`,
          [res_.quantity, res_.ingredient_id]
        );
        await client.query(
          `INSERT INTO stock_movements (ingredient_id, order_id, movement_type, quantity)
           VALUES ($1, $2, 'release', $3)`,
          [res_.ingredient_id, order.id, res_.quantity]
        );
      }
    }

    const { rows: updated } = await client.query(
      `UPDATE production_orders SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [order.id]
    );

    await client.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
