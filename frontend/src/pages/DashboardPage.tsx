import React, { useState } from 'react';
import StakeForm from '../components/StakeForm';
import UserDashboard from '../components/UserDashboard';

export default function DashboardPage() {
  const [profile, setProfile] = useState<'company' | 'user' | null>(null);

  if (!profile) {
    return (
      <div className="text-center mt-16">
        <h2 className="text-3xl font-bold">Selecione o seu Perfil</h2>
        <p className="mt-4 text-lg text-gray-400">Como irá interagir com a plataforma Vitrine?</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-6 justify-center">
          <button 
            onClick={() => setProfile('company')} 
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold text-lg"
          >
            Sou uma Empresa
          </button>
          <button 
            onClick={() => setProfile('user')} 
            className="px-8 py-4 bg-teal-600 hover:bg-teal-700 rounded-lg font-semibold text-lg"
          >
            Sou um Utilizador
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {profile === 'company' && <StakeForm />}
      {profile === 'user' && <UserDashboard />}
    </div>
  );
}
