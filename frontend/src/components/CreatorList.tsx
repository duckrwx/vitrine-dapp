import React, { useState, useEffect } from 'react';
import { useContractRead } from 'wagmi';
import vitrineCoreAbi from '../abi/VitrineCore.json';

// --- Sub-componente: CreatorItem ---
// Renderiza uma única linha/card para um criador.
const CreatorItem = ({ creator }: { creator: any }) => {
  const vitrineCoreAddress = (import.meta.env.VITE_VITRINE_CORE_ADDRESS || '') as `0x${string}`;

  // Opcional: Busca a reputação on-chain mais atualizada.
  // Para otimizar, o ideal seria que o backend já incluísse este dado.
  const { data: onChainReputation } = useContractRead({
    address: vitrineCoreAddress,
    abi: vitrineCoreAbi.abi,
    functionName: 'userReputation',
    args: [creator.creatorAddress],
    enabled: !!vitrineCoreAddress && !!creator.creatorAddress,
  });
  
  // Usa a reputação on-chain se disponível, senão usa a que veio do backend.
  const reputation = onChainReputation ? Number(onChainReputation) : (creator.reputation || 0);

  const truncateAddress = (address: string) => {
    if (!address) return 'Endereço inválido';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getReputationColor = (rep: number) => {
    if (rep >= 800) return 'text-yellow-400';
    if (rep >= 500) return 'text-purple-400';
    return 'text-blue-400';
  };
  
  // Simplesmente para o exemplo, vamos simular o status 'isLive'
  const isLive = Math.random() > 0.5;

  return (
    <a 
      href={creator.liveUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600/70 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img 
            className="w-10 h-10 rounded-full object-cover" 
            src={`https://effigy.im/a/${creator.creatorAddress}.png`} 
            alt={`Avatar de ${creator.creatorAddress}`} 
          />
          {isLive && (
            <div className="absolute -top-1 -right-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{truncateAddress(creator.creatorAddress)}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className={`font-semibold ${getReputationColor(reputation)}`}>⭐ {reputation}</span>
            <span>•</span>
            <span className="capitalize">{creator.platform}</span>
            {isLive && <span className="font-bold text-red-500">• AO VIVO</span>}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-300 bg-gray-600 px-2 py-1 rounded">
        Visitar
      </div>
    </a>
  );
};


// --- Componente Principal: CreatorList ---
// Busca e exibe a lista de criadores para um produto.
export default function CreatorList({ productId, compact = false }: { productId: string, compact?: boolean }) {
  const [creators, setCreators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!productId) {
      setIsLoading(false);
      return;
    }

    const fetchCreators = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // **INTEGRAÇÃO COM O BACKEND**
        // Busca a lista de criadores do nosso novo endpoint
        const response = await fetch(`${backendUrl}/api/creators/product/${productId}`);
        
        if (!response.ok) {
          throw new Error('Não foi possível carregar a lista de criadores.');
        }

        const data = await response.json();
        const sortedCreators = (data.creators || []).sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
        setCreators(sortedCreators);

      } catch (err: any) {
        console.error('Erro ao buscar criadores:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCreators();
  }, [productId, backendUrl]);

  // Lógica para exibição compacta ou completa
  const displayedCreators = compact && !showAll ? creators.slice(0, 3) : creators;

  // --- Renderização Condicional ---

  if (isLoading) {
    return <div className="text-center text-sm text-gray-400 p-4">A carregar criadores...</div>;
  }

  if (error) {
    return <div className="text-center text-sm text-red-500 p-4">{error}</div>;
  }

  if (creators.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 p-4 bg-gray-800 rounded-lg">
        ✨ Seja o primeiro a promover este produto e ganhe comissões!
      </div>
    );
  }

  // --- JSX Final ---

  return (
    <div className={`${compact ? '' : 'bg-gray-800 rounded-lg p-4'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Criadores Promovendo</h3>
        
        {compact && creators.length > 3 && (
          <button onClick={() => setShowAll(!showAll)} className="text-xs text-blue-400 hover:underline">
            {showAll ? 'Ver menos' : `Ver todos (${creators.length})`}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {displayedCreators.map((creator) => (
          <CreatorItem key={creator.creatorAddress} creator={creator} />
        ))}
      </div>
    </div>
  );
}
