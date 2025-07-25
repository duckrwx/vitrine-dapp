import React from 'react';
import UserDashboard from '../components/UserDashboard';

export default function DashboardPage() {
  // A seleção de perfil foi removida.
  // A página agora mostra diretamente o painel principal do utilizador.
  return (
    <div>
      <UserDashboard />
    </div>
  );
}
