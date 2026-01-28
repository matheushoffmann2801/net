import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full p-10 text-center">
      <div className="bg-yellow-100 p-6 rounded-full mb-6">
        <Construction className="w-16 h-16 text-yellow-600" />
      </div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Em Desenvolvimento</h1>
      <p className="text-gray-500 max-w-md mb-8">
        Esta funcionalidade já está no menu, mas a tela ainda está sendo construída.
        Foque em testar o "Novo Item" e o "Dashboard" por enquanto.
      </p>
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Dashboard
      </button>
    </div>
  );
}