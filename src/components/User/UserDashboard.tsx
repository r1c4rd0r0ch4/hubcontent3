import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import { Users, Sparkles, ShoppingCart, Loader2, Eye, Heart } from 'lucide-react';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type Content = Database['public']['Tables']['content']['Row'];
type InfluencerProfile = Database['public']['Tables']['influencer_profiles']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface InfluencerWithProfile extends InfluencerProfile {
  profiles: Profile;
}

export function UserDashboard() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [purchasedContent, setPurchasedContent] = useState<Content[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [loadingPurchasedContent, setLoadingPurchasedContent] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="container mx-auto p-8 bg-background text-text min-h-[calc(100vh-64px)]">
      <h2 className="text-4xl font-extrabold text-center mb-10 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        Seu Painel
      </h2>

      {error && <p className="text-error text-center mb-4">{error}</p>}

      <div className="mb-10">
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

      <div>
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
    </div>
  );
}
