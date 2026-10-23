import { useState, useEffect } from 'react';
import { getIngredients, getIngredientMovements } from '../api';

export default function StockPage() {
  const [ingredients, setIngredients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [movements, setMovements] = useState([]);

  useEffect(() => { getIngredients().then(setIngredients); }, []);

  function selectIngredient(ing) {
    setSelected(ing);
    getIngredientMovements(ing.id).then(setMovements);
  }

  return (
    <div>
      <h2>Stock</h2>
      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr><th>Ingredient</th><th>Unit</th><th>On Hand</th><th>Reserved</th><th>Available</th><th>Movements</th></tr>
        </thead>
        <tbody>
          {ingredients.map(i => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{i.unit}</td>
              <td>{parseFloat(i.on_hand)}</td>
              <td>{parseFloat(i.reserved)}</td>
              <td>{parseFloat(i.available)}</td>
              <td><button onClick={() => selectIngredient(i)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Movements — {selected.name}</h3>
          {movements.length === 0 ? <p>No movements.</p> : (
            <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr><th>Type</th><th>Quantity</th><th>Unit</th><th>Order</th><th>Recipe</th><th>Time</th></tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id}>
                    <td>{m.movement_type}</td>
                    <td>{parseFloat(m.quantity)}</td>
                    <td>{selected.unit}</td>
                    <td>{m.order_id ?? '—'}</td>
                    <td>{m.recipe_name ?? '—'}</td>
                    <td>{new Date(m.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
