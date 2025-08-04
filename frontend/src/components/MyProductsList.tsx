import React, { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractReads } from 'wagmi';
import marketplaceAbi from '../abi/Marketplace.json';

// Componente para imagem com múltiplas tentativas (reutilizando do ProductList)
const CESSImage = ({ fid, alt, className }) => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const urlStrategies = [
    `https://deoss-sgp.cess.network/file/download/${fid}`,
    `https://deoss-sgp.cess.network/file/${fid}`,
    `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/image/${fid}`,
  ];

  useEffect(() => {
    if (fid && attemptIndex < urlStrategies.length) {
      setCurrentUrl(urlStrategies[attemptIndex]);
      setError(false);
    }
  }, [fid, attemptIndex]);

  const handleError = () => {
    if (attemptIndex < urlStrategies.length - 1) {
      setAttemptIndex(attemptIndex + 1);
    } else {
      setError(true);
      setLoading(false);
    }
  };

  const handleLoad = () => {
    setLoading(false);
  };

  if (!fid || error) {
    return (
      <div className={`${className} bg-gray-700 flex items-center justify-center`}>
        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className={`${className} bg-gray-700 flex items-center justify-center absolute inset-0`}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
        </div>
      )}
      <img
        src={currentUrl}
        alt={alt}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  );
};

// ProductCard específico para MyProductsList
const MyProductCard = ({ productData }) => {
  const [metadata, setMetadata] = useState(null);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  
  const [id, owner, price, commission, metadataFid] = productData;
  
  // Buscar metadados
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!metadataFid) return;
      
      try {
        const response = await fetch(`${backendUrl}/api/metadata/${metadataFid}`);
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        }
      } catch (error) {
        console.error('Erro ao buscar metadados:', error);
      } finally {
        setLoadingMetadata(false);
      }
    };
    
    fetchMetadata();
  }, [metadataFid, backendUrl]);

  const formatPrice = (weiValue) => {
    try {
      return (Number(weiValue) / 1e18).toFixed(3);
    } catch {
      return '0';
    }
  };

  return (
    <div className="bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Imagem do Produto */}
      <div className="relative h-40 bg-gray-600">
        {metadata?.image_fid ? (
          <CESSImage 
            fid={metadata.image_fid}
            alt={metadata?.name || `Produto #${Number(id)}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Badge do ID */}
        <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
          #{Number(id)}
        </div>
        
        {/* Badge de Comissão */}
        {Number(commission) > 0 && (
          <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">
            {commission.toString()}%
          </div>
        )}
      </div>

      {/* Informações do Produto */}
      <div className="p-3">
        <h3 className="text-md font-semibold text-white mb-1 truncate">
          {loadingMetadata ? (
            <span className="animate-pulse">Carregando...</span>
          ) : (
            metadata?.name || `Produto #${Number(id)}`
          )}
        </h3>
        
        <p className="text-gray-400 text-xs mb-2 line-clamp-2">
          {loadingMetadata ? (
            <span className="animate-pulse">...</span>
          ) : (
            metadata?.description || 'Sem descrição'
          )}
        </p>

        {/* Tags */}
        {metadata?.tags && metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {metadata.tags.slice(0, 2).map((tag, index) => (
              <span 
                key={index} 
                className="px-1.5 py-0.5 bg-gray-600 text-gray-300 text-xs rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Preço */}
        <div className="flex justify-between items-center">
          <p className="text-lg font-bold text-green-500">
            {formatPrice(price)} ETH
          </p>
          
          {/* Status */}
          <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded">
            Ativo
          </span>
        </div>

        {/* Ações */}
        <div className="mt-3 flex gap-2">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-sm transition-colors">
            Editar
          </button>
          <button className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-1.5 px-3 rounded text-sm transition-colors">
            Detalhes
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente Principal
export default function MyProductsList() {
  const { address: userAddress, isConnected } = useAccount();
  const marketplaceAddress = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '') as `0x${string}`;
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lê o total de produtos
  const { data: nextProductId } = useContractRead({
    address: marketplaceAddress,
    abi: marketplaceAbi.abi,
    functionName: 'nextProductId',
    watch: true,
  });

  const totalProducts = Number(nextProductId || 0);

  // Cria array de contratos para ler todos os produtos
  const productContracts = Array.from({ length: totalProducts }, (_, i) => ({
    address: marketplaceAddress,
    abi: marketplaceAbi.abi,
    functionName: 'products',
    args: [BigInt(i)],
  }));
  
  // Lê todos os produtos de uma vez
  const { data: allProductsData, isLoading } = useContractReads({
    contracts: productContracts,
    enabled: totalProducts > 0 && isConnected,
  });

  // Filtra produtos do usuário
  useEffect(() => {
    if (allProductsData && userAddress) {
      const userProducts = allProductsData
        .map((result, index) => {
          if (result.status === 'success' && result.result) {
            const productData = result.result;
            const productOwner = productData[1]; // owner é o segundo elemento
            
            if (productOwner?.toLowerCase() === userAddress.toLowerCase()) {
              return {
                index,
                data: productData
              };
            }
          }
          return null;
        })
        .filter(item => item !== null);

      setMyProducts(userProducts);
    }
    setLoading(false);
  }, [allProductsData, userAddress]);

  if (!isConnected) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Meus Produtos</h2>
        <p className="text-center text-gray-400">
          Conecte sua carteira para ver seus produtos
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Meus Produtos</h2>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie seus produtos listados no marketplace
          </p>
        </div>
        
        {/* Estatísticas */}
        <div className="text-right">
          <p className="text-2xl font-bold text-green-500">{myProducts.length}</p>
          <p className="text-xs text-gray-400">Produtos ativos</p>
        </div>
      </div>

      {loading || isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : myProducts.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-gray-400 mb-4">Você ainda não registrou nenhum produto</p>
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
            Registrar Primeiro Produto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myProducts.map(({ index, data }) => (
            <MyProductCard 
              key={index} 
              productData={data}
            />
          ))}
        </div>
      )}
    </div>
  );
}
