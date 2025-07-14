import ConnectWallet from './components/ConnectWallet';
import RegisterMicrogrid from './components/RegisterMicrogrid';
import MicrogridInspector from './components/MicrogridInspector';

export default function App() {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Sunest dashboard</h1>
        <ConnectWallet />
      </header>

      <RegisterMicrogrid />

      <hr style={{ margin: '32px 0' }} />

      <MicrogridInspector />
    </div>
  );
}

