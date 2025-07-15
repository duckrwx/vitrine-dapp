// src/components/ConnectWalletAdvanced.tsx

import { useAccount, useConnect, useDisconnect, useNetwork } from 'wagmi';

export default function ConnectWalletAdvanced() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="text-center p-4 bg-gray-800 rounded-lg shadow-inner border border-gray-700">
        <div className="text-sm font-mono break-all text-gray-300">{address}</div>
        <div className="text-xs text-gray-400 mt-1">
          Conectado à rede: <span className="font-semibold text-white">{chain?.name ?? 'Desconhecida'}</span>
          {chain?.unsupported && <span className="text-red-400 ml-2">(Rede não suportada!)</span>}
        </div>
        <button
          onClick={() => disconnect()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
        >
          Desconectar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Conectar Carteira</h3>
      <div className="flex flex-col gap-2">
        {connectors
          .filter((c) => c.ready)
          .map((connector) => (
            <button
              key={connector.id}
              onClick={() => connect({ connector })}
              disabled={isLoading && pendingConnector?.id === connector.id}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {connector.name}
              {isLoading && pendingConnector?.id === connector.id && ' (Conectando...)'}
            </button>
        ))}
      </div>
      {error && <p className="text-red-500 mt-2 text-sm">{error.message}</p>}
    </div>
  );
}
