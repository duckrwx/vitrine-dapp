import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import SuccessPage from './pages/SuccessPage';
import ProtectedRoute from './components/ProtectedRoute';
import ConnectWallet from './components/ConnectWallet';
import { useAccount } from 'wagmi';

export default function App() {
  const { isConnected } = useAccount();

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-gray-900 text-white">
      <div className="w-full max-w-2xl">
        
        {isConnected && (
          <header className="flex justify-between items-center w-full mb-8">
            <Link to="/dashboard" className="text-2xl font-bold text-white hover:text-gray-300 transition-colors">
              Vitrine
            </Link>
            <ConnectWallet />
          </header>
        )}

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} 
          />
          <Route 
            path="/success" 
            element={<ProtectedRoute><SuccessPage /></ProtectedRoute>} 
          />
        </Routes>
      </div>
    </main>
  );
}
