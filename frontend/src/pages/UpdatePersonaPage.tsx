import React from 'react';
import { Link } from 'react-router-dom';
import UserDashboard from '../components/UserDashboard'; // O nome do componente está correto

export default function UpdatePersonaPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Atualizar a sua Persona</h1>
        <p className="mt-2 text-gray-400">Forneça os seus dados para refinar a sua persona e ganhar reputação.</p>
      </div>
      
      {/* O UserDashboard agora é o formulário de atualização e ligação da extensão */}
      <UserDashboard />

      {/* ✅ NOVO: Botão de atalho para registar produto */}
      <div className="mt-8 pt-6 border-t border-gray-700 text-center">
        <p className="text-gray-400 mb-4">Tem um produto para vender?</p>
        <Link to="/dashboard/register-product">
          <button className="py-2 px-6 border rounded-md shadow-sm font-medium text-white bg-green-600 hover:bg-green-700">
            Ir para a página de Registo de Produto
          </button>
        </Link>
      </div>
    </div>
  );
}
