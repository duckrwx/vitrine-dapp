// src/lib/web3.ts
import { createPublicClient, http, defineChain } from 'viem';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';

/* -------------------------------------------------
 * 1. Lê o ID da chain direto do .env
 * ------------------------------------------------- */
const id = +import.meta.env.VITE_CHAIN_ID;          // string -> number

/* -------------------------------------------------
 * 2. Seleciona RPC e texto conforme a chain
 * ------------------------------------------------- */
const configByChain: Record<number, { name: string; rpc: string; symbol: string }> = {
  31337: {
    name: 'Hardhat Local',
    rpc: 'http://127.0.0.1:8545',
    symbol: 'ETH',
  },
  11330: {
    name: 'CESS Testnet',
    rpc: 'https://testnet-rpc.cess.network/ws/',     // use o endpoint EVM compatível
    symbol: 'TCESS',
  },
};

const { name, rpc, symbol } = configByChain[id] ?? {
  name: `Chain ${id}`,
  rpc: '',
  symbol: 'ETH',
};

/* -------------------------------------------------
 * 3. Define a chain para o viem/wagmi
 * ------------------------------------------------- */
export const chain = defineChain({
  id,
  name,
  nativeCurrency: { name: symbol, symbol, decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
});

/* -------------------------------------------------
 * 4. Clientes
 * ------------------------------------------------- */
export const publicClient = createPublicClient({
  chain,
  transport: http(),
});

export const connector = new MetaMaskConnector({
  chains: [chain],
});
