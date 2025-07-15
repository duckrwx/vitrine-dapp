import 'dotenv/config'; // ✨ PASSO 1: Carrega as variáveis do .env - DEVE SER A PRIMEIRA LINHA
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hardhat } from 'viem/chains';
import SunestArtifact from './artifacts/contracts/Sunest.sol/Sunest.json' with { type: 'json' };
// --- CONFIGURAÇÃO (Agora lida do arquivo .env) ---

// ✨ PASSO 2: Lê as variáveis do process.env
const SUNEST_CONTRACT_ADDRESS = process.env.SUNEST_CONTRACT_ADDRESS;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const SUNEST_ABI = SunestArtifact.abi;

// --- VERIFICAÇÃO DE VARIÁVEIS ---

// ✨ PASSO 3: Garante que as variáveis foram carregadas corretamente
if (!SUNEST_CONTRACT_ADDRESS || !DEPLOYER_PRIVATE_KEY) {
  throw new Error(
    "Variáveis de ambiente SUNEST_CONTRACT_ADDRESS e DEPLOYER_PRIVATE_KEY precisam ser definidas no arquivo .env"
  );
}

// --- O RESTO DO SCRIPT CONTINUA IGUAL ---

// Cliente público para ler dados (view functions)
const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(),
});

// Cliente de carteira para enviar transações (write functions)
const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: hardhat,
  transport: http(),
});

console.log(`Script iniciado. Conectado à conta: ${walletClient.account.address}`);
console.log(`Contrato Sunest: ${SUNEST_CONTRACT_ADDRESS}`);

// Função para gerar um valor de kWh aleatório
function getRandomKWh() {
  return Math.floor(Math.random() * (5000 - 100 + 1) + 100);
}

// Função principal que executa a lógica de atualização
async function updateSensorData() {
  console.log("\nIniciando atualização de sensores...");
  try {
    const microgridHashes = await publicClient.readContract({
      address: SUNEST_CONTRACT_ADDRESS,
      abi: SUNEST_ABI,
      functionName: 'listMicrogrids',
    });

    if (!microgridHashes || microgridHashes.length === 0) {
      console.log("Nenhuma microgrid encontrada. Aguardando próximo ciclo.");
      return;
    }

    console.log(`Encontradas ${microgridHashes.length} microgrids. Enviando dados...`);

    for (const hash of microgridHashes) {
      const randomKWh = BigInt(getRandomKWh());
      
      console.log(`  - Enviando ${randomKWh} kWh para a microgrid ${hash.slice(0, 12)}...`);

      const txHash = await walletClient.writeContract({
        address: SUNEST_CONTRACT_ADDRESS,
        abi: SUNEST_ABI,
        functionName: 'submitSensorData',
        args: [hash, randomKWh],
      });

      console.log(`    > Transação enviada: ${txHash}`);
    }
    console.log("Atualização concluída com sucesso!");

  } catch (error) {
    console.error("Ocorreu um erro durante a atualização:", error.message);
  }
}

// --- EXECUÇÃO ---
const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

updateSensorData();
setInterval(updateSensorData, FIVE_MINUTES_IN_MS);
