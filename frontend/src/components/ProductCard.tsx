import React from 'react';
import { useContractRead } from 'wagmi';
import { formatEther } from 'viem';
import marketplaceAbi from '../abi/Marketplace.json';

type ProductCardProps = {
  productId: bigint;
};

export default function ProductCard({ productId }: ProductCardProps) {
  const marketplaceAddress = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '') as `0x${string}`;

  // Hook para ler os dados deste produto específico da blockchain
  const { data: product, isLoading } = useContractRead({
    address: marketplaceAddress,
    abi: marketplaceAbi.abi,
    functionName: 'products',
    args: [productId],
  });

  if (isLoading) {
    return <div className="p-4 bg-gray-800 rounded-lg text-center text-gray-400">A carregar produto...</div>;
  }

  if (!product) {
    return null; // Não renderiza nada se o produto não for encontrado
  }

  // O wagmi retorna os dados como um array, vamos dar nomes a cada campo
  const [id, owner, price, commission] = product as [bigint, string, bigint, bigint];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col">
      {/* Futuramente, aqui podemos adicionar a imagem do produto */}
      <div className="bg-gray-700 h-40 rounded-md mb-4 flex items-center justify-center text-gray-500">
        (Imagem do Produto)
      </div>
      
      <div className="flex-grow">
        <p className="text-sm text-gray-400">Vendido por:</p>
        <p className="font-mono text-xs text-gray-300 break-all">{owner}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
        <div>
          <p className="text-lg font-bold text-white">{formatEther(price)} ETH</p>
          <p className="text-xs text-cyan-400">{String(commission)}% de comissão</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md">
          Ver Detalhes
        </button>
      </div>
    </div>
  );
}
