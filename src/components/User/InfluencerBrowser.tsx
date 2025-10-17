import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, DollarSign, Image as ImageIcon, Loader2 } from 'lucide-react';
import { InfluencerProfile } from './InfluencerProfile';

interface InfluencerWithDetails {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  influencer_profiles: {
    subscription_price: number;
    instagram: string | null;
    twitter: string | null;
    tiktok: string | null;
  };
  content_count: number;
  is_subscribed: boolean;
  total_subscribers: number; // Add this
}

export function InfluencerBrowser() {
  const { profile } = useAuth();
  const [influencers, setInfluencers] = useState<InfluencerWithDetails[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInfluencers();
  }, [profile]);

  const loadInfluencers = async () => {
    setLoading(true);
    const { data: influencersData, error } = await supabase
      .from('profiles')
      .select(`
        *,
        influencer_profiles (
          subscription_price,
          instagram,
          twitter,
          tiktok
        )
      `)
      .eq('user_type', 'influencer')
      .eq('is_active', true);

    if (!error && influencersData) {
      const influencersWithDetails = await Promise.all(
        influencersData.map(async (inf: any) => {
          const { count: contentCount } = await supabase
            .from('content')
            .select('id', { count: 'exact' })
            .eq('influencer_id', inf.id)
            .eq('status', 'approved'); // Only count approved content

          let isSubscribed = false;
          if (profile) {
            const { data: subData } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('subscriber_id', profile.id)
              .eq('influencer_id', inf.id)
              .eq('status', 'active')
              .maybeSingle();

            isSubscribed = !!subData;
          }

          // Fetch dynamic subscriber count
          const { data: subscriberCountData, error: countError } = await supabase.rpc('get_influencer_subscriber_count', {
            p_influencer_id: inf.id,
          });

          if (countError) {
            console.error('Error fetching subscriber count:', countError);
          }

          return {
            ...inf,
            content_count: contentCount || 0,
            is_subscribed: isSubscribed,
            total_subscribers: subscriberCountData || 0, // Use dynamic count
          };
        })
      );

      setInfluencers(influencersWithDetails);
    }
    setLoading(false);
  };

  const filteredInfluencers = influencers.filter(inf =>
    inf.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inf.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inf.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedInfluencer) {
    return (
      <InfluencerProfile
        influencerId={selectedInfluencer}
        onBack={() => {
          setSelectedInfluencer(null);
          loadInfluencers(); // Reload influencers to update subscription status
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center text-primary text-lg py-12">
        <Loader2 className="animate-spin mr-2" size={24} /> Carregando influencers...
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl p-8 shadow-xl border border-border">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-4">Descubra Influencers</h1>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar influencers..."
          className="w-full max-w-xl px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-text"
        />
      </div>

      {filteredInfluencers.length === 0 ? (
        <div className="text-center py-12 bg-background rounded-xl">
          <Users className="w-16 h-16 text-textSecondary/70 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text mb-2">Nenhum influencer encontrado</h3>
          <p className="text-textSecondary">Tente buscar por outro termo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInfluencers.map((influencer) => (
            <div
              key={influencer.id}
              className="bg-background rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer border border-border"
              onClick={() => setSelectedInfluencer(influencer.id)}
            >
              <div className="relative h-48 bg-gradient-to-br from-secondary to-primary">
                {influencer.avatar_url ? (
                  <img
                    src={influencer.avatar_url}
                    alt={influencer.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
                    {influencer.username[0].toUpperCase()}
                  </div>
                )}
                {influencer.is_subscribed && (
                  <div className="absolute top-4 right-4 bg-success text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Inscrito
                  </div>
                )}
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-text mb-1">
                  {influencer.full_name || `@${influencer.username}`}
                </h3>
                <p className="text-sm text-textSecondary mb-4">@{influencer.username}</p>

                {influencer.bio && (
                  <p className="text-sm text-textSecondary mb-4 line-clamp-2">{influencer.bio}</p>
                )}

                <div className="flex items-center justify-between text-sm text-textSecondary mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{influencer.total_subscribers} assinantes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ImageIcon className="w-4 h-4" />
                    <span>{influencer.content_count} posts</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-success font-semibold">
                    <DollarSign className="w-5 h-5" />
                    <span>R$ {influencer.influencer_profiles.subscription_price.toFixed(2)}/mês</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInfluencer(influencer.id);
                    }}
                    className="bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
                  >
                    {influencer.is_subscribed ? 'Ver Perfil' : 'Assinar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
