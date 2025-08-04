// App.tsx

import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage'; // Será o nosso novo "hub"
import UpdatePersonaPage from './pages/UpdatePersonaPage'; // NOVO
import RegisterProductPage from './pages/RegisterProductPage'; // NOVO
import MarketplacePage from './pages/MarketplacePage';
import SuccessPage from './pages/SuccessPage';
import ProtectedRoute from './components/ProtectedRoute';
import ConnectWallet from './components/ConnectWallet';
import ProductInterface from './pages/ProductInterface';
import Seed from './pages/Seed';
import { useAccount } from 'wagmi';
import CreatorDashboard from './pages/CreatorDashboard'; // NOVO

export default function App() {
  const { isConnected } = useAccount();
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-gray-900 text-white">
      <div className="w-full max-w-6xl">
        {isConnected && (
          <header className="flex justify-between items-center w-full mb-8">
            <Link to="/marketplace" className="text-2xl font-bold text-white hover:text-gray-300">Vitrine</Link>
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="text-sm text-gray-300 hover:text-white">Meu Painel</Link>
              <ConnectWallet />
            </div>
          </header>
        )}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard/update" element={<ProtectedRoute><UpdatePersonaPage /></ProtectedRoute>} />
          <Route path="/dashboard/register-product" element={<ProtectedRoute><RegisterProductPage /></ProtectedRoute>} />
          <Route path="/success" element={<ProtectedRoute><SuccessPage /></ProtectedRoute>} />
          <Route path="/product/:id" element={<ProtectedRoute><ProductInterface /></ProtectedRoute>} />
          <Route path="/product/:id/seed" element={<ProtectedRoute><Seed /></ProtectedRoute>} />
          <Route path="/creator-dashboard" element={<ProtectedRoute><CreatorDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to={isConnected ? "/marketplace" : "/"} />} />
        </Routes>
      </div>
    </main>
  );
}
