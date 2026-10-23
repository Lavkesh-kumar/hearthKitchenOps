import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders } from '../api';

const STATUSES = ['', 'draft', 'released', 'completed', 'cancelled'];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => { getOrders(status).then(setOrders); }, [status]);

  return (
    <div>
      <h2>Production Orders</h2>
      <div style={{ marginBottom: '0.5rem' }}>
        Filter by status:{' '}
        <select value={status} onChange={e => setStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All'}</option>)}
        </select>
        {' '}
        <button onClick={() => navigate('/orders/new')}>+ New Order</button>
      </div>
      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr><th>ID</th><th>Recipe</th><th>Batches</th><th>Status</th><th>Created</th><th></th></tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.recipe_name}</td>
              <td>{parseFloat(o.batches)}</td>
              <td>{o.status}</td>
              <td>{new Date(o.created_at).toLocaleString()}</td>
              <td><button onClick={() => navigate(`/orders/${o.id}`)}>Open</button></td>
            </tr>
          ))}
          {orders.length === 0 && <tr><td colSpan="6">No orders.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
