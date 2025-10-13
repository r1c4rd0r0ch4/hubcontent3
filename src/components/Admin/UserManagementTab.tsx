import React from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import { AdminCard } from './AdminCard';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { toast } from 'react-hot-toast'; // Assuming react-hot-toast is installed

export const UserManagementTab: React.FC = () => {
  const { profiles, loading, error, refetch } = useAdminData();
  const [processingUserId, setProcessingUserId] = React.useState<string | null>(null);

  const handleAccountStatusUpdate = async (userId: string, status: 'approved' | 'rejected') => {
    setProcessingUserId(userId);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ account_status: status, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id || '',
        action: `Updated user account status to ${status}`,
        target_user_id: userId,
        details: { new_status: status },
      });

      toast.success(`Conta do usuário ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso!`);
      refetch(); // Refresh data
    } catch (err) {
      console.error('Error updating account status:', err);
      toast.error('Falha ao atualizar status da conta.');
    } finally {
      setProcessingUserId(null);
    }
  };

  const pendingInfluencers = profiles.filter(p => p.user_type === 'influencer' && p.account_status === 'pending');
  const allUsers = profiles.filter(p => p.user_type !== 'influencer' || p.account_status !== 'pending');

  if (loading) {
    return (
      <AdminCard title="Gerenciamento de Usuários">
        <div className="flex items-center justify-center py-10 text-textSecondary">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando usuários...
        </div>
      </AdminCard>
    );
  }

  if (error) {
    return (
      <AdminCard title="Gerenciamento de Usuários">
        <div className="text-error text-center py-10">{error}</div>
      </AdminCard>
    );
  }

  return (
    <div className="space-y-8">
      <AdminCard title="Influenciadores Pendentes de Aprovação">
        {pendingInfluencers.length === 0 ? (
          <p className="text-textSecondary italic">Nenhum influenciador pendente de aprovação.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingInfluencers.map((profile) => (
              <div key={profile.id} className="bg-surface p-5 rounded-lg border border-border shadow-md flex flex-col">
                <div className="flex items-center mb-4">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-12 h-12 rounded-full object-cover mr-4" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                      <span className="text-primary font-semibold text-lg">{profile.username[0].toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-semibold text-text">@{profile.username}</p>
                    <p className="text-sm text-textSecondary">{profile.email}</p>
                  </div>
                </div>
                <p className="text-textSecondary text-sm mb-4">
                  <span className="font-medium text-text">Nome Completo:</span> {profile.full_name || 'N/A'}
                </p>
                <p className="text-textSecondary text-sm mb-4">
                  <span className="font-medium text-text">Status da Conta:</span> <span className="capitalize text-warning">{profile.account_status}</span>
                </p>
                <div className="flex gap-3 mt-auto pt-4 border-t border-border/50">
                  <button
                    onClick={() => handleAccountStatusUpdate(profile.id, 'approved')}
                    disabled={processingUserId === profile.id}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingUserId === profile.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleAccountStatusUpdate(profile.id, 'rejected')}
                    disabled={processingUserId === profile.id}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingUserId === profile.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5 mr-2" />}
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminCard title="Todos os Usuários">
        {allUsers.length === 0 ? (
          <p className="text-textSecondary italic">Nenhum usuário registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                    Usuário
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                    Registro
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {allUsers.map((profile) => (
                  <tr key={profile.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.username} className="w-8 h-8 rounded-full object-cover mr-3" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                            <span className="text-primary text-sm font-semibold">{profile.username[0].toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-text">@{profile.username}</div>
                          <div className="text-xs text-textSecondary">{profile.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize
                        ${profile.user_type === 'influencer' ? 'bg-accent/20 text-accent' : 'bg-secondary/20 text-secondary'}`}>
                        {profile.user_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize
                        ${profile.account_status === 'approved' ? 'bg-success/20 text-success' :
                          profile.account_status === 'pending' ? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'}`}>
                        {profile.account_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {/* Add more actions here if needed, e.g., view profile, deactivate */}
                      <button className="text-primary hover:text-primary/80 transition-colors">
                        <Info className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
};
