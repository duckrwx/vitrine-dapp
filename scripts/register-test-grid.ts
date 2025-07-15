import { ethers, network } from "hardhat";

async function main() {
  // Lê o endereço do contrato do arquivo .env
  const sunestAddress = process.env.SUNEST_CONTRACT_ADDRESS;

  // Verificação inicial para garantir que a variável foi carregada
  if (!sunestAddress) {
    throw new Error("ERRO: Variável SUNEST_CONTRACT_ADDRESS não foi encontrada no .env.");
  }

  // Log corrigido: usa a variável 'sunestAddress' diretamente
  console.log(`Tentando conectar ao contrato Sunest em: ${sunestAddress} na rede ${network.name}`);

  // Pega o contrato
  const sunest = await ethers.getContractAt("Sunest", sunestAddress);
  const [deployer] = await ethers.getSigners();

  // Dados de exemplo
  const walletMetamask = deployer.address;
  const country = "Brasil";
  const city = "Brasilia";
  const price = ethers.parseEther("0.001");

  console.log(`Registrando microgrid com a carteira ${walletMetamask}...`);
  const tx = await sunest.registerMicrogrid(walletMetamask, price, country, city);

  // Espera a transação ser minerada
  await tx.wait(1);

  console.log("✅ Microgrid de teste registrada com sucesso!");
  console.log(`Hash da transação: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
