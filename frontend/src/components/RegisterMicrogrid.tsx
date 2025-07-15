import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { useSunest } from '../hooks/useContracts';

export default function RegisterMicrogrid() {
  const { address: userAddress, isConnected } = useAccount();
  const { address: sunestAddress, abi: sunestAbi } = useSunest();

  const [wallet, setWallet] = useState('');
  const [price, setPrice] = useState('0.01');
  const [country, setCountry] = useState('Brasil');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (isConnected && userAddress) {
      setWallet(userAddress);
    }
  }, [isConnected, userAddress]);

  const { config, error: prepareError } = usePrepareContractWrite({
    address: sunestAddress,
    abi: sunestAbi,
    functionName: 'registerMicrogrid',
    args: [wallet, parseEther(price || '0'), country, city],
    enabled: !!wallet && !!price && !!country && !!city,
  });

  const { data, write, error: writeError } = useContractWrite(config);
  const { isLoading, isSuccess } = useWaitForTransaction({ hash: data?.hash });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (write) write();
  };

  if (!isConnected) {
    return <p className="text-sm text-center text-gray-500">Conecte a carteira para registrar uma microgrid.</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Registrar Nova Microgrid</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Sua Carteira (Operador)</label>
          <input
            type="text"
            value={wallet}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">Preço (ETH)</label>
            <input
              id="price"
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex: 0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">País</label>
            <input
              id="country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">Cidade</label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Brasília"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={!write || isLoading}
          className="w-full flex justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {isLoading ? 'Registrando...' : 'Registrar Microgrid'}
        </button>
        {isSuccess && (
          <div className="text-sm text-center text-green-700">Microgrid registrada com sucesso!</div>
        )}
        {(prepareError || writeError) && (
          <div className="text-sm text-red-600">Erro: {(prepareError || writeError)?.message}</div>
        )}
      </form>
    </div>
  );
}
