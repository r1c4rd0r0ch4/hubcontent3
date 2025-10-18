import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import { Users, Sparkles, ShoppingCart, Loader2, Eye, Heart, User, Edit } from 'lucide-react';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type Content = Database['public']['Tables']['content']['Row'];
type InfluencerProfile = Database['public']['Tables']['influencer_profiles']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface InfluencerWithProfile extends InfluencerProfile {
  profiles: Profile;
}

// Import the new components
import { UserProfileEditModal } from './UserProfileEditModal';
import { InfluencerBrowser } from './InfluencerBrowser';

export function UserDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [purchasedContent, setPurchasedContent] = useState<Content[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [loadingPurchasedContent, setLoadingPurchasedContent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false); // State for modal
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'purchased' | 'discover'>('subscriptions'); // State for tabs

  useEffect(() => {
    if (user) {
      fetchUserSubscriptions();
      fetchPurchasedContent();
    }
  }, [user]);

  const fetchUserSubscriptions = async () => {
    if (!user) return;
    setLoadingSubscriptions(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          influencer_profiles (
            *,
            profiles (
              username,
              avatar_url
            )
          )
        `)
        .eq('subscriber_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err: any) {
      console.error('Error fetching subscriptions:', err.message);
      setError('Falha ao carregar assinaturas: ' + err.message);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const fetchPurchasedContent = async () => {
    if (!user) return;
    setLoadingPurchasedContent(true);
    try {
      const { data, error } = await supabase
        .from('purchased_content')
        .select(`
          content (
            *,
            influencer_profiles (
              profiles (
                username
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Extract content objects from the nested structure
      const contentItems = data?.map(pc => pc.content).filter(Boolean) as Content[] || [];
      setPurchasedContent(contentItems);
    } catch (err: any) {
      console.error('Error fetching purchased content:', err.message);
      setError('Falha ao carregar conteúdo comprado: ' + err.message);
    } finally {
      setLoadingPurchasedContent(false);
    }
  };

  const handleProfileUpdateSuccess = () => {
    setShowEditProfileModal(false);
    // AuthContext already reloads profile on update, so no explicit fetch here.
  };

  return (
    <div className="container mx-auto p-8 bg-background text-text min-h-[calc(100vh-64px)]">
      <h2 className="text-4xl font-extrabold text-center mb-10 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        Seu Painel
      </h2>

      {error && <p className="text-error text-center mb-4">{error}</p>}

      {/* User Profile Section */}
      <div className="bg-surface rounded-2xl p-8 shadow-xl border border-border mb-10 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(https://images.pexels.com/photos/1768514/pexels-photo-1768514.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-30 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username || 'User Avatar'}
              className="w-28 h-28 rounded-full object-cover border-4 border-accent/50 shadow-lg"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center border-4 border-accent/50 shadow-lg">
              <User className="text-primary" size={48} />
            </div>
          )}
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl font-bold text-text mb-1">
              {profile?.full_name || `@${profile?.username || 'Usuário'}`}
            </h3>
            <p className="text-lg text-textSecondary mb-3">@{profile?.username || 'usuário'}</p>
            <p className="text-textSecondary text-sm mb-4 max-w-prose">
              {profile?.bio || 'Adicione uma biografia para contar mais sobre você.'}
            </p>
            <button
              onClick={() => setShowEditProfileModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90 transition-colors shadow-md"
            >
              <Edit className="w-5 h-5" />
              Editar Perfil
            </button>
          </div>
        </div>
      </div>

      {/* Tabs for different sections */}
      <div className="mb-10">
        <div className="flex border-b border-border mb-6">
          <button
            className={`px-6 py-3 text-lg font-semibold ${
              activeTab === 'subscriptions'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textSecondary hover:text-text'
            } transition-colors`}
            onClick={() => setActiveTab('subscriptions')}
          >
            Minhas Assinaturas
          </button>
          <button
            className={`px-6 py-3 text-lg font-semibold ${
              activeTab === 'purchased'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textSecondary hover:text-text'
            } transition-colors`}
            onClick={() => setActiveTab('purchased')}
          >
            Conteúdo Comprado
          </button>
          <button
            className={`px-6 py-3 text-lg font-semibold ${
              activeTab === 'discover'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textSecondary hover:text-text'
            } transition-colors`}
            onClick={() => setActiveTab('discover')}
          >
            Descobrir Influencers
          </button>
        </div>

        {activeTab === 'subscriptions' && (
          <div className="fade-in">
            <h3 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Suas Assinaturas</h3>
            {loadingSubscriptions && (
              <div className="flex items-center justify-center text-primary text-lg">
                <Loader2 className="animate-spin mr-2" size={24} /> Carregando assinaturas...
              </div>
            )}
            {!loadingSubscriptions && subscriptions.length === 0 && (
              <p className="text-textSecondary text-center">Você não tem nenhuma assinatura ativa.</p>
            )}
            {!loadingSubscriptions && subscriptions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subscriptions.map((sub) => {
                  const influencer = (sub.influencer_profiles as InfluencerWithProfile)?.profiles;
                  return (
                    <div key={sub.id} className="bg-surface rounded-xl p-6 shadow-lg border border-border flex items-center gap-4">
                      {influencer?.avatar_url ? (
                        <img src={influencer.avatar_url} alt={influencer.username} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                          <Users className="text-white" size={24} />
                        </div>
                      )}
                      <div>
                        <p className="text-xl font-semibold text-text">@{influencer?.username || 'Influenciador Desconhecido'}</p>
                        <p className="text-sm text-textSecondary">Status: <span className={`capitalize font-medium ${sub.status === 'active' ? 'text-success' : sub.status === 'pending' ? 'text-warning' : 'text-error'}`}>{sub.status}</span></p>
                        <p className="text-xs text-textSecondary">Desde: {new Date(sub.start_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'purchased' && (
          <div className="fade-in">
            <h3 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Conteúdo Comprado</h3>
            {loadingPurchasedContent && (
              <div className="flex items-center justify-center text-primary text-lg">
                <Loader2 className="animate-spin mr-2" size={24} /> Carregando conteúdo comprado...
              </div>
            )}
            {!loadingPurchasedContent && purchasedContent.length === 0 && (
              <p className="text-textSecondary text-center">Você ainda não comprou nenhum conteúdo.</p>
            )}
            {!loadingPurchasedContent && purchasedContent.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {purchasedContent.map((item) => {
                  const influencerUsername = (item.influencer_profiles as { profiles: { username: string } })?.profiles?.username;
                  return (
                    <div key={item.id} className="bg-surface rounded-xl shadow-lg border border-border overflow-hidden">
                      <img src={item.thumbnail_url || item.media_url} alt={item.title} className="w-full h-48 object-cover" />
                      <div className="p-4">
                        <h4 className="text-lg font-semibold text-text mb-2">{item.title}</h4>
                        <p className="text-sm text-textSecondary mb-1">Por: @{influencerUsername || 'Desconhecido'}</p>
                        <p className="text-sm text-textSecondary mb-3 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between text-textSecondary text-sm">
                          <span className="flex items-center gap-1"><Eye size={16} /> {item.total_views}</span>
                          <span className="flex items-center gap-1"><Heart size={16} /> {item.likes_count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="fade-in">
            <InfluencerBrowser />
          </div>
        )}
      </div>

      {showEditProfileModal && (
        <UserProfileEditModal
          onClose={() => setShowEditProfileModal(false)}
          onSuccess={handleProfileUpdateSuccess}
        />
      )}
    </div>
  );
}
