import React from 'react';
import { Link } from 'react-router-dom';
import UserStatusPanel from '../components/UserStatusPanel';
import MyProductsList from '../components/MyProductsList';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-center">Meu Painel</h1>
      
      <UserStatusPanel />

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center"> {/* ✅ ALTERADO para 3 colunas */}
        <Link to="/dashboard/update" className="p-6 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
          <h2 className="text-2xl font-bold">Atualizar Persona</h2>
          <p className="mt-2 text-gray-400">Gira os seus dados e a ligação com a extensão.</p>
        </Link>
        <Link to="/dashboard/register-product" className="p-6 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
          <h2 className="text-2xl font-bold">Registar Produto</h2>
          <p className="mt-2 text-gray-400">Adicione um novo produto ao marketplace.</p>
        </Link>
        {/* ✅ NOVO: Link para o Marketplace */}
        <Link to="/marketplace" className="p-6 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
          <h2 className="text-2xl font-bold">Ver Marketplace</h2>
          <p className="mt-2 text-gray-400">Explore todos os produtos e as lives.</p>
        </Link>
      </div>

      <MyProductsList />
    </div>
  );
}
