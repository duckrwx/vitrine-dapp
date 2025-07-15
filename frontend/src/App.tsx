import ConnectWallet from './components/ConnectWalletAdvanced'; // Usando a versão avançada que criamos
import RegisterMicrogrid from './components/RegisterMicrogrid';
import MicrogridInspector from './components/MicrogridInspector';
import RegisterNode from './components/RegisterNode';
import NodeDashboard from './components/NodeDashboard'; // Já vamos deixar o espaço para o próximo

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-gray-100">
      <div className="w-full max-w-2xl space-y-8">
        
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">Sunest Dashboard</h1>
          <p className="mt-2 text-md text-gray-600">Gerencie suas microgrids e nós de energia.</p>
        </header>

        <ConnectWallet />

        {/* Painel de Ações do Usuário */}
        <div className="p-6 bg-white rounded-xl shadow-lg space-y-6">
          <h2 className="text-xl font-bold text-gray-700 border-b pb-2">Ações</h2>
          <RegisterMicrogrid />
          <hr />
          <RegisterNode />
          <hr />
          <NodeDashboard /> 
        </div>
        
        {/* Painel de Inspeção */}
        <div className="p-6 bg-white rounded-xl shadow-lg">
           <h2 className="text-xl font-bold text-gray-700 border-b pb-2 mb-4">Inspecionar Rede</h2>
          <MicrogridInspector />
        </div>

      </div>
    </main>
  );
}
