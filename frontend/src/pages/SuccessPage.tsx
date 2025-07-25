import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useContractRead } from 'wagmi';
import { useAccount } from 'wagmi';
import vitrineCoreAbi from '../abi/VitrineCore.json';

export default function SuccessPage() {
  const location = useLocation();
  const { address: userAddress, isConnected } = useAccount();
  const coreContractAddress = (import.meta.env.VITE_VITRINE_CORE_ADDRESS || '') as `0x${string}`;

  const { txHash } = location.state || {};

  // ✅ ALTERAÇÃO: Obter a função de 'refetch'
  const { data: reputation, refetch: refetchReputation } = useContractRead({
    address: coreContractAddress,
    abi: vitrineCoreAbi.abi,
    functionName: 'userReputation',
    args: [userAddress],
    enabled: isConnected,
  });

  return (
    <div className="text-center mt-16 p-8 bg-gray-800 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-green-400">Persona Atualizada com Sucesso!</h1>
      <p className="mt-4 text-gray-300">A sua persona foi atualizada e registada na blockchain.</p>
      
      <div className="mt-6 text-left space-y-4">
        <div>
          <p className="text-sm text-gray-400">Hash da Transação:</p>
          <p className="font-mono text-xs break-all text-gray-100">{txHash || 'N/A'}</p>
        </div>
        
        <div className="pt-2 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Sua Nova Reputação:</p>
              <p className="font-bold text-2xl text-cyan-400">{reputation ? String(reputation) : '0'} Pontos</p>
            </div>
            {/* ✅ NOVO: Botão de Atualização Manual */}
            <button
                onClick={() => refetchReputation()}
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700"
                title="Atualizar reputação"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>
      </div>
      
      <Link to="/dashboard">
        <button className="mt-8 w-full py-2 px-4 border rounded-md shadow-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
          Voltar ao Dashboard
        </button>
      </Link>
    </div>
  );
}
