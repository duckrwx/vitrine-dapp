import { ethers } from "hardhat";

async function main() {
  console.log("A fazer deploy do VitrineCore...");
  const vitrineCore = await ethers.deployContract("VitrineCore");
  await vitrineCore.waitForDeployment();
  const coreAddress = await vitrineCore.getAddress();
  console.log(`✅ VitrineCore implantado em: ${coreAddress}`);

  console.log("\nA fazer deploy do Marketplace...");
  const marketplace = await ethers.deployContract("Marketplace", [coreAddress]);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`✅ Marketplace implantado em: ${marketplaceAddress}`);

  console.log("\n--- DEPLOY CONCLUÍDO ---");
  console.log("\nCopie estas linhas para o seu ficheiro .env (na raiz):");
  console.log(`VITRINE_CORE_ADDRESS="${coreAddress}"`);
  console.log(`MARKETPLACE_ADDRESS="${marketplaceAddress}"`);
  
  console.log("\nCopie estas linhas para o seu ficheiro frontend/.env.local:");
  console.log(`VITE_VITRINE_CORE_ADDRESS="${coreAddress}"`);
  console.log(`VITE_MARKETPLACE_ADDRESS="${marketplaceAddress}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
