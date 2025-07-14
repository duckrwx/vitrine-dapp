import { useState } from 'react';
import { useSunest } from '../hooks/useContracts';
import { parseEther } from 'viem';
import { chain } from '../lib/web3';
import { normalize } from '../lib/strings';

export default function RegisterMicrogrid() {
  const { wallet, address: sunestAddr, abi } = useSunest();

  const [kaspa,   setKaspa]   = useState('');
  const [price,   setPrice]   = useState(''); // ETH/op
  const [country, setCountry] = useState('');
  const [city,    setCity]    = useState('');
  const [txHash,  setTxHash]  = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setTxHash(null);

    try {
      const hash = await wallet!.writeContract({
	chain,
        address: sunestAddr,
        abi,
        functionName: 'registerMicrogrid',
        args: [
          kaspa,
          parseEther(price), // converte ETH → wei
          normalize(country),
          normalize(city),
        ],
      });
      setTxHash(hash);
    } catch (err: any) {
      setError(err.shortMessage ?? err.message);
    }
  }

  if (!wallet) return <p className="text-red-600">Conecte a carteira para registrar.</p>;

  return (
    <form onSubmit={submit} className="border rounded p-4 max-w-lg space-y-3">
      <h3 className="text-lg font-semibold">Registrar Microgrid</h3>

      <input
        value={kaspa}
        onChange={e=>setKaspa(e.target.value)}
        placeholder="Kaspa wallet (0x…)"
        className="border px-2 py-1 w-full"
        required
      />

      <input
        value={price}
        onChange={e=>setPrice(e.target.value)}
        placeholder="Preço por operação (ETH)"
        type="number"
        step="0.0001"
        className="border px-2 py-1 w-full"
        required
      />

      <div className="flex gap-2">
        <input value={country} onChange={e=>setCountry(e.target.value)}
               placeholder="Country" className="border px-2 py-1 flex-1" required />
        <input value={city} onChange={e=>setCity(e.target.value)}
               placeholder="City" className="border px-2 py-1 flex-1" required />
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded w-full">
        Registrar
      </button>

      {txHash && (
        <p className="text-sm text-green-700 break-all">
          Enviado! Tx: {txHash}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
