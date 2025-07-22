import { ethers } from "hardhat";

async function main() {
  const initialTokenSupply = ethers.parseUnits("1000000", 18); 
  const minStakeAmount = ethers.parseUnits("100", 18);

  console.log("Fazendo deploy do VitrineToken...");
  const vitrineToken = await ethers.deployContract("VitrineToken", [initialTokenSupply]);
  await vitrineToken.waitForDeployment();
  const tokenAddress = await vitrineToken.getAddress();
  console.log(`✅ VitrineToken implantado em: ${tokenAddress}`);

  console.log("\nFazendo deploy do VitrineCore...");
  const vitrineCore = await ethers.deployContract("VitrineCore", [
    tokenAddress,
    minStakeAmount,
  ]);
  await vitrineCore.waitForDeployment();
  const coreAddress = await vitrineCore.getAddress();
  console.log(`✅ VitrineCore implantado em: ${coreAddress}`);

  console.log("\n--- Deploy concluído! ---");
  console.log("Copie os endereços abaixo para seus arquivos .env");
  console.log(`VITRINE_CORE_ADDRESS="${coreAddress}"`);
  console.log(`VITE_VITRINE_CORE_ADDRESS="${coreAddress}"`);
  console.log(`VITE_VITRINE_TOKEN_ADDRESS="${tokenAddress}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
