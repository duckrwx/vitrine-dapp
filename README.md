
<p align="center">
<img width="300" height="220" alt="VITRINE" src="https://github.com/user-attachments/assets/3872087c-7220-4bea-a0e4-3e40a4b605a7" />
</p>


# 🎭 Vitrine – Your Decentralized Data Persona

** Vitrine is a Web3 platform where users transform their browsing data and interests into an AI-segmented, anonymous persona, stored decentrally on the CESS network. **

Our goal is to create a new paradigm for digital advertising, where companies can reach highly qualified audiences without ever accessing raw user data, and where users themselves are rewarded for contributing to a more ethical and efficient data ecosystem.

---

## 🚀 How It Works

 1.Consented Data Collection: Through an on-platform form and a browser extension, users actively (declared) and passively (observed) provide their interests.
 2.Persona Creation: An AI engine on our backend processes and anonymizes this data, creating a rich, structured "persona" (a JSON file).
 3.Decentralized Storage: This persona is stored on the CESS network, ensuring its integrity and availability. Its unique FID (File ID) is saved in our backend's database.
 4.On-Chain Proof: The hash (the "digital fingerprint") of the persona is registered on our VitrineCore smart contract on an EVM blockchain, creating an immutable and auditable proof of existence.
 5.Attention Marketplace: Companies and sellers don't buy the data. Instead, they pay the platform to have their products and "livestreams" displayed to users with matching personas.

## 💡 Key Differentiators

* **👤 User Sovereignty:** Raw data is never exposed. The user is the owner of their persona and the value it generates.
* **🎯 Ethical Advertising:** Companies can run highly targeted campaigns without violating user privacy.
* **🏆 Reputation Economy:** Active participation (updating data, making purchases, giving feedback) builds reputation, which unlocks features and benefits on the platform.
* **📢 Decentralized Social Commerce:** High-reputation users can become "streamers," promoting products and earning commissions that are instantly guaranteed and settled by smart contracts.


---

## 🧱 Technology Stack

* **Blockchain (Logic Layer): ** Smart contracts in Solidity (VitrineCore, Marketplace) on an EVM-compatible network.
* **Blockchain (Storage Layer): ** CESS (Cumulus Encrypted Storage System) for decentralized persona storage.
* **Backend: ** A Python API using FastAPI for business logic, AI processing, and multi-chain communication.
* **Frontend: ** A React application (built with Vite) using the wagmi library for blockchain interaction.
* **Database: ** SQLite (for the MVP) for indexing personas and products.
* **Extension:** A Google Chrome extension for passive, consented data collection.

---

## 🛠️ Local Installation and Setup Guide

Follow these steps to run the project on your local machine.

### Prerequisites

1.  **Node.js**: Versão 18+ ou superior.
2.  **pnpm**: npm install: `sudo apt-get npm` and then `npm install`. Package manager. Install via `npm i -g pnpm`
3.  **Browser Wallet**: MetaMask ou similar.
4.  **Python**: Version 3.10+ with a virtual environment (venv).

### 1. Clone the Repository
```bash
git clone https://github.com/duckrwx/vitrine-dapp.git # 
cd vitrine-dapp
###2. Install Dependencies
Você precisa instalar as dependências tanto para o ambiente Hardhat (raiz) quanto para o frontend.
```
2. Instalar Dependências
Você precisa instalar as dependências tanto para o ambiente Hardhat (raiz) quanto para o frontend.

```Bash

# In the root directory (for Hardhat)
pnpm install

# In the frontend directory
cd frontend
pnpm install
cd .. 

# Set up the Python environment and install packages
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt 
```
3. Start the Services (4 Separate Terminals)

**Terminal 1: Local Blockchain**

```bash

# In the root directory
    pnpm hardhat node
```
**Terminal 2: Deploy contracts:**

```bash

 # In the root directory
    pnpm hardhat run scripts/deploy.ts --network localhost
```
**Set Up Environment Variables**
The project uses two `.env` files. Create them and fill in the addresses after deployment. They can be vizualized after the deploy.
**Root Directory (`.env`):**

```bash

VITRINE_CORE_ADDRESS="..."
MARKETPLACE_ADDRESS="..."
DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
CESS_ACCOUNT_MNEMONIC="..."
```

**Frontend Directory (`frontend/.env.local`):**

```bash

VITE_VITRINE_CORE_ADDRESS="..."
VITE_MARKETPLACE_ADDRESS="..."
VITE_CHAIN_ID=31337
```

**Terminal 3: Backend Server**

```bash

# In the root directory
    source venv/bin/activate
    uvicorn main:app --reload
```



 **Terminal 4: Frontend Server**

```bash

# In the root directory
    cd frontend
    pnpm run dev
```

 **Open the Application:** Navigate to `http://localhost:5173` in your browser.

### 💰 Business Model
*   **Sales Commission:** The platform takes a small percentage of every successful sale on the marketplace.
*   **Promotional Services ("Boosts"):** Sellers and streamers can pay a fee (in the platform's token) to boost the visibility of their products and livestreams to the most relevant personas.

### 🌞 Use Cases
*   **Privacy-Preserving Targeted Marketing:** Companies can advertise to specific audiences without ever accessing their personal data.
*   **User-Driven Data Monetization:** Users are rewarded with reputation and benefits for anonymously sharing their interests.
*   **Decentralized Affiliate Marketing:** Streamers can promote products and receive commissions instantly and securely, guaranteed by the blockchain.

