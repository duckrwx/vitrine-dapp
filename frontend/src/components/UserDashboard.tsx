import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { toast } from 'react-hot-toast';
import VitrineCore from '../abi/VitrineCore.json';
import Marketplace from '../abi/Marketplace.json';

// Interfaces
interface PersonaStats {
  hash: string;
  fid: string;
  lastUpdated: string;
  matchingCampaigns: number;
  earningsThisMonth: string;
  reputationScore: number;
  totalInteractions: number;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  budget: string;
  targetAudience: string;
  cpc: string; // Cost per click
  status: 'active' | 'paused' | 'ended';
  clicks: number;
  conversions: number;
  estimatedReach: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  seller: string;
  category: string;
  imageUrl: string;
  personalityMatch: number; // 0-100%
  sponsored: boolean;
}

interface Transaction {
  id: string;
  type: 'campaign_click' | 'purchase' | 'persona_update' | 'reward';
  amount: string;
  timestamp: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
}

interface StreamerApplication {
  userId: string;
  reputationScore: number;
  totalSales: string;
  proposedCommission: number;
  status: 'pending' | 'approved' | 'rejected';
}

const VITRINE_CORE_ADDRESS = import.meta.env.VITE_VITRINE_CORE_ADDRESS as `0x${string}`;
const MARKETPLACE_ADDRESS = import.meta.env.VITE_MARKETPLACE_ADDRESS as `0x${string}`;

const UserDashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'persona' | 'marketplace' | 'earnings' | 'streamer'>('overview');
  const [personaStats, setPersonaStats] = useState<PersonaStats | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isStreamer, setIsStreamer] = useState(false);
  const [streamerStats, setStreamerStats] = useState({
    totalEarnings: '0',
    activePromotions: 0,
    conversionRate: 0,
    followers: 0
  });

  // Contract reads
  const { data: personaHash } = useReadContract({
    address: VITRINE_CORE_ADDRESS,
    abi: VitrineCore.abi,
    functionName: 'getUserPersonaHash',
    args: [address],
  });

  const { data: userReputation } = useReadContract({
    address: VITRINE_CORE_ADDRESS,
    abi: VitrineCore.abi,
    functionName: 'getUserReputation',
    args: [address],
  });

  const { data: userBalance } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: Marketplace.abi,
    functionName: 'getUserBalance',
    args: [address],
  });

  // Contract writes
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Load dashboard data
  useEffect(() => {
    if (isConnected && address) {
      loadDashboardData();
    }
  }, [isConnected, address, personaHash]);

  const loadDashboardData = async () => {
    try {
      // Load persona stats
      if (personaHash && personaHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const personaResponse = await fetch(`/api/persona/stats/${address}`);
        if (personaResponse.ok) {
          const stats = await personaResponse.json();
          setPersonaStats(stats);
        }
      }

      // Load recommended products
      const productsResponse = await fetch(`/api/marketplace/recommendations/${address}`);
      if (productsResponse.ok) {
        const products = await productsResponse.json();
        setRecommendedProducts(products);
      }

      // Load available campaigns
      const campaignsResponse = await fetch(`/api/campaigns/available/${address}`);
      if (campaignsResponse.ok) {
        const campaigns = await campaignsResponse.json();
        setAvailableCampaigns(campaigns);
      }

      // Load transaction history
      const transactionsResponse = await fetch(`/api/transactions/${address}`);
      if (transactionsResponse.ok) {
        const txHistory = await transactionsResponse.json();
        setTransactions(txHistory);
      }

      // Check streamer status
      const streamerResponse = await fetch(`/api/streamer/status/${address}`);
      if (streamerResponse.ok) {
        const streamerData = await streamerResponse.json();
        setIsStreamer(streamerData.isStreamer);
        if (streamerData.isStreamer) {
          setStreamerStats(streamerData.stats);
        }
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleCampaignClick = async (campaignId: string) => {
    try {
      const response = await fetch('/api/campaigns/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, userAddress: address })
      });

      if (response.ok) {
        const { reward } = await response.json();
        toast.success(`Você ganhou ${formatEther(reward)} ETH por interagir com a campanha!`);
        loadDashboardData(); // Reload data
      }
    } catch (error) {
      console.error('Error clicking campaign:', error);
      toast.error('Erro ao processar interação');
    }
  };

  const handleProductPurchase = async (productId: string, price: string) => {
    try {
      writeContract({
        address: MARKETPLACE_ADDRESS,
        abi: Marketplace.abi,
        functionName: 'purchaseProduct',
        args: [productId],
        value: parseEther(price),
      });
    } catch (error) {
      console.error('Error purchasing product:', error);
      toast.error('Erro ao comprar produto');
    }
  };

  const applyForStreamer = async () => {
    try {
      const response = await fetch('/api/streamer/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userAddress: address,
          reputationScore: userReputation,
          proposedCommission: 5 // 5% default
        })
      });

      if (response.ok) {
        toast.success('Aplicação para streamer enviada! Aguarde análise.');
      } else {
        toast.error('Erro ao enviar aplicação');
      }
    } catch (error) {
      console.error('Error applying for streamer:', error);
      toast.error('Erro ao aplicar para streamer');
    }
  };

  const withdrawEarnings = async () => {
    try {
      writeContract({
        address: MARKETPLACE_ADDRESS,
        abi: Marketplace.abi,
        functionName: 'withdrawBalance',
        args: [],
      });
    } catch (error) {
      console.error('Error withdrawing earnings:', error);
      toast.error('Erro ao sacar ganhos');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Conecte sua Carteira</h1>
          <p className="text-xl">Para acessar seu dashboard, conecte sua carteira Web3</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-blue-200">Bem-vindo ao Vitrine dApp</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-blue-200">Reputação</p>
                <p className="text-lg font-semibold text-white">
                  {userReputation ? Number(userReputation) : 0}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-200">Saldo</p>
                <p className="text-lg font-semibold text-white">
                  {userBalance ? formatEther(userBalance) : '0'} ETH
                </p>
              </div>
              {userBalance && Number(formatEther(userBalance)) > 0 && (
                <button
                  onClick={withdrawEarnings}
                  disabled={isPending || isConfirming}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isPending || isConfirming ? 'Sacando...' : 'Sacar'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex space-x-1 bg-white/10 backdrop-blur-lg rounded-lg p-1 mb-8">
          {[
            { id: 'overview', label: 'Visão Geral' },
            { id: 'persona', label: 'Minha Persona' },
            { id: 'marketplace', label: 'Marketplace' },
            { id: 'earnings', label: 'Ganhos' },
            { id: 'streamer', label: 'Streamer' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-blue-200 text-sm font-medium">Persona Status</h3>
                <p className="text-2xl font-bold text-white mt-2">
                  {personaHash && personaHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
                    ? 'Ativa' : 'Não Criada'}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-blue-200 text-sm font-medium">Campanhas Disponíveis</h3>
                <p className="text-2xl font-bold text-white mt-2">{availableCampaigns.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-blue-200 text-sm font-medium">Ganhos do Mês</h3>
                <p className="text-2xl font-bold text-white mt-2">
                  {personaStats ? formatEther(personaStats.earningsThisMonth) : '0'} ETH
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-blue-200 text-sm font-medium">Interações Totais</h3>
                <p className="text-2xl font-bold text-white mt-2">
                  {personaStats?.totalInteractions || 0}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Ações Rápidas</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('persona')}
                  className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                >
                  <div className="text-left">
                    <h3 className="font-semibold">
                      {personaHash && personaHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
                        ? 'Atualizar Persona' : 'Criar Persona'}
                    </h3>
                    <p className="text-sm opacity-80">Configure seus interesses e preferências</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
                >
                  <div className="text-left">
                    <h3 className="font-semibold">Explorar Marketplace</h3>
                    <p className="text-sm opacity-80">Produtos recomendados para você</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('streamer')}
                  className="p-4 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
                >
                  <div className="text-left">
                    <h3 className="font-semibold">
                      {isStreamer ? 'Dashboard Streamer' : 'Tornar-se Streamer'}
                    </h3>
                    <p className="text-sm opacity-80">
                      {isStreamer ? 'Gerencie suas promoções' : 'Ganhe promovendo produtos'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Transactions */}
            {transactions.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Transações Recentes</h2>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{tx.description}</p>
                        <p className="text-blue-200 text-sm">
                          {new Date(tx.timestamp).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          tx.type === 'purchase' ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {tx.type === 'purchase' ? '-' : '+'}{formatEther(tx.amount)} ETH
                        </p>
                        <p className={`text-sm ${
                          tx.status === 'completed' ? 'text-green-400' : 
                          tx.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {tx.status === 'completed' ? 'Concluída' : 
                           tx.status === 'pending' ? 'Pendente' : 'Falhou'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Persona Tab */}
        {activeTab === 'persona' && (
          <div className="space-y-6">
            {personaStats ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Status da Persona</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-blue-200 mb-2">Informações Básicas</h3>
                    <div className="space-y-2">
                      <p className="text-white"><span className="text-blue-200">Hash:</span> {personaStats.hash.slice(0, 10)}...</p>
                      <p className="text-white"><span className="text-blue-200">FID:</span> {personaStats.fid}</p>
                      <p className="text-white"><span className="text-blue-200">Última Atualização:</span> {new Date(personaStats.lastUpdated).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-blue-200 mb-2">Performance</h3>
                    <div className="space-y-2">
                      <p className="text-white"><span className="text-blue-200">Campanhas Compatíveis:</span> {personaStats.matchingCampaigns}</p>
                      <p className="text-white"><span className="text-blue-200">Score de Reputação:</span> {personaStats.reputationScore}</p>
                      <p className="text-white"><span className="text-blue-200">Total de Interações:</span> {personaStats.totalInteractions}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => window.location.href = '/update-persona'}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Atualizar Persona
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 text-center">
                <h2 className="text-xl font-semibold text-white mb-4">Persona Não Encontrada</h2>
                <p className="text-blue-200 mb-6">
                  Você ainda não criou sua persona. Crie agora para começar a receber produtos e campanhas personalizadas.
                </p>
                <button
                  onClick={() => window.location.href = '/update-persona'}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Criar Persona
                </button>
              </div>
            )}
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            {/* Available Campaigns */}
            {availableCampaigns.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Campanhas Disponíveis</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {availableCampaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h3 className="text-white font-semibold mb-2">{campaign.title}</h3>
                      <p className="text-blue-200 text-sm mb-3">{campaign.description}</p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-green-400 font-medium">
                          {formatEther(campaign.cpc)} ETH por clique
                        </span>
                        <span className="text-blue-200 text-sm">
                          Alcance estimado: {campaign.estimatedReach}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCampaignClick(campaign.id)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Participar Campanha
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Products */}
            {recommendedProducts.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Produtos Recomendados</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {recommendedProducts.map((product) => (
                    <div key={product.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      {product.imageUrl && (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-semibold">{product.name}</h3>
                        {product.sponsored && (
                          <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                            Patrocinado
                          </span>
                        )}
                      </div>
                      <p className="text-blue-200 text-sm mb-3">{product.description}</p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-green-400 font-medium">
                          {formatEther(product.price)} ETH
                        </span>
                        <span className="text-blue-200 text-sm">
                          {product.personalityMatch}% compatível
                        </span>
                      </div>
                      <button
                        onClick={() => handleProductPurchase(product.id, product.price)}
                        disabled={isPending || isConfirming}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isPending || isConfirming ? 'Comprando...' : 'Comprar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Histórico de Ganhos</h2>
              
              {transactions.filter(tx => tx.type !== 'purchase').length > 0 ? (
                <div className="space-y-3">
                  {transactions
                    .filter(tx => tx.type !== 'purchase')
                    .map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{tx.description}</p>
                          <p className="text-blue-200 text-sm">
                            {new Date(tx.timestamp).toLocaleDateString('pt-BR')} - {
                              tx.type === 'campaign_click' ? 'Clique em Campanha' :
                              tx.type === 'persona_update' ? 'Atualização de Persona' :
                              tx.type === 'reward' ? 'Recompensa' : 'Outro'
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-semibold">
                            +{formatEther(tx.amount)} ETH
                          </p>
                          <p className={`text-sm ${
                            tx.status === 'completed' ? 'text-green-400' : 
                            tx.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {tx.status === 'completed' ? 'Concluída' : 
                             tx.status === 'pending' ? 'Pendente' : 'Falhou'}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-blue-200">Nenhum ganho registrado ainda.</p>
                  <p className="text-sm text-blue-300 mt-2">
                    Comece interagindo com campanhas e atualizando sua persona para ganhar recompensas.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Streamer Tab */}
        {activeTab === 'streamer' && (
          <div className="space-y-6">
            {isStreamer ? (
              <>
                {/* Streamer Stats */}
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                    <h3 className="text-blue-200 text-sm font-medium">Ganhos Totais</h3>
                    <p className="text-2xl font-bold text-white mt-2">
                      {formatEther(streamerStats.totalEarnings)} ETH
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                    <h3 className="text-blue-200 text-sm font-medium">Promoções Ativas</h3>
                    <p className="text-2xl font-bold text-white mt-2">{streamerStats.activePromotions}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                    <h3 className="text-blue-200 text-sm font-medium">Taxa de Conversão</h3>
                    <p className="text-2xl font-bold text-white mt-2">{streamerStats.conversionRate}%</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                    <h3 className="text-blue-200 text-sm font-medium">Seguidores</h3>
                    <p className="text-2xl font-bold text-white mt-2">{streamerStats.followers}</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <h2 className="text-xl font-semibold text-white mb-4">Painel do Streamer</h2>
                  <p className="text-blue-200 mb-4">
                    Como streamer verificado, você pode promover produtos e ganhar comissões instantâneas.
                  </p>
                  <div className="flex space-x-4">
                    <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                      Criar Promoção
                    </button>
                    <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      Ver Analytics
                    </button>
                    <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                      Sacar Comissões
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Torne-se um Streamer</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-blue-200 mb-3">Benefícios do Streamer</h3>
                    <ul className="text-white space-y-2">
                      <li>• Ganhe comissões instantâneas por vendas</li>
                      <li>• Acesso a produtos exclusivos para promover</li>
                      <li>• Dashboard avançado com analytics</li>
                      <li>• Sistema de pagamento automático via smart contracts</li>
                      <li>• Badge de verificação na plataforma</li>
                      <li>• Prioridade em campanhas publicitárias</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-blue-200 mb-3">Requisitos</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white">Reputação mínima</span>
                        <span className={`font-semibold ${
                          Number(userReputation) >= 50 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {Number(userReputation)}/50
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white">Persona ativa</span>
                        <span className={`font-semibold ${
                          personaHash && personaHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
                            ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {personaHash && personaHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
                            ? '✓ Ativa' : '✗ Inativa'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white">Histórico de transações</span>
                        <span className={`font-semibold ${
                          transactions.length >= 5 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transactions.length}/5
                        </span>
                      </div>
                    </div>
                    
                    {Number(userReputation) >= 50 && 
                     personaHash && personaHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' && 
                     transactions.length >= 5 ? (
                      <button
                        onClick={applyForStreamer}
                        className="w-full mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Aplicar para Streamer
                      </button>
                    ) : (
                      <div className="mt-6 p-4 bg-yellow-600/20 border border-yellow-600/30 rounded-lg">
                        <p className="text-yellow-200 text-sm">
                          Complete os requisitos acima para se candidatar a streamer.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Success notification for transactions */}
      {isSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg">
          <p className="font-semibold">Transação concluída com sucesso!</p>
        </div>
      )}

      {/* Loading overlay */}
      {(isPending || isConfirming) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white font-semibold">
              {isPending ? 'Confirmando transação...' : 'Aguardando confirmação da rede...'}
            </p>
            <p className="text-blue-200 text-sm mt-2">
              Isso pode levar alguns segundos
            </p>
          </div>
        </div>
      )}

      {/* Bottom Action Bar - Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-lg border-t border-white/20">
        <div className="flex justify-around py-2">
          {[
            { id: 'overview', label: 'Início', icon: '🏠' },
            { id: 'persona', label: 'Persona', icon: '👤' },
            { id: 'marketplace', label: 'Market', icon: '🛍️' },
            { id: 'earnings', label: 'Ganhos', icon: '💰' },
            { id: 'streamer', label: 'Stream', icon: '📺' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                activeTab === tab.id ? 'text-blue-400' : 'text-blue-200'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Help Button */}
      <button 
        onClick={() => toast.info('Em breve: Central de ajuda e tutoriais!')}
        className="fixed bottom-20 md:bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
      >
        <span className="text-xl">?</span>
      </button>

      {/* Privacy Notice */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-blue-600/10 backdrop-blur-lg rounded-xl p-6 border border-blue-400/20">
          <h3 className="text-lg font-semibold text-white mb-2">🔒 Sua Privacidade é Garantida</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-200">
            <div>
              <h4 className="font-medium text-white mb-1">Anonimização Completa</h4>
              <p>Seus dados pessoais são processados por IA e completamente anonimizados antes do armazenamento.</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-1">Armazenamento Descentralizado</h4>
              <p>Suas personas são armazenadas na rede CESS, garantindo que nenhuma entidade central tenha acesso.</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-1">Controle Total</h4>
              <p>Você pode atualizar, pausar ou deletar sua persona a qualquer momento através do dashboard.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-lg border-t border-white/10">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Vitrine dApp</h3>
              <p className="text-blue-200 text-sm">
                A nova era da publicidade digital: ética, descentralizada e recompensadora.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3">Plataforma</h4>
              <ul className="space-y-2 text-sm text-blue-200">
                <li><a href="/marketplace" className="hover:text-white transition-colors">Marketplace</a></li>
                <li><a href="/campaigns" className="hover:text-white transition-colors">Campanhas</a></li>
                <li><a href="/streamer" className="hover:text-white transition-colors">Programa Streamer</a></li>
                <li><a href="/analytics" className="hover:text-white transition-colors">Analytics</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3">Recursos</h4>
              <ul className="space-y-2 text-sm text-blue-200">
                <li><a href="/docs" className="hover:text-white transition-colors">Documentação</a></li>
                <li><a href="/api" className="hover:text-white transition-colors">API</a></li>
                <li><a href="/whitepaper" className="hover:text-white transition-colors">Whitepaper</a></li>
                <li><a href="/roadmap" className="hover:text-white transition-colors">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3">Comunidade</h4>
              <ul className="space-y-2 text-sm text-blue-200">
                <li><a href="/discord" className="hover:text-white transition-colors">Discord</a></li>
                <li><a href="/telegram" className="hover:text-white transition-colors">Telegram</a></li>
                <li><a href="/twitter" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="/github" className="hover:text-white transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-6 text-center">
            <p className="text-blue-200 text-sm">
              © 2025 Vitrine dApp. Construído com ❤️ para uma internet mais ética e descentralizada.
            </p>
          </div>
        </div>
      </footer>

      {/* Progressive Web App - Add to homescreen prompt for mobile */}
      <style jsx>{`
        @media (max-width: 768px) {
          .container {
            padding-bottom: 80px;
          }
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
      `}</style>
    </div>
  );
};

export default UserDashboard;
