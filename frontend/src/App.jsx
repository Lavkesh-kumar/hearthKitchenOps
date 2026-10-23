import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import StockPage from './pages/StockPage';
import OrdersPage from './pages/OrdersPage';
import NewOrderPage from './pages/NewOrderPage';
import OrderDetailPage from './pages/OrderDetailPage';

const navStyle = ({ isActive }) => ({ marginRight: '1rem', fontWeight: isActive ? 'bold' : 'normal' });

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #ccc', marginBottom: '1rem' }}>
        <NavLink to="/stock" style={navStyle}>Stock</NavLink>
        <NavLink to="/orders" style={navStyle}>Orders</NavLink>
      </nav>
      <main style={{ padding: '0 1rem' }}>
        <Routes>
          <Route path="/" element={<OrdersPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/new" element={<NewOrderPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
