import React, { useState, useEffect } from 'react';
import { useContractRead } from 'wagmi';
import { formatEther } from 'viem';
import { Link } from 'react-router-dom';
import marketplaceAbi from '../abi/Marketplace.json';

type ProductCardProps = {
  productId: bigint;
};

export default function ProductCard({ productId }: ProductCardProps) {
  // --- Configuração de Ambiente e Estados ---
  const marketplaceAddress = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '') as `0x${string}`;
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const [metadata, setMetadata] = useState<any>(null);

  // --- Busca de Dados On-chain ---
  // Busca os dados primários do produto (dono, preço, fid) do smart contract.
  const { data: product, isLoading: isProductLoading } = useContractRead({
    address: marketplaceAddress,
    abi: marketplaceAbi.abi,
    functionName: 'getProduct', // Usando a função de leitura mais completa
    args: [productId],
    enabled: !!productId,
  });

  // --- Busca de Dados Off-chain (Metadados da CESS via Backend) ---
  // Este efeito roda quando os dados do produto (especialmente o FID) são carregados.
  useEffect(() => {
    // A função getProduct retorna [id, owner, price, commission, metadataFid]
    const metadataFid = product?.[4];
    // Se não tivermos o FID, não há nada a fazer.
    if (!metadataFid) return;

    const fetchMetadata = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/metadata/${metadataFid}`);
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        } else {
            console.error(`Erro ao buscar metadados para FID ${metadataFid}: Servidor respondeu com ${response.status}`);
        }
      } catch (error) {
        console.error(`Falha na requisição de metadados para o produto ${productId}:`, error);
      }
    };

    fetchMetadata();
  }, [product, backendUrl, productId]); // Dependências do efeito


  // --- Renderização Condicional (Loading) ---
  // Exibe um esqueleto do card enquanto os dados da blockchain estão carregando.
  if (isProductLoading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse h-full">
        <div className="bg-gray-700 h-48 rounded-md mb-4"></div>
        <div className="h-6 bg-gray-700 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
            <div className="h-6 bg-gray-700 rounded w-1/4"></div>
            <div className="h-10 bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  // --- Renderização Condicional (Produto Inexistente) ---
  // Se a busca terminou mas não encontrou produto, ou o dono é o endereço zero, não renderiza nada.
  if (!product || product[1] === '0x0000000000000000000000000000000000000000') {
    return null; 
  }

  // Extrai os dados do array retornado pelo contrato para facilitar o uso
  const [id, owner, price, commission, metadataFid] = product;

  
  // --- JSX Final do Componente Renderizado ---
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col h-full">
      
      {/* Container da Imagem */}
      <div className="relative mb-4 bg-black rounded-md flex-shrink-0"> 
        {metadata?.image_url ? (
          <img 
            src={metadata.image_url} 
            alt={metadata.name || `Imagem do produto ${String(id)}`} 
            // ✅ CORREÇÃO: object-contain para respeitar as proporções
            className="w-full h-48 object-contain rounded-md" 
          />
        ) : (
          // Placeholder enquanto a imagem dos metadados está carregando
          <div className="w-full h-48 bg-gray-700 flex items-center justify-center text-gray-500 rounded-md">
            (A carregar imagem...)
          </div>
        )}
      </div>
      
      {/* Container de Informações */}
      <div className="flex-grow flex flex-col">
        <h3 className="text-xl font-bold text-white truncate" title={metadata?.name}>{metadata?.name || `Produto #${String(id)}`}</h3>
        <p className="text-sm text-gray-400 mt-1 flex-grow h-10 overflow-hidden" title={metadata?.description}>
          {metadata?.description || 'Sem descrição.'}
        </p>
      </div>

      {/* Footer do Card com Preço e Botão */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center flex-shrink-0">
        <div>
          <p className="text-lg font-bold text-white">{formatEther(price)} ETH</p>
          <p className="text-xs text-cyan-400">{String(commission)}% de comissão</p>
        </div>
        
        <Link
          to={`/product/${id}`}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
        >
          Ver Detalhes
        </Link>
      </div>
    </div>
  );
}
