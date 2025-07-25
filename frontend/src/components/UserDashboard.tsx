import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useContractRead } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import vitrineCoreAbi from '../abi/VitrineCore.json';
import RegisterProductForm from './RegisterProductForm'; // <-- 1. Importar o novo componente

const REGISTER_PRODUCT_REP_THRESHOLD = 10; // O mesmo valor do smart contract

export default function UserDashboard() {
  const navigate = useNavigate();
  const { address: userAddress, isConnected } = useAccount();
  const coreContractAddress = (import.meta.env.VITE_VITRINE_CORE_ADDRESS || '') as `0x${string}`;
  
  const [isEditing, setIsEditing] = useState(false);
  const [interests, setInterests] = useState('');
  const [purchaseIntent, setPurchaseIntent] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [brands, setBrands] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [isFetchingId, setIsFetchingId] = useState(false);

  const { data: personaHash, isLoading: isLoadingHash, refetch: refetchPersonaHash } = useContractRead({ address: coreContractAddress, abi: vitrineCoreAbi.abi, functionName: 'personaHashes', args: [userAddress], enabled: isConnected });
  const { data: reputation, refetch: refetchReputation } = useContractRead({ address: coreContractAddress, abi: vitrineCoreAbi.abi, functionName: 'userReputation', args: [userAddress], enabled: isConnected });
  
  useEffect(() => {
    if (!isLoadingHash) {
      const userIsNew = !personaHash || String(personaHash) === '0x0000000000000000000000000000000000000000000000000000000000000000';
      setIsEditing(userIsNew);
    }
  }, [isLoadingHash, personaHash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true); setSubmitError('');
    const personaData = { interests: interests.split(',').map(item => item.trim()).filter(item => item), purchaseIntent: purchaseIntent.split(',').map(item => item.trim()).filter(item => item), ageRange, favoriteBrands: brands.split(',').map(item => item.trim()).filter(item => item),};
    try {
      const response = await fetch(`http://localhost:8000/api/persona/update?user_address=${userAddress}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(personaData), });
      if (!response.ok) throw new Error('Falha na comunicação com o servidor.');
      const result = await response.json();
      navigate('/success', { state: { txHash: result.tx_hash } });
    } catch (error) {
      console.error("Erro ao enviar dados:", error); setSubmitError('Não foi possível enviar os dados.');
    } finally { setIsSubmitting(false); }
  };
  const handleLinkExtension = async () => { setIsFetchingId(true); setConnectionId(''); try { const response = await fetch(`http://localhost:8000/api/user/link_extension?user_address=${userAddress}`, { method: 'POST', }); if (!response.ok) throw new Error('Falha ao obter o ID de conexão.'); const data = await response.json(); setConnectionId(data.connection_id); } catch (error) { console.error(error); } finally { setIsFetchingId(false); } };
  const handleManualRefresh = () => { refetchPersonaHash(); refetchReputation(); };

  return (
    <div className="space-y-8">
      {/* O Painel de Utilizador agora está sempre visível */}
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl shadow-lg space-y-6">
        <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-white">Meu Painel</h2><button onClick={handleManualRefresh} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700" title="Atualizar dados"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg></button></div>
        <div className="p-4 bg-gray-900 rounded-lg space-y-2"><div><p className="text-sm text-gray-400">Hash da sua Persona On-Chain:</p>{personaHash && String(personaHash) !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? (<p className="font-mono text-xs break-all text-green-400 mt-1">{String(personaHash)}</p>) : ( <p className="text-yellow-400 mt-1">Nenhuma persona registada.</p> )}</div><div className="pt-2 border-t border-gray-700"><p className="text-sm text-gray-400">Sua Reputação:</p><p className="font-bold text-2xl text-cyan-400 mt-1">{reputation ? String(reputation) : '0'} Pontos</p></div></div>
        <div className="p-4 border border-dashed border-gray-600 rounded-lg text-center mt-6"><h3 className="font-semibold text-lg">Ligar Extensão do Chrome</h3><p className="text-sm text-gray-400 mt-1">Gere um código para conectar a sua extensão a esta conta.</p><button onClick={handleLinkExtension} disabled={isFetchingId} className="mt-4 py-2 px-4 border rounded-md shadow-sm font-medium text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500">{isFetchingId ? 'A gerar...' : 'Gerar Código de Conexão'}</button>{connectionId && (<div className="mt-4 p-2 bg-gray-900 rounded"><p className="text-xs text-gray-400">Copie este código para a sua extensão:</p><p className="font-mono text-green-400 break-all cursor-pointer" onClick={() => navigator.clipboard.writeText(connectionId)}>{connectionId}</p></div>)}</div>
        <form onSubmit={handleSubmit} className="space-y-4 pt-6 border-t border-gray-700"><h3 className="font-semibold text-lg">Atualize a sua Persona</h3><div><label htmlFor="interests" className="block text-sm font-medium text-gray-300">Os seus Interesses (separados por vírgula)</label><input id="interests" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Ex: blockchain, energia solar, IA" className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/></div><div><label htmlFor="purchaseIntent" className="block text-sm font-medium text-gray-300">O que planeia comprar?</label><input id="purchaseIntent" value={purchaseIntent} onChange={(e) => setPurchaseIntent(e.target.value)} placeholder="Ex: smartphone novo, viagem" className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label htmlFor="brands" className="block text-sm font-medium text-gray-300">Marcas Preferidas</label><input id="brands" value={brands} onChange={(e) => setBrands(e.target.value)} placeholder="Ex: Apple, Nike" className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/></div><div><label htmlFor="ageRange" className="block text-sm font-medium text-gray-300">Faixa Etária</label><select id="ageRange" value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"><option value="">Prefiro não informar</option><option value="18-24">18-24</option><option value="25-34">25-34</option><option value="35-44">35-44</option><option value="45+">45+</option></select></div></div><button type="submit" disabled={isSubmitting} className="w-full py-2 px-4 border rounded-md shadow-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400/50">{isSubmitting ? 'A processar...' : 'Enviar Dados para Análise'}</button>{submitError && <p className="text-red-500 text-center text-sm">{submitError}</p>}</form>
      </div>

      {/* ✅ 2. NOVA SECÇÃO DO MARKETPLACE */}
      <div className="mt-8 pt-6 border-t border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Ações de Vendedor</h2>
        {Number(reputation || 0) >= REGISTER_PRODUCT_REP_THRESHOLD ? (
          // Se o utilizador tem reputação, mostra o formulário
          <RegisterProductForm />
        ) : (
          // Se não tem, mostra uma mensagem de ajuda
          <div className="text-center p-4 bg-gray-900 rounded-lg">
            <p className="text-yellow-400">Você precisa de {REGISTER_PRODUCT_REP_THRESHOLD} pontos de reputação para poder registar produtos.</p>
            <p className="text-gray-400 text-sm mt-2">Continue a participar na plataforma e a atualizar a sua persona para ganhar mais reputação.</p>
          </div>
        )}
      </div>
    </div>
  );
}
