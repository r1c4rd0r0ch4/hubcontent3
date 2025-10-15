import React, { useState } from 'react';
import { Home, Users, Settings, LogOut, FileText, BarChart, DollarSign, MessageSquare, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AdminCard } from '../components/Admin/AdminCard';
import { UserManagementTab } from '../components/Admin/UserManagementTab';
import { AdminSettingsTab } from '../components/Admin/AdminSettingsTab';
import { AdminLogsTab } from '../components/Admin/AdminLogsTab';
import { AdminAnalyticsTab } from '../components/Admin/AdminAnalyticsTab';
import { AdminPayoutsTab } from '../components/Admin/AdminPayoutsTab';
import { AdminContentManagementTab } from '../components/Admin/AdminContentManagementTab';
import { AdminChatManagementTab } from '../components/Admin/AdminChatManagementTab';

type AdminTab = 'dashboard' | 'users' | 'settings' | 'logs' | 'analytics' | 'payouts' | 'content' | 'chat';

export const AdminDashboard: React.FC = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AdminCard title="Visão Geral">
              <p className="text-textSecondary">Bem-vindo ao painel de administração.</p>
              <p className="text-textSecondary mt-2">Use o menu lateral para navegar pelas funcionalidades.</p>
            </AdminCard>
            <AdminCard title="Usuários Ativos">
              <p className="text-4xl font-bold text-primary">1,234</p>
              <p className="text-textSecondary">Total de usuários registrados</p>
            </AdminCard>
            <AdminCard title="Influenciadores Pendentes">
              <p className="text-4xl font-bold text-warning">12</p>
              <p className="text-textSecondary">Aguardando aprovação de KYC</p>
            </AdminCard>
            <AdminCard title="Conteúdo Novo">
              <p className="text-4xl font-bold text-secondary">56</p>
              <p className="text-textSecondary">Conteúdos enviados hoje</p>
            </AdminCard>
            <AdminCard title="Ganhos do Mês">
              <p className="text-4xl font-bold text-success">R$ 12.500</p>
              <p className="text-textSecondary">Receita total da plataforma</p>
            </AdminCard>
            <AdminCard title="Mensagens Ativas">
              <p className="text-4xl font-bold text-accent">234</p>
              <p className="text-textSecondary">Conversas em andamento</p>
            </AdminCard>
          </div>
        );
      case 'users':
        return <UserManagementTab />;
      case 'settings':
        return <AdminSettingsTab />;
      case 'logs':
        return <AdminLogsTab />;
      case 'analytics':
        return <AdminAnalyticsTab />;
      case 'payouts':
        return <AdminPayoutsTab />;
      case 'content':
        return <AdminContentManagementTab />;
      case 'chat':
        return <AdminChatManagementTab />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-text">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border p-6 flex flex-col shadow-lg">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-primary">HubContent</h1>
          <p className="text-sm text-textSecondary">Admin Panel</p>
        </div>
        <nav className="flex-grow">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                  activeTab === 'dashboard' ? 'bg-primary/20 text-primary' : 'text-textSecondary hover:bg-border hover:text-text'
                }`}
              >
                <Home className="w-5 h-5 mr-3" />
                Dashboard
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                  activeTab === 'users' ? 'bg-primary/20 text-primary' : 'text-textSecondary hover:bg-border hover:text-text'
                }`}
              >
                <Users className="w-5 h-5 mr-3" />
                Gerenciar Usuários
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('content')}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                  activeTab === 'content' ? 'bg-primary/20 text-primary' : 'text-textSecondary hover:bg-border hover:text-text'
                }`}
              >
                <Video className="w-5 h-5 mr-3" />
                Gerenciar Conteúdo
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('chat')}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                  activeTab === 'chat' ? 'bg-primary/20 text-primary' : 'text-textSecondary hover:bg-border hover:text-text'
                }`}
              >
                <MessageSquare className="w-5 h-5 mr-3" />
                Gerenciar Chat
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('payouts')}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                  activeTab === 'payouts' ? 'bg-primary/20 text-primary' : 'text-textSecondary hover:bg-border hover:text-text'
                }`}
              >
                <DollarSign className="w-5 h-5 mr-3" />
                Pagamentos
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                  activeTab === 'analytics' ? 'bg-primary/20 text-primary' : 'text-textSecondary hover:bg-border hover:text-text'
                }`}
              >
                <BarChart className="w-5 h-5 mr-3" />
                Análises
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('logs')}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                  activeTab === 'logs' ? 'bg-primary/20 text-primary' : 'text-textSecondary hover:bg-border hover:text-text'
                }`}
              >
                <FileText className="w-5 h-5 mr-3" />
                Logs de Auditoria
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                  activeTab === 'settings' ? 'bg-primary/20 text-primary' : 'text-textSecondary hover:bg-border hover:text-text'
                }`}
              >
                <Settings className="w-5 h-5 mr-3" />
                Configurações
              </button>
            </li>
          </ul>
        </nav>
        <div className="mt-8">
          <button
            onClick={signOut}
            className="w-full flex items-center p-3 rounded-lg text-error hover:bg-error/20 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-bold text-text capitalize">{activeTab.replace(/([A-Z])/g, ' $1').trim()}</h2>
          {/* Admin profile/notifications could go here */}
        </header>
        {renderTabContent()}
      </main>
    </div>
  );
};
