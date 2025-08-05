import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { toast } from 'react-hot-toast';
import VitrineCore from '../abi/VitrineCore.json';

// Interfaces para tipagem - ajustadas para corresponder ao backend
interface Demographics {
  age_range: string;
  location: string;
  language: string;
}

interface BrowseData {
  categories: string[];
  time_spent: Record<string, number>;
  devices: string[];
}

interface Preferences {
  ad_types: string[];
  content_formats: string[];
  shopping_habits: string[];
}

interface PersonaData {
  interests: string[];
  demographics: Demographics;
  Browse: BrowseData;
  preferences: Preferences;
}

interface PersonaRequest {
  user_address: string;
  persona_data: PersonaData;
}

interface FormData {
  // Dados demográficos
  ageRange: string;
  location: string;
  language: string;
  
  // Interesses
  interests: string[];
  customInterest: string;
  
  // Preferências de navegação
  categories: string[];
  devices: string[];
  
  // Preferências de publicidade
  adTypes: string[];
  contentFormats: string[];
  shoppingHabits: string[];
}

interface PersonaStats {
  hash: string;
  fid: string;
  lastUpdated: string;
  matchingCampaigns: number;
  earningsThisMonth: string;
  reputationScore: number;
  totalInteractions: number;
}

interface BackendResponse {
  success: boolean;
  hash: string;
  fid: string;
  processing_method: string;
  storage_provider: string;
  message: string;
}

const VITRINE_CORE_ADDRESS = import.meta.env.VITE_VITRINE_CORE_ADDRESS as `0x${string}`;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const UpdatePersonaPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState<FormData>({
    ageRange: '',
    location: '',
    language: '',
    interests: [],
    customInterest: '',
    categories: [],
    devices: [],
    adTypes: [],
    contentFormats: [],
    shoppingHabits: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [existingPersona, setExistingPersona] = useState<PersonaData | null>(null);
  const [personaStats, setPersonaStats] = useState<PersonaStats | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');

  // Opções predefinidas para os campos
  const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const languages = ['português', 'english', 'español', 'français', 'deutsch'];
  const interestOptions = [
    'tecnologia', 'esportes', 'música', 'cinema', 'gastronomia', 'viagem',
    'moda', 'arte', 'jogos', 'educação', 'saúde', 'finanças', 'sustentabilidade'
  ];
  const categoryOptions = [
    'e-commerce', 'notícias', 'entretenimento', 'educação', 'redes sociais',
    'produtividade', 'esportes', 'tecnologia', 'saúde'
  ];
  const deviceOptions = ['Desktop', 'Mobile', 'Tablet', 'Smart TV'];
  const adTypeOptions = [
    'Display Banners', 'Vídeos', 'Native Ads', 'Social Media', 'Influencer Marketing'
  ];
  const contentFormatOptions = [
    'Artigos', 'Vídeos', 'Podcasts', 'Infográficos', 'Lives', 'Stories'
  ];
  const shoppingHabitOptions = [
    'Compra por impulso', 'Pesquisa preços', 'Fidelidade a marcas',
    'Sustentabilidade', 'Promoções', 'Qualidade premium'
  ];

  // Hook para ler persona existente
  const { data: personaHash } = useReadContract({
    address: VITRINE_CORE_ADDRESS,
    abi: VitrineCore.abi,
    functionName: 'getUserPersonaHash',
    args: [address],
  });

  // Hook para criar/atualizar persona
  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Efeito para carregar persona existente
  useEffect(() => {
    if (address && personaHash && personaHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      loadExistingPersona();
      loadPersonaStats();
    }
  }, [personaHash, address]);

  // Efeito para tratar sucesso da transação
  useEffect(() => {
    if (isSuccess) {
      toast.success('Persona registrada na blockchain com sucesso!');
      setIsLoading(false);
      setProcessingStep('');
      // Recarregar estatísticas
      if (address) {
        loadPersonaStats();
      }
    }
  }, [isSuccess, address]);

  const loadExistingPersona = async () => {
    try {
      setProcessingStep('Carregando persona existente...');
      
      const response = await fetch(`${API_BASE_URL}/api/persona/${personaHash}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const persona: PersonaData = await response.json();
        setExistingPersona(persona);
        populateFormWithExistingData(persona);
        toast.success('Persona existente carregada!');
      } else if (response.status === 404) {
        toast.info('Hash encontrado, mas dados da persona não estão disponíveis');
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erro ao carregar persona existente:', error);
      toast.error('Erro ao carregar persona existente');
    } finally {
      setProcessingStep('');
    }
  };

  const loadPersonaStats = async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/persona/stats/${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const stats: PersonaStats = await response.json();
        setPersonaStats(stats);
      } else if (response.status !== 404) {
        console.warn('Erro ao carregar estatísticas da persona');
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const populateFormWithExistingData = (persona: PersonaData) => {
    setFormData({
      ageRange: persona.demographics.age_range,
      location: persona.demographics.location,
      language: persona.demographics.language,
      interests: persona.interests,
      customInterest: '',
      categories: persona.Browse.categories,
      devices: persona.Browse.devices,
      adTypes: persona.preferences.ad_types,
      contentFormats: persona.preferences.content_formats,
      shoppingHabits: persona.preferences.shopping_habits
    });
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayToggle = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).includes(value)
        ? (prev[field] as string[]).filter(item => item !== value)
        : [...(prev[field] as string[]), value]
    }));
  };

  const addCustomInterest = () => {
    if (formData.customInterest.trim() && !formData.interests.includes(formData.customInterest.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, prev.customInterest.trim().toLowerCase()],
        customInterest: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.ageRange || !formData.location || !formData.language) {
      toast.error('Por favor, preencha todos os campos demográficos obrigatórios');
      return false;
    }
    if (formData.interests.length === 0) {
      toast.error('Selecione pelo menos um interesse');
      return false;
    }
    if (formData.categories.length === 0) {
      toast.error('Selecione pelo menos uma categoria de navegação');
      return false;
    }
    if (formData.devices.length === 0) {
      toast.error('Selecione pelo menos um dispositivo');
      return false;
    }
    return true;
  };

  const createTimeSpentData = (categories: string[]): Record<string, number> => {
    // Simular dados de tempo gasto baseado nas categorias selecionadas
    const timeSpent: Record<string, number> = {};
    const totalHours = 8; // Total de horas simuladas por dia
    const baseTime = totalHours / categories.length;
    
    categories.forEach((category, index) => {
      // Adicionar alguma variação no tempo gasto
      const variation = (Math.random() - 0.5) * 2; // -1 a +1 horas
      timeSpent[category] = Math.max(0.5, baseTime + variation);
    });
    
    return timeSpent;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      toast.error('Conecte sua carteira primeiro');
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    setProcessingStep('Preparando dados...');

    try {
      // Criar objeto persona com a estrutura esperada pelo backend
      const personaData: PersonaData = {
        interests: formData.interests,
        demographics: {
          age_range: formData.ageRange,
          location: formData.location,
          language: formData.language
        },
        Browse: {
          categories: formData.categories,
          time_spent: createTimeSpentData(formData.categories),
          devices: formData.devices
        },
        preferences: {
          ad_types: formData.adTypes,
          content_formats: formData.contentFormats,
          shopping_habits: formData.shoppingHabits
        }
      };

      const requestBody: PersonaRequest = {
        user_address: address,
        persona_data: personaData
      };

      setProcessingStep('Processando persona com IA...');

      // Enviar para o backend para processamento e armazenamento na CESS
      const response = await fetch(`${API_BASE_URL}/api/persona/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
        throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`);
      }

      const backendResponse: BackendResponse = await response.json();

      if (!backendResponse.success) {
        throw new Error(backendResponse.message || 'Erro ao processar persona no backend');
      }

      setProcessingStep('Registrando na blockchain...');
      
      toast.success(`Persona processada com ${backendResponse.processing_method} e armazenada na ${backendResponse.storage_provider}!`);

      // Registrar hash no smart contract
      writeContract({
        address: VITRINE_CORE_ADDRESS,
        abi: VitrineCore.abi,
        functionName: 'registerPersona',
        args: [backendResponse.hash],
      });

      toast.info('Aguardando confirmação da transação...');
      
    } catch (error) {
      console.error('Erro ao criar persona:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao criar persona: ${errorMessage}`);
      setIsLoading(false);
      setProcessingStep('');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Conecte sua Carteira</h1>
          <p className="text-xl">Para criar ou atualizar sua persona, conecte sua carteira Web3</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {existingPersona ? 'Atualizar Persona' : 'Criar Persona'}
          </h1>
          <p className="text-blue-200">
            Configure seus dados para criar uma persona anônima e descentralizada
          </p>
          
          {/* Estatísticas da persona existente */}
          {personaStats && (
            <div className="mt-4 bg-blue-600/20 backdrop-blur-lg rounded-xl p-4 border border-blue-400/30">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-blue-200 text-sm">Campanhas Correspondentes</p>
                  <p className="text-white font-bold text-lg">{personaStats.matchingCampaigns}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Ganhos Este Mês</p>
                  <p className="text-white font-bold text-lg">{formatEther(BigInt(personaStats.earningsThisMonth))} ETH</p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Reputação</p>
                  <p className="text-white font-bold text-lg">{personaStats.reputationScore}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Interações</p>
                  <p className="text-white font-bold text-lg">{personaStats.totalInteractions}</p>
                </div>
              </div>
              <p className="text-blue-200 text-xs mt-2">
                FID CESS: {personaStats.fid} | Última atualização: {new Date(personaStats.lastUpdated).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Status de processamento */}
        {processingStep && (
          <div className="mb-6 bg-yellow-600/20 backdrop-blur-lg rounded-xl p-4 border border-yellow-400/30">
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-yellow-200">{processingStep}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informações Demográficas */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">Informações Demográficas</h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-blue-200 mb-2">Faixa Etária *</label>
                <select
                  value={formData.ageRange}
                  onChange={(e) => handleInputChange('ageRange', e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:border-blue-400 focus:outline-none"
                  required
                >
                  <option value="">Selecione</option>
                  {ageRanges.map(range => (
                    <option key={range} value={range} className="text-black">{range}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-blue-200 mb-2">Localização *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Ex: São Paulo, Brasil"
                  className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:border-blue-400 focus:outline-none placeholder-blue-300"
                  required
                />
              </div>

              <div>
                <label className="block text-blue-200 mb-2">Idioma *</label>
                <select
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:border-blue-400 focus:outline-none"
                  required
                >
                  <option value="">Selecione</option>
                  {languages.map(lang => (
                    <option key={lang} value={lang} className="text-black">{lang}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Interesses */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">Interesses *</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {interestOptions.map(interest => (
                <label key={interest} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(interest)}
                    onChange={() => handleArrayToggle('interests', interest)}
                    className="rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-400"
                  />
                  <span className="text-white text-sm capitalize">{interest}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={formData.customInterest}
                onChange={(e) => handleInputChange('customInterest', e.target.value)}
                placeholder="Adicionar interesse personalizado"
                className="flex-1 p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:border-blue-400 focus:outline-none placeholder-blue-300"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomInterest())}
              />
              <button
                type="button"
                onClick={addCustomInterest}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Adicionar
              </button>
            </div>

            {formData.interests.length > 0 && (
              <div className="mt-4">
                <p className="text-blue-200 mb-2">Interesses selecionados:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map(interest => (
                    <span
                      key={interest}
                      className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm cursor-pointer hover:bg-red-600 transition-colors capitalize"
                      onClick={() => handleArrayToggle('interests', interest)}
                    >
                      {interest} ×
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preferências de Navegação */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">Preferências de Navegação</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-blue-200 mb-2">Categorias de Sites Frequentados *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categoryOptions.map(category => (
                    <label key={category} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(category)}
                        onChange={() => handleArrayToggle('categories', category)}
                        className="rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-400"
                      />
                      <span className="text-white text-sm capitalize">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-blue-200 mb-2">Dispositivos Utilizados *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {deviceOptions.map(device => (
                    <label key={device} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.devices.includes(device)}
                        onChange={() => handleArrayToggle('devices', device)}
                        className="rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-400"
                      />
                      <span className="text-white text-sm">{device}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preferências de Publicidade */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">Preferências de Publicidade</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-blue-200 mb-2">Tipos de Anúncios Preferidos</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {adTypeOptions.map(adType => (
                    <label key={adType} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.adTypes.includes(adType)}
                        onChange={() => handleArrayToggle('adTypes', adType)}
                        className="rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-400"
                      />
                      <span className="text-white text-sm">{adType}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-blue-200 mb-2">Formatos de Conteúdo Preferidos</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {contentFormatOptions.map(format => (
                    <label key={format} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.contentFormats.includes(format)}
                        onChange={() => handleArrayToggle('contentFormats', format)}
                        className="rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-400"
                      />
                      <span className="text-white text-sm">{format}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-blue-200 mb-2">Hábitos de Compra</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shoppingHabitOptions.map(habit => (
                    <label key={habit} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.shoppingHabits.includes(habit)}
                        onChange={() => handleArrayToggle('shoppingHabits', habit)}
                        className="rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-400"
                      />
                      <span className="text-white text-sm">{habit}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Submit */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isLoading || isPending || isConfirming}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || isPending || isConfirming ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isPending ? 'Confirmando transação...' : isConfirming ? 'Aguardando confirmação...' : 'Processando...'}
                </span>
              ) : (
                existingPersona ? 'Atualizar Persona' : 'Criar Persona'
              )}
            </button>
          </div>

          {/* Informações sobre o processo */}
          <div className="bg-blue-600/20 backdrop-blur-lg rounded-xl p-6 border border-blue-400/30">
            <h3 className="text-lg font-semibold text-white mb-2">🔄 Processo de Criação</h3>
            <ul className="text-blue-200 space-y-1 text-sm">
              <li>• <strong>Processamento:</strong> Dados são processados usando algoritmos baseados em regras</li>
              <li>• <strong>Anonimização:</strong> Informações pessoais são anonimizadas e categorizadas</li>
              <li>• <strong>Armazenamento CESS:</strong> Persona é armazenada na rede descentralizada CESS</li>
              <li>• <strong>Blockchain:</strong> Apenas o hash é registrado no smart contract</li>
              <li>• <strong>Privacidade:</strong> Você mantém controle total sobre seus dados</li>
            </ul>
          </div>

          {/* Informações de privacidade */}
          <div className="bg-green-600/20 backdrop-blur-lg rounded-xl p-6 border border-green-400/30">
            <h3 className="text-lg font-semibold text-white mb-2">🔒 Privacidade e Segurança</h3>
            <ul className="text-green-200 space-y-1 text-sm">
              <li>• Seus dados são processados localmente pelo backend e anonimizados</li>
              <li>• A persona é armazenada de forma descentralizada na rede CESS</li>
              <li>• Apenas o hash criptográfico é registrado na blockchain</li>
              <li>• Você mantém controle total sobre seus dados e pode removê-los a qualquer momento</li>
              <li>• Empresas nunca acessam seus dados brutos, apenas personas anonimizadas</li>
              <li>• Processamento baseado em regras sem dependência de modelos de ML externos</li>
            </ul>
          </div>

          {/* Debug/Development Info */}
          {import.meta.env.DEV && (
            <div className="bg-gray-600/20 backdrop-blur-lg rounded-xl p-6 border border-gray-400/30">
              <h3 className="text-lg font-semibold text-white mb-2">🔧 Informações de Desenvolvimento</h3>
              <div className="text-gray-200 space-y-1 text-sm">
                <p>• <strong>Endereço:</strong> {address}</p>
                <p>• <strong>API Base URL:</strong> {API_BASE_URL || 'localhost:8000'}</p>
                <p>• <strong>Contract:</strong> {VITRINE_CORE_ADDRESS}</p>
                <p>• <strong>Persona Hash:</strong> {personaHash || 'Nenhum'}</p>
                {personaStats && (
                  <>
                    <p>• <strong>FID CESS:</strong> {personaStats.fid}</p>
                    <p>• <strong>Última Atualização:</strong> {personaStats.lastUpdated}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default UpdatePersonaPage;
