import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useContractRead } from 'wagmi';
import vitrineCoreAbi from '../abi/VitrineCore.json';

export default function UserDashboard() {
  const { address: userAddress, isConnected } = useAccount();
  const coreContractAddress = (import.meta.env.VITE_VITRINE_CORE_ADDRESS || '') as `0x${string}`;
  
  // --- Estados do Formulário ---
  const [interests, setInterests] = useState('');
  const [purchaseIntent, setPurchaseIntent] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [brands, setBrands] = useState('');

  // --- Estados de Controlo da UI ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Hook para ler o hash da persona do utilizador ligado em tempo real
  const { data: personaHash, isLoading: isLoadingHash } = useContractRead({
    address: coreContractAddress,
    abi: vitrineCoreAbi.abi,
    functionName: 'personaHashes',
    args: [userAddress],
    enabled: isConnected,
    watch: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess('');
    setSubmitError('');

    const personaData = {
      interests: interests.split(',').map(item => item.trim()).filter(item => item),
      purchaseIntent: purchaseIntent.split(',').map(item => item.trim()).filter(item => item),
      ageRange,
      favoriteBrands: brands.split(',').map(item => item.trim()).filter(item => item),
    };
    
    // --- LÓGICA DE CHAMADA DE API REAL ---
    try {
      const response = await fetch(`http://localhost:8000/api/persona/update?user_address=${userAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(personaData),
      });

      if (!response.ok) {
        throw new Error('Falha na comunicação com o servidor.');
      }

      const result = await response.json();
      console.log("Resposta do backend:", result);

      setSubmitSuccess('Os seus dados foram enviados com sucesso! O hash on-chain deve ser atualizado em breve.');
      
      // Limpa o formulário
      setInterests('');
      setPurchaseIntent('');
      setAgeRange('');
      setBrands('');
    } catch (error) {
      console.error("Erro ao enviar dados:", error);
      setSubmitError('Não foi possível enviar os dados. Verifique se o servidor backend está a funcionar.');
    } finally {
      setIsSubmitting(false);
    }
    // --- FIM DA LÓGICA DE API ---
  };

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl shadow-lg space-y-6">
      <h2 className="text-xl font-bold text-white">Painel do Utilizador</h2>
      
      {/* Secção para mostrar o estado on-chain */}
      <div className="p-4 bg-gray-900 rounded-lg">
        <p className="text-sm text-gray-400">Hash da sua Persona On-Chain:</p>
        {isLoadingHash ? (
          <p className="text-gray-500 mt-1">A procurar na blockchain...</p>
        ) : (
          personaHash && personaHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? (
            <p className="font-mono text-xs break-all text-green-400 mt-1">{String(personaHash)}</p>
          ) : (
            <p className="text-yellow-400 mt-1">Nenhuma persona registada na blockchain ainda.</p>
          )
        )}
      </div>

      {/* Formulário de Dados Declarados */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-gray-700">
        <h3 className="font-semibold text-lg">Atualize a sua Persona</h3>
        <div>
          <label htmlFor="interests" className="block text-sm font-medium text-gray-300">Os seus Interesses (separados por vírgula)</label>
          <input id="interests" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Ex: blockchain, energia solar, IA" className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/>
        </div>

        <div>
          <label htmlFor="purchaseIntent" className="block text-sm font-medium text-gray-300">O que planeia comprar?</label>
          <input id="purchaseIntent" value={purchaseIntent} onChange={(e) => setPurchaseIntent(e.target.value)} placeholder="Ex: smartphone novo, viagem" className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="brands" className="block text-sm font-medium text-gray-300">Marcas Preferidas</label>
              <input id="brands" value={brands} onChange={(e) => setBrands(e.target.value)} placeholder="Ex: Apple, Nike" className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/>
            </div>
            <div>
              <label htmlFor="ageRange" className="block text-sm font-medium text-gray-300">Faixa Etária</label>
              <select id="ageRange" value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md">
                <option value="">Prefiro não informar</option>
                <option value="18-24">18-24</option>
                <option value="25-34">25-34</option>
                <option value="35-44">35-44</option>
                <option value="45+">45+</option>
              </select>
            </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full py-2 px-4 border rounded-md shadow-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400/50">
          {isSubmitting ? 'A processar...' : 'Enviar Dados para Análise'}
        </button>

        {submitSuccess && <p className="text-green-400 text-center text-sm">{submitSuccess}</p>}
        {submitError && <p className="text-red-500 text-center text-sm">{submitError}</p>}
      </form>
    </div>
  );
}
