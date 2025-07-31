import React from 'react';
import { useAccount } from 'wagmi';
import { useContractRead } from 'wagmi';
import vitrineCoreAbi from '../abi/VitrineCore.json';

export default function UserStatusPanel() {
  const { address: userAddress, isConnected } = useAccount();
  const coreContractAddress = (import.meta.env.VITE_VITRINE_CORE_ADDRESS || '') as `0x${string}`;

  const { data: personaHash, refetch: refetchPersonaHash } = useContractRead({
    address: coreContractAddress,
    abi: vitrineCoreAbi.abi,
    functionName: 'personaHashes',
    args: [userAddress],
    enabled: isConnected,
  });

  const { data: reputation, refetch: refetchReputation } = useContractRead({
    address: coreContractAddress,
    abi: vitrineCoreAbi.abi,
    functionName: 'userReputation',
    args: [userAddress],
    enabled: isConnected,
  });
  
  const handleManualRefresh = () => {
    refetchPersonaHash();
    refetchReputation();
  };

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl shadow-lg">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Meu Status</h2>
        <button onClick={handleManualRefresh} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700" title="Atualizar dados">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
        </button>
      </div>
      <div className="mt-4 p-4 bg-gray-900 rounded-lg space-y-2">
        <div>
          <p className="text-sm text-gray-400">Hash da sua Persona On-Chain:</p>
          {personaHash && String(personaHash) !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? (
            <p className="font-mono text-xs break-all text-green-400 mt-1">{String(personaHash)}</p>
          ) : ( <p className="text-yellow-400 mt-1">Nenhuma persona registada.</p> )}
        </div>
        <div className="pt-2 border-t border-gray-700">
          <p className="text-sm text-gray-400">Sua Reputação:</p>
          <p className="font-bold text-2xl text-cyan-400 mt-1">{reputation ? String(reputation) : '0'} Pontos</p>
        </div>
      </div>
    </div>
  );
}
