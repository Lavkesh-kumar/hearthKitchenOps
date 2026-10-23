import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder, releaseOrder, completeOrder, cancelOrder } from '../api';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [shortfalls, setShortfalls] = useState([]);

  const load = useCallback(() => getOrder(id).then(setOrder), [id]);
  useEffect(() => { load(); }, [load]);

  async function doAction(action) {
    setError('');
    setShortfalls([]);
    try {
      await action(id);
      load();
    } catch (err) {
      if (err.shortfalls) setShortfalls(err.shortfalls);
      else setError(err.error || 'Action failed');
    }
  }

  if (!order) return <p>Loading...</p>;

  return (
    <div>
      <button onClick={() => navigate('/orders')}>← Orders</button>
      <h2>Order #{order.id} — {order.recipe_name}</h2>
      <p>Batches: {parseFloat(order.batches)} | Status: <strong>{order.status}</strong></p>
      <p>Created: {new Date(order.created_at).toLocaleString()}</p>

      <div style={{ margin: '0.5rem 0' }}>
        {order.status === 'draft' && (
          <>
            <button onClick={() => doAction(releaseOrder)}>Release</button>
            <button onClick={() => doAction(cancelOrder)} style={{ marginLeft: '0.5rem' }}>Cancel</button>
          </>
        )}
        {order.status === 'released' && (
          <>
            <button onClick={() => doAction(completeOrder)}>Complete</button>
            <button onClick={() => doAction(cancelOrder)} style={{ marginLeft: '0.5rem' }}>Cancel</button>
          </>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {shortfalls.length > 0 && (
        <div style={{ color: 'red', marginTop: '0.5rem' }}>
          <strong>Release failed — insufficient stock:</strong>
          <table border="1" cellPadding="4" style={{ borderCollapse: 'collapse', marginTop: '0.25rem' }}>
            <thead>
              <tr><th>Ingredient</th><th>Required</th><th>Available</th><th>Shortfall</th><th>Unit</th></tr>
            </thead>
            <tbody>
              {shortfalls.map(s => (
                <tr key={s.ingredient}>
                  <td>{s.ingredient}</td>
                  <td>{s.required}</td>
                  <td>{s.available}</td>
                  <td>{s.shortfall.toFixed(3)}</td>
                  <td>{s.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Ingredient Requirements</h3>
      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr><th>Ingredient</th><th>Required</th><th>On Hand</th><th>Reserved</th><th>Available</th><th>Unit</th></tr>
        </thead>
        <tbody>
          {order.requirements.map(r => (
            <tr key={r.ingredient_id}
              style={{ background: parseFloat(r.available) < parseFloat(r.total_required) ? '#ffe0e0' : '' }}>
              <td>{r.name}</td>
              <td>{parseFloat(r.total_required)}</td>
              <td>{parseFloat(r.on_hand)}</td>
              <td>{parseFloat(r.reserved)}</td>
              <td>{parseFloat(r.available)}</td>
              <td>{r.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Stock Movements</h3>
      {order.movements.length === 0 ? <p>None yet.</p> : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr><th>Type</th><th>Ingredient</th><th>Quantity</th><th>Unit</th><th>Time</th></tr>
          </thead>
          <tbody>
            {order.movements.map(m => (
              <tr key={m.id}>
                <td>{m.movement_type}</td>
                <td>{m.ingredient_name}</td>
                <td>{parseFloat(m.quantity)}</td>
                <td>{m.unit}</td>
                <td>{new Date(m.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
