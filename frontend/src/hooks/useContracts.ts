import { usePublicClient, useWalletClient } from 'wagmi';
import SunestABI from '../abi/Sunest.json';
import PoEABI from '../abi/PoE.json';

export function useSunest() {
  const { data: wallet } = useWalletClient();
  const publicClient     = usePublicClient();
  const address = import.meta.env.VITE_SUNEST;

  return { wallet, publicClient, address, abi: SunestABI.abi };
}

export function usePoE() {
  const { data: wallet } = useWalletClient();
  const publicClient     = usePublicClient();
  const address = import.meta.env.VITE_POE;

  return { wallet, publicClient, address, abi: PoEABI.abi };
}
