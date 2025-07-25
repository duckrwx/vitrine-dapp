import React, { useState } from 'react';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';

// Importa o ABI do novo contrato Marketplace
import marketplaceAbi from '../abi/Marketplace.json';

export default function RegisterProductForm() {
  const marketplaceAddress = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '') as `0x${string}`;
  
  // Estados do formulário
  const [price, setPrice] = useState('0.1'); // Preço em ETH
  const [commission, setCommission] = useState('15'); // Comissão em %
  const [error, setError] = useState('');

  // Hooks do wagmi para enviar a transação
  const { data: hash, writeContract } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ 
    hash,
    onSuccess: () => {
      // Limpa o formulário após o sucesso da transação
      setPrice('0.1');
      setCommission('15');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Converte o preço para a unidade correta (wei)
    const priceInWei = parseEther(price || '0');
    
    writeContract({
      address: marketplaceAddress,
      abi: marketplaceAbi.abi,
      functionName: 'registerProduct',
      args: [priceInWei, BigInt(commission || '0')],
    }, {
      onError: (err) => {
        console.error(err);
        setError('A transação falhou ou foi rejeitada.');
      }
    });
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h3 className="font-semibold text-lg text-white">Registar Novo Produto</h3>
      <p className="text-sm text-gray-400 mb-4">Este produto ficará disponível para os streamers promoverem.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-300">Preço (em ETH)</label>
            <input id="price" type="text" value={price} onChange={e => setPrice(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/>
          </div>
          <div>
            <label htmlFor="commission" className="block text-sm font-medium text-gray-300">Comissão para Streamer (%)</label>
            <input id="commission" type="number" min="0" max="99" value={commission} onChange={e => setCommission(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/>
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 border rounded-md shadow-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400/50"
        >
          {isLoading ? 'A registar...' : 'Registar Produto no Marketplace'}
        </button>
        {isSuccess && <p className="text-green-400 text-center text-sm">Produto registado com sucesso!</p>}
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
      </form>
    </div>
  );
}
