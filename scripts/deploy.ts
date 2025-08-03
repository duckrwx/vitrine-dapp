// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Iniciando deploy dos contratos...");

  // Deploy VitrineCore primeiro
  const VitrineCore = await ethers.getContractFactory("VitrineCore");
  const vitrineCore = await VitrineCore.deploy();
  await vitrineCore.waitForDeployment();
  const vitrineCoreAddress = await vitrineCore.getAddress();
  console.log("✅ VitrineCore deployed to:", vitrineCoreAddress);

  // Deploy Marketplace passando o endereço do VitrineCore
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(vitrineCoreAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // Obter as contas
  const [deployer, user1] = await ethers.getSigners();
  console.log("\n📊 Informações do Deploy:");
  console.log("Deployer:", deployer.address);

  // Para testes: Adicionar reputação ao deployer
  console.log("\n🎯 Configurando reputação para testes...");
  const repAmount = 100; // Reputação suficiente para registrar produtos
  await vitrineCore.mintReputation(deployer.address, repAmount);
  console.log(`✅ Adicionada reputação ${repAmount} para ${deployer.address}`);

  // Se houver um segundo usuário, adicionar reputação também
  if (user1) {
    await vitrineCore.mintReputation(user1.address, repAmount);
    console.log(`✅ Adicionada reputação ${repAmount} para ${user1.address}`);
  }

  console.log("\n📋 Resumo do Deploy:");
  console.log("====================");
  console.log(`VITE_VITRINE_CORE_ADDRESS=${vitrineCoreAddress}`);
  console.log(`VITE_MARKETPLACE_ADDRESS=${marketplaceAddress}`);
  console.log("====================");
  console.log("\n⚡ Copie os endereços acima para seu arquivo .env do frontend!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
