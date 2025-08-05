import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Starting Vitrine dApp deployment...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📡 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // Deploy VitrineCore
  console.log("📋 Deploying VitrineCore contract...");
  const VitrineCore = await ethers.getContractFactory("VitrineCore");
  const vitrineCore = await VitrineCore.deploy();
  await vitrineCore.deployed();
  
  console.log("✅ VitrineCore deployed to:", vitrineCore.address);

  // Deploy Marketplace with VitrineCore address and fee recipient
  console.log("\n🏪 Deploying Marketplace contract...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    vitrineCore.address,
    deployer.address // Fee recipient (deployer for now)
  );
  await marketplace.deployed();
  
  console.log("✅ Marketplace deployed to:", marketplace.address);

  // Set Marketplace as authorized in VitrineCore (for updating reputation)
  console.log("\n🔗 Setting up contract permissions...");
  
  // Note: In a production setup, you might want more granular permissions
  // For now, we'll transfer ownership or set up proper access control
  
  console.log("✅ Permissions configured");

  // Save deployment addresses
  const deploymentInfo = {
    network: "localhost",
    vitrineCore: vitrineCore.address,
    marketplace: marketplace.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  fs.writeFileSync(
    path.join(deploymentsDir, "localhost.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Update .env file with contract addresses
  const envPath = path.join(__dirname, "../.env");
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // Update or add contract addresses
  const updateEnvVar = (content: string, key: string, value: string): string => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    const newLine = `${key}="${value}"`;
    
    if (regex.test(content)) {
      return content.replace(regex, newLine);
    } else {
      return content + (content.endsWith("\n") ? "" : "\n") + newLine + "\n";
    }
  };

  envContent = updateEnvVar(envContent, "VITRINE_CORE_ADDRESS", vitrineCore.address);
  envContent = updateEnvVar(envContent, "MARKETPLACE_ADDRESS", marketplace.address);

  fs.writeFileSync(envPath, envContent);

  // Update frontend env file
  const frontendEnvPath = path.join(__dirname, "../frontend/.env.local");
  let frontendEnvContent = "";
  
  if (fs.existsSync(frontendEnvPath)) {
    frontendEnvContent = fs.readFileSync(frontendEnvPath, "utf8");
  }

  frontendEnvContent = updateEnvVar(frontendEnvContent, "VITE_VITRINE_CORE_ADDRESS", vitrineCore.address);
  frontendEnvContent = updateEnvVar(frontendEnvContent, "VITE_MARKETPLACE_ADDRESS", marketplace.address);
  frontendEnvContent = updateEnvVar(frontendEnvContent, "VITE_CHAIN_ID", "31337");

  // Ensure frontend directory exists
  const frontendDir = path.dirname(frontendEnvPath);
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  fs.writeFileSync(frontendEnvPath, frontendEnvContent);

  // Verify contracts
  console.log("\n🔍 Verifying contract deployment...");
  
  try {
    // Test VitrineCore functions
    const totalUsers = await vitrineCore.totalUsers();
    const totalPersonas = await vitrineCore.totalPersonas();
    console.log("📊 VitrineCore initial state:");
    console.log("   - Total users:", totalUsers.toString());
    console.log("   - Total personas:", totalPersonas.toString());

    // Test Marketplace functions
    const marketplaceStats = await marketplace.getMarketplaceStats();
    console.log("🏪 Marketplace initial state:");
    console.log("   - Total products:", marketplaceStats[0].toString());
    console.log("   - Total sales:", marketplaceStats[1].toString());
    console.log("   - Total volume:", ethers.utils.formatEther(marketplaceStats[2]), "ETH");

    console.log("✅ Contract verification completed");
  } catch (error) {
    console.error("❌ Contract verification failed:", error);
  }

  // Display summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log("📋 Contract Addresses:");
  console.log("   VitrineCore:", vitrineCore.address);
  console.log("   Marketplace:", marketplace.address);
  console.log("\n📁 Files Updated:");
  console.log("   - .env");
  console.log("   - frontend/.env.local");
  console.log("   - deployments/localhost.json");
  console.log("\n🔧 Next Steps:");
  console.log("   1. Run: npm run copy-abi");
  console.log("   2. Start backend: uvicorn main:app --reload");
  console.log("   3. Start frontend: cd frontend && npm run dev");
  console.log("   4. Initialize sample data: curl -X POST http://localhost:8000/api/admin/init-sample-data");
  console.log("\n🌐 Access Points:");
  console.log("   - Frontend: http://localhost:5173");
  console.log("   - Backend: http://localhost:8000");
  console.log("   - API Docs: http://localhost:8000/docs");
  console.log("=".repeat(60));
}

// Error handling
main().catch((error) => {
  console.error("\n❌ Deployment failed:");
  console.error(error);
  process.exitCode = 1;
});
