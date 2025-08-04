import React from 'react';
import { Link } from 'react-router-dom';
import UserStatusPanel from '../components/UserStatusPanel';
import MyProductsList from '../components/MyProductsList';

// Ícones para cada card (componentes SVG simples para manter tudo em um único arquivo)
const IconUpdatePersona = () => <svg className="w-10 h-10 mx-auto text-blue-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>;
const IconRegisterProduct = () => <svg className="w-10 h-10 mx-auto text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
const IconMarketplace = () => <svg className="w-10 h-10 mx-auto text-purple-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>;
const IconCreatorDashboard = () => <svg className="w-10 h-10 mx-auto text-yellow-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>;


export default function DashboardPage() {
  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Meu Painel</h1>
        <p className="text-lg text-gray-400 mt-2">Gerencie seus produtos, sua persona e seu desempenho como criador.</p>
      </div>
      
      <UserStatusPanel />

      {/* Ações Rápidas */}
      <div>
        <h2 className="text-2xl font-semibold mb-6 text-center">Ações Rápidas</h2>
        {/* ✅ ATUALIZADO para 4 colunas em telas grandes (lg) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <Link to="/dashboard/update" className="group p-6 bg-gray-800 border border-gray-700 hover:border-blue-500 hover:bg-gray-700/50 rounded-lg transition-all duration-300 transform hover:-translate-y-1">
            <IconUpdatePersona />
            <h3 className="text-xl font-bold text-white group-hover:text-blue-400">Atualizar Persona</h3>
            <p className="mt-2 text-sm text-gray-400">Gerencie seus dados e a ligação com a extensão.</p>
          </Link>

          <Link to="/dashboard/register-product" className="group p-6 bg-gray-800 border border-gray-700 hover:border-green-500 hover:bg-gray-700/50 rounded-lg transition-all duration-300 transform hover:-translate-y-1">
            <IconRegisterProduct />
            <h3 className="text-xl font-bold text-white group-hover:text-green-400">Registrar Produto</h3>
            <p className="mt-2 text-sm text-gray-400">Adicione um novo produto ao marketplace.</p>
          </Link>
          
          {/* ✅ NOVO CARD: Link para o Creator Dashboard */}
          <Link to="/creator-dashboard" className="group p-6 bg-gray-800 border border-gray-700 hover:border-yellow-500 hover:bg-gray-700/50 rounded-lg transition-all duration-300 transform hover:-translate-y-1">
            <IconCreatorDashboard />
            <h3 className="text-xl font-bold text-white group-hover:text-yellow-400">Painel do Criador</h3>
            <p className="mt-2 text-sm text-gray-400">Acompanhe suas vendas e comissões de afiliado.</p>
          </Link>
          
          <Link to="/marketplace" className="group p-6 bg-gray-800 border border-gray-700 hover:border-purple-500 hover:bg-gray-700/50 rounded-lg transition-all duration-300 transform hover:-translate-y-1">
            <IconMarketplace />
            <h3 className="text-xl font-bold text-white group-hover:text-purple-400">Ver Marketplace</h3>
            <p className="mt-2 text-sm text-gray-400">Explore todos os produtos e as lives ativas.</p>
          </Link>

        </div>
      </div>

      <MyProductsList />
    </div>
  );
}
