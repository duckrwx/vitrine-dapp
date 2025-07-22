import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import ConnectWallet from '../components/ConnectWallet';

export default function ConnectPage() {
  const { isConnected } = useAccount();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected) {
      navigate('/dashboard');
    }
  }, [isConnected, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold">Bem-vindo à Vitrine</h1>
        <p className="mt-2 text-md text-gray-400">Conecte a sua carteira para começar.</p>
      </div>
      <ConnectWallet />
    </div>
  );
}
