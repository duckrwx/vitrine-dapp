// ProductList.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useContractRead } from 'wagmi';
import marketplaceAbi from '../abi/Marketplace.json';
import { Link } from 'react-router-dom';

// Hook para buscar um produto específico do contrato
const useProduct = (productId: number) => {
  const marketplaceAddress = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '') as `0x${string}`;
  
  const { data: productData } = useContractRead({
    address: marketplaceAddress,
    abi: marketplaceAbi.abi,
    functionName: 'products',
    args: [BigInt(productId)],
    enabled: productId >= 0,
  });

  return productData;
};

// Componente para imagem com múltiplas tentativas
const CESSImage = ({ fid, alt, className }) => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Lista de URLs para tentar em ordem
  const urlStrategies = [
    `https://deoss-sgp.cess.network/file/download/${fid}`,
    `https://deoss-sgp.cess.network/file/${fid}`,
    `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/image/${fid}`,
    `https://gateway.cess.network/ipfs/${fid}`,
  ];

  useEffect(() => {
    if (fid && attemptIndex < urlStrategies.length) {
      setCurrentUrl(urlStrategies[attemptIndex]);
      setError(false);
    }
  }, [fid, attemptIndex]);

  const handleError = () => {
    console.error(`❌ Falha ao carregar imagem da URL ${attemptIndex + 1}:`, currentUrl);
    
    if (attemptIndex < urlStrategies.length - 1) {
      setAttemptIndex(attemptIndex + 1);
    } else {
      setError(true);
      setLoading(false);
    }
  };

  const handleLoad = () => {
    console.log(`✅ Imagem carregada com sucesso da URL ${attemptIndex + 1}:`, currentUrl);
    setLoading(false);
  };

  if (!fid) {
    return (
      <div className={`${className} bg-gray-700 flex items-center justify-center`}>
        <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <>
      {loading && !error && (
        <div className={`${className} bg-gray-700 flex items-center justify-center absolute inset-0`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      )}
      
      {error ? (
        <div className={`${className} bg-gray-700 flex items-center justify-center`}>
          <div className="text-center p-4">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-gray-500">Imagem não disponível</p>
          </div>
        </div>
      ) : (
        <img
          src={currentUrl}
          alt={alt}
          className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onError={handleError}
          onLoad={handleLoad}
        />
      )}
    </>
  );
};

// ProductCard atualizado
const ProductCard = ({ productId }) => {
  const [metadata, setMetadata] = useState(null);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  
  // Buscar dados do contrato
  const productData = useProduct(productId);
  
  // Buscar metadados quando tivermos o FID
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!productData || !productData[4]) return; // productData[4] é o metadataFid
      
      const metadataFid = productData[4];
      console.log(`Buscando metadados para produto ${productId}, FID: ${metadataFid}`);
      
      try {
        const response = await fetch(`${backendUrl}/api/metadata/${metadataFid}`);
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        } else {
          console.error('Erro ao buscar metadados:', response.status);
        }
      } catch (error) {
        console.error('Erro ao buscar metadados:', error);
      } finally {
        setLoadingMetadata(false);
      }
    };
    
    fetchMetadata();
  }, [productData, productId, backendUrl]);

  if (!productData) {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg animate-pulse">
        <div className="h-48 bg-gray-700"></div>
        <div className="p-4">
          <div className="h-6 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded mb-4"></div>
          <div className="h-8 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const [id, owner, price, commission, metadataFid] = productData;
  
  const formatPrice = (weiValue) => {
    try {
      return (Number(weiValue) / 1e18).toFixed(3);
    } catch {
      return '0';
    }
  };
  
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
      {/* Container da Imagem */}
      <div className="relative h-48 bg-gray-700 overflow-hidden">
        {metadata?.image_fid ? (
          <CESSImage 
            fid={metadata.image_fid}
            alt={metadata?.name || `Produto #${Number(id)}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Badge de Comissão */}
        {Number(commission) > 0 && (
          <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-lg">
            {commission.toString()}% Comissão
          </div>
        )}
        
        {/* Badge de Novo */}
        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-lg">
          Novo
        </div>
      </div>

      {/* Informações do Produto */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-2 truncate">
          {loadingMetadata ? (
            <span className="animate-pulse">Carregando...</span>
          ) : (
            metadata?.name || `Produto #${Number(id)}`
          )}
        </h3>
        
        <p className="text-gray-400 text-sm mb-3 line-clamp-2 h-10">
          {loadingMetadata ? (
            <span className="animate-pulse">Carregando descrição...</span>
          ) : (
            metadata?.description || 'Sem descrição disponível'
          )}
        </p>

        {/* Tags */}
        {metadata?.tags && metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {metadata.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index} 
                className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Preço e Vendedor */}
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-2xl font-bold text-green-500">
              {formatPrice(price)} ETH
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Vendedor: {truncateAddress(owner)}
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2">
          <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors duration-200 font-medium">
            <Link 
              to={`/product/${id}`} // Use backticks (`) para inserir a variável 'id' na string
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors duration-200 font-medium text-center" // Adicionei text-center para garantir o alinhamento
              title="Ver detalhes do produto"
            >
              Ver Detalhes
            </Link>
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors duration-200" title="Salvar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente Principal
export default function ProductList() {
  const marketplaceAddress = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '') as `0x${string}`;
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Lê o total de produtos do contrato
  const { data: nextProductId, refetch } = useContractRead({
    address: marketplaceAddress,
    abi: marketplaceAbi.abi,
    functionName: 'nextProductId',
    watch: true,
  });

  const totalProducts = Number(nextProductId || 0);
  const productIds = Array.from({ length: totalProducts }, (_, i) => i);

  return (
    <div className="space-y-6">
      {/* Header com informação da blockchain */}
      <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-600/30 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="animate-pulse h-3 w-3 bg-green-500 rounded-full"></div>
          <span className="text-green-400 text-sm font-medium">
            Conectado à Blockchain • {totalProducts} produtos registrados on-chain
          </span>
        </div>
      </div>

      {/* Header com Filtros */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Produtos no Marketplace</h2>
            <p className="text-gray-400 text-sm mt-1">
              Explore produtos únicos armazenados de forma descentralizada
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-full sm:w-64"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todas Categorias</option>
              <option value="eletrônicos">Eletrônicos</option>
              <option value="casa">Casa e Jardim</option>
              <option value="moda">Moda</option>
              <option value="tecnologia">Tecnologia</option>
              <option value="outros">Outros</option>
            </select>
            
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              title="Atualizar lista"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar
            </button>
          </div>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-gray-400">Total on-chain:</span>
            <span className="text-white font-semibold ml-1">{totalProducts}</span>
          </div>
          <div>
            <span className="text-gray-400">Exibindo:</span>
            <span className="text-green-500 font-semibold ml-1">{totalProducts}</span>
          </div>
        </div>
      </div>

      {/* Lista de Produtos */}
      {totalProducts === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-gray-400 mb-2">
            Nenhum produto registrado no marketplace ainda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productIds.map((productId) => (
            <ProductCard 
              key={productId} 
              productId={productId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

