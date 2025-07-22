import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export default function ConnectWallet() {
  const { address, isConnected, connector } = useAccount()
  const { connect, connectors, error, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div className="text-center p-4 bg-gray-800 rounded-lg shadow-inner border border-gray-700">
        <div className="text-sm font-mono break-all text-gray-300">{address}</div>
        <div className="text-xs text-gray-400 mt-1">
          Conectado via: <span className="font-semibold text-white">{connector?.name}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
        >
          Desconectar
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 border border-gray-700 rounded-lg bg-gray-800">
      <h3 className="text-lg font-semibold mb-3 text-white">Conectar Carteira</h3>
      <div className="flex flex-col gap-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            {connector.name}
            {isPending && ` (Conectando...)`}
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 mt-2 text-sm">{error.message}</p>}
    </div>
  )
}
