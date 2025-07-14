import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, isLoading }  = useConnect({ connector: new MetaMaskConnector() });
  const { disconnect } = useDisconnect();

  if (isConnected)
    return (
      <button
        onClick={() => disconnect()}
        className="px-4 py-2 bg-red-600 text-white rounded"
      >
        {address!.slice(0,6)}…{address!.slice(-4)} (Desconectar)
      </button>
    );

  return (
    <button
      onClick={() => connect()}
      disabled={isLoading}
      className="px-4 py-2 bg-green-600 text-white rounded"
    >
      {isLoading ? 'Conectando…' : 'Conectar MetaMask'}
    </button>
  );
}
