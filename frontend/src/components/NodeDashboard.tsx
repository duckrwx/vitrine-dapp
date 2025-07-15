import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import {
  useContractRead,
  usePrepareContractWrite,
  useContractWrite,
  useWaitForTransaction,
} from 'wagmi';
import { useSunest } from '../hooks/useContracts';

export default function NodeDashboard() {
  const { address: userAddress, isConnected } = useAccount();
  const { address: sunestAddress, abi: sunestAbi } = useSunest();

  // 1. BUSCA OS DADOS DO NÓ DO USUÁRIO CONECTADO
  const { data: nodeData, isLoading: isLoadingNode, refetch: refetchNodeData } = useContractRead({
    address: sunestAddress,
    abi: sunestAbi,
    functionName: 'nodeByOperator',
    args: [userAddress],
    enabled: isConnected, // Só busca se a carteira estiver conectada
    watch: true, // Atualiza automaticamente se os dados mudarem na blockchain
  });

  // Extrai o hash da microgrid atual do nó, se ele existir
  const currentMicrogridHash = nodeData?.[1];

  // 2. BUSCA OS DADOS DO SENSOR DA MICROGRID ATUAL (depende da primeira busca)
  const { data: sensorData, refetch: refetchSensorData } = useContractRead({
    address: sunestAddress,
    abi: sunestAbi,
    functionName: 'latestSensor',
    args: [currentMicrogridHash],
    // Só busca se a primeira busca retornou um hash válido
    enabled: !!currentMicrogridHash && currentMicrogridHash !== '0x0000000000000000000000000000000000000000000000000000000000000000',
    watch: true,
  });

  const currentEnergyKWh = sensorData?.[0] ?? 0;

  // 3. PREPARA A TRANSAÇÃO 'switchIfNeeded'
  const { config } = usePrepareContractWrite({
    address: sunestAddress,
    abi: sunestAbi,
    functionName: 'switchIfNeeded',
    args: [],
    // Só habilita o botão se o nó estiver ativo
    enabled: nodeData?.[2], // nodeData.isActive
  });

  const { data: switchTxData, write: performSwitch } = useContractWrite(config);
  const { isLoading: isSwitching, isSuccess: isSwitchSuccess } = useWaitForTransaction({
    hash: switchTxData?.hash,
  });
  useEffect(() => {
      if (isSwitchSuccess) {
        console.log("Ação de troca bem-sucedida. Buscando dados atualizados do nó e do sensor...");
        // Força a busca dos dados mais recentes da blockchain
        refetchNodeData();
        refetchSensorData();
      }
    }, [isSwitchSuccess, refetchNodeData, refetchSensorData]);

  // --- RENDERIZAÇÃO DO COMPONENTE ---

  if (!isConnected) {
    return null; // Não mostra nada se a carteira não estiver conectada
  }

  if (isLoadingNode) {
    return <div className="text-center text-gray-500">Verificando seu nó...</div>;
  }

  // Se o endereço do operador for o endereço zero, significa que não há nó registrado
  if (!nodeData || nodeData[0] === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="text-center text-sm text-gray-600 p-4 bg-gray-100 rounded-lg">
        Você ainda não possui um nó registrado.
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg space-y-4">
      <h2 className="text-xl font-bold text-gray-700 border-b pb-2">Painel do seu Nó</h2>
      <div className="space-y-2 text-sm">
        <p><strong>Status:</strong> {nodeData[2] ? <span className="text-green-600 font-semibold">Ativo</span> : <span className="text-red-600 font-semibold">Inativo</span>}</p>
        <p><strong>Microgrid Atual (Hash):</strong> <span className="font-mono text-xs break-all">{nodeData[1]}</span></p>
        <p><strong>Energia da Microgrid:</strong> <span className="font-bold">{String(currentEnergyKWh)} kWh</span></p>
        <p><strong>Sua Localização:</strong> {nodeData[3]}, {nodeData[4]}</p>
      </div>

      <button
        disabled={!performSwitch || isSwitching || !nodeData[2]}
        onClick={() => performSwitch?.()}
        className="w-full py-2 px-4 border rounded-md shadow-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300"
      >
        {isSwitching ? 'Trocando...' : 'Verificar e Trocar de Microgrid se Necessário'}
      </button>

      {isSwitchSuccess && (
        <div className="text-center text-green-700">Verificação concluída com sucesso!</div>
      )}
    </div>
  );
}
