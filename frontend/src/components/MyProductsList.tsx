import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useContractRead, useContractReads } from 'wagmi';
import marketplaceAbi from '../abi/Marketplace.json';
import ProductCard from './ProductCard';

export default function MyProductsList() {
  const { address: userAddress } = useAccount();
  const marketplaceAddress = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '') as `0x${string}`;

  const { data: nextProductId } = useContractRead({
    address: marketplaceAddress,
    abi: marketplaceAbi.abi,
    functionName: 'nextProductId',
    watch: true,
  });

  const totalProducts = Number(nextProductId || 0);

  // 1. Criar um array de "contratos" para ler os dados de todos os produtos
  const productContracts = Array.from({ length: totalProducts }, (_, i) => ({
    address: marketplaceAddress,
    abi: marketplaceAbi.abi,
    functionName: 'products',
    args: [BigInt(i)],
  }));
  
  // 2. Usar o hook 'useContractReads' para ler todos os produtos de uma só vez
  const { data: allProductsData } = useContractReads({
    contracts: productContracts,
    watch: true,
  });

  // 3. Filtrar a lista para mostrar apenas os produtos do utilizador atual
  const [myProducts, setMyProducts] = useState<bigint[]>([]);

  useEffect(() => {
    if (allProductsData) {
      const filteredProductIds = allProductsData
        .map((result, index) => {
          // O resultado de cada leitura tem 'status' e 'result'
          if (result.status === 'success') {
            const productOwner = (result.result as any[])[1]; // O 2º elemento é o 'owner'
            if (productOwner?.toLowerCase() === userAddress?.toLowerCase()) {
              return BigInt(index); // Retorna o ID do produto
            }
          }
          return null;
        })
        .filter((id): id is bigint => id !== null); // Remove os nulos

      setMyProducts(filteredProductIds);
    }
  }, [allProductsData, userAddress]);

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl shadow-lg">
      <h2 className="text-xl font-bold text-white">Meus Produtos no Marketplace</h2>
      <div className="mt-4">
        {myProducts.length === 0 ? (
          <p className="text-center text-gray-400">Você ainda não registou nenhum produto.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myProducts.map(productId => (
              <ProductCard key={String(productId)} productId={productId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
