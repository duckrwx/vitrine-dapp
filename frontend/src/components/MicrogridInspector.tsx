import { useState } from 'react';
import { useSunest } from '../hooks/useContracts';
import { formatEther, parseEther } from 'viem'; // A sintaxe de parseEther mudou na v6 do viem/ethers
import { normalize } from '../lib/strings';

// 1. TIPO ATUALIZADO
type MicrogridInfo = {
  hash: string;
  walletMetamask: string; // RENOMEADO AQUI
  price: bigint;
  latestKWh: bigint;
};

export default function MicrogridInspector() {
  const { publicClient, address, abi } = useSunest();
  const [city, setCity] = useState('Brasilia'); // Cidade de exemplo
  const [country, setCountry] = useState('Brasil'); // País de exemplo

  const [microgrids, setMicrogrids] = useState<MicrogridInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countryClean = normalize(country);
  const cityClean = normalize(city);

  async function fetchMicrogrids() {
    setIsLoading(true);
    setError(null);
    setMicrogrids([]);

    try {
      // A função no contrato retorna múltiplos arrays
      const result = await publicClient.readContract({
        address,
        abi,
        functionName: 'microgridsByLocation',
        args: [countryClean, cityClean],
      });

      // 2. FORMATAÇÃO DOS DADOS ATUALIZADA
      const formattedData: MicrogridInfo[] = result[0].map((hash, i) => ({
        hash: hash,
        walletMetamask: result[1][i], // RENOMEADO AQUI
        price: result[2][i],
        latestKWh: result[3][i],
      }));

      setMicrogrids(formattedData);
    } catch (err) {
      console.error("Erro ao buscar microgrids:", err);
      setError("Falha ao buscar os dados. Verifique o console para mais detalhes.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded-xl max-w-xl mx-auto bg-white shadow">
      <h2 className="text-xl font-semibold mb-3 text-gray-800">Inspecionar Microgrids</h2>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="border px-3 py-2 flex-1 rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="País"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="border px-3 py-2 flex-1 rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="Cidade"
        />
        <button
          onClick={fetchMicrogrids}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200 hover:bg-blue-700"
        >
          {isLoading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {isLoading && <p className="text-center text-gray-500">Carregando dados...</p>}
      {error && <p className="text-center text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}
      {!isLoading && !error && microgrids.length === 0 && (
        <p className="text-center text-gray-500">Nenhum painel encontrado para esta localização.</p>
      )}

      <div className="space-y-3 mt-4">
        {microgrids.map((mg) => (
          <div key={mg.hash} className="border p-4 rounded-lg bg-gray-50 text-sm">
            <p className="font-semibold text-gray-700">Hash: <span className="text-xs break-all font-mono">{mg.hash}</span></p>
            {/* 3. JSX ATUALIZADO */}
            <p><b>Wallet MetaMask:</b> <span className="text-xs font-mono">{mg.walletMetamask}</span></p>
            <p><b>Preço:</b> <span className="font-bold text-green-600">{formatEther(mg.price)} ETH/op</span></p>
            <p><b>Energia Atual:</b> <span className="font-bold">{String(mg.latestKWh)} kWh</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}
