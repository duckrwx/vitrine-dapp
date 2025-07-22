import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import ConnectPage from './pages/ConnectPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import ConnectWallet from './components/ConnectWallet';
import StakeForm from './components/StakeForm';
import { useAccount } from 'wagmi';

export default function App() {
  const { isConnected } = useAccount();

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-gray-900 text-white">
      <div className="w-full max-w-2xl">
        
        {/* Header que aparece em todas as páginas internas (após conectar) */}
        {isConnected && (
          <header className="flex justify-between items-center w-full mb-8">
            <Link to="/dashboard" className="text-2xl font-bold text-white hover:text-gray-300 transition-colors">
              Vitrine
            </Link>
            <ConnectWallet />
          </header>
        )}

        <Routes>
          {/* Rota inicial: página para conectar a carteira */}
          <Route path="/" element={<ConnectPage />} />
          
          {/* Rota do Dashboard: só é acessível se a carteira estiver conectada */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </main>
  );
}
