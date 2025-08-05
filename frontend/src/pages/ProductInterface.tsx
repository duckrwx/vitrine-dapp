//ProductInterface.js

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import ProductCard from '../components/ProductCard';
import CreatorList from '../components/CreatorList';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function ProductInterface() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { address: userAddress, isConnected } = useAccount();

  const handleBecomeCreator = () => {
    if (!isConnected) {
      alert('Por favor, conecte sua carteira para se tornar um criador');
      return;
    }
    
    // Navegar para a página de criação de link de afiliado
    navigate(`/seed/${productId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Produto Principal */}
          <div className="lg:col-span-2">
            <ProductCard productId={BigInt(productId || 0)} />
            
            {/* Botão para se tornar criador */}
            <div className="mt-6 bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Ganhe promovendo este produto!
                  </h3>
                  <p className="text-green-100">
                    Crie seu link de afiliado e comece a ganhar comissões
                  </p>
                </div>
              <Link
                  to={`/product/${productId}/seed`}
                  className="px-6 py-3 bg-white text-green-700 rounded-lg font-semibold hover:bg-green-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Tornar-se Criador</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar com Criadores */}
          <div className="space-y-6">
            {/* Lista de Criadores Compacta */}
            <div className="bg-gray-800 rounded-lg p-4">
              <CreatorList productId={productId} compact={true} />
            </div>

            {/* Estatísticas do Produto */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                Estatísticas de Promoção
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Criadores Ativos</span>
                  <span className="text-white font-semibold">8</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Vendas via Afiliados</span>
                  <span className="text-white font-semibold">47</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Taxa de Conversão</span>
                  <span className="text-green-400 font-semibold">12.3%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
