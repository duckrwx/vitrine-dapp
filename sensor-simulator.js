import 'dotenv/config';
import { createWalletClient, createPublicClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hardhat } from 'viem/chains';
import SunestArtifact from './artifacts/contracts/Sunest.sol/Sunest.json' with { type: 'json' };

const SUNEST_CONTRACT_ADDRESS = process.env.SUNEST_CONTRACT_ADDRESS;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const SUNEST_ABI = SunestArtifact.abi;

if (!SUNEST_CONTRACT_ADDRESS || !DEPLOYER_PRIVATE_KEY) {
  throw new Error("Variáveis de ambiente não definidas no .env");
}

const publicClient = createPublicClient({ chain: hardhat, transport: http() });
const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain: hardhat, transport: http() });

const SIMULATOR_ADDRESS = walletClient.account.address;
console.log(`Script iniciado. Conectado como: ${SIMULATOR_ADDRESS}`);
console.log(`Contrato Sunest: ${SUNEST_CONTRACT_ADDRESS}`);

function getRandomKWh() {
  return Math.floor(Math.random() * (5000 - 100 + 1) + 100);
}

async function updateSensorData() {
  console.log("\nIniciando atualização de sensores...");
  try {
    const microgridHashes = await publicClient.readContract({
      address: SUNEST_CONTRACT_ADDRESS,
      abi: SUNEST_ABI,
      functionName: 'listMicrogrids',
    });

    if (!microgridHashes || microgridHashes.length === 0) {
      console.log("Nenhuma microgrid encontrada.");
      return;
    }

    console.log(`Encontradas ${microgridHashes.length} microgrids. Verificando e enviando dados...`);

    for (const hash of microgridHashes) {
      // ✅ NOVA LÓGICA: VERIFICA A PERMISSÃO ANTES DE ENVIAR
      const microgridData = await publicClient.readContract({
        address: SUNEST_CONTRACT_ADDRESS,
        abi: SUNEST_ABI,
        functionName: 'microgridByHash',
        args: [hash],
      });
      
      const walletMetamask = microgridData[0];
      const owner = microgridData[5];

      // Compara os endereços (convertendo para minúsculas por segurança)
      if (owner.toLowerCase() === SIMULATOR_ADDRESS.toLowerCase() || walletMetamask.toLowerCase() === SIMULATOR_ADDRESS.toLowerCase()) {
        // Se tiver permissão, envia a transação
        const randomKWh = BigInt(getRandomKWh());
        console.log(`  - [AUTORIZADO] Enviando ${randomKWh} kWh para a microgrid ${hash.slice(0, 12)}...`);
        
        const txHash = await walletClient.writeContract({
          address: SUNEST_CONTRACT_ADDRESS,
          abi: SUNEST_ABI,
          functionName: 'submitSensorData',
          args: [hash, randomKWh],
        });
        console.log(`    > Transação enviada: ${txHash}`);
      } else {
        // Se não tiver, apenas avisa e pula para a próxima
        console.log(`  - [PULANDO] Microgrid ${hash.slice(0, 12)}... pertence a outra conta (${owner.slice(0, 8)}...).`);
      }
    }
    console.log("Ciclo de atualização concluído!");

  } catch (error) {
    console.error("Ocorreu um erro inesperado durante a atualização:", error.message);
  }
}

// Execução
updateSensorData();
setInterval(updateSensorData, 5 * 60 * 1000); // 5 minutos
