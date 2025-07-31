import React from 'react';
import { useContractRead } from 'wagmi';
import ProductCard from './ProductCard'; // Importa o nosso novo componente
import marketplaceAbi from '../abi/Marketplace.json';

export default function ProductList() {
  const marketplaceAddress = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '') as `0x${string}`;

  // Hook para ler o número total de produtos registados
  const { data: nextProductId } = useContractRead({
    address: marketplaceAddress,
    abi: marketplaceAbi.abi,
    functionName: 'nextProductId',
    watch: true, // Atualiza automaticamente quando novos produtos são adicionados
  });

  const totalProducts = Number(nextProductId || 0);

  return (
    <div>
      {totalProducts === 0 ? (
        <p className="text-center text-gray-400">Nenhum produto registado no marketplace ainda.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Cria um loop para renderizar um card para cada ID de produto */}
          {Array.from({ length: totalProducts }, (_, i) => (
            <ProductCard key={i} productId={BigInt(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
