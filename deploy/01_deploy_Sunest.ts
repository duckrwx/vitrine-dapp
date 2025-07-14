import {HardhatRuntimeEnvironment} from "hardhat/types";

export default async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get} = deployments;
  const {deployer} = await getNamedAccounts();

  // pega o address recém-implantado
  const poe = await get("ProofOfExistence");

  await deploy("Sunest", {
    from: deployer,
    args: [poe.address],       // ← 1 argumento exigido
    log: true,
  });
}

export const tags = ["Sunest"];
export const dependencies = ["PoE"]; // garante ordem
