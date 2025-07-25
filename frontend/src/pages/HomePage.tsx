import React, { useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected) {
      navigate('/dashboard');
    }
  }, [isConnected, navigate]);

  const handleLogin = () => {
    const metaMaskConnector = connectors.find(c => c.name === 'MetaMask');
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-5xl font-bold">Bem-vindo à Vitrine</h1>
      <p className="mt-4 text-lg text-gray-400">A plataforma onde os seus dados geram valor para si.</p>
      <div className="mt-10 flex flex-col sm:flex-row gap-6">
        <button 
          onClick={handleLogin}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-xl"
        >
          Ligar Carteira
        </button>
      </div>
    </div>
  );
}
