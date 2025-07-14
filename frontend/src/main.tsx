import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import App from './App';

import { WagmiConfig, createConfig } from 'wagmi';
import { publicClient, connector } from './lib/web3';

const config = createConfig({
  publicClient,
  connectors: [connector],
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiConfig config={config}>
      <App />
    </WagmiConfig>
  </React.StrictMode>
);

