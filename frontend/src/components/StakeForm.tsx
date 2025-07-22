import React, { useState } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';

// Importe os ABIs que vamos precisar
import vitrineCoreAbi from '../abi/VitrineCore.json';
import vitrineTokenAbi from '../abi/VitrineToken.json';

export default function StakeForm() {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState('100'); // Valor inicial sugerido
  const [error, setError] = useState('');

  const coreContractAddress = (import.meta.env.VITE_VITRINE_CORE_ADDRESS || '') as `0x${string}`;
  const tokenContractAddress = (import.meta.env.VITE_VITRINE_TOKEN_ADDRESS || '') as `0x${string}`;

  // Hook genérico para tratar erros
  const handleError = (err: Error) => {
    if (err.message.includes('User rejected the request')) {
      setError('Transação rejeitada pelo utilizador.');
    } else {
      setError('Ocorreu um erro. Tente novamente.');
    }
    console.error(err);
  };

  // --- 1. Lógica para APROVAR (Approve) ---
  const { data: approveHash, writeContract: approve } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash });

  // --- 2. Lógica para FAZER STAKE (Stake) ---
  const { data: stakeHash, writeContract: stake } = useWriteContract();
  const { isLoading: isStaking, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({ hash: stakeHash });

  const handleApprove = () => {
    setError('');
    approve({
      address: tokenContractAddress,
      abi: vitrineTokenAbi.abi,
      functionName: 'approve',
      args: [coreContractAddress, parseEther(amount || '0')],
    }, {
      onError: handleError,
    });
  };

  const handleStake = () => {
    setError('');
    stake({
      address: coreContractAddress,
      abi: vitrineCoreAbi.abi,
      functionName: 'stake',
      args: [parseEther(amount || '0')],
    }, {
      onError: handleError,
    });
  };

  if (!isConnected) {
    return null; // Não mostra o formulário se a carteira não estiver ligada
  }

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl shadow-lg space-y-4">
      <h2 className="text-xl font-bold text-white">Painel de Staking para Empresas</h2>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-300">Quantidade de VTRN para Stake</label>
        <input
          id="amount"
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md shadow-sm"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          disabled={isApproving}
          onClick={handleApprove}
          className="flex-1 py-2 px-4 border rounded-md shadow-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400/50 disabled:cursor-not-allowed"
        >
          {isApproving ? 'A aprovar...' : '1. Aprovar'}
        </button>

        <button
          disabled={isStaking || isStakeSuccess}
          onClick={handleStake}
          className="flex-1 py-2 px-4 border rounded-md shadow-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400/50 disabled:cursor-not-allowed"
        >
          {isStaking ? 'A fazer Stake...' : isStakeSuccess ? '✅ Stake Concluído' : '2. Fazer Stake'}
        </button>
      </div>
      
      {isStakeSuccess && <p className="text-green-400 text-center">Parabéns! É agora uma empresa ativa na Vitrine.</p>}
      {error && <p className="text-red-500 text-center">{error}</p>}
    </div>
  );
}
