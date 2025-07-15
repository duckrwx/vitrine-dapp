# Substrate + Solidity Front-End Template

	Este repositório combina um nó Substrate compatível com EVM (CESS) com um front-end React + Wagmi para interagir com contratos Solidity. module that deploys that contract.

##Pré-requisitos

 1.	Node.js v16+ e pnpm (ou npm/yarn).
 ```shel
sudo apt-get npm
npm install
npm i -g pnpm
 ```

 2.	Hardhat instalado localmente (npm install --save-dev hardhat).

 3.	Metamask ou outra carteira compatível.

##Passo a passo de configuração

###1 . Clonar o repositório
```shell
git clone https://github.com/duckrwx/sunest
cd sunest
```

###2 . Instalar dependências
```shell
#No diretório principal (para o nó):
pnpm install
#No subdiretório frontend (para o dApp):
cd frontend
pnpm install
```

###3 . Compilar e implantar contratos Solidity
```shell
cd sunest
pnpm hardhat node
#Deploy
cd frontend
pnpm hardhat deploy --reset --network localhost
#Após o deploy, copie as ABIs para o front-end:
cp artifacts/contracts/Sunest.sol/Sunest.json frontend/src/abi/Sunest.json
cp artifacts/contracts/ProofOfExistence.sol/ProofOfExistence.json frontend/src/abi/PoE.json
```

###4 . Configurar variáveis de ambiente
```shell
#Crie .env na raiz do frontend com:
VITE_SUNEST=0x...   # endereço do contrato Sunest
VITE_POE=0x...      # endereço do contrato ProofOfExistence
VITE_CHAIN_ID=31337 # Chain ID do Hardhat local
```

###5 . Iniciar o front-end
```shell
cd frontend
pnpm run dev
#abra http://localhost:5173/ e conecte sua carteira.
```

###6 . Interagindo com o dApp
 - Registrar Microgrid: preencha endereço Kaspa, preço, país e cidade.

 - Listar Microgrids: pesquise por localização.

 - Enviar dados de sensor: cadastre sensores às suas microgrids.


