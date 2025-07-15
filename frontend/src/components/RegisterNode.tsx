import { useState } from 'react';
import { useAccount } from 'wagmi';
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from 'wagmi';
import { useSunest } from '../hooks/useContracts';
import { normalize } from '../lib/strings';

type AvailableMicrogrid = { hash: string; walletMetamask: string };

export default function RegisterNode() {
  const { isConnected } = useAccount();
  const { publicClient, address: sunestAddress, abi: sunestAbi } = useSunest();

  const [searchCountry, setSearchCountry] = useState('Brasil');
  const [searchCity, setSearchCity] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [availableMicrogrids, setAvailableMicrogrids] = useState<AvailableMicrogrid[]>([]);
  const [selectedMicrogridHash, setSelectedMicrogridHash] = useState('');
  const [nodeGB, setNodeGB] = useState('10');

  const findMicrogrids = async () => {
    setIsSearching(true);
    try {
      const data = await publicClient.readContract({
        address: sunestAddress,
        abi: sunestAbi,
        functionName: 'microgridsByLocation',
        args: [normalize(searchCountry), normalize(searchCity)],
      });
      const formatted = data[0].map((hash, i) => ({ hash: hash, walletMetamask: data[1][i] }));
      setAvailableMicrogrids(formatted);
    } catch (e) { console.error("Falha ao buscar microgrids", e); }
    finally { setIsSearching(false); }
  };

  const { config } = usePrepareContractWrite({
    address: sunestAddress,
    abi: sunestAbi,
    functionName: 'registerNode',
    args: [selectedMicrogridHash, normalize(searchCountry), normalize(searchCity), BigInt(nodeGB || '0')],
    enabled: !!selectedMicrogridHash && !!nodeGB,
  });

  const { data, write } = useContractWrite(config);
  const { isLoading, isSuccess } = useWaitForTransaction({ hash: data?.hash });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (write) write();
  };
  
  if (!isConnected) {
    return <p className="text-sm text-center text-gray-500">Conecte a carteira para registrar um nó.</p>;
  }

  return (
    <div className="space-y-4">
       <h3 className="text-lg font-semibold text-gray-800">Registrar Novo Nó</h3>
      <div className="space-y-2 p-3 border rounded-md bg-gray-50">
        <p className="text-sm font-medium text-gray-700">1. Encontre uma microgrid para se conectar:</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={searchCountry} onChange={e => setSearchCountry(e.target.value)} placeholder="País" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
          <input value={searchCity} onChange={e => setSearchCity(e.target.value)} placeholder="Cidade" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
          <button type="button" onClick={findMicrogrids} disabled={isSearching} className="py-2 px-4 bg-gray-600 text-white rounded-md disabled:bg-gray-400">
            {isSearching ? '...' : 'Buscar'}
          </button>
        </div>
      </div>
      
      {availableMicrogrids.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
           <p className="text-sm font-medium text-gray-700">2. Preencha os dados do seu nó:</p>
          <div>
            <label htmlFor="microgrid" className="block text-sm font-medium text-gray-700">Selecione a Microgrid</label>
            <select id="microgrid" value={selectedMicrogridHash} onChange={e => setSelectedMicrogridHash(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
              <option value="">-- Escolha uma --</option>
              {availableMicrogrids.map(mg => (
                <option key={mg.hash} value={mg.hash}>Hash: {mg.hash.slice(0, 10)}...</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nodeGB" className="block text-sm font-medium text-gray-700">Capacidade do seu Nó (GB)</label>
            <input id="nodeGB" type="number" value={nodeGB} onChange={e => setNodeGB(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <button type="submit" disabled={!write || isLoading} className="w-full flex justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300">
            {isLoading ? 'Registrando...' : 'Registrar Meu Nó'}
          </button>
          {isSuccess && (
            <div className="text-sm text-center text-green-700">Nó registrado com sucesso!</div>
          )}
        </form>
      )}
    </div>
  );
}
