import React from 'react';
import ProductList from '../components/ProductList';

export default function MarketplacePage() {
  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold">Marketplace da Vitrine</h1>
        <p className="mt-2 text-lg text-gray-400">Explore produtos e oportunidades.</p>
      </div>
      <ProductList />
    </div>
  );
}
