import React from 'react';
import { Link } from 'react-router-dom';
import RegisterProductForm from '../components/RegisterProductForm';

export default function RegisterProductPage() {
  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Registar Novo Produto</h1>
        <div>
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white mr-4">Voltar ao Painel</Link>
          <Link to="/marketplace" className="text-sm text-gray-400 hover:text-white">Ir para o Marketplace</Link>
        </div>
      </div>
      <RegisterProductForm />
    </div>
  );
}
