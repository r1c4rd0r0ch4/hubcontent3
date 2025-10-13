import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { CheckCircle, XCircle, User, Sparkles, Loader2, ShieldCheck, Ban } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type InfluencerProfile = Database['public']['Tables']['influencer_profiles']['Row'];

export function AdminDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      console.error('Error fetching profiles:', err.message);
      setError('Falha ao carregar perfis: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (profileId: string, newStatus: Database['public']['Enums']['account_status_enum']) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', profileId);

      if (error) throw error;
      fetchProfiles(); // Refresh list
      setShowModal(false);
    } catch (err: any) {
      console.error('Error updating profile status:', err.message);
      setError('Falha ao atualizar status: ' + err.message);
    }
  };

  const handleAdminToggle = async (profileId: string, isAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: isAdmin })
        .eq('id', profileId);

      if (error) throw error;
      fetchProfiles(); // Refresh list
      setShowModal(false);
    } catch (err: any) {
      console.error('Error toggling admin status:', err.message);
      setError('Falha ao alternar status de administrador: ' + err.message);
    }
  };

  const ProfileDetailsModal = () => {
    if (!selectedProfile) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-xl p-8 w-full max-w-2xl shadow-2xl border border-border">
          <h3 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Detalhes do Perfil: {selectedProfile.username}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-textSecondary mb-6">
            <p><strong>Email:</strong> {selectedProfile.email}</p>
            <p><strong>Tipo de Usuário:</strong> <span className="capitalize">{selectedProfile.user_type}</span></p>
            <p><strong>Status da Conta:</strong> <span className="capitalize">{selectedProfile.account_status}</span></p>
            <p><strong>Admin:</strong> {selectedProfile.is_admin ? 'Sim' : 'Não'}</p>
            {selectedProfile.full_name && <p><strong>Nome Completo:</strong> {selectedProfile.full_name}</p>}
            {selectedProfile.date_of_birth && <p><strong>Data de Nascimento:</strong> {selectedProfile.date_of_birth}</p>}
            {selectedProfile.document_type && <p><strong>Tipo Doc:</strong> {selectedProfile.document_type}</p>}
            {selectedProfile.document_number && <p><strong>Número Doc:</strong> {selectedProfile.document_number}</p>}
            {selectedProfile.address && (
              <p className="col-span-2">
                <strong>Endereço:</strong> {JSON.stringify(selectedProfile.address)}
              </p>
            )}
          </div>

          {selectedProfile.user_type === 'influencer' && selectedProfile.account_status === 'pending' && (
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => handleStatusChange(selectedProfile.id, 'approved')}
                className="flex-1 bg-success text-white py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} /> Aprovar Influenciador
              </button>
              <button
                onClick={() => handleStatusChange(selectedProfile.id, 'rejected')}
                className="flex-1 bg-error text-white py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={18} /> Rejeitar Influenciador
              </button>
            </div>
          )}

          <div className="flex gap-4 mb-6">
            {selectedProfile.is_admin ? (
              <button
                onClick={() => handleAdminToggle(selectedProfile.id, false)}
                className="flex-1 bg-warning text-white py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
              >
                <Ban size={18} /> Remover Admin
              </button>
            ) : (
              <button
                onClick={() => handleAdminToggle(selectedProfile.id, true)}
                className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} /> Tornar Admin
              </button>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setShowModal(false)}
              className="bg-textSecondary text-background py-2 px-6 rounded-lg hover:bg-opacity-80 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-8 bg-background text-text min-h-screen">
      <h2 className="text-4xl font-extrabold text-center mb-10 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        Painel de Administração
      </h2>

      {loading && (
        <div className="flex items-center justify-center text-primary text-lg">
          <Loader2 className="animate-spin mr-2" size={24} /> Carregando perfis...
        </div>
      )}
      {error && <p className="text-error text-center mb-4">{error}</p>}

      {!loading && profiles.length === 0 && (
        <p className="text-textSecondary text-center">Nenhum perfil encontrado.</p>
      )}

      {!loading && profiles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-surface rounded-xl p-6 shadow-lg border border-border hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              onClick={() => {
                setSelectedProfile(profile);
                setShowModal(true);
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <User className="text-white" size={24} />
                  </div>
                )}
                <div>
                  <p className="text-xl font-semibold text-text">@{profile.username}</p>
                  <p className="text-sm text-textSecondary capitalize">{profile.user_type}</p>
                </div>
              </div>
              <div className="text-sm text-textSecondary">
                <p>Email: {profile.email}</p>
                <p>Status: <span className={`capitalize font-medium ${profile.account_status === 'approved' ? 'text-success' : profile.account_status === 'pending' ? 'text-warning' : 'text-error'}`}>{profile.account_status}</span></p>
                <p>Admin: {profile.is_admin ? <span className="text-primary">Sim</span> : 'Não'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <ProfileDetailsModal />}
    </div>
  );
}
