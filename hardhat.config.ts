import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "hardhat-deploy";
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      default: 0,
    },
    beneficiary: {
      default: 1,
    },
  },
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0
    },
    localhost: {
      url: "http://localhost:8545",
      
    },
    "cess-local": {
      url: "http://localhost:9944", // RPC endpoint of CESS testnet
      chainId: 11330,
      // private key of `//Alice` from Substrate
      accounts: ["0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a"],
    },
    "cess-testnet": {
      url: "wss://testnet-rpc.cess.network",
      chainId: 11330,
      accounts: {
      	mnemonic: "camp fork say cake indicate idea radar solve gesture news behind century"
      },
    }
  }
};

export default config;
