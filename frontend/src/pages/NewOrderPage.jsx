import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecipes, createOrder } from '../api';

export default function NewOrderPage() {
  const [recipes, setRecipes] = useState([]);
  const [recipeId, setRecipeId] = useState('');
  const [batches, setBatches] = useState(1);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getRecipes().then(r => { setRecipes(r); if (r.length) setRecipeId(r[0].id); });
  }, []);

  const selectedRecipe = recipes.find(r => r.id === parseInt(recipeId));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const order = await createOrder({ recipe_id: parseInt(recipeId), batches: parseFloat(batches) });
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err.error || 'Failed to create order');
    }
  }

  return (
    <div>
      <h2>New Production Order</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Recipe: </label>
          <select value={recipeId} onChange={e => setRecipeId(e.target.value)}>
            {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <label>Batches: </label>
          <input type="number" min="0.1" step="0.1" value={batches}
            onChange={e => setBatches(e.target.value)} required />
        </div>

        {selectedRecipe && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Ingredients for {batches} batch(es):</strong>
            <ul>
              {selectedRecipe.ingredients.map(i => (
                <li key={i.ingredient_id}>
                  {i.ingredient_name}: {(i.quantity_per_batch * batches).toFixed(3)} {i.unit}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ marginTop: '0.5rem' }}>Create Draft</button>
        <button type="button" onClick={() => navigate('/orders')} style={{ marginLeft: '0.5rem' }}>Cancel</button>
      </form>
    </div>
  );
}
