import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useContractRead } from 'wagmi';
import marketplaceAbi from '../abi/Marketplace.json';

export default function CreatorSeed() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { address: userAddress, isConnected } = useAccount();
  const marketplaceAddress = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '') as `0x${string}`;
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  const [metadata, setMetadata] = useState(null);
  const [liveUrl, setLiveUrl] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Buscar dados do produto
  const { data: productData } = useContractRead({
    address: marketplaceAddress,
    abi: marketplaceAbi.abi,
    functionName: 'products',
    args: [BigInt(productId || 0)],
    enabled: !!productId,
  });

  // Buscar metadados do produto
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!productData || !productData[4]) return;
      
      try {
        const response = await fetch(`${backendUrl}/api/metadata/${productData[4]}`);
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        }
      } catch (error) {
        console.error('Erro ao buscar metadados:', error);
      }
    };
    
    fetchMetadata();
  }, [productData, backendUrl]);

  // Gerar link de afiliado
  useEffect(() => {
    if (userAddress && productId) {
      // Formato: domínio/produto/ID/afiliado/endereço
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/produto/${productId}/ref/${userAddress}`;
      setAffiliateLink(link);
    }
  }, [userAddress, productId]);

  const handleGenerateLink = async () => {
    if (!liveUrl) {
      alert('Por favor, insira o link da sua live');
      return;
    }

    setLoading(true);
    
    try {
      // Preparar dados do criador
      const creatorData = {
        productId,
        creatorAddress: userAddress,
        liveUrl,
        platform,
        affiliateLink,
        commission: Number(commission),
        timestamp: new Date().toISOString(),
        version: "1.0"
      };

      // Criar arquivo JSON
      const creatorJson = JSON.stringify(creatorData, null, 2);
      const creatorFile = new File(
        [creatorJson], 
        `creator_${productId}_${userAddress}_${Date.now()}.json`, 
        { type: 'application/json' }
      );

      // Upload para CESS via backend
      const formData = new FormData();
      formData.append('file', creatorFile);

      const response = await fetch(`${backendUrl}/api/upload-to-cess`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar no CESS');
      }

      const { fid } = await response.json();
      console.log('Dados do criador salvos no CESS, FID:', fid);

      // Salvar referência localmente (em produção, salvaria no contrato)
      const creators = JSON.parse(localStorage.getItem('product_creators') || '{}');
      if (!creators[productId]) {
        creators[productId] = [];
      }
      
      creators[productId].push({
        address: userAddress,
        fid,
        platform,
        liveUrl,
        timestamp: Date.now()
      });
      
      localStorage.setItem('product_creators', JSON.stringify(creators));
      
      alert('Link de afiliado criado com sucesso! Você já pode começar a promover este produto.');
      
      // Redirecionar para o dashboard
      setTimeout(() => {
        navigate('/dashboard/creator');
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao criar link:', error);
      alert('Erro ao criar link de afiliado');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Conecte sua Carteira</h2>
          <p className="text-gray-400">Para criar links de afiliado, você precisa estar conectado</p>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const [id, owner, price, commission] = productData;
  const commissionPercentage = Number(commission);
  const priceInETH = (Number(price) / 1e18).toFixed(3);

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          
          <h1 className="text-3xl font-bold text-white">Criar Link de Afiliado</h1>
          <p className="text-gray-400 mt-2">
            Promova este produto e ganhe comissão em cada venda
          </p>
        </div>

        {/* Informações do Produto */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            {metadata?.image_fid && (
              <img
                src={`https://deoss-sgp.cess.network/file/download/${metadata.image_fid}`}
                alt={metadata.name}
                className="w-24 h-24 object-cover rounded-lg"
              />
            )}
            
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">
                {metadata?.name || `Produto #${Number(id)}`}
              </h2>
              <p className="text-gray-400 mt-1">
                {metadata?.description || 'Sem descrição'}
              </p>
              
              <div className="flex gap-6 mt-4">
                <div>
                  <p className="text-sm text-gray-400">Preço</p>
                  <p className="text-lg font-bold text-white">{priceInETH} ETH</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Sua Comissão</p>
                  <p className="text-lg font-bold text-green-500">{commissionPercentage}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Ganho por Venda</p>
                  <p className="text-lg font-bold text-green-500">
                    {(parseFloat(priceInETH) * commissionPercentage / 100).toFixed(3)} ETH
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de Criação */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Informações da Live</h3>
          
          <div className="space-y-4">
            {/* Plataforma */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Plataforma de Streaming
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['youtube', 'twitch', 'tiktok'].map((plat) => (
                  <button
                    key={plat}
                    onClick={() => setPlatform(plat)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      platform === plat 
                        ? 'border-green-500 bg-green-500/10 text-green-500' 
                        : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {plat === 'youtube' && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      )}
                      {plat === 'twitch' && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                        </svg>
                      )}
                      {plat === 'tiktok' && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                        </svg>
                      )}
                      <span className="capitalize">{plat}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* URL da Live */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Link da Live
              </label>
              <input
                type="url"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder={`https://${platform}.com/sua-live`}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Link de Afiliado Gerado */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Seu Link de Afiliado
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={affiliateLink}
                  readOnly
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-400 rounded-lg"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use este link para rastrear suas vendas e comissões
              </p>
            </div>
          </div>

          {/* Botão de Criar */}
          <button
            onClick={handleGenerateLink}
            disabled={loading || !liveUrl}
            className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Criando Link...
              </span>
            ) : (
              'Criar Link de Afiliado'
            )}
          </button>
        </div>

        {/* Dicas */}
        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
          <h4 className="text-blue-400 font-semibold mb-2">💡 Dicas para Aumentar suas Vendas:</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Mostre o produto em uso durante sua live</li>
            <li>• Explique os benefícios e diferenciais</li>
            <li>• Ofereça bônus exclusivos para sua audiência</li>
            <li>• Responda perguntas em tempo real</li>
            <li>• Use o link nos comentários fixados</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
