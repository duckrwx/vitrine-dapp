<p align="center">
  <img src="https://googleusercontent.com/file_content/0" alt="Sunest Logo" width="400"/>
</p>

# ☀️ Sunest – Armazenamento Descentralizado com Energia Solar sob Demanda

**Sunest é uma plataforma de armazenamento descentralizado que integra nós verdes — computadores que operam somente com energia solar, conectados a microgrids locais ou sistemas de compensação energética.**

Nosso objetivo é transformar o modelo atual de infraestrutura blockchain e Web3, tornando-o energeticamente sustentável, economicamente acessível e inteligente em escala global.

---

## 🚀 Como Funciona

Os painéis solares vinculados a microgrids fornecem energia para nós de armazenamento e consenso. A plataforma detecta os horários de pico solar e ativa apenas os nós disponíveis com energia limpa.

Quando a geração solar de um nó estiver se encerrando, o sistema migra automaticamente os dados para outro nó verde em um fuso complementar (ex: Brasil → Japão), através da função `switchIfNeeded`.

Toda a operação é registrada e validada por smart contracts, com distribuição automática dos valores de cada transação.

## 💡 Diferenciais

* **🔋 Energia sob demanda:** os nós funcionam apenas quando há energia solar disponível.
* **🔐 Segurança com rastreabilidade total:** os dados são auditáveis e protegidos por blockchain.
* **♻️ Sustentabilidade real:** sem dependência de energia contínua nem emissão de carbono.
* **🌍 Distribuição global inteligente:** fluxo de dados acompanha os picos solares do planeta.

---

## 🧱 Tecnologia

* **Blockchain:** Contratos em Solidity no padrão EVM.
* **Ambiente de Desenvolvimento:** Hardhat para compilação, testes e deploy.
* **Frontend:** React (com Vite) e a biblioteca `wagmi` para interação com a blockchain.
* **Armazenamento (Visão Futura):** Integração com a blockchain de armazenamento CESS.

---

## 🛠️ Guia de Instalação e Execução Local

Siga estes passos para rodar o projeto na sua máquina.

### Pré-requisitos

1.  **Node.js**: Versão 18+ ou superior.
2.  **pnpm**: Gerenciador de pacotes. Para instalar, rode: `npm install -g pnpm`.
3.  **Carteira de Navegador**: MetaMask ou similar.

### 1. Clonar o Repositório
```bash
git clone [https://github.com/duckrwx/sunest](https://github.com/duckrwx/sunest) # (Substitua pelo seu repositório, se for o caso)
cd sunest
###2. Instalar Dependências
Você precisa instalar as dependências tanto para o ambiente Hardhat (raiz) quanto para o frontend.
```
2. Instalar Dependências
Você precisa instalar as dependências tanto para o ambiente Hardhat (raiz) quanto para o frontend.

```Bash

# Na pasta raiz (ex: ~/sunest)
pnpm install

# Na pasta do frontend
cd frontend
pnpm install
cd .. # Volte para a raiz
```
3. Configurar Variáveis de Ambiente
O projeto utiliza dois arquivos .env. Crie-os baseando-se nos exemplos abaixo.

 Arquivo na Raiz: .env

 - Usado pelo Hardhat e pelos scripts de backend.

 - Crie o arquivo ~/sunest/.env e adicione:

```bash

SUNEST_CONTRACT_ADDRESS="COLE_O_ENDERECO_DO_CONTRATO_AQUI"
DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
```

 Arquivo no Frontend: frontend/.env.local

 - Usado pela aplicação React/Vite.

 - Crie o arquivo ~/sunest/frontend/.env.local e adicione:

```bash

VITE_SUNEST_ADDRESS="COLE_O_ENDERECO_DO_CONTRATO_AQUI"
# VITE_POE_ADDRESS="COLE_O_ENDERECO_DO_POE_AQUI" # Se aplicável
VITE_CHAIN_ID=31337
```

4. Iniciar a Blockchain e Fazer o Deploy
Estes comandos precisam de terminais separados.

 - Terminal 1: Iniciar o Nó Local

```bash

pnpm hardhat node
```
 - Terminal 2: Implantar os Contratos

```bash

pnpm hardhat deploy --network localhost
Após a execução, copie o endereço do contrato Sunest que apareceu no terminal e cole-o nos seus dois arquivos .env.
```

5. Iniciar o Frontend
 - Terminal 3: Iniciar a Aplicação React

```bash

cd frontend
pnpm run dev
```

 Abra http://localhost:5173 (ou a porta indicada) no seu navegador.

⚙️ Scripts Úteis para Desenvolvimento
 Para popular sua blockchain com dados de teste e simular atividade.

 - Registrar uma microgrid de teste:

```bash

pnpm hardhat run scripts/register-test-grid.ts --network localhost
```

 - Iniciar o simulador de sensores:

```bash

node sensor-simulator.js
```

💰 Modelo Financeiro
	- O microgrid recebe pelo fornecimento de energia + taxa de gestão.

	- O operador do nó verde recebe o valor da operação menos os custos energéticos.

	- A plataforma Sunest mantém uma taxa sobre cada operação bem-sucedida.

🌞 Casos de Uso
Armazenamento seguro de dados em horários de pico solar.

	- Distribuição automatizada de dados sensíveis em regiões sustentáveis.

	- Incentivo à adesão de operadores domésticos e microprodutores solares.
