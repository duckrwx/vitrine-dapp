import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async ({ deployments, getNamedAccounts }: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const deployment = await deploy("ProofOfExistence", {
    from: deployer,
    args: [],          // sem construtor
    log: true,         // <-- garante que imprime endereço
    autoMine: true,
  });

  console.log("PoE deployed at:", deployment.address);
};
export default func;
func.tags = ["PoE"];
