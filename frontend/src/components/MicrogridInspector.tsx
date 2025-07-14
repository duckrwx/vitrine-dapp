import { useState } from 'react';
import { useSunest } from '../hooks/useContracts';
import { formatEther } from 'viem';
import { normalize } from '../lib/strings';

export default function MicrogridInspector () {
  const { publicClient, address, abi } = useSunest();
  const [city, setCity]       = useState('City');
  const [country, setCountry] = useState('Country');
  const [data, setData]       = useState<any>(null);
  const countryClean = normalize(country);
  const cityClean    = normalize(city);

  async function fetch() {
    const result = await publicClient.readContract({
      address, abi,
      functionName: 'microgridsByLocation',
      args: [countryClean, cityClean]
    });
    setData(result);
  }

  return (
    <div className="p-4 border rounded-xl max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">Microgrids em {city}</h2>
      <div className="flex gap-2 mb-3">
        <input
          value={country} onChange={e=>setCountry(e.target.value)}
          className="border px-2 py-1 flex-1" placeholder="País"/>
        <input
          value={city} onChange={e=>setCity(e.target.value)}
          className="border px-2 py-1 flex-1" placeholder="Cidade"/>
        <button onClick={fetch} className="bg-blue-600 text-white px-4 rounded">
          Buscar
        </button>
      </div>

      {data && data[0].length === 0 && <p>Nenhum painel encontrado.</p>}
      {data && data[0].map((hash:string, i:number)=>
        <div key={hash} className="border p-2 mb-2 rounded">
          <p><b>Hash:</b> {hash}</p>
          <p><b>Wallet:</b> {data[1][i]}</p>
          <p><b>Preço:</b> {formatEther(data[2][i])} ETH/op</p>
          <p><b>Status:</b> {data[3][i] ? 'Ativo' : 'Inativo'}</p>
          <p><b>Energia:</b> {data[4][i]} kWh</p>
          <p><b>Capacidade:</b> {data[5][i]} GB</p>
        </div>
      )}
    </div>
  );
}
