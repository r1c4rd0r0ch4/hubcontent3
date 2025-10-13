import React, { useState } from 'react';
import { UserManagementTab } from './UserManagementTab';
import { ReportedContentTab } from './ReportedContentTab';
import { KycReviewTab } from './KycReviewTab';
import { PlatformSettingsTab } from './PlatformSettingsTab';
import { AdminLayout } from './AdminLayout'; // Import the new layout
import { Users, Flag, FileText, Settings } from 'lucide-react';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('userManagement');

  const tabs = [
    { id: 'userManagement', label: 'Gerenciar Usuários', icon: Users, component: <UserManagementTab /> },
    { id: 'reportedContent', label: 'Moderação de Conteúdo', icon: Flag, component: <ReportedContentTab /> },
    { id: 'kycReview', label: 'Revisão de KYC', icon: FileText, component: <KycReviewTab /> },
    { id: 'platformSettings', label: 'Configurações da Plataforma', icon: Settings, component: <PlatformSettingsTab /> },
  ];

  const currentTabComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <AdminLayout
      navItems={tabs.map(({ id, label, icon }) => ({ id, label, icon }))}
      activeNavItemId={activeTab}
      onNavItemClick={setActiveTab}
    >
      <div className="animate-fade-in">
        <h2 className="text-4xl font-extrabold mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {tabs.find(tab => tab.id === activeTab)?.label}
        </h2>
        {currentTabComponent}
      </div>
    </AdminLayout>
  );
}
