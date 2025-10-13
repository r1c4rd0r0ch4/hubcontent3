import React from 'react';
import { Users, FileText, Flag, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { signOut } = useAuth();

  const navItems = [
    { id: 'users', icon: Users, label: 'Gerenciamento de Usuários' },
    { id: 'kyc', icon: FileText, label: 'Revisão de KYC' },
    { id: 'content', icon: Flag, label: 'Moderação de Conteúdo' },
    { id: 'settings', icon: Settings, label: 'Configurações' }, // New navigation item
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-6 flex flex-col">
        <div className="text-2xl font-bold text-gray-900 mb-8">Admin HubContent</div>
        <nav className="flex-1">
          <ul>
            {navItems.map((item) => (
              <li key={item.id} className="mb-2">
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center w-full p-3 rounded-lg text-left transition-colors ${
                    activeTab === item.id
                      ? 'bg-pink-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto">
          <button
            onClick={signOut}
            className="flex items-center w-full p-3 rounded-lg text-left text-gray-700 hover:bg-red-100 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
