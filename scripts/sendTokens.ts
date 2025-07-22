import { ethers } from "hardhat";

async function main() {
  // --- CONFIGURAÇÃO ---
  // Endereço do contrato VitrineToken (pegue do seu .env do frontend)
  const tokenAddress = process.env.VITE_VITRINE_TOKEN_ADDRESS;
  if (!tokenAddress) {
    throw new Error("VITE_VITRINE_TOKEN_ADDRESS não encontrado no .env do frontend. Verifique se o endereço do token está lá.");
  }

  // Pega as contas disponíveis.
  const signers = await ethers.getSigners();
  if (signers.length < 2) {
    throw new Error("Não foram encontradas contas suficientes. Verifique a sua configuração de rede no hardhat.config.ts.");
  }
  
  // A primeira conta é o deployer (que tem os tokens), a segunda será o receptor
  const [deployer, receiver] = signers;
  const receiverAddress = receiver.address;

  // Quantidade de tokens a enviar (ex: 5,000 VTRN)
  const amountToSend = ethers.parseUnits("5000", 18);

  // --- EXECUÇÃO ---
  console.log(`A conectar ao contrato VitrineToken em: ${tokenAddress}`);
  const vitrineToken = await ethers.getContractAt("VitrineToken", tokenAddress);

  console.log(`\nO saldo do Deployer (${deployer.address}) é: ${ethers.formatUnits(await vitrineToken.balanceOf(deployer.address), 18)} VTRN`);
  console.log(`O saldo do Receptor (${receiverAddress}) é: ${ethers.formatUnits(await vitrineToken.balanceOf(receiverAddress), 18)} VTRN`);

  console.log(`\nA enviar ${ethers.formatUnits(amountToSend, 18)} VTRN para ${receiverAddress}...`);

  // O deployer chama a função 'transfer' do token para enviar os fundos
  const tx = await vitrineToken.connect(deployer).transfer(receiverAddress, amountToSend);
  await tx.wait(1);

  console.log("\n✅ Transferência concluída com sucesso!");

  console.log(`Novo saldo do Deployer: ${ethers.formatUnits(await vitrineToken.balanceOf(deployer.address), 18)} VTRN`);
  console.log(`Novo saldo do Receptor: ${ethers.formatUnits(await vitrineToken.balanceOf(receiverAddress), 18)} VTRN`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
