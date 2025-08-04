import React, { useState, useEffect } from 'react';
import { useAccount, useContractRead } from 'wagmi';
import vitrineCoreAbi from '../abi/VitrineCore.json';

// Componente de Métrica Individual
const MetricCard = ({ title, value, change, icon, color = 'green' }) => {
  const isPositive = change >= 0;
  const colorClasses = {
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    yellow: 'bg-yellow-600'
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
};

// Componente de Produto Recente
const RecentSaleItem = ({ sale }) => {
  const timeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s atrás`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  };

  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-700/50 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-white">{sale.productName}</p>
          <p className="text-xs text-gray-400">{timeAgo(sale.timestamp)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-green-400">+{sale.commission} ETH</p>
        <p className="text-xs text-gray-500">Comissão</p>
      </div>
    </div>
  );
};

// Componente de Gráfico Simples (sem Chart.js)
const SimpleLineChart = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const height = 200;
  
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-400 mb-3">{title}</h4>
      <div className="relative h-48 flex items-end justify-between gap-1">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-green-500 rounded-t"
              style={{ height: `${(item.value / maxValue) * 100}%` }}
            />
            <span className="text-xs text-gray-500 mt-1">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Dashboard Principal
export default function CreatorDashboard() {
  const { address: userAddress, isConnected } = useAccount();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const vitrineCoreAddress = (import.meta.env.VITE_VITRINE_CORE_ADDRESS || '') as `0x${string}`;
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  // Buscar reputação do usuário
  const { data: userReputation } = useContractRead({
    address: vitrineCoreAddress,
    abi: vitrineCoreAbi.abi,
    functionName: 'userReputation',
    args: [userAddress],
    enabled: !!userAddress && !!vitrineCoreAddress,
  });

  // Buscar dados do dashboard
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userAddress) return;

      setLoading(true);
      try {
        // Dados mock para demonstração
        const mockData = {
          metrics: {
            totalSales: 47,
            totalCommission: 3.24,
            activeProducts: 12,
            conversionRate: 8.7,
            reputation: Number(userReputation) || 750,
            viewsTotal: 15420,
            clicksTotal: 1342,
            uniqueBuyers: 41
          },
          changes: {
            sales: 12.5,
            commission: 18.3,
            conversion: -2.1,
            views: 25.8
          },
          salesHistory: generateSalesHistory(),
          recentSales: generateRecentSales(),
          categoryStats: {
            'Eletrônicos': 35,
            'Casa': 25,
            'Moda': 20,
            'Outros': 20
          },
          topProducts: generateTopProducts(),
          performanceByPlatform: {
            youtube: { sales: 23, revenue: 1.54 },
            twitch: { sales: 15, revenue: 0.98 },
            tiktok: { sales: 9, revenue: 0.72 }
          }
        };

        setDashboardData(mockData);
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userAddress, selectedPeriod, userReputation]);

  // Funções auxiliares
  function generateSalesHistory() {
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = 0; i < days; i += Math.ceil(days / 7)) {
      const date = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000);
      data.push({
        label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: Math.floor(Math.random() * 5) + 1
      });
    }
    return data;
  }

  function generateRecentSales() {
    const products = ['Smart Watch', 'Headphone Bluetooth', 'Câmera 4K', 'Mouse Gamer', 'Teclado Mecânico'];
    const sales = [];
    
    for (let i = 0; i < 5; i++) {
      sales.push({
        id: i,
        productName: products[i],
        commission: (Math.random() * 0.2).toFixed(3),
        timestamp: Date.now() - Math.random() * 48 * 60 * 60 * 1000,
        platform: ['youtube', 'twitch', 'tiktok'][Math.floor(Math.random() * 3)]
      });
    }
    
    return sales.sort((a, b) => b.timestamp - a.timestamp);
  }

  function generateTopProducts() {
    return [
      { name: 'Smart Watch Pro', sales: 15, revenue: 1.2, trend: 'up' },
      { name: 'Headphone Bluetooth X', sales: 12, revenue: 0.84, trend: 'up' },
      { name: 'Câmera 4K Ultra', sales: 8, revenue: 0.72, trend: 'down' },
      { name: 'Mouse Gamer RGB', sales: 7, revenue: 0.35, trend: 'stable' },
      { name: 'Teclado Mecânico', sales: 5, revenue: 0.13, trend: 'up' }
    ];
  }

  async function exportToCESS() {
    try {
      const reportData = {
        creator: userAddress,
        period: selectedPeriod,
        metrics: dashboardData?.metrics,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      const reportJson = JSON.stringify(reportData, null, 2);
      const reportFile = new File([reportJson], `creator_report_${Date.now()}.json`, { type: 'application/json' });

      const formData = new FormData();
      formData.append('file', reportFile);

      const response = await fetch(`${backendUrl}/api/upload-to-cess`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const { fid } = await response.json();
        alert(`Relatório exportado com sucesso! FID: ${fid}`);
      }
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      alert('Erro ao exportar relatório');
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Conecte sua Carteira</h2>
          <p className="text-gray-400">Para acessar o dashboard de criador</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard do Criador</h1>
          <p className="text-gray-400">Acompanhe seu desempenho e otimize suas vendas</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex bg-gray-800 rounded-lg p-1">
            {['7d', '30d', 'all'].map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedPeriod === period 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : 'Tudo'}
              </button>
            ))}
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Vendas Totais"
            value={dashboardData?.metrics.totalSales || 0}
            change={dashboardData?.changes.sales}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
            color="green"
          />
          
          <MetricCard
            title="Comissão Total"
            value={`${dashboardData?.metrics.totalCommission || 0} ETH`}
            change={dashboardData?.changes.commission}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="blue"
          />
          
          <MetricCard
            title="Taxa de Conversão"
            value={`${dashboardData?.metrics.conversionRate || 0}%`}
            change={dashboardData?.changes.conversion}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            color="purple"
          />
          
          <MetricCard
            title="Reputação"
            value={dashboardData?.metrics.reputation || 0}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
            color="yellow"
          />
        </div>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Vendas */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Histórico de Vendas</h3>
            <SimpleLineChart 
              data={dashboardData?.salesHistory || []} 
              title="Vendas por período"
            />
          </div>

          {/* Vendas Recentes */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Vendas Recentes</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {dashboardData?.recentSales.map(sale => (
                <RecentSaleItem key={sale.id} sale={sale} />
              ))}
            </div>
          </div>

          {/* Performance por Plataforma */}
          <div className="lg:col-span-3 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Performance por Plataforma</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(dashboardData?.performanceByPlatform || {}).map(([platform, data]) => (
                <div key={platform} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      platform === 'youtube' ? 'bg-red-600' :
                      platform === 'twitch' ? 'bg-purple-600' :
                      'bg-black'
                    }`}>
                      <span className="text-white text-xs font-bold uppercase">
                        {platform.charAt(0)}
                      </span>
                    </div>
                    <span className="text-white font-medium capitalize">{platform}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Vendas</span>
                      <span className="text-white font-semibold">{data.sales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Receita</span>
                      <span className="text-green-400 font-semibold">{data.revenue} ETH</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Botão de Exportar */}
        <div className="mt-8 flex justify-end">
          <button 
            onClick={() => exportToCESS()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Exportar Relatório para CESS
          </button>
        </div>
      </div>
    </div>
  );
}
