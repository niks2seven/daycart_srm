/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Wallet from './pages/Wallet';
import Subscriptions from './pages/Subscriptions';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import OrderSuccess from './pages/OrderSuccess';
import { ConfigGuard } from './components/ConfigGuard';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
      <Route
        path="/*"
        element={
          user ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/order-success" element={<OrderSuccess />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/auth" />
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigGuard>
      <AuthProvider>
        <CartProvider>
          <Router>
            <AppRoutes />
          </Router>
        </CartProvider>
      </AuthProvider>
    </ConfigGuard>
  );
}
